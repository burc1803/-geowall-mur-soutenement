import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CalculationStepsTheory } from './CalculationStepsTheory';
import { OfficialNoteDeCalcul } from './OfficialNoteDeCalcul';
import { StemDeflectionCard } from './StemDeflectionCard';
import { fmtSci, equivalentK } from './StemDeflectionSteps';
import { fr } from '../lib/theoryEquations';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG } from '../lib/analysis';
import type { LoadsConfig, SoilProperties, WallGeometry } from '../lib/types';

// MUR-05 : affichage de la flèche du voile. Cas G1 (R1 de la fiche). Les écrans lisent le moteur : chaque valeur affichée = valeur du moteur.
const DELTA_B_MU055 = (Math.atan(0.55) * 180) / Math.PI;
const GEO: WallGeometry = { wallType: 'cantilever', hMur: 3.0, epStem: 0.3, ePiedAv: 0.6, ePiedAr: 1.5, epBase: 0.4 };
const SOIL: SoilProperties = {
  gamma: 19, phi: 32, cohesion: 0, bearingSoil: { phi: 32, contact: 'cast', deltaB: DELTA_B_MU055 }, hSolAv: 0, qAllowable_SLS: 300, qUltimate_ULS: 300,
  hasWaterTable: false, gamma_w: 9.81, stabilityCriterion: 'eccentricity', geotechLevel: 'typical', psi: 1.0,
  methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'none', pga: 0.15, deltaFrictionRatio: 0.667 }
};
const LOADS: LoadsConfig = { surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };
const result = analyzeRetainingWall(GEO, SOIL, LOADS, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
const sd = result.stemDeflection;
const row = sd.rows[sd.governingIndex];
const p = sd.props!;
const text = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/<!-- -->/g, '');

describe('MUR-05 : onglet Étapes & formules, section « Flèche du voile (ÉLS) » (combinaison qui gouverne, G1/R1)', () => {
  const html = renderToString(<CalculationStepsTheory geo={GEO} soil={SOIL} loads={LOADS} result={result} conc={DEFAULT_CONCRETE_PROPS} initialSection="fleche" />);
  const t = text(html);
  it('la combinaison qui gouverne est S0 et ses valeurs substituées égalent celles du moteur', () => {
    expect(row.combName).toContain('ELS S0');
    for (const v of [
      fr(p.Ec, 1), fr(p.frHalf, 3), fr(p.Mcr, 2), fr(p.n, 4), fr(p.c, 2), fmtSci(p.Icr, 3), fmtSci(p.Ig, 3), fr(row.Ma, 2),
      fmtSci(row.Ie, 4), fr(row.deltaI, 3), fr(row.deltaSus, 3), fr(row.deltaLT, 3), fr(sd.zetaS, 3), fr(row.limit, 2)
    ]) expect(t, v).toContain(v);
  });
  it('R1 : Ec = 24 647,5 ; Mcr = 24,65 ; Icr = 4,684 × 10⁸ ; Δi = 0,989 ; ΔLT = 2,967 (moteur) ; limite 10,00 ; CONFORME', () => {
    // Format d'affichage : espace fine insécable (U+202F) entre les milliers
    expect(t).toContain('24 647,5'); expect(t).toContain('24,65'); expect(t).toContain('4,684 × 10⁸'); expect(t).toContain('0,989'); expect(t).toContain('10,00');
    expect(t).toContain('section fissurée'); expect(t).toContain('CONFORME au critère');
  });
  it('mentions : K de Chaallal en comparaison seulement, rotation NON VÉRIFIÉE, limite = critère de l\'utilisateur, sources citées', () => {
    expect(Number.isFinite(equivalentK(sd, row))).toBe(true); expect(t).toContain(`K = ${fr(equivalentK(sd, row), 2)}`);
    expect(t).toContain('K = 2,4'); expect(t).toContain('Comparaison seulement');
    expect(t).toContain('Rotation de la semelle non comprise (Chaallal, tableau 3.3, note a : à ajouter s\'il y a lieu)'); expect(t).toContain('NON VÉRIFIÉE');
    expect(t).toContain('critère de l\'utilisateur'); expect(t).toContain('Chaallal (2012) §3.4.2, p. 33 à 36, éq. 3.22, 3.25 à 3.27, tableau 3.3'); expect(t).toContain('CSA A23.3 9.8.2.2 à 9.8.2.5');
    expect(html).toContain('<sub'); expect(html).not.toContain('NaN');
  });
});

describe('MUR-05 : note de calcul et carte', () => {
  const html = renderToString(<OfficialNoteDeCalcul geo={GEO} soil={SOIL} conc={DEFAULT_CONCRETE_PROPS} result={result} loads={LOADS} />);
  const t = text(html);
  it('la note a la section 4.5, les 10 combinaisons ÉLS, les paramètres et les deux mentions', () => {
    expect(t).toContain('Flèche du voile (ÉLS)');
    for (const id of ['S0', 'S1', 'S1a', 'S1b', 'S2', 'S2a', 'S2b', 'S3', 'S3a', 'S3b']) expect(t, id).toContain(id);
    expect(t).toContain(fr(row.deltaLT, 2)); expect(t).toContain(fr(p.Mcr, 2));
    expect(t).toContain('Limite h/300'); expect(t).toContain('aucune limite de la CSA A23.3 tableau 9.3 pour un mur');
    expect(t).toContain('Rotation de la semelle : NON VÉRIFIÉE');
    expect(html).not.toContain('NaN');
  });
  it('la carte affiche le moteur et ne masque aucun statut', () => {
    const c = text(renderToString(<StemDeflectionCard result={result} />));
    expect(c).toContain(fr(row.deltaLT, 2)); expect(c).toContain('OK'); expect(c).toContain('gouverne');
    const bad = analyzeRetainingWall({ ...GEO, hMur: 3.8, epStem: 0.35 }, SOIL, { ...LOADS, surcharge: 20 }, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
    expect(bad.stemDeflection.status).toBe('NON');
    expect(text(renderToString(<StemDeflectionCard result={bad} />))).toContain('NON');
  });
});
