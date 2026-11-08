import { describe, it, expect } from 'vitest';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG } from './analysis';
import { adhesionFromCu, proposedDeltaB } from './cfemTable204';
import { resolveBearingSoil } from './bearingSoil';
import type { LoadsConfig, SoilProperties, WallGeometry, BearingSoilProperties } from './types';

// MUR-04 : sols avant / d'assise, tableau 20.4 du CFEM, amendement M4-A1 (hauteur du sol arrière hr)
const close = (a: number, b: number, relTol: number, label = '') => expect(Math.abs(a - b), `${label} obtenu ${a}, attendu ${b}`).toBeLessThanOrEqual(Math.abs(b) * relTol);
const GEO: WallGeometry = { wallType: 'cantilever', hMur: 3.0, epStem: 0.3, ePiedAv: 0.6, ePiedAr: 1.5, epBase: 0.4 };
const bearing = (over: Partial<BearingSoilProperties> = {}): BearingSoilProperties => ({ uscs: 'SW', phi: 32, contact: 'cast', ...over });
const soilOf = (b: BearingSoilProperties | undefined, over: Partial<SoilProperties> = {}): SoilProperties => ({
  gamma: 19, phi: 32, hSolAv: 0, qAllowable_SLS: 300, qUltimate_ULS: 300, bearingSoil: b,
  hasWaterTable: false, gamma_w: 9.81, stabilityCriterion: 'eccentricity', geotechLevel: 'typical', psi: 1.0,
  methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'none', pga: 0.15, deltaFrictionRatio: 0.667 },
  ...over
});
const LOADS: LoadsConfig = { surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };
const run = (soil: SoilProperties, geo = GEO) => analyzeRetainingWall(geo, soil, LOADS, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);

describe('MUR-04 R1 : δb proposé par le tableau 20.4(a)', () => {
  it('sable SW coulé contre le sol : 24° (tan 0,445) ; béton formé : 17°', () => {
    const a = resolveBearingSoil(soilOf(bearing()));
    expect(a.deltaB).toBe(24); close(a.tanDeltaB, 0.4452, 0.001);
    expect(a.deltaBSource).toContain('tableau 20.4(a)');
    expect(resolveBearingSoil(soilOf(bearing({ contact: 'formed' }))).deltaB).toBe(17);
  });
  it('plafonné à φ′ d\'assise ; δb saisi > φ′ : bloqué avec message', () => {
    expect(proposedDeltaB('SW', 'cast', 20)).toMatchObject({ delta: 20, capped: true });
    const r = run(soilOf(bearing({ deltaB: 35 })));
    expect(r.verifiable).toBe(false);
    expect(r.warnings.some(w => w.includes('δb'))).toBe(true);
    expect(r.combinations.filter(c => c.type === 'ULS').every(c => c.status_sliding === 'NON VÉRIFIABLE')).toBe(true);
  });
  it('classe sans valeur pour le contact (CL + béton formé) ou non définie : saisie obligatoire', () => {
    expect(resolveBearingSoil(soilOf(bearing({ uscs: 'CL', contact: 'formed', cu: 50 }))).issues.some(m => m.includes('δb à saisir'))).toBe(true);
    expect(resolveBearingSoil(soilOf(bearing({ uscs: undefined }))).deltaB).toBeUndefined();
    expect(run(soilOf(bearing({ uscs: undefined }))).verifiable).toBe(false);
  });
});

describe('MUR-04 R2 : assise cohérente (CL)', () => {
  it('cu = 50 kPa : ca = 38 ; Rs,CT = 0,60 × 38 × 2,40 = 54,72 kN/m < 60 : NON', () => {
    expect(adhesionFromCu(50)).toBe(38);
    const Rs = 0.6 * adhesionFromCu(50) * 2.4;
    close(Rs, 54.72, 0.005); expect(Rs).toBeLessThan(60);
    expect(adhesionFromCu(0)).toBe(0); expect(adhesionFromCu(6)).toBe(6); close(adhesionFromCu(75), 43, 1e-9); expect(adhesionFromCu(500)).toBe(65);
  });
  it('moteur : court terme = Ψ·φcoh·ca·B′ sans butée ; le plus défavorable gouverne', () => {
    const r = run(soilOf(bearing({ uscs: 'CL', phi: 26, cu: 50 }), { hSolAv: 1.0, frost: { deduct: false, df: 0 } }));
    expect(r.bearingSoil.ca).toBe(38);
    for (const c of r.combinations.filter(x => x.type === 'ULS')) {
      close(c.Fs_undrained!, c.psi * c.phi_coh * 38 * c.B_slide, 1e-9);
      expect(c.sliding_condition).toBe(c.FOS_undrained! < c.FOS_drained ? 'undrained' : 'drained');
      close(c.FOS_sliding, Math.min(c.FOS_undrained!, c.FOS_drained), 1e-12);
      if (c.sliding_condition === 'undrained') { expect(c.Rf_passive).toBe(0); expect(c.Rf_friction).toBe(0); }
    }
    expect(r.combinations.some(c => c.sliding_condition === 'undrained')).toBe(true);
  });
  it('cu sans effet pour un sol non cohérent ; CL sans cu : bloqué', () => {
    const a = run(soilOf(bearing()));
    const b = run(soilOf(bearing({ cu: 50 })));
    expect(b.combinations.map(c => c.FOS_sliding)).toEqual(a.combinations.map(c => c.FOS_sliding));
    expect(run(soilOf(bearing({ uscs: 'CL' }))).verifiable).toBe(false);
  });
});

