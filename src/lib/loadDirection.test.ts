import { describe, it, expect } from 'vitest';
import { directionOfComponent } from './loadDirection';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG, DEFAULT_SOIL_METHOD_CONFIG } from './analysis';

// MUR-04 : δb saisi = atan 0,55 (ancien μ de MUR-02) pour que les cas de référence restent reproductibles
const DELTA_B_MU055 = (Math.atan(0.55) * 180) / Math.PI;
describe('Note, section 2 : direction des lignes de charge', () => {
  it('H, V, M et « — » selon les composantes', () => {
    expect(directionOfComponent({ Fx: 12 })).toBe('H');
    expect(directionOfComponent({ Fy: -5 })).toBe('V');
    expect(directionOfComponent({ Mz: 3 })).toBe('M');
    expect(directionOfComponent({})).toBe('—');
    expect(directionOfComponent({ Fx: 1, Fy: 1 })).toBe('—');
  });
  it('chaque composante du moteur (poussées, poids) reçoit H ou V', () => {
    const geo: any = { wallType: 'cantilever', hMur: 3.8, epStem: 0.35, ePiedAv: 0.8, ePiedAr: 1.75, epBase: 0.35 };
    const soil: any = { gamma: 19, gamma_prime: 9.2, phi: 29, cohesion: 0, bearingSoil: { phi: 29, contact: 'cast', deltaB: DELTA_B_MU055 }, hSolAv: 1.5, qAllowable_SLS: 130, qUltimate_ULS: 392, methodConfig: DEFAULT_SOIL_METHOD_CONFIG, hasWaterTable: true, waterTableHeight: 2.5, gamma_w: 9.81, geotechLevel: 'typical', psi: 1 };
    const loads: any = { surcharge: 12, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };
    const r = analyzeRetainingWall(geo, soil, loads, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
    expect(r.lateral_nominal.length).toBeGreaterThan(0);
    for (const c of r.lateral_nominal) expect(directionOfComponent({ Fx: c.Fx }), c.name).toBe('H');
    for (const [k, w] of Object.entries(r.weights_nominal)) if (w > 0) expect(directionOfComponent({ Fy: w }), k).toBe('V');
  });
});
