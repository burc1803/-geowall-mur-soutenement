import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { OfficialNoteDeCalcul } from './OfficialNoteDeCalcul';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG } from '../lib/analysis';
import { fr } from '../lib/theoryEquations';
import type { LoadsConfig, SoilProperties, WallGeometry } from '../lib/types';

/**
 * Présentation de la note de calcul officielle (aucun calcul n'est testé ici) : une seule police, nombres à virgule décimale,
 * numérotation des titres, tableaux, figures et équations, symboles en italique avec indice droit, langue française.
 * Les tests de calcul restent dans les autres fichiers ; ceux-ci lisent le HTML rendu par la note.
 */
const DELTA_B_MU055 = (Math.atan(0.55) * 180) / Math.PI;
const GEO: WallGeometry = { wallType: 'cantilever', hMur: 3.0, epStem: 0.3, ePiedAv: 0.6, ePiedAr: 1.5, epBase: 0.4 };
const SOIL: SoilProperties = {
  gamma: 19, phi: 32, cohesion: 0, bearingSoil: { phi: 32, contact: 'cast', deltaB: DELTA_B_MU055 }, hSolAv: 0, qAllowable_SLS: 300, qUltimate_ULS: 300,
  hasWaterTable: false, gamma_w: 9.81, stabilityCriterion: 'eccentricity', geotechLevel: 'typical', psi: 1.0,
  methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'none', pga: 0.15, deltaFrictionRatio: 0.667 }
};
const LOADS: LoadsConfig = { surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };
// Cas riche : sol avant, nappe, séisme Mononobe-Okabe, surcharge et charge de tête (tous les tableaux conditionnels apparaissent)
const GEO2: WallGeometry = { wallType: 'cantilever', hMur: 3.8, epStem: 0.35, ePiedAv: 0.8, ePiedAr: 1.75, epBase: 0.35 };
const SOIL2: SoilProperties = {
  ...SOIL, hSolAv: 1.5, hasWaterTable: true, waterTableHeight: 2.5, qAllowable_SLS: 130, qUltimate_ULS: 392,
  methodConfig: { activeMethod: 'coulomb', passiveMethod: 'rankine', seismicMethod: 'mononobe_okabe', pga: 0.15, deltaFrictionRatio: 0.667 }
};
const LOADS2: LoadsConfig = { ...LOADS, surcharge: 12, pointLoadTop: { enabled: true, Fy: 12, Fx: 0, name: 'Charge Tête' } };

const render = (geo: WallGeometry, soil: SoilProperties, loads: LoadsConfig) => {
  const result = analyzeRetainingWall(geo, soil, loads, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
  const html = renderToString(<OfficialNoteDeCalcul geo={geo} soil={soil} conc={DEFAULT_CONCRETE_PROPS} result={result} loads={loads} />).replace(/<!-- -->/g, '');
  return { result, html };
};
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"');
const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, ''));

const CASES = [
  { name: 'cas de base (Rankine, sans séisme)', ...render(GEO, SOIL, LOADS) },
  { name: 'cas riche (Coulomb, Mononobe-Okabe, nappe, surcharge)', ...render(GEO2, SOIL2, LOADS2) },
];

describe('Note de calcul : format des nombres (virgule décimale, espace fine)', () => {
  it('fr : virgule décimale et espace fine insécable entre les milliers', () => {
    expect(fr(24647.5, 1)).toBe('24 647,5');
    expect(fr(1234, 0)).toBe('1 234');
    expect(fr(999.5, 1)).toBe('999,5');
    expect(fr(-1234.5, 1)).toBe('-1 234,5');
    expect(fr(0.35, 2)).toBe('0,35');
  });
  for (const c of CASES) {
    it(`${c.name} : aucun nombre de la note ne contient de point décimal`, () => {
      const t = textOf(c.html);
      // 1) après un signe égal ; 2) devant une unité ; 3) cellule de tableau qui n'est qu'un nombre (versions et articles exclus : ils n'ont ni signe égal ni unité)
      expect(t.match(/=\s*[−-]?\d+\.\d+/g) ?? []).toEqual([]);
      expect(t.match(/\d+\.\d+[   ]?(?:kPa|kN|MPa|mm|°|%|m\b|g\b)/g) ?? []).toEqual([]);
      const cells = [...c.html.matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/g)].map(m => textOf(m[1]).trim());
      expect(cells.filter(x => /^[−-]?\d+\.\d+$/.test(x))).toEqual([]);
      // les facteurs de charge et les noms de combinaisons du moteur (1.25D) sont affichés avec la virgule
      expect(t).toContain('1,25D');
      expect(t).not.toMatch(/\b1\.25D|\b0\.9D|\b1\.5H/);
    });
  }
});

