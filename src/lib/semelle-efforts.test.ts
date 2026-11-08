import { describe, it, expect } from 'vitest';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG, DEFAULT_SOIL_METHOD_CONFIG } from './analysis';
import type { LoadsConfig, SoilProperties, WallGeometry } from './types';

// MUR-04 : δb saisi = atan 0,55 (ancien μ de MUR-02) pour que les cas de référence restent reproductibles
const DELTA_B_MU055 = (Math.atan(0.55) * 180) / Math.PI;
// Efforts du patin et du talon : états à résultante hors base exclus, intégration exacte de la pression linéaire par morceaux (MUR-02 §5)
const GEO_G: WallGeometry = { wallType: 'cantilever', hMur: 3.0, epStem: 0.3, ePiedAv: 0.6, ePiedAr: 1.5, epBase: 0.4 };
const SOIL_G1: SoilProperties = {
  gamma: 19, phi: 32, cohesion: 0, bearingSoil: { phi: 32, contact: 'cast', deltaB: DELTA_B_MU055 }, hSolAv: 0, qAllowable_SLS: 300, qUltimate_ULS: 300,
  hasWaterTable: false, gamma_w: 9.81, stabilityCriterion: 'moments', geotechLevel: 'typical', psi: 1.0,
  methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'none', pga: 0.15, deltaFrictionRatio: 0.667 }
};
const SOIL_G2: SoilProperties = { ...SOIL_G1, methodConfig: { ...SOIL_G1.methodConfig!, seismicMethod: 'mononobe_okabe' } };
const LOADS: LoadsConfig = { surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };

const GEO_D: WallGeometry = { wallType: 'cantilever', hMur: 3.8, epStem: 0.35, ePiedAv: 0.8, ePiedAr: 1.75, epBase: 0.35 };
const SOIL_D: SoilProperties = {
  gamma: 19, gamma_prime: 9.2, phi: 29, cohesion: 0, bearingSoil: { phi: 29, contact: 'cast', deltaB: DELTA_B_MU055 }, hSolAv: 1.5, qAllowable_SLS: 130, qUltimate_ULS: 392,
  methodConfig: DEFAULT_SOIL_METHOD_CONFIG, hasWaterTable: true, waterTableHeight: 2.5, gamma_w: 9.81, geotechLevel: 'typical', psi: 1.0, quFactored: false,
  frost: { deduct: true, df: 0, noDf: 'zero' }
};
const LOADS_D: LoadsConfig = { surcharge: 12, surchargeType: 'L', surchargeAval: 0, additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };

const run = (geo: WallGeometry, soil: SoilProperties, loads: LoadsConfig) => analyzeRetainingWall(geo, soil, loads, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
const close = (a: number, b: number, tol: number, label = '') => expect(Math.abs(a - b), `${label} obtenu ${a}, attendu ${b}`).toBeLessThanOrEqual(Math.abs(b) * tol);

describe('Efforts du patin et du talon : états hors base exclus', () => {
  it("cas D (3,8 m, nappe, surcharge 12 kPa ; ce n'est pas le défaut de l'application) : combinaisons tracées valides, aucune valeur fictive", () => {
    const r = run(GEO_D, SOIL_D, LOADS_D);
    expect(r.combinations.some(c => c.type === 'ULS' && c.outside_base)).toBe(true); // le cas fictif existe bien
    expect(r.governingToe.slab_ok).toBe(true);
    expect(r.governingHeel.slab_ok).toBe(true);
    expect(r.toeForcesComb).toBe(r.governingToe.combName);
    expect(r.heelForcesComb).toBe(r.governingHeel.combName);
    const valid = r.combinations.filter(c => c.type === 'ULS' && c.slab_ok);
    expect(r.concreteDesign.semelle_orteil.Mf).toBeCloseTo(Math.max(...valid.map(c => c.toe_Mf)), 9);
    expect(r.concreteDesign.semelle_talon.Mf).toBeCloseTo(Math.max(...valid.map(c => c.heel_Mf)), 9);
    expect(r.concreteDesign.semelle_orteil.Mf).toBeLessThan(500);
    expect(r.concreteDesign.semelle_talon.Mf).toBeLessThan(500);
    for (const c of r.combinations.filter(x => !x.slab_ok)) { expect(c.toe_Mf).toBe(0); expect(c.heel_Mf).toBe(0); }
  });

  it('G1 : V du patin à x = 0,40 m = intégrale exacte (0,5 %) et courbe V sans ondulation', () => {
    const r = run(GEO_G, SOIL_G1, LOADS);
    const c = r.combinations.find(x => x.combName === r.toeForcesComb)!;
    expect(c.distributionCase).toBe('Cas 2');
    const B = r.baseWidth;
    const down = c.factors.D * DEFAULT_CONCRETE_PROPS.gamma_c * GEO_G.epBase; // hSolAv = 0, pas d'eau
    const p0 = r.toeForces.reduce((best, f) => (Math.abs(f.x - 0.4) < Math.abs(best.x - 0.4) ? f : best)); // point du diagramme le plus proche de 0,40 m
    const x = p0.x;
    const n = 200000;
    let V = 0;
    for (let i = 0; i < n; i++) { const u = ((i + 0.5) * x) / n; V += (c.q_toe + ((c.q_heel - c.q_toe) * u) / B - down) * (x / n); }
    close(p0.shear, Math.abs(V), 0.005, 'V(0,40)');
    const d = r.toeForces.slice(1).map((f, i) => f.shear - r.toeForces[i].shear);
    let changes = 0;
    for (let i = 1; i < d.length; i++) if (d[i] * d[i - 1] < -1e-12) changes++;
    expect(changes).toBeLessThanOrEqual(1);
  });

  it('G1 et G2 : valeurs de dimensionnement', () => {
    const g1 = run(GEO_G, SOIL_G1, LOADS).concreteDesign;
    close(g1.semelle_talon.Mf, 34.05, 0.005, 'talon G1');
    close(g1.semelle_orteil.Mf, 13.92, 0.005, 'patin G1');
    const g2 = run(GEO_G, SOIL_G2, LOADS).concreteDesign;
    console.log('G2 talon Mf', g2.semelle_talon.Mf.toFixed(2), 'Vf', g2.semelle_talon.Vf.toFixed(2), '; patin Mf', g2.semelle_orteil.Mf.toFixed(2), 'Vf', g2.semelle_orteil.Vf.toFixed(2));
    expect(g2.semelle_talon.Mf).toBeGreaterThan(0);
  });
});
