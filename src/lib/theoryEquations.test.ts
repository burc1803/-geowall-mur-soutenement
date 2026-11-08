import { describe, it, expect } from 'vitest';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG, DEFAULT_SOIL_METHOD_CONFIG } from './analysis';
import { buildBearingEq, buildDeltaPaeEq, buildOverturningEq, buildSlidingEq, fr, recomposeDeltaPae } from './theoryEquations';
import type { LoadsConfig, SoilProperties, WallGeometry } from './types';

// MUR-04 : δb saisi = atan 0,55 (ancien μ de MUR-02) pour que les cas de référence restent reproductibles
const DELTA_B_MU055 = (Math.atan(0.55) * 180) / Math.PI;
// G1 (MUR-02 §7)
const GEO_G1: WallGeometry = { wallType: 'cantilever', hMur: 3.0, epStem: 0.3, ePiedAv: 0.6, ePiedAr: 1.5, epBase: 0.4 };
const SOIL_G1: SoilProperties = {
  gamma: 19, phi: 32, cohesion: 0, bearingSoil: { phi: 32, contact: 'cast', deltaB: DELTA_B_MU055 }, hSolAv: 0, qAllowable_SLS: 300, qUltimate_ULS: 300,
  hasWaterTable: false, gamma_w: 9.81, stabilityCriterion: 'eccentricity', geotechLevel: 'typical', psi: 1.0,
  methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'none', pga: 0.15, deltaFrictionRatio: 0.667 }
};
const LOADS_G1: LoadsConfig = { surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };

// Projet « nappe » : exemple par défaut de l'application (nappe à 2,50 m, sol avant, séisme M-O, surcharge)
const GEO_N: WallGeometry = { wallType: 'cantilever', hMur: 3.8, epStem: 0.35, ePiedAv: 0.8, ePiedAr: 1.75, epBase: 0.35 };
const SOIL_N: SoilProperties = {
  gamma: 19, gamma_prime: 9.2, phi: 29, cohesion: 0, bearingSoil: { phi: 29, contact: 'cast', deltaB: DELTA_B_MU055 }, hSolAv: 1.5, qAllowable_SLS: 130, qUltimate_ULS: 392,
  methodConfig: DEFAULT_SOIL_METHOD_CONFIG, hasWaterTable: true, waterTableHeight: 2.5, gamma_w: 9.81, geotechLevel: 'typical', psi: 1.0, quFactored: false,
  frost: { deduct: true, df: 1.2, noDf: 'zero' }
};
const LOADS_N: LoadsConfig = { surcharge: 12, surchargeType: 'L', surchargeAval: 0, additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };

const projects = [
  { name: 'G1', geo: GEO_G1, soil: SOIL_G1, loads: LOADS_G1 },
  { name: 'G1 critère moments', geo: GEO_G1, soil: { ...SOIL_G1, stabilityCriterion: 'moments' as const }, loads: LOADS_G1 },
  { name: 'nappe', geo: GEO_N, soil: SOIL_N, loads: LOADS_N },
  { name: 'nappe critère B′', geo: GEO_N, soil: { ...SOIL_N, stabilityCriterion: 'eccentricity' as const }, loads: LOADS_N }
];

