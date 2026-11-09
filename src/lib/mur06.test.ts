import { describe, it, expect } from 'vitest';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG } from './analysis';
import type { LoadsConfig, SoilProperties, WallGeometry } from './types';

// MUR-06 §5 : cas de référence (projet « mur3 3 »). Tolérance 0,1 kN/m. Calcul manuel de la fiche : 21,0 kN/m × 1,5 = 31,5 ; 0,9·0,8·ΣV·tan 30°.
const GEO: WallGeometry = { wallType: 'cantilever', hMur: 4.0, epStem: 0.35, ePiedAv: 0.8, ePiedAr: 1.75, epBase: 0.35 };
const SOIL: SoilProperties = {
  gamma: 19, phi: 29, cohesion: 0, hr: 3.5, hSolAv: 1.35, qAllowable_SLS: 130, qUltimate_ULS: 392,
  bearingSoil: { uscs: 'SW', phi: 30, deltaB: 30, contact: 'cast' },
  methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'mononobe_okabe', pga: 0.2576, seismicPassive: 'kpe', deltaFrictionRatio: 0.667 } as SoilProperties['methodConfig'],
  hasWaterTable: false, gamma_w: 9.81, geotechLevel: 'typical', psi: 0.9, quFactored: false,
  frost: { deduct: false, df: 0, noDf: 'zero' },
};
const loads = (on: boolean | undefined): LoadsConfig => ({
  surcharge: 12, surchargeType: 'L', surchargeAval: 0, additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0.22,
  ...(on === undefined ? {} : { countStabilizingVariable: on }),
});
const conc = { ...DEFAULT_CONCRETE_PROPS, gamma_c: 23.54 };
const run = (on: boolean | undefined) => analyzeRetainingWall(GEO, SOIL, loads(on), conc, DEFAULT_REBAR_CONFIG);
const near = (a: number, b: number, label: string) => expect(Math.abs(a - b), `${label} obtenu ${a}, attendu ${b}`).toBeLessThanOrEqual(0.1);
const nonSeis = (r: ReturnType<typeof run>, D: number, S = 0, W = 0) =>
  r.combinations.find(c => c.type === 'ULS' && c.caseNo === 2 && c.factors.D === D && c.factors.L === 1.5 && c.factors.S === S && c.factors.W === W && !(c.factors.E))!;

describe('MUR-06 §5 : cas de référence', () => {
  it('option cochée (défaut, champ absent ou true) : 205,9 / 85,6 / 277,7 / ELS S1 214,7', () => {
    for (const on of [undefined, true]) {
      const r = run(on);
      const a = nonSeis(r, 0.9), b = nonSeis(r, 1.25);
      const s1 = r.combinations.find(c => c.combName.includes('ELS S1 '))!;
      console.log('cochée', on, a.sumV_min, a.Rf_friction, b.sumV_min, s1.sumV_min);
      near(a.sumV_min, 205.9, '0,9D+1,5L ΣV'); near(a.Rf_friction, 85.6, 'frottement 0,9D'); near(b.sumV_min, 277.7, '1,25D+1,5L ΣV'); near(s1.sumV_min, 214.7, 'S1 ΣV');
    }
  });
  it('option décochée : 174,4 / 72,5 / 246,2 / 193,7', () => {
    const r = run(false);
    const a = nonSeis(r, 0.9), b = nonSeis(r, 1.25);
    const s1 = r.combinations.find(c => c.combName.includes('ELS S1 '))!;
    console.log('décochée', a.sumV_min, a.Rf_friction, b.sumV_min, s1.sumV_min);
    near(a.sumV_min, 174.4, 'ΣV'); near(a.Rf_friction, 72.5, 'frottement'); near(b.sumV_min, 246.2, 'ΣV 1,25D'); near(s1.sumV_min, 193.7, 'S1');
  });
  it('séisme E inchangé (D4) : combinaisons avec E identiques entre les deux options sauf le poids de L', () => {
    const on = run(true), off = run(false);
    const e = (r: typeof on) => r.combinations.filter(c => (c.factors.E ?? 0) > 0 && (c.factors.L ?? 0) === 0 && (c.factors.S ?? 0) === 0);
    expect(e(on).length).toBeGreaterThan(0);
    e(on).forEach((c, i) => expect(c.sumV_min).toBeCloseTo(e(off)[i].sumV_min, 9));
  });
});

