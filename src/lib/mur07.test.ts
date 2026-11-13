import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG, DEFAULT_SOIL_METHOD_CONFIG } from './analysis';
import { buildStemPassiveEq, fr } from './theoryEquations';
import { StemPassiveSteps } from '../components/StemPassiveSteps';
import { defaultProject, parseProjectText, projectToJson } from './projectFile';
import { STEM_PASSIVE_LOAD_NOTICE } from './stemPassive';
import type { LoadsConfig, SoilProperties, StemPassiveChoice, WallGeometry } from './types';

// MUR-07 : poussée passive du sol avant sur le voile. Cas de référence §3 (projet « mur3 3 », cas 1 : 1,4D + 1,5H).
const GEO: WallGeometry = { wallType: 'cantilever', hMur: 4.0, epStem: 0.35, ePiedAv: 0.8, ePiedAr: 1.75, epBase: 0.35 };
const SOIL: SoilProperties = {
  gamma: 19, phi: 29, hr: 3.5, hSolAv: 1.35, foundation: { gamma: 19, phi: 29 },
  bearingSoil: { phi: 30, contact: 'cast', deltaB: 30 }, qAllowable_SLS: 300, qUltimate_ULS: 600,
  hasWaterTable: false, gamma_w: 9.81, geotechLevel: 'typical', psi: 0.9,
  methodConfig: { ...DEFAULT_SOIL_METHOD_CONFIG, seismicMethod: 'none' },
  frost: { deduct: false, df: 0, noDf: 'zero' }
};
const LOADS: LoadsConfig = { surcharge: 0, surchargeType: 'L', surchargeAval: 0, additionalLoads: [], gammaM: 1, gammaF: 1 };
const run = (choice?: StemPassiveChoice, soil: SoilProperties = SOIL, geo: WallGeometry = GEO, loads: LoadsConfig = LOADS) =>
  analyzeRetainingWall(geo, { ...soil, stemPassive: choice }, loads, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
const near = (a: number, b: number, tol = 0.05) => expect(Math.abs(a - b), `obtenu ${a}, attendu ${b}`).toBeLessThanOrEqual(tol);
const case1 = (r: ReturnType<typeof run>) => r.combinations.find(c => c.caseNo === 1)!;

describe('MUR-07 §3 : cas de référence (cas 1)', () => {
  // La fiche donne 70,71 pour la poussée active seule ; le calcul exact 1,5 × Ka × γ × 3,5³ / 6 donne 70,663 (écart 0,05 de la fiche).
  // Les valeurs de la fiche sont donc vérifiées à ±0,06 ; le calcul exact à ±0,005.
  const KA = Math.pow(Math.tan(Math.PI / 4 - (29 * Math.PI) / 360), 2);
  const KP = Math.pow(Math.tan(Math.PI / 4 + (29 * Math.PI) / 360), 2);
  const MA = 1.5 * KA * 19 * Math.pow(3.5, 3) / 6;
  const MP = KP * 19 * Math.pow(1.35, 3) / 6;
  it('M_f au pied du voile, choix 0 à 3 : valeurs corrigées 70,66 / 48,21 / 60,56 / 36,98 (±0,05) et calcul exact', () => {
    const foot = (ch: StemPassiveChoice) => case1(run(ch)).stem_passive.foot_net;
    near(foot(0), 70.66); near(foot(1), 48.21); near(foot(2), 60.56); near(foot(3), 36.98);
    near(foot(0), MA, 0.005); near(foot(1), MA - MP, 0.005); near(foot(2), MA - 0.45 * MP, 0.005); near(foot(3), MA - 1.5 * MP, 0.005);
  });
  it('M_f de dimensionnement (maximum le long du voile) : égal au pied aux choix 0 à 2 ; choix 3 : maximum au-dessus du pied', () => {
    near(case1(run(0)).mur_Mf, MA, 0.005); near(case1(run(1)).mur_Mf, MA - MP, 0.005); near(case1(run(2)).mur_Mf, MA - 0.45 * MP, 0.005);
    expect(case1(run(3)).mur_Mf).toBeGreaterThanOrEqual(MA - 1.5 * MP - 1e-9); // V net change de signe : maximum entre le pied et le haut de la zone passive
  });
  it('choix 3 : maximum le long du voile 38,41 (±0,05) et effort tranchant net au pied −14,28 (±0,05)', () => {
    const c = case1(run(3));
    near(c.mur_Mf, 38.41); near(c.stem_passive.foot_shear, -14.28);
    near(c.stem_lateral.butee_voile, -1.5 * 49.899, 0.05);
    near(c.stem_lateral.total, c.stem_passive.foot_shear, 1e-6); // somme des colonnes = V net au pied
    near(c.stem_lateral.autres, 0, 1e-9);
  });
  it('résultante 49,90 kN/m et moment nominal 22,454 kN·m/m (choix 3)', () => {
    const p = case1(run(3)).stem_passive;
    near(p.P_nominal, 49.90, 0.01); near(p.M_nominal, 22.454, 0.005);
    near(p.factor, 1.5, 1e-9);
    near(p.Mf_choices[0], MA, 0.005); near(p.Mf_choices[1], MA - MP, 0.005); near(p.Mf_choices[2], MA - 0.45 * MP, 0.005);
  });
  it('champ absent = choix 3 (D1)', () => {
    const r = run(undefined);
    expect(r.stemPassive.choice).toBe(3);
    near(case1(r).stem_passive.foot_net, MA - 1.5 * MP, 0.005);
  });
  it('choix 0 : aucune charge ajoutée', () => {
    const c = case1(run(0));
    expect(c.stem_passive.factor).toBe(0);
    near(c.stem_lateral.autres, 0, 1e-9);
  });
  it('stabilité identique entre les 4 choix (D2)', () => {
    const base = run(0).combinations;
    for (const ch of [1, 2, 3] as StemPassiveChoice[]) {
      run(ch).combinations.forEach((c, i) => {
        expect(c.FOS_sliding).toBe(base[i].FOS_sliding);
        expect(c.FOS_overturning).toBe(base[i].FOS_overturning);
        expect(c.q_toe).toBe(base[i].q_toe);
        expect(c.Pp_used).toBe(base[i].Pp_used);
        expect(c.toe_Mf).toBe(base[i].toe_Mf);
        expect(c.heel_Mf).toBe(base[i].heel_Mf);
      });
    }
  });
});

const MA0 = 1.5 * Math.pow(Math.tan(Math.PI / 4 - (29 * Math.PI) / 360), 2) * 19 * Math.pow(3.5, 3) / 6;
describe('MUR-07 : gel, nappe, séisme, ÉLS, face tendue', () => {
  it('gel : zone gelée retirée (h_v = hSolAv − z_gel) ; df non saisie -> butée nulle sur le voile', () => {
    const r = run(1, { ...SOIL, frost: { deduct: true, df: 0.5, noDf: 'zero' } });
    near(r.stemPassive.hv, 0.85, 1e-9);
    near(case1(r).stem_passive.P_nominal, 0.5 * r.K_passive * 19 * (1.35 ** 2 - 0.5 ** 2), 1e-6);
    const r0 = run(1, { ...SOIL, frost: { deduct: true, df: 0, noDf: 'zero' } });
    expect(r0.stemPassive.active).toBe(false);
    near(case1(r0).mur_Mf, MA0, 0.005);
  });
  it('nappe aval dans la zone : γ′ sous la nappe (moins de butée que sec)', () => {
    const wet = run(1, { ...SOIL, hasWaterTable: true, waterTableHeight: 1.0 });
    expect(wet.stemPassive.zDry).toBeLessThan(1.35);
    expect(case1(wet).stem_passive.P_nominal).toBeLessThan(49.90);
    expect(case1(wet).stem_passive.P_nominal).toBeGreaterThan(0);
  });
  it('séisme (cas 5) : option none -> pression passive du voile nulle (D3) ; kpe -> non nulle, facteur 1,0', () => {
    const seis = (passive: 'none' | 'kpe') => run(3, { ...SOIL, methodConfig: { ...DEFAULT_SOIL_METHOD_CONFIG, seismicMethod: 'mononobe_okabe', pga: 0.15, seismicPassive: passive } });
    const c5n = seis('none').combinations.filter(c => c.caseNo === 5);
    expect(c5n.length).toBeGreaterThan(0);
    c5n.forEach(c => { expect(c.stem_passive.P_nominal).toBe(0); expect(c.stem_passive.factor).toBe(0); expect(c.stem_passive.seismic_null).toBe(true); expect(c.mur_Mf).toBeGreaterThan(0); });
    const c5k = seis('kpe').combinations.filter(c => c.caseNo === 5);
    c5k.forEach(c => { expect(c.stem_passive.P_nominal).toBeGreaterThan(0); near(c.stem_passive.factor, 1.0, 1e-9); expect(c.stem_passive.P_nominal).toBeLessThanOrEqual(49.9 + 1e-6); });
  });
  it('ÉLS (D4) : facteur 1,0 aux choix 1 à 3, 0 au choix 0', () => {
    const sls = (ch: StemPassiveChoice) => run(ch).combinations.filter(c => c.type === 'SLS').map(c => c.stem_passive.factor);
    expect(sls(0).every(f => f === 0)).toBe(true);
    for (const ch of [1, 2, 3] as StemPassiveChoice[]) expect(sls(ch).every(f => f === 1)).toBe(true);
  });
  it('ÉLU choix 2 : facteur Ψ·φp = 0,9 × 0,5', () => {
    near(case1(run(2)).stem_passive.factor, 0.45, 1e-9);
  });
  it('D6 : moment net de signe inverse au pied -> avis face avant tendue', () => {
    const tall = run(3, { ...SOIL, hr: 1.0, hSolAv: 3.5 });
    expect(tall.notices.some(n => n.includes('face avant tendue'))).toBe(true);
    expect(run(3).notices.some(n => n.includes('face avant tendue'))).toBe(false);
  });
});

describe('MUR-07 : projet (D1) et onglet Étapes (D5)', () => {
  it('projet par défaut : choix 3 ; ancien fichier sans le champ : choix 3 et avis de chargement', () => {
    expect(defaultProject().soil.stemPassive).toBe(3);
    const r = parseProjectText(JSON.stringify({ format: 'geowall-project', version: 1, soil: { phi: 30 } }));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.state.soil.stemPassive).toBe(3); expect(r.notices).toEqual([STEM_PASSIVE_LOAD_NOTICE]); }
  });
  it('fichier avec le champ : conservé, sans avis ; valeur hors 0-3 refusée ; aller-retour', () => {
    const r = parseProjectText(JSON.stringify({ format: 'geowall-project', version: 1, soil: { stemPassive: 0 } }));
    expect(r.ok && r.state.soil.stemPassive).toBe(0);
    expect(r.ok && r.notices).toBeFalsy();
    expect(parseProjectText(JSON.stringify({ format: 'geowall-project', version: 1, soil: { stemPassive: 7 } })).ok).toBe(false);
    const s = defaultProject(); s.soil.stemPassive = 2;
    const back = parseProjectText(projectToJson(s));
    expect(back.ok && back.state.soil.stemPassive).toBe(2);
  });
  it('nappe aval : deux couches γ / γ′ (P₁ + P₂ = moteur) affichées en chiffres', () => {
    const r = run(3, { ...SOIL, hasWaterTable: true, waterTableHeight: 1.0 });
    const q = buildStemPassiveEq(r, SOIL.hSolAv);
    expect(q.layered).toBe(true);
    near(q.P1 + q.P2, q.P, 1e-6); near(q.M1 + q.M2, q.M, 1e-6);
    const html = renderToString(React.createElement(StemPassiveSteps, { result: r, hSolAv: SOIL.hSolAv }));
    expect(html).toContain(fr(q.P1, 2)); expect(html).toContain(fr(q.P2, 2)); expect(html).toContain(fr(q.M1, 2)); expect(html).toContain(fr(q.M2, 2));
    expect(html).toContain('couche γ′');
  });
  it('tableau des 4 choix : enveloppe ÉLU de chaque choix avec sa combinaison gouvernante (moteur)', () => {
    const r = run(3);
    const q = buildStemPassiveEq(r, SOIL.hSolAv);
    for (const ch of [0, 1, 2, 3] as const) {
      const uls = r.combinations.filter(c => c.type === 'ULS');
      const max = Math.max(...uls.map(c => c.stem_passive.Mf_choices[ch]));
      near(q.table[ch].Mf, max, 1e-9);
      expect(uls.find(c => c.combName === q.table[ch].comb)!.stem_passive.Mf_choices[ch]).toBe(max);
    }
    // le choix 3 gouverne l'enveloppe actuelle du voile
    near(q.table[3].Mf, r.stemMaxMoment, 1e-9);
  });
  it('Étapes : équations et tableau des 4 choix = valeurs du moteur', () => {
    const r = run(3);
    const q = buildStemPassiveEq(r, SOIL.hSolAv);
    near(0.5 * q.Kp_eff * q.gamma * (q.hSolAv ** 2 - q.t0 ** 2), q.P, 1e-6);
    near(q.Kp_eff * q.gamma * (q.hSolAv * (q.hSolAv ** 2 - q.t0 ** 2) / 2 - (q.hSolAv ** 3 - q.t0 ** 3) / 3), q.M, 1e-6);
    near(q.Mactive - q.factor * q.M, q.Mnet, 1e-6);
    const html = renderToString(React.createElement(StemPassiveSteps, { result: r, hSolAv: SOIL.hSolAv }));
    for (const v of [fr(q.hv), fr(q.P, 2), fr(q.M, 2), fr(q.factor, 3), fr(q.Mnet, 2)]) expect(html).toContain(v);
    for (const t of q.table) expect(html).toContain(fr(t.Mf, 2));
    expect(html).not.toContain('NaN');
  });
});

