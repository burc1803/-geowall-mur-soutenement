import { describe, it, expect } from 'vitest';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG, DEFAULT_SOIL_METHOD_CONFIG } from '../lib/analysis';
import type { LoadsConfig, SoilProperties, WallGeometry } from '../lib/types';
import { buildLoadTables, sumRows, sumsByType } from './loadTables';

// Affichage de la section 2 de la note : pour les charges D et H (facteurs 1,0), ΣM du tableau 2b = Mr non pondéré de la combinaison ÉLS S0
// et ΣM du tableau 2a (butée et eau à l'avant incluses, comme Mpass_c) = Ms_nominal de S0. Tolérance 0,01 kN·m/m.
const GEO: WallGeometry = { wallType: 'cantilever', hMur: 3.80, epStem: 0.35, ePiedAv: 0.80, ePiedAr: 1.75, epBase: 0.35 };
const SOIL: SoilProperties = {
  gamma: 19.0, gamma_prime: 9.2, phi: 29.0, cohesion: 0.0, hSolAv: 1.50, qAllowable_SLS: 130.0, qUltimate_ULS: 392.0,
  bearingSoil: { uscs: 'SW', phi: 29.0, contact: 'cast' }, methodConfig: DEFAULT_SOIL_METHOD_CONFIG,
  hasWaterTable: true, waterTableHeight: 2.50, gamma_w: 9.81, geotechLevel: 'typical', psi: 1.0, quFactored: false,
  frost: { deduct: true, df: 0, noDf: 'zero' }
};
const LOADS: LoadsConfig = {
  surcharge: 12.0, surchargeType: 'L', surchargeAval: 0.0,
  pointLoadTop: { enabled: true, Fy: 12.0, Fx: 0.0, name: 'Charge Tête' }, gammaM: 1.0, gammaF: 1.0, additionalLoads: []
};

const check = (label: string, soil: SoilProperties, loads: LoadsConfig, geo = GEO) => {
  const result = analyzeRetainingWall(geo, soil, loads, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
  const t = buildLoadTables(geo, soil, result, loads);
  const s0 = result.combinations.find(c => c.combName.includes('ELS S0'))!;
  const dh = (r: { type: string; kind: string }) => r.type === 'D' || r.type === 'H' || r.kind === 'passive';
  const s2a = sumRows(t.stabilizing.filter(dh));
  const s2b = sumRows(t.destabilizing.filter(dh));
  describe(label, () => {
    it('ΣM (2b, D et H) = Mr de S0', () => { console.log(label, 'tableau 2a', sumRows(t.stabilizing), 'D+H', s2a, '| 2b', sumRows(t.destabilizing), 'D+H', s2b, '| S0 Mr', s0.Mr, 'Ms_nominal', s0.Ms_nominal); expect(Math.abs(s2b.moment - s0.Mr)).toBeLessThanOrEqual(0.01); });
    it('ΣM (2a, D et H + butée) = Ms_nominal de S0', () => expect(Math.abs(s2a.moment - s0.Ms_nominal)).toBeLessThanOrEqual(0.01));
    it('ΣFv(2a) - ΣFv(2b) = ΣV de S0 ; ΣFh(2b) - ΣFh(2a hors butée) = ΣH de S0', () => {
      expect(Math.abs(s2a.fv - s2b.fv - s0.sumV_max)).toBeLessThanOrEqual(0.01);
      const passiveFh = t.stabilizing.filter(r => r.kind === 'passive').reduce((a, r) => a + (r.fh ?? 0), 0);
      expect(Math.abs(s2b.fh - (s2a.fh - passiveFh) - s0.sumH)).toBeLessThanOrEqual(0.01);
    });
    it('Σ D + H = premier groupe ; somme des groupes par type = total de toutes les lignes', () => {
      for (const rows of [t.stabilizing, t.destabilizing]) {
        const g = sumsByType(rows), all = sumRows(rows);
        expect(g[0].label).toBe('Σ D + H (permanentes)');
        for (const k of ['fh', 'fv', 'moment'] as const) expect(Math.abs(g.reduce((a, x) => a + x[k], 0) - all[k])).toBeLessThanOrEqual(1e-9);
      }
      expect(sumsByType(t.destabilizing)[0].moment).toBeCloseTo(s0.Mr, 2);
      expect(sumsByType(t.stabilizing)[0].moment).toBeCloseTo(s0.Ms_nominal, 2);
    });
    it('aucune valeur non finie', () => { for (const r of [...t.stabilizing, ...t.destabilizing]) expect(r.moment === null ? r.kind === 'data' : Number.isFinite(r.moment)).toBe(true); });
  });
  return { result, t };
};

const dflt = check('projet par défaut (nappe)', SOIL, LOADS);
check('sans nappe', { ...SOIL, hasWaterTable: false, waterTableHeight: 0 }, LOADS);
check('sans nappe, butée active (df = 1,0 m)', { ...SOIL, hasWaterTable: false, waterTableHeight: 0, frost: { deduct: true, df: 1.0, noDf: 'zero' } }, LOADS);

describe('surcharges uniformes : poids vertical non compté dans ΣV par le moteur', () => {
  it('ΣV de S1 = ΣV de S0 (sumV_min et sumV_max) ; lignes « donnée » sans force ni moment', () => {
    const c = dflt.result.combinations;
    const s0 = c.find(x => x.combName.includes('ELS S0'))!, s1 = c.find(x => x.combName.includes('ELS S1 '))!;
    expect(s1.sumV_min).toBeCloseTo(s0.sumV_min, 9);
    expect(s1.sumV_max).toBeCloseTo(s0.sumV_max, 9);
    const sur = dflt.t.stabilizing.find(r => r.desc.startsWith('Surcharge amont'))!;
    expect(sur.kind).toBe('data');
    expect(sur.fv).toBeNull();
    expect(sur.moment).toBeNull();
  });
});
