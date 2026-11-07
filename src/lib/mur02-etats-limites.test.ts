import { describe, it, expect } from 'vitest';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG, DEFAULT_SOIL_METHOD_CONFIG } from './analysis';
import type { LoadsConfig, SoilProperties, WallGeometry } from './types';

// MUR-02 §12 (décision de l'utilisateur du 2026-11-07) : glissement et renversement à l'ÉLU seulement ; portance à l'ÉLU et à l'ÉLS.
const GEO_G: WallGeometry = { wallType: 'cantilever', hMur: 3.0, epStem: 0.3, ePiedAv: 0.6, ePiedAr: 1.5, epBase: 0.4 };
const SOIL_G1: SoilProperties = {
  gamma: 19, phi: 32, cohesion: 0, mu: 0.55, hSolAv: 0, qAllowable_SLS: 300, qUltimate_ULS: 300,
  hasWaterTable: false, gamma_w: 9.81, stabilityCriterion: 'eccentricity', geotechLevel: 'typical', psi: 1.0,
  methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'none', pga: 0.15, deltaFrictionRatio: 0.667 }
};
const SOIL_G2: SoilProperties = { ...SOIL_G1, methodConfig: { ...SOIL_G1.methodConfig!, seismicMethod: 'mononobe_okabe' } };
const LOADS: LoadsConfig = { surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };

const GEO_D: WallGeometry = { wallType: 'cantilever', hMur: 3.8, epStem: 0.35, ePiedAv: 0.8, ePiedAr: 1.75, epBase: 0.35 };
const SOIL_D: SoilProperties = {
  gamma: 19, gamma_prime: 9.2, phi: 29, cohesion: 0, mu: 0.55, hSolAv: 1.5, qAllowable_SLS: 130, qUltimate_ULS: 392, presetType: 'compact_sand',
  methodConfig: DEFAULT_SOIL_METHOD_CONFIG, hasWaterTable: true, waterTableHeight: 2.5, gamma_w: 9.81, geotechLevel: 'typical', psi: 1.0, quFactored: false,
  frost: { deduct: true, df: 0, noDf: 'zero' }
};
const LOADS_D: LoadsConfig = { surcharge: 12, surchargeType: 'L', surchargeAval: 0, additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };

const projects = [
  { name: 'G1', geo: GEO_G, soil: SOIL_G1, loads: LOADS },
  { name: 'G2', geo: GEO_G, soil: SOIL_G2, loads: LOADS },
  { name: 'projet par défaut', geo: GEO_D, soil: SOIL_D, loads: LOADS_D }
];

describe('MUR-02 §12 : états limites des vérifications de stabilité', () => {
  for (const p of projects) {
    const r = analyzeRetainingWall(p.geo, p.soil, p.loads, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
    const uls = r.combinations.filter(c => c.type === 'ULS');
    const sls = r.combinations.filter(c => c.type === 'SLS');

    it(`${p.name} : aucune combinaison ÉLS n'a de statut de glissement ni de renversement`, () => {
      expect(sls.length).toBeGreaterThan(0);
      for (const c of sls) {
        expect(c.stabApplicable).toBe(false);
        expect(c.status_sliding).toBe('SANS OBJET');
        expect(c.status_overturning).toBe('SANS OBJET');
      }
    });

    it(`${p.name} : statuts gouvernants inchangés (lus à l'ÉLU seulement)`, () => {
      const stab = uls.filter(c => c.stabApplicable);
      const minSl = stab.reduce((m, c) => Math.min(m, c.FOS_sliding), Infinity);
      expect(r.governingSliding.type).toBe('ULS');
      expect(r.governingSliding.FOS_sliding).toBe(minSl);
      expect(r.critical_sliding_ULS).toBe(minSl);
      expect(r.governingOverturning.type).toBe('ULS');
      expect(['OK', 'NON']).toContain(r.governingOverturning.status_overturning);
      expect(['OK', 'NON']).toContain(r.governingSliding.status_sliding);
    });

    it(`${p.name} : la portance ÉLS reste vérifiée (q ≤ qadm et e ≤ B/6) et la portance ÉLU (q ≤ Ψ·φgu·qu)`, () => {
      const B = r.baseWidth;
      for (const c of sls) {
        expect(c.q_capacity).toBeCloseTo(p.soil.qAllowable_SLS, 9);
        expect(c.status_bearing).toBe(!c.outside_base && !(c.sumV_max <= 0) && c.q_design <= p.soil.qAllowable_SLS ? 'OK' : 'NON');
        expect(c.status_ecc).toBe(!c.outside_base && c.ecc_max <= B / 6 + 1e-9 ? 'OK' : 'NON');
      }
      for (const c of uls) {
        expect(c.q_capacity).toBeCloseTo(c.psi * c.phi_gu * p.soil.qUltimate_ULS, 9);
      }
    });
  }

  it('G1 : valeurs gouvernantes inchangées (glissement 1,018 ; renversement 1,451)', () => {
    const r = analyzeRetainingWall(GEO_G, SOIL_G1, LOADS, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
    expect(Math.abs(r.governingSliding.FOS_sliding - 1.018)).toBeLessThanOrEqual(1.018 * 0.005);
    const o = r.combinations.find(c => c.type === 'ULS' && c.stabApplicable && c.factors.D === 0.9 && c.caseNo === 2 && c.factors.L === 1.5)!;
    expect(Math.abs(o.FOS_overturning - 1.451)).toBeLessThanOrEqual(1.451 * 0.005);
  });
});