describe('MUR-06 : cas 5 sismique avec 0,5L', () => {
  it('poids de la surcharge compté à 0,5 (cochée) ; E et le reste inchangés', () => {
    const on = run(true), off = run(false);
    const pick = (r: typeof on) => r.combinations.filter(c => c.type === 'ULS' && c.caseNo === 5 && (c.factors.E ?? 0) > 0 && c.factors.L === 0.5);
    const a = pick(on), b = pick(off);
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBe(b.length);
    a.forEach((c, i) => {
      expect(c.combName).toBe(b[i].combName);
      // 0,5 × q·L_talon = 0,5 × 12 × 1,75 = 10,5 kN/m ; la composante E (kv, inertie) n'est pas modifiée
      expect(c.sumV_min - b[i].sumV_min, c.combName).toBeCloseTo(0.5 * 12 * 1.75, 6);
      expect(c.sumH, c.combName).toBeCloseTo(b[i].sumH, 9);
    });
    // les combinaisons E sans L (accompagnement nul) sont identiques
    const e0 = (r: typeof on) => r.combinations.filter(c => c.caseNo === 5 && (c.factors.E ?? 0) > 0 && c.factors.L === 0);
    e0(on).forEach((c, i) => expect(c.sumV_min).toBeCloseTo(e0(off)[i].sumV_min, 9));
  });
});

describe('MUR-06 D6 : surcharge aval, efforts du patin (ÉLS S1 = 1D + 1L + 1H, sans nappe, hSolAv = 0)', () => {
  const soil = { ...SOIL, hSolAv: 0 };
  const QAV = 5;
  const mk = (on: boolean, qav: number) => analyzeRetainingWall(GEO, soil, { ...loads(on), surcharge: 0, kv: 0, surchargeAval: qav }, conc, DEFAULT_REBAR_CONFIG);
  const s1 = (r: ReturnType<typeof mk>) => r.combinations.find(c => c.combName.includes('ELS S1 '))!;
  it('décochée : ancien calcul = max des états Z (sans q_av) et F (avec q_av), charge au patin à 0 dans le terme « down »', () => {
    const B = GEO.ePiedAv + GEO.epStem + GEO.ePiedAr, x = GEO.ePiedAv;
    const down0 = conc.gamma_c * GEO.epBase; // facteur 0 : q_av absent de down
    const eff = (c: { q_toe: number; q_heel: number }) => {
      const slope = (c.q_heel - c.q_toe) / B;
      return { V: Math.abs(c.q_toe * x + slope * x * x / 2 - down0 * x), M: Math.abs(c.q_toe * x * x / 2 + slope * x ** 3 / 6 - down0 * x * x / 2) };
    };
    const off = s1(mk(false, QAV)), z = eff(s1(mk(false, 0))), f = eff(s1(mk(true, QAV)));
    expect(off.toe_Vf).toBeCloseTo(Math.max(z.V, f.V), 6);
    expect(off.toe_Mf).toBeCloseTo(Math.max(z.M, f.M), 6);
  });
  it('cochée : V et M = pression linéaire − (γc·ep + q_av·1,0)·x, calcul à la main', () => {
    const c = s1(mk(true, QAV));
    expect(c.distributionCase).toBe('Cas 2');
    const B = GEO.ePiedAv + GEO.epStem + GEO.ePiedAr, x = GEO.ePiedAv;
    const down = conc.gamma_c * GEO.epBase + QAV * 1.0;
    const slope = (c.q_heel - c.q_toe) / B;
    const V = c.q_toe * x + slope * x * x / 2 - down * x;
    const M = c.q_toe * x * x / 2 + slope * x ** 3 / 6 - down * x * x / 2;
    expect(c.toe_Vf).toBeCloseTo(Math.abs(V), 6);
    expect(c.toe_Mf).toBeCloseTo(Math.abs(M), 6);
    // la surcharge aval augmente ΣV de 1,0 × q_av × L_patin
    expect(c.sumV_max - s1(mk(true, 0)).sumV_max).toBeCloseTo(QAV * GEO.ePiedAv, 6);
  });
});