describe('Note de calcul : une seule police, quatre tailles', () => {
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
  it('la feuille de style impose une pile serif système unique à tout #note-officielle (aucune police téléchargée)', () => {
    expect(css.match(/--note-font:/g)?.length).toBe(1);
    expect(css).toMatch(/--note-font:\s*"Cambria",\s*"Cambria Math",\s*"Times New Roman",\s*Times,\s*serif;/);
    expect(css).toMatch(/#note-officielle,\s*#note-officielle \* \{\s*font-family: var\(--note-font\) !important;/);
    // toute déclaration font-family : celle de la note (var) ou celle du pied de page @page ; jamais de monospace ni de sans-serif
    const decls = [...css.matchAll(/font-family:\s*([^;]+);/g)].map(m => m[1].trim());
    expect(decls.filter(d => !d.startsWith('var(--note-font)') && !d.startsWith('"Cambria"'))).toEqual([]);
    expect(css).not.toMatch(/monospace|ui-sans|sans-serif|@font-face|@import url/);
    expect(css).toMatch(/font-variant-numeric:\s*tabular-nums/);
  });
  it('quatre tailles seulement (titre de section, sous-titre, texte courant, petit), à l\'écran et à l\'impression', () => {
    const vars = [...css.matchAll(/--fs-(\w+):\s*([\d.]+(?:px|pt));/g)].map(m => m[1]);
    expect(vars.filter(v => v === 'h2')).toHaveLength(2);
    expect(vars.filter(v => v === 'h3')).toHaveLength(2);
    expect(vars.filter(v => v === 'body')).toHaveLength(2);
    expect(vars.filter(v => v === 'small')).toHaveLength(2);
    expect(vars).toHaveLength(8);
    expect(css).toMatch(/--fs-body:\s*11px/);
    expect(css).toMatch(/--fs-body:\s*9\.5pt/);
  });
  it('le conteneur #note-officielle est présent et aucun style en ligne ne définit une autre police', () => {
    // La police calculée n'est pas mesurable sans navigateur (aucun jsdom dans le projet) : mesurée à part dans Chrome (voir le rapport).
    for (const c of CASES) {
      expect(c.html).toContain('id="note-officielle"');
      expect(c.html).not.toMatch(/style="[^"]*font-family/);
      expect(c.html).not.toMatch(/font-family="/);
    }
  });
  it('la règle @page Letter (marges 12 mm) et le numéro de page sont conservés', () => {
    expect(css).toMatch(/@page \{\s*size: letter;\s*margin: 12mm 12mm 14mm 12mm;/);
    expect(css).toMatch(/content: "Page " counter\(page\) " \/ " counter\(pages\)/);
  });
});

describe('Note de calcul : hiérarchie, légendes et numérotation', () => {
  for (const c of CASES) {
    const t = textOf(c.html);
    it(`${c.name} : titres « 1. », « 1.1 », « 1.1.1 » seulement`, () => {
      const h2 = [...c.html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map(m => textOf(m[1]));
      const h3 = [...c.html.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map(m => textOf(m[1]));
      expect(h2.length).toBeGreaterThanOrEqual(6);
      for (const h of h2) expect(h).toMatch(/^\d+\. \S/);
      for (const h of h3.filter(x => !x.startsWith('Note de calcul officielle'))) expect(h).toMatch(/^\d+\.\d+ \S/);
      for (const h of [...h2, ...h3]) { expect(h).not.toMatch(/\b\d+\.\d+[a-z]\b/); expect(h).not.toMatch(/\b4\.0\b/); }
      expect(t).not.toMatch(/\b[1-6]\.[1-9][abc]\b/);
    });
    it(`${c.name} : légendes « Tableau s.n — titre » consécutives par section, en casse de phrase`, () => {
      const caps = [...c.html.matchAll(/<div class="note-caption"><span>Tableau (\d+)\.(\d+) — <\/span>(.*?)<\/div>/g)].map(m => ({ s: Number(m[1]), n: Number(m[2]), title: textOf(m[3]) }));
      expect(caps.length).toBeGreaterThanOrEqual(25);
      let prev = { s: 0, n: 0 };
      for (const k of caps) {
        if (k.s === prev.s) expect(k.n, `Tableau ${k.s}.${k.n}`).toBe(prev.n + 1);
        else { expect(k.s, `section du tableau ${k.s}.${k.n}`).toBeGreaterThan(prev.s); expect(k.n).toBe(1); }
        prev = k;
        expect(k.title, k.title).not.toBe(k.title.toUpperCase());
        expect(k.title.length).toBeGreaterThan(5);
      }
      // les renvois internes suivent la numérotation (tableau des charges déstabilisantes)
      const destab = caps.find(k => k.title === 'Charges déstabilisantes')!;
      expect(t).toContain(`leur poussée horizontale figure au tableau ${destab.s}.${destab.n}`);
      expect(t).not.toMatch(/tableau 2[ab]\b|Tableau 1[abc]\b|tableau 1c/);
    });
    it(`${c.name} : figures « Figure s.n — titre », légende sous la figure`, () => {
      const figs = [...c.html.matchAll(/<figure class="note-fig">([\s\S]*?)<figcaption class="note-caption-fig"><span>Figure (\d+\.\d+) — <\/span>(.*?)<\/figcaption><\/figure>/g)];
      expect(figs.map(m => m[2])).toEqual(['1.1', '4.1']);
      expect(figs[0][1]).toContain('<svg');
      expect(textOf(figs[1][3])).toContain('Diagramme des pressions au sol');
    });
    it(`${c.name} : équations numérotées (4.1), (4.2)… dans le gabarit formule / valeurs / résultat`, () => {
      const nos = [...c.html.matchAll(/>\((4\.\d+)\)<\/div>/g)].map(m => m[1]);
      expect(nos).toEqual(Array.from({ length: 13 }, (_, i) => `4.${i + 1}`));
      expect(c.html.match(/class="note-eq /g)?.length).toBe(13);
    });
  }
});

describe('Note de calcul : symboles, langue et contenu conservé', () => {
  const sym = (n: string, s: string) => `<i>${n}</i><sub class="text-[0.75em]">${s}</sub>`;
  for (const c of CASES) {
    it(`${c.name} : symboles en italique avec indice droit (Lp, Lt, hs,av, hp, ts, Ka, Kp, φgu, φov, φgs, φp, Mf, Vf, Mr, ΔLT)`, () => {
      for (const [n, s] of [['L', 'p'], ['L', 't'], ['h', 's,av'], ['h', 'p'], ['t', 's'], ['K', 'a'], ['K', 'p'], ['φ', 'gu'], ['φ', 'ov'], ['φ', 'gs'], ['φ', 'p'], ['M', 'f'], ['V', 'f'], ['M', 'r'], ['Δ', 'LT'], ['f', 'y']]) {
        expect(c.html, `${n}${s}`).toContain(sym(n, s));
      }
      // plus de symboles en texte droit ni de soulignés dans le texte
      const t = textOf(c.html);
      expect(t).not.toMatch(/\bh_r\b|\bt_s\b|φ_ov|φ_gs|φ_gu|\bH_p\b|\bK_p\b|\bK_a\b|\bh_pass\b/);
      expect(c.html).not.toMatch(/>(?:Lp|Lt|hp|ts|Ka|Kp|φgu|φov|φgs|φp)</);
    });
    it(`${c.name} : plus de mentions anglaises des sources`, () => {
      const t = textOf(c.html);
      expect(t).not.toMatch(/Retaining systems|Shallow foundations|Base sliding|Passive resistance|Sliding cohesive|Overturning\)|Bearing\)|if any at all|\(cantilever\)|Gov\. /);
      expect(t).toContain('systèmes de soutènement');
    });
    it(`${c.name} : mentions À CONFIRMER, NON VÉRIFIÉ, Commentaire A ¶40, MUR-06 et MUR-07 conservées`, () => {
      const t = textOf(c.html);
      for (const m of ['À CONFIRMER', 'NON VÉRIFIÉ', 'Commentaire A', '¶40', 'MUR-06', 'MUR-07', 'Poussée passive sur le voile']) expect(t, m).toContain(m);
      expect(t).not.toContain('NaN');
      expect(t).not.toContain('undefined');
    });
  }
  it('cas riche : KAE (Mononobe-Okabe), tableau du séisme et valeurs du moteur lues telles quelles', () => {
    const c = CASES[1];
    expect(c.html).toContain(sym('K', 'AE'));
    expect(textOf(c.html)).toContain('Séisme : coefficients et incréments de poussée par signe de kv');
    const gs = c.result.governingSliding;
    expect(textOf(c.html)).toContain(`${fr(gs.Fs, 1)} kN/m`);
    expect(textOf(c.html)).toContain(fr(c.result.governingBearing.q_design, 1));
  });
  it('cartouche : projet, date, logiciel, normes, préparé par / vérifié par, sans majuscules', () => {
    const t = textOf(CASES[0].html);
    for (const m of ['Projet', 'Date', 'Logiciel', 'Normes', 'Préparé par', 'Vérifié par', 'Note de calcul — mur de soutènement']) expect(t, m).toContain(m);
    expect(t).not.toContain('RAPPORT D');
    expect(t).not.toContain('PROJET :');
    expect(CASES[0].html).toContain('data-testid="note-cartouche"');
  });
});