describe('Étapes & formules : valeurs substituées = valeurs du moteur', () => {
  for (const p of projects) {
    const r = analyzeRetainingWall(p.geo, p.soil, p.loads, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
    const B = r.baseWidth;
    const criterion = r.stabilityCriterion;

    it(`${p.name} : glissement, chaque combinaison recomposée à partir des termes affichés`, () => {
      for (const c of r.combinations) {
        const s = buildSlidingEq(c, r);
        const Fs = s.condition === 'undrained' ? s.psi * s.phi_coh * s.ca * s.Bp : s.psi * (s.phi_gs * s.sumV * s.tanDeltaB + s.phi_p * (s.Pp + s.Pw));
        expect(Math.abs(Fs - c.Fs)).toBeLessThanOrEqual(Math.max(Math.abs(c.Fs) * 1e-9, 1e-9));
        expect(s.sumHf).toBe(c.Fh_destab);
        expect(s.substituted).toContain(fr(c.phi_gs));
        expect(s.substituted).toContain(fr(c.Pp_used, 1));
        expect(s.result).toContain(fr(c.Fs, 1));
        expect(s.result).toContain(fr(c.FOS_sliding));
      }
    });

    it(`${p.name} : renversement recomposé`, () => {
      for (const c of r.combinations) {
        const o = buildOverturningEq(c);
        const Ms = o.psi * o.phi_ov * (o.Mres + o.Mpass);
        expect(Math.abs(Ms - c.Ms)).toBeLessThanOrEqual(Math.max(Math.abs(c.Ms) * 1e-9, 1e-9));
        expect(o.Mr).toBe(c.Mr);
        expect(o.result).toContain(fr(c.FOS_overturning));
      }
    });

    it(`${p.name} : portance, la pression affichée = q_design du moteur (cas ${[...new Set(r.combinations.map(c => c.distributionCase))].join(', ')})`, () => {
      for (const c of r.combinations) {
        const b = buildBearingEq(c, B, criterion);
        if (c.outside_base) { expect(b.kind).toBe('outside'); continue; }
        expect(Math.abs(b.qDesign - c.q_design)).toBeLessThanOrEqual(Math.max(Math.abs(c.q_design) * 1e-9, 1e-9));
        expect(b.result).toContain(fr(c.q_design, 1));
        if (criterion === 'eccentricity') expect(b.kind).toBe('uniform_Beff');
        else if (c.distributionCase === 'Cas 4') expect(b.kind === 'cas4_toe' || b.kind === 'cas4_heel').toBe(true);
      }
    });

    it(`${p.name} : ΔPAE recomposée = valeur du moteur`, () => {
      if (r.seismic.scenarios.length === 0) return;
      r.seismic.scenarios.forEach((sc, i) => {
        const e = buildDeltaPaeEq(r, p.soil, p.geo, i)!;
        expect(Math.abs(recomposeDeltaPae(r, p.soil, p.geo, i) - sc.dPae)).toBeLessThanOrEqual(Math.max(sc.dPae * 1e-9, 1e-9));
        expect(e.result).toContain(fr(sc.dPae, 2));
      });
    });
  }

  it('cas triangulaire (e > B/6) présent dans au moins un projet et formule 2V/(3·x1)', () => {
    let found = 0;
    for (const p of projects.filter(x => x.soil.stabilityCriterion !== 'eccentricity')) {
      const r = analyzeRetainingWall(p.geo, p.soil, p.loads, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
      for (const c of r.combinations.filter(x => x.distributionCase === 'Cas 4' && !x.outside_base)) {
        const b = buildBearingEq(c, r.baseWidth, 'moments');
        expect(b.substituted).toContain('2 ·');
        expect(b.substituted).toContain('3 ·');
        found++;
      }
    }
    expect(found).toBeGreaterThan(0);
  });
});

describe('MUR-04 M4-A1 : équations affichées avec hr < h (H_p = hr + ts)', () => {
  const sm = (method: 'mononobe_okabe' | 'seed_whitman', wall: 'cantilever' | 'basement' = 'cantilever') => ({
    ...SOIL_G1, hr: 2.0, methodConfig: { ...SOIL_G1.methodConfig!, seismicMethod: method, pga: 0.2 }
  } as SoilProperties);
  for (const [name, wall, method] of [['M-O', 'cantilever', 'mononobe_okabe'], ['Seed-Whitman', 'cantilever', 'seed_whitman'], ['Wood (sous-sol)', 'basement', 'mononobe_okabe']] as const) {
    it(`${name} : Pa et ΔPAE recomposés avec H_p = 2,4 m, substitution affichée avec 2,40`, () => {
      const geo = { ...GEO_G1, wallType: wall };
      const soil = sm(method);
      const r = analyzeRetainingWall(geo, soil, LOADS_G1, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
      expect(r.soilHeight.Hp).toBeCloseTo(2.4, 12);
      // Pa nominale = ½·K·γ·H_p² (K utilisé par le moteur)
      expect(Math.abs(r.earthPressures.P_active_nominal - 0.5 * r.earthPressures.K_active_used * 19 * 2.4 * 2.4)).toBeLessThan(1e-9);
      const sc = r.seismic.scenarios[0];
      const e = buildDeltaPaeEq(r, soil, geo, 0)!;
      expect(Math.abs(recomposeDeltaPae(r, soil, geo, 0) - sc.dPae)).toBeLessThanOrEqual(Math.max(sc.dPae * 1e-9, 1e-9));
      expect(e.substituted).toContain('2,40²');
      expect(e.substituted).not.toContain('3,40');
    });
  }
});