describe('MUR-04 R5 : migration d\'un ancien projet', () => {
  it('μ = 0,55 : δb = atan 0,55 (28,81°), classe non définie', () => {
    const b = resolveBearingSoil(soilOf(undefined, { phi: 32, mu: 0.55 }));
    close(b.deltaB!, (Math.atan(0.55) * 180) / Math.PI, 1e-12); close(b.tanDeltaB, 0.55, 1e-12);
    expect(b.uscs).toBeUndefined(); expect(b.deltaBSource).toContain('ancien projet');
  });
  it('μ = 0,9, φ′ = 30° : plafonné à φ′', () => {
    const b = resolveBearingSoil(soilOf(undefined, { phi: 30, mu: 0.9 }));
    expect(b.deltaB).toBe(30); expect(b.deltaBSource).toContain('plafonné');
  });
});

describe('MUR-04 M4-A1 : hauteur du sol arrière hr', () => {
  const b = bearing({ deltaB: (Math.atan(0.55) * 180) / Math.PI });
  it('hr = h : aucun résultat ne change', () => {
    const a = run(soilOf(b));
    const c = run(soilOf(b, { hr: 3.0 }));
    expect(c.combinations).toEqual(a.combinations);
    expect(c.earthPressures).toEqual(a.earthPressures);
  });
  it('G1 avec hr = 2,0 m : Pa = ½·Ka·γ·(2,0 + 0,4)² ; poids du talon sur hr ; voile sur la hauteur remblayée', () => {
    const r = run(soilOf(b, { hr: 2.0 }));
    const Ka = Math.pow(Math.tan(Math.PI / 4 - (32 * Math.PI) / 360), 2);
    const Pa = 0.5 * Ka * 19 * 2.4 * 2.4;
    close(r.earthPressures.P_active_nominal, Pa, 1e-12); close(Pa, 16.81, 0.002);
    close(r.lateral_nominal.find(c => c.name === 'Pa_sol')!.Fx, Pa, 1e-12);
    close(r.weights_nominal.heelSoil, 2.0 * 1.5 * 19, 1e-12);
    const c1 = r.combinations.find(c => c.caseNo === 1)!; // 1,4D + 1,5H : le voile ne reçoit que la poussée sur hr
    close(c1.mur_Vf, 1.5 * 0.5 * Ka * 19 * 2.0 * 2.0, 1e-3);
    close(c1.mur_Mf, 1.5 * Ka * 19 * Math.pow(2.0, 3) / 6, 1e-3);
    expect(r.soilHeight).toEqual({ hr: 2.0, Hp: 2.4 });
  });
  it('hr hors bornes : avis NON VÉRIFIABLE', () => {
    expect(run(soilOf(b, { hr: 3.5 })).verifiable).toBe(false);
    expect(run(soilOf(b, { hr: 0 })).verifiable).toBe(false);
  });
});

describe('MUR-04 (décision du 2026-11-08) : charge linéaire QL avec hr < h', () => {
  const b = bearing({ deltaB: (Math.atan(0.55) * 180) / Math.PI });
  const QL = 50;
  const withLoad = (hr?: number) => analyzeRetainingWall(GEO, soilOf(b, hr === undefined ? {} : { hr }), { ...LOADS, additionalLoads: [{ id: 'ql', name: 'QL', nature: 'Fy', magnitude: QL, caseType: 'L', x: GEO.ePiedAv + GEO.epStem + 1.0, y: 3.4 } as any] }, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
  const lineComp = (r: ReturnType<typeof withLoad>) => r.lateral_nominal.find(c => c.name.includes('fig. 20.8'))!;
  it('hr = 2,0 : H = 2,40, m = 1,0/2,40, origine à la surface du remblai ; PH et sa position recalculés', () => {
    const H = 2.4, m = 1.0 / H; // m > 0,4 : formule éloignée
    const PH = (0.64 * QL) / (m * m + 1);
    // position : centroïde de g(n) = 1,28·m²·n/(m² + n²)², intégré indépendamment (Simpson, 20000 pas)
    const g = (n: number) => (1.28 * m * m * n) / Math.pow(m * m + n * n, 2);
    const N = 20000; let I0 = 0, I1 = 0;
    for (let i = 0; i <= N; i++) { const n = i / N; const w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2; I0 += w * g(n); I1 += w * g(n) * n; }
    const zc = (I1 / I0) * H; // profondeur sous la surface du remblai
    const c = lineComp(withLoad(2.0));
    close(c.Fx, PH, 1e-9); close(c.Fx, 27.27, 0.002); // 0,64·50/(0,4167² + 1)
    close(c.y, H - zc, 1e-4); // hauteur au-dessus de la sous-face
  });
  it('hr = 2,0 : aucune poussée de la charge au-dessus du remblai (voile : z < 1,0 m sous le haut)', () => {
    const r = withLoad(2.0);
    const full = withLoad(undefined);
    // la poussée totale sur le voile dépend de la hauteur remblayée : effort tranchant à la base du voile plus petit
    expect(r.combinations.find(c => c.caseNo === 2)!.mur_Vf).toBeLessThan(full.combinations.find(c => c.caseNo === 2)!.mur_Vf);
  });
  it('hr = h : identique à hr non défini', () => {
    const a = withLoad(undefined);
    const c = withLoad(3.0);
    expect(c.combinations).toEqual(a.combinations);
    expect(c.lateral_nominal).toEqual(a.lateral_nominal);
  });
});