describe('MUR-07 : effet sur le projet par défaut', () => {
  const d = defaultProject();
  const go = (ch: StemPassiveChoice, frost: SoilProperties['frost']) => analyzeRetainingWall(d.geo, { ...d.soil, frost, stemPassive: ch }, d.loads, d.conc, d.rebarConfig);
  const gov = (r: ReturnType<typeof go>) => r.stemDeflection.rows[r.stemDeflection.governingIndex];
  it('df non saisie (défaut) : butée nulle, donc aucun effet sur le voile', () => {
    const a = go(0, d.soil.frost); const b = go(3, d.soil.frost);
    expect(b.stemPassive.hv).toBe(0);
    expect(b.stemMaxMoment).toBe(a.stemMaxMoment);
    expect(b.concreteDesign.mur_interieur.As_req).toBe(a.concreteDesign.mur_interieur.As_req);
    expect(gov(b).deltaLT).toBe(gov(a).deltaLT);
  });
  it('df saisie (1,2 m) ou gel non déduit : le choix 3 réduit M_f, As requise et la flèche', () => {
    for (const frost of [{ deduct: true, df: 1.2, noDf: 'zero' as const }, { deduct: false, df: 0, noDf: 'zero' as const }]) {
      const a = go(0, frost); const b = go(3, frost);
      expect(b.stemMaxMoment).toBeLessThan(a.stemMaxMoment);
      expect(b.concreteDesign.mur_interieur.As_req!).toBeLessThanOrEqual(a.concreteDesign.mur_interieur.As_req! + 1e-9);
      expect(gov(b).deltaLT).toBeLessThan(gov(a).deltaLT);
    }
  });
});
