import { describe, it, expect } from 'vitest';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG, GEOTECH_TABLE_6_2 } from './analysis';
import { mononobeOkabeKae, mononobeOkabeKpe, lineLoadThrust } from './wallMechanics';
import type { LoadsConfig, SoilProperties, WallGeometry, RebarCustomConfig } from './types';

const deg = (d: number) => (d * Math.PI) / 180;
const close = (a: number, b: number, relTol: number, label = '') =>
  expect(Math.abs(a - b), `${label} obtenu ${a}, attendu ${b}`).toBeLessThanOrEqual(Math.abs(b) * relTol);

// Cas de référence MUR-02 §7 : hMur 3,00 ; voile 0,30 ; patin 0,60 ; talon 1,50 ; semelle 0,40
const GEO: WallGeometry = { wallType: 'cantilever', hMur: 3.0, epStem: 0.3, ePiedAv: 0.6, ePiedAr: 1.5, epBase: 0.4 };
const soilG = (over: Partial<SoilProperties> = {}, method: Partial<SoilProperties['methodConfig'] & object> = {}): SoilProperties => ({
  gamma: 19, phi: 32, cohesion: 0, mu: 0.55, hSolAv: 0, qAllowable_SLS: 300, qUltimate_ULS: 300,
  hasWaterTable: false, gamma_w: 9.81, stabilityCriterion: 'eccentricity',
  geotechLevel: 'typical', psi: 1.0,
  methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'none', pga: 0.15, deltaFrictionRatio: 0.667, ...method },
  ...over
});
const loadsG = (over: Partial<LoadsConfig> = {}): LoadsConfig => ({ surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0, ...over });
// voile : 15M à 120 mm (face intérieure) et 10M à 300 mm (face extérieure) ; MUR-02 §7
const REBAR: RebarCustomConfig = { ...DEFAULT_REBAR_CONFIG, mur_interieur: { barSize: '15M', spacing: 120 }, mur_exterieur: { barSize: '10M', spacing: 300 } };
const conc = { ...DEFAULT_CONCRETE_PROPS, cover_h: 60, cover_v: 60, cover_base_bottom: 75 };
const run = (soil = soilG(), loads = loadsG(), rebar = REBAR) => analyzeRetainingWall(GEO, soil, loads, conc, rebar);

const c = (r: ReturnType<typeof run>, caseNo: number, D: number, extra: (x: any) => boolean = () => true) =>
  r.combinations.find(x => x.caseNo === caseNo && x.factors.D === D && x.factors.S === 0 && x.factors.W === 0 && x.factors.L === (caseNo === 2 ? 1.5 : 0) && extra(x))!;

describe('MUR-02 §1 - facteurs géotechniques (tableau 6.2) et Ψ', () => {
  it('tableau 6.2 : faible / typique / élevé', () => {
    expect(GEOTECH_TABLE_6_2.typical).toMatchObject({ bearing: 0.5, overturning: 0.5, sliding: 0.8, slidingCohesive: 0.6, passive: 0.5, settlement: 0.8 });
    expect(GEOTECH_TABLE_6_2.low).toMatchObject({ bearing: 0.45, overturning: 0.45, sliding: 0.7, slidingCohesive: 0.55, passive: 0.4 });
    expect(GEOTECH_TABLE_6_2.high).toMatchObject({ bearing: 0.6, overturning: 0.55, sliding: 0.9, slidingCohesive: 0.65, passive: 0.55 });
  });
  it('le moteur expose les facteurs retenus ; qu déjà pondérée -> φ_gu = 1', () => {
    expect(run().geotech).toMatchObject({ level: 'typical', psi: 1.0, phi_gu: 0.5, phi_gs: 0.8, phi_ov: 0.5, phi_p: 0.5, phi_coh: 0.6, quFactored: false });
    const hi = run(soilG({ geotechLevel: 'high', psi: 0.9, quFactored: true }));
    expect(hi.geotech).toMatchObject({ level: 'high', psi: 0.9, phi_gu: 1.0, phi_gs: 0.9, phi_ov: 0.55 });
  });
  it('Ψ multiplie les résistances ELU : glissement et capacité portante', () => {
    const a = run(); const b = run(soilG({ psi: 0.9 }));
    close(c(b, 2, 0.9).FOS_sliding, 0.9 * c(a, 2, 0.9).FOS_sliding, 1e-9);
    close(c(b, 2, 0.9).q_capacity, 0.9 * 150, 1e-9);
  });
  it('aucune réduction Kp x 0,5 : Kp de Rankine pleine, seul φ_p s\'applique', () => {
    const r = run(soilG({ hSolAv: 1.5, frost: { deduct: false, df: 0 } }));
    close(r.K_passive, Math.pow(Math.tan(deg(61)), 2), 1e-9);
  });
});

describe('MUR-02 §7.1 - Cas G1 (statique)', () => {
  const r = run();
  it('glissement 0,9D + 1,5H : Rf = 51,54 ; Hf = 50,61 ; Rf/Hf = 1,018', () => {
    const k = c(r, 2, 0.9);
    close(k.Fs, 51.54, 0.005, 'Rf'); close(k.sumH, 50.61, 0.005, 'Hf'); close(k.FOS_sliding, 1.018, 0.005, 'Rf/Hf');
    expect(k.status_sliding).toBe('OK');
  });
  it('renversement (option a) 0,9D + 1,5H : Ψφ_ov·Ms = 83,21 ; Mo = 57,36 ; rapport 1,451', () => {
    const k = c(r, 2, 0.9);
    close(k.Ms, 83.21, 0.005, 'Ψφ_ovMs'); close(k.Mr, 57.36, 0.005, 'Mo'); close(k.FOS_overturning, 1.451, 0.005, 'rapport');
  });
  it('e, B′ et qf : 1,4D (0,094 ; 2,212 ; 82,4), 1,25D (0,132 ; 2,137 ; 76,1), 0,9D (0,269 ; 1,862 ; 62,9)', () => {
    const k14 = r.combinations.find(x => x.caseNo === 1)!;
    close(k14.sumV_max, 182.20, 0.005, 'V1,4'); close(k14.ecc, 0.094, 0.02, 'e1,4'); close(k14.B_eff, 2.212, 0.005); close(k14.q_design, 82.4, 0.005);
    const k125 = c(r, 2, 1.25);
    close(k125.sumV_max, 162.68, 0.005); close(k125.ecc, 0.132, 0.02); close(k125.B_eff, 2.137, 0.005); close(k125.q_design, 76.1, 0.005);
    const k09 = c(r, 2, 0.9);
    close(k09.sumV_max, 117.13, 0.005); close(k09.ecc, 0.269, 0.01); close(k09.B_eff, 1.862, 0.005); close(k09.q_design, 62.9, 0.005);
    [k14, k125, k09].forEach(k => { expect(k.status_ecc).toBe('OK'); expect(k.status_bearing).toBe('OK'); expect(k.q_capacity).toBeCloseTo(150, 9); });
  });
  it('ELS D + H : e = 0,073 ≤ B/6 ; q = 64,1 / 44,3 kPa (distribution linéaire)', () => {
    const rm = run(soilG({ stabilityCriterion: 'moments' }));
    const els = rm.combinations.find(x => x.combName.includes('ELS 11'))!;
    close(els.ecc, 0.073, 0.02, 'e'); close(els.q_toe, 64.1, 0.005, 'q_toe'); close(els.q_heel, 44.3, 0.005, 'q_heel');
    expect(els.status_ecc).toBe('OK');
    expect(rm.eccentricity_ok_SLS).toBe(true);
  });
  it('voile 1,5H : Mf = 39,41 ; Vf = 39,41 ; Vf(dv) = 33,94 ; Mr = 121,24 ; c/d = 0,174 ≤ 0,509 ; Vc = 145,5 ; Vr,max = 1 053', () => {
    const k = r.combinations.find(x => x.caseNo === 1)!;
    close(k.mur_Mf, 39.41, 0.005); close(k.mur_Vf, 39.41, 0.005);
    close(k.mur_Vf_dv, 33.94, 0.005, 'Vf(dv)');
    const d = r.concreteDesign.mur_interieur;
    expect(d.d).toBeCloseTo(232, 0); expect(d.dv).toBeCloseTo(216, 0);
    close(d.a_stress_block, 36.10, 0.005); close(d.Mr, 121.24, 0.005);
    close(d.ductility_c_over_d, 0.174, 0.01); close(d.ductility_limit, 0.8 * 700 / 1100, 1e-9); expect(d.ductility_ok).toBe(true);
    close(d.beta, 0.1891, 0.002); close(d.Vc, 145.5, 0.005); close(d.Vr_max, 1053, 0.005);
  });
  it('voile : armature minimale 14.1.8.5 = 450 mm²/m ; 10.5.1.2 b) = 821,6 mm²/m dispensée (10.5.1.3) ; As = 1 667', () => {
    const d = r.concreteDesign.mur_interieur;
    close(d.As_min, 450, 1e-9); close(d.As_min_flexure, 821.6, 0.001); expect(d.flexure_min_waived).toBe(true);
    close(d.As_provided, 1667, 0.001); expect(d.As_ok).toBe(true);
  });
  it('fissuration 10.6.1 : dc = 58, A = 13 920, z = 22 350 N/mm ≤ 25 000', () => {
    const d = r.concreteDesign.mur_interieur;
    close(d.crack_dc!, 58, 0.001); close(d.crack_A!, 13920, 0.001); close(d.Z_factor!, 22350, 0.005); expect(d.Z_ok).toBe(true);
  });
  it('ld = 420,7 mm ; ldh = 204,5 mm (enrobage latéral 60 mm, prolongement 75 mm)', () => {
    const d = r.concreteDesign.mur_interieur;
    close(d.ld, 420.7, 0.005); close(d.lhb!, 292.1, 0.005); close(d.ldh_required!, 204.5, 0.005);
  });
  it('talon à la face du voile : Mf = 31,18 (1,4D) ; 32,04 (1,25D) ; 34,05 (0,9D) ; Vf = 36,01', () => {
    const rm = run(soilG({ stabilityCriterion: 'moments' }));
    const m = (k: any) => k.heel_Mf;
    close(m(rm.combinations.find(x => x.caseNo === 1)!), 31.18, 0.01, 'talon 1,4D');
    close(m(c(rm, 2, 1.25)), 32.04, 0.01, 'talon 1,25D');
    close(m(c(rm, 2, 0.9)), 34.05, 0.01, 'talon 0,9D');
    close(Math.max(...rm.combinations.filter(x => x.type === 'ULS').map(x => x.heel_Vf)), 36.01, 0.01, 'talon Vf');
  });
  it('patin à la face du voile : Mf = 13,92 (1,4D) ; Vf = 45,50', () => {
    const rm = run(soilG({ stabilityCriterion: 'moments' }));
    close(rm.combinations.find(x => x.caseNo === 1)!.toe_Mf, 13.92, 0.01, 'patin 1,4D');
    close(Math.max(...rm.combinations.filter(x => x.type === 'ULS').map(x => x.toe_Vf)), 45.50, 0.01, 'patin Vf');
  });
  it('joint voile-semelle 11.5 : N = 21,6 (non pondéré) ; ρv = 0,00667 ; σ = 2,739 MPa ; Vr = 369 kN/m ≥ Vf', () => {
    const f = r.concreteDesign.cisaillement_friction;
    close(f.N, 21.6, 1e-9); close(f.rho_v, 2000 / 300000, 0.001); close(f.sigma, 2.739, 0.002); close(f.Vr, 369, 0.003);
    expect(f.status_ok).toBe(true); expect(f.capped).toBe(false);
  });
});

describe('MUR-02 §7.2 - Cas G2 (séisme kh = 0,15 ; kv = 0 ; δ = 0 ; 1,0D ; 1,0H)', () => {
  const sMO = (method: object = {}) => soilG({}, { seismicMethod: 'mononobe_okabe', ...method });
  const g2 = (soil = sMO()) => {
    const r = run(soil);
    return { r, k: r.combinations.find(x => x.caseNo === 5 && x.factors.L === 0)! };
  };
  const { r, k } = g2();
  it('ψ = 8,531° ; KAE = 0,4025 ; kh = 0 donne Ka = 0,3073', () => {
    close(r.seismic.scenarios[0].psi_deg, 8.531, 0.001); close(r.seismic.scenarios[0].Kae, 0.4025, 0.002);
    close(mononobeOkabeKae(deg(32), 0, 0)!, 0.3073, 0.002);
    expect(r.seismic.kh).toBeCloseTo(0.15, 12);
  });
  it('ΔPAE = 10,46 kN/m à 0,6H = 2,04 m ; M = 21,34', () => {
    close(r.earthPressures.delta_Pae_seed, 10.46, 0.005); close(r.earthPressures.y_Pae, 2.04, 1e-9);
    close(r.earthPressures.delta_Pae_seed * r.earthPressures.y_Pae, 21.34, 0.005);
  });
  it('inertie : voile 3,24 ; semelle 3,456 ; sol du talon 12,83 à 1,90 m ; ΣE_H = 29,98 ; ΣE_M = 52,56', () => {
    close(r.earthPressures.E_stem_nominal, 3.24, 1e-9); close(r.earthPressures.E_base_nominal, 3.456, 1e-9);
    close(r.earthPressures.E_heelSoil_nominal, 12.83, 0.002); close(r.earthPressures.y_heelSoil, 1.9, 1e-9);
    const E = r.lateral_nominal.filter(x => x.type === 'E');
    close(E.reduce((s, x) => s + x.Fx, 0), 29.98, 0.005, 'ΣE_H');
    close(E.reduce((s, x) => s + x.Fx * x.y, 0), 52.56, 0.005, 'ΣE_M');
  });
  it('option A (1,0H), glissement : Hf = 63,73 ; Rf = 57,26 ; rapport 0,899 NON CONFORME', () => {
    close(k.sumH, 63.73, 0.005, 'Hf'); close(k.Fs, 57.26, 0.005, 'Rf'); close(k.FOS_sliding, 0.899, 0.005);
    expect(k.status_sliding).toBe('NON');
  });
  it('excentricité et portance : Mo = 90,80 ; e = 0,477 > B/6 ; B′ = 1,446 ; qf = 90,0 ; limite e ≤ B/6 non respectée', () => {
    close(k.Mr, 90.80, 0.005, 'Mo'); close(k.ecc, 0.477, 0.005, 'e'); close(k.B_eff, 1.446, 0.005); close(k.q_design, 90.0, 0.005);
    expect(k.status_ecc).toBe('NON'); expect(r.eccentricity_ok_ULS).toBe(false);
  });
  it('renversement (option a) : 0,50·184,92 = 92,46 ≥ 90,80 -> rapport 1,018', () => {
    close(k.Ms, 92.46, 0.005); close(k.FOS_overturning, 1.018, 0.005); expect(k.status_overturning).toBe('OK');
  });
  it('voile : Mf = 45,79 ; Vf = 37,66', () => {
    close(k.mur_Mf, 45.79, 0.005, 'Mf'); close(k.mur_Vf, 37.66, 0.005, 'Vf');
  });
  it('talon et patin (distribution triangulaire e > B/6) : talon Mf = 56,06, Vf = 55,33 ; patin Mf = 17,87', () => {
    // distribution linéaire / triangulaire de la fiche = critère « moments » (option a)
    const km = run(sMO({}) && soilG({ stabilityCriterion: 'moments' }, { seismicMethod: 'mononobe_okabe' })).combinations.find(x => x.caseNo === 5 && x.factors.L === 0)!;
    expect(km.distributionCase).toBe('Cas 4');
    close(km.heel_Mf, 56.06, 0.01, 'talon Mf'); close(km.heel_Vf, 55.33, 0.01, 'talon Vf'); close(km.toe_Mf, 17.87, 0.01, 'patin Mf');
  });
  it('option avancée CSA S6 (ah = 0,30 ; kh = 0,5·ah ; kv = 0) : mêmes valeurs que G2 par défaut', () => {
    const s6 = g2(sMO({ pga: 0.30, csaS6Reduction: true }));
    close(s6.r.seismic.kh, 0.15, 1e-12); expect(s6.r.seismic.csaS6).toBe(true);
    close(s6.k.sumH, k.sumH, 1e-9); close(s6.k.mur_Mf, k.mur_Mf, 1e-9); close(s6.k.FOS_sliding, k.FOS_sliding, 1e-9);
    // l'option est désactivée par défaut : ah = 0,30 sans l'option donne kh = 0,30
    close(g2(sMO({ pga: 0.30 })).r.seismic.kh, 0.30, 1e-12);
    // l'option force kv = 0
    expect(run(sMO({ pga: 0.30, csaS6Reduction: true }), loadsG({ kv: 0.1 })).seismic.scenarios.length).toBe(1);
  });
  it('option B (1,5H), comparaison par le moteur : Hf = 80,60 ; Rf/Hf = 0,710', () => {
    const E = r.lateral_nominal.filter(x => x.type === 'E').reduce((t, x) => t + x.Fx, 0);
    const HfB = 1.5 * r.earthPressures.P_active_nominal + E;
    close(HfB, 80.60, 0.005); close(k.Fs / HfB, 0.710, 0.005);
  });
  it('sans l\'inertie du sol du talon (ancien code), comparaison par le moteur : rapport 1,125', () => {
    const Hf = k.sumH - r.earthPressures.E_heelSoil_nominal;
    close(Hf, 50.90, 0.005); close(k.Fs / Hf, 1.125, 0.005);
  });
  it('G2 avec kv = ±2/3·kh = ±0,10 : glissement 0,855 / 0,8515 et renversement 0,949 / 0,900 (vers le bas / vers le haut)', () => {
    const rv = run(sMO(), loadsG({ kv: 0.1 }));
    const dn = rv.combinations.find(x => x.caseNo === 5 && x.factors.L === 0 && x.kvSign === -1)!;
    const up = rv.combinations.find(x => x.caseNo === 5 && x.factors.L === 0 && x.kvSign === 1)!;
    close(dn.FOS_sliding, 0.855, 0.005, 'glissement kv bas'); close(dn.FOS_overturning, 0.949, 0.005, 'renversement kv bas');
    close(up.FOS_sliding, 0.8515, 0.005, 'glissement kv haut'); close(up.FOS_overturning, 0.900, 0.005, 'renversement kv haut');
  });
  it('kv par défaut = 2/3·kh (deux signes étudiés) ; kv = 0 saisi explicitement ; option CSA S6 : kv = 0', () => {
    const d = run(sMO(), { surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1 });
    close(d.seismic.kvInput, (2 / 3) * 0.15, 1e-12); expect(d.seismic.kvIsDefault).toBe(true); expect(d.seismic.scenarios.length).toBe(2);
    expect(run(sMO(), loadsG({ kv: 0 })).seismic.scenarios.length).toBe(1);
    const s6 = run(sMO({ pga: 0.3, csaS6Reduction: true }), { surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1 });
    expect(s6.seismic.kvInput).toBe(0); expect(s6.seismic.scenarios.length).toBe(1);
  });
  it('kh = 0 et kv ≠ 0 : ΔPAE (kv vers le bas) et forces kv·W sont pris en compte', () => {
    const rz = run(sMO({ pga: 0 }), loadsG({ kv: 0.1 }));
    expect(rz.seismic.scenarios.length).toBe(2);
    const dn = rz.seismic.scenarios.find(x => x.sign === -1)!;
    close(dn.dPae, 0.5 * 19 * 3.4 * 3.4 * (1.1 * 0.3073 - 0.3073), 0.005);
    const kUp = rz.combinations.find(x => x.caseNo === 5 && x.factors.L === 0 && x.kvSign === 1)!;
    const k0 = run(sMO({ pga: 0 }), loadsG({ kv: 0 })).combinations.find(x => x.caseNo === 5 && x.factors.L === 0)!;
    expect(kUp.sumV_min).toBeLessThan(k0.sumV_min);
  });
  it('kv ≠ 0 : les deux signes sont étudiés (deux combinaisons de cas 5)', () => {
    const rv = run(sMO(), loadsG({ kv: 0.1 }));
    expect(rv.seismic.scenarios.map(x => x.sign)).toEqual([1, -1]);
    const c5 = rv.combinations.filter(x => x.caseNo === 5 && x.factors.L === 0);
    expect(c5.length).toBe(2); expect(c5.map(x => x.kvSign).sort()).toEqual([-1, 1]);
    // kv vers le haut réduit le poids : glissement plus défavorable que kv vers le bas pour la friction
    const up = c5.find(x => x.kvSign === 1)!; const dn = c5.find(x => x.kvSign === -1)!;
    expect(up.sumV_min).toBeLessThan(dn.sumV_min);
    expect(Number.isFinite(up.FOS_sliding) && Number.isFinite(dn.FOS_sliding)).toBe(true);
  });
});

describe('MUR-02 §2.1 - terme cohésif c′a·B′', () => {
  it('c′ = 10 kPa, 0,9D + 1,5H : Rf,coh = Ψ·φcoh·c′·B′ = 0,6·10·1,862 = 11,17 kN/m', () => {
    const base = c(run(), 2, 0.9);
    const rc = c(run(soilG({ foundation: { gamma: 19, phi: 32, cohesion: 10 } })), 2, 0.9);
    close(rc.B_slide, 1.862, 0.005); close(rc.Rf_cohesion, 0.6 * 10 * rc.B_slide, 1e-9); close(rc.Rf_cohesion, 11.17, 0.005);
    close(rc.Fs - base.Fs, rc.Rf_cohesion, 1e-9);
  });
});

describe('MUR-02 §4 - Mononobe-Okabe indéterminé, Wood, Westergaard', () => {
  it('φ − β < ψ : KAE indéterminé -> null, jamais NaN ; le moteur arrête le calcul sismique avec un message', () => {
    expect(mononobeOkabeKae(deg(20), 0, deg(25))).toBeNull();
    const r = analyzeRetainingWall(GEO, soilG({ phi: 20 }, { seismicMethod: 'mononobe_okabe', pga: 0.6 }), loadsG(), conc, REBAR);
    expect(r.verifiable).toBe(false);
    expect(r.warnings.some(w => w.includes('indéterminé'))).toBe(true);
    r.combinations.forEach(x => { expect(Number.isNaN(x.FOS_sliding)).toBe(false); expect(Number.isNaN(x.q_design)).toBe(false); expect(Number.isNaN(x.Ms)).toBe(false); });
  });
  it('mur de sous-sol : Wood, ΔP0E = kh·γ·H² à 0,58H', () => {
    const geo: WallGeometry = { ...GEO, wallType: 'basement' };
    const r = analyzeRetainingWall(geo, soilG({}, { seismicMethod: 'mononobe_okabe', pga: 0.15 }), loadsG(), conc, REBAR);
    expect(r.seismic.method).toBe('wood');
    close(r.earthPressures.delta_Pae_seed, 0.15 * 19 * 3.4 * 3.4, 1e-9); close(r.earthPressures.y_Pae, 0.58 * 3.4, 1e-9);
  });
  it('option CSA S6 non appliquée à un mur rigide (kh = ah)', () => {
    const geo: WallGeometry = { ...GEO, wallType: 'basement' };
    const r = analyzeRetainingWall(geo, soilG({}, { seismicMethod: 'mononobe_okabe', pga: 0.3, csaS6Reduction: true }), loadsG(), conc, REBAR);
    close(r.seismic.kh, 0.3, 1e-12); expect(r.notices.some(n => n.includes('CSA S6'))).toBe(true);
  });
  it('KPE : réduit la butée (PPE < PP) ; KPE(ψ = 0) = Kp', () => {
    close(mononobeOkabeKpe(deg(32), 0, 0)!, Math.pow(Math.tan(deg(61)), 2), 1e-9);
    expect(mononobeOkabeKpe(deg(32), 0, deg(8.531))!).toBeLessThan(mononobeOkabeKpe(deg(32), 0, 0)!);
    const base = { hSolAv: 1.5, frost: { deduct: false, df: 0 } };
    const none = analyzeRetainingWall(GEO, soilG(base, { seismicMethod: 'mononobe_okabe' }), loadsG(), conc, REBAR);
    const kpe = analyzeRetainingWall(GEO, soilG(base, { seismicMethod: 'mononobe_okabe', seismicPassive: 'kpe' }), loadsG(), conc, REBAR);
    const k5 = (x: typeof none) => x.combinations.find(c5 => c5.caseNo === 5 && c5.factors.L === 0)!;
    expect(k5(none).Pp_used).toBe(0); // défaut : butée nulle au séisme
    expect(k5(kpe).Pp_used).toBeGreaterThan(0);
    expect(k5(kpe).Pp_used).toBeLessThan(kpe.earthPressures.P_passive_nominal);
  });
  it('Westergaard : action E ajoutée à ΣHf (hw,av = 1,5 m : 7/12·0,15·9,81·1,5² = 1,93 kN/m), résistance Pw,a inchangée', () => {
    const soilW = soilG({ hSolAv: 1.5, hasWaterTable: true, waterTableHeight: 2.0, frontWater: { enabled: true, hwAv: 1.5 }, frost: { deduct: false, df: 0 } }, { seismicMethod: 'mononobe_okabe' });
    const w = analyzeRetainingWall(GEO, soilW, loadsG(), conc, REBAR);
    const k = w.combinations.find(x => x.caseNo === 5 && x.factors.L === 0)!;
    const dyn = w.lateral_nominal.find(x => x.name.includes('E_westergaard'))!;
    close(dyn.Fx, 1.93, 0.005); close(dyn.Fx, (7 / 12) * 0.15 * 9.81 * 2.25, 1e-9); close(dyn.y, 0.4 * 1.5, 1e-9);
    expect(k.Pw_front_used).toBeCloseTo(w.earthPressures.P_water_front, 12);
    // sans eau à l'avant : ΣHf plus petit de 1,93 (même autre donnée)
    const w0 = analyzeRetainingWall(GEO, { ...soilW, frontWater: { enabled: false } }, loadsG(), conc, REBAR);
    expect(w0.lateral_nominal.some(x => x.name.includes('E_westergaard'))).toBe(false);
  });
});

describe('MUR-02 D9 - butée et profondeur de gel', () => {
  const soilP = (frost: SoilProperties['frost']) => soilG({ phi: 29, hSolAv: 1.5, frost });
  const geoP: WallGeometry = { ...GEO, epBase: 0.35 };
  const rp = (frost: SoilProperties['frost'], over: Partial<SoilProperties> = {}) =>
    analyzeRetainingWall(geoP, { ...soilP(frost), ...over }, loadsG(), conc, REBAR);
  it('case décochée : butée sur toute la hauteur (93,70 kN/m) et avertissement', () => {
    const r = rp({ deduct: false, df: 1.2 });
    close(r.earthPressures.P_passive_nominal, 93.70, 0.001);
    expect(r.notices.some(n => n.includes('permanent et non gélif'))).toBe(true);
    expect(r.frost.deduct).toBe(false);
  });
  it('case cochée, df = 1,2 m : Pp = ½·Kp·γ·(h_pass² − df²) ; bras par couches', () => {
    const r = rp({ deduct: true, df: 1.2 });
    const Kp = r.K_passive; const h = 1.85; const df = 1.2;
    close(r.earthPressures.P_passive_nominal, 0.5 * Kp * 19 * (h * h - df * df), 1e-9);
    // moment depuis la sous-face : ∫ Kpγz (h − z) dz de df à h
    const M = Kp * 19 * ((h * (h * h - df * df)) / 2 - (h * h * h - df * df * df) / 3);
    close(r.earthPressures.y_Pp, M / r.earthPressures.P_passive_nominal, 1e-9);
    expect(r.frost.deduct).toBe(true);
  });
  it('df ≥ h_pass : butée nulle ; df non saisie (0) : aucune déduction, avis', () => {
    expect(rp({ deduct: true, df: 2.0 }).earthPressures.P_passive_nominal).toBe(0);
    // MUR-02 §11 : « butée pleine avec avis » redonne la valeur antérieure
    const r0 = rp({ deduct: true, df: 0, noDf: 'full_with_notice' });
    close(r0.earthPressures.P_passive_nominal, 93.70, 0.001);
    expect(r0.notices.some(n => n.includes('df non saisie'))).toBe(true);
  });
  it('MUR-02 §11 : par défaut (case cochée, df = 0), Pp = 0 et avis', () => {
    for (const f of [{ deduct: true, df: 0 }, { deduct: true, df: 0, noDf: 'zero' as const }]) {
      const r = rp(f);
      expect(r.earthPressures.P_passive_nominal).toBe(0);
      expect(r.frost.df_missing).toBe(true);
      expect(r.frost.no_df_treatment).toBe('zero');
      expect(r.notices.some(n => n.includes('df non saisie') && n.includes('nulle'))).toBe(true);
      expect(r.combinations.every(c => c.status_sliding !== 'NON VÉRIFIABLE')).toBe(true);
    }
    expect(rp(undefined).earthPressures.P_passive_nominal).toBe(0); // projet ancien sans champ frost
  });
  it('MUR-02 §11 : « non vérifiable » -> glissement et renversement NON VÉRIFIABLES, butée nulle, portance inchangée', () => {
    const r = rp({ deduct: true, df: 0, noDf: 'not_verifiable' });
    expect(r.earthPressures.P_passive_nominal).toBe(0);
    expect(r.verifiable).toBe(true); // via un statut, pas via warnings
    expect(r.combinations.every(c => c.status_sliding === 'NON VÉRIFIABLE' && c.status_overturning === 'NON VÉRIFIABLE')).toBe(true);
    expect(r.governingBearing.status_bearing === 'OK' || r.governingBearing.status_bearing === 'NON').toBe(true);
    // df saisie : statuts normaux
    const ok = rp({ deduct: true, df: 1.2, noDf: 'not_verifiable' });
    expect(ok.combinations.every(c => c.status_sliding !== 'NON VÉRIFIABLE')).toBe(true);
  });
  it('MUR-02 §11 : critère de portance par défaut = moments (nouveau projet et projet sans valeur)', () => {
    expect(rp({ deduct: true, df: 1.2 }, { stabilityCriterion: undefined }).stabilityCriterion).toBe('moments');
  });
  it('avec nappe, la zone gelée est conservée comme surcharge (σ′v) : intégration par couches', () => {
    const r = rp({ deduct: true, df: 1.0 }, { hasWaterTable: true, waterTableHeight: 1.0 });
    const Kp = r.K_passive; const g = 19; const gp = 19 - 9.81; const zd = 0.85; const h = 1.85; const z0 = 1.0;
    let P = 0; let M = 0; const n = 20000; const dz = (h - z0) / n;
    for (let i = 0; i < n; i++) { const z = z0 + (i + 0.5) * dz; const sv = z <= zd ? g * z : g * zd + gp * (z - zd); P += Kp * sv * dz; M += Kp * sv * (h - z) * dz; }
    close(r.earthPressures.P_passive_nominal, P, 1e-5); close(r.earthPressures.y_Pp, M / P, 1e-4);
  });
});

describe('MUR-02 §3 - charge linéaire (fig. 20.8)', () => {
  it('m ≤ 0,4 : PH = 0,55·QL ; m > 0,4 : PH = 0,64·QL/(m² + 1) ; diagramme intégré = PH', () => {
    close(lineLoadThrust(100, 0.2, 4).PH, 55, 1e-12);
    close(lineLoadThrust(100, 1.0, 4).PH, 32, 1e-12);
    for (const m of [0.2, 0.8]) {
      const lt = lineLoadThrust(100, m, 4); let I = 0; const N = 4000;
      for (let i = 0; i < N; i++) I += lt.sigmaAt(((i + 0.5) / N) * 4) * (4 / N);
      close(I, lt.PH, 1e-4);
      expect(lt.zc).toBeGreaterThan(0); expect(lt.zc).toBeLessThan(4);
    }
  });
  it('le moteur utilise la fig. 20.8 (et non Ka·Fy·η)', () => {
    const al = [{ id: '1', name: 'Q', caseType: 'L' as const, nature: 'Fy' as const, magnitude: 50, x: 0.6 + 0.3 + 0.5, y: 0 }];
    const r = analyzeRetainingWall(GEO, soilG(), loadsG({ additionalLoads: al }), conc, REBAR);
    const m = 0.5 / 3.4; const PH = 0.55 * 50;
    expect(m).toBeLessThan(0.4);
    const f = r.lateral_nominal.find(x => x.name.includes('fig. 20.8'))!;
    close(f.Fx, PH, 1e-9);
  });
});

describe('MUR-02 §6 - béton A23.3-19', () => {
  it('E28 : c/d ≤ 0,8·700/(700 + fy) = 0,509 (et non 0,636)', () => {
    close(run().concreteDesign.mur_interieur.ductility_limit, 0.509, 0.002);
  });
  it('semelles : 7.8.1 0,002Ag ; espacement 7.8.3 ≤ min(5h ; 500) ; β = 0,21 si distance < 2dv ou h ≤ 350', () => {
    const r = run();
    close(r.concreteDesign.semelle_talon.As_min, 800, 1e-9); expect(r.concreteDesign.semelle_talon.spacing_max).toBe(500);
    const geoThin: WallGeometry = { ...GEO, epBase: 0.35 };
    const rt = analyzeRetainingWall(geoThin, soilG(), loadsG(), conc, REBAR);
    expect(rt.concreteDesign.semelle_talon.beta).toBe(0.21);
    // semelle de 400 mm : talon (1,5 m > 2dv) -> 230/(1000 + dv) ; patin (0,6 m ≥ 2dv = 0,598) -> idem
    close(r.concreteDesign.semelle_talon.beta, 230 / (1000 + r.concreteDesign.semelle_talon.dv), 1e-9);
  });
  it('voile : espacement ≤ min(3t ; 500) = 500 (t = 300 -> 900 ; limité à 500) et db ≤ t/10 = 30', () => {
    const d = run().concreteDesign.mur_interieur;
    expect(d.spacing_max).toBe(500); close(d.db_max!, 30, 1e-9); expect(d.spacing_ok).toBe(true); expect(d.db_ok).toBe(true);
    const wide = run(soilG(), loadsG(), { ...REBAR, mur_interieur: { barSize: '15M', spacing: 600 } });
    expect(wide.concreteDesign.mur_interieur.spacing_ok).toBe(false);
    expect(wide.concreteDesign.mur_interieur.checks_ok).toBe(false);
  });
  it('11.5.4 : N non pondéré (et non 0,9D)', () => {
    close(run().concreteDesign.cisaillement_friction.N, 3 * 0.3 * 24, 1e-12);
  });
});

describe('Robustesse : projet de démonstration complet, sans NaN', () => {
  it('nappe, séisme M-O avec kv, butée KPE, gel, eau à l\'avant, charge linéaire : toutes les valeurs sont finies', () => {
    const geo: WallGeometry = { wallType: 'cantilever', hMur: 3.8, epStem: 0.35, ePiedAv: 0.8, ePiedAr: 1.75, epBase: 0.35 };
    const soil: SoilProperties = soilG({
      phi: 29, hSolAv: 1.5, hasWaterTable: true, waterTableHeight: 2.5, frontWater: { enabled: true, hwAv: 1.85 }, frost: { deduct: true, df: 1.0 },
      stabilityCriterion: 'moments', qUltimate_ULS: 392, qAllowable_SLS: 130
    }, { seismicMethod: 'mononobe_okabe', seismicPassive: 'kpe', pga: 0.15 });
    const loads = loadsG({ surcharge: 12, kv: 0.1, additionalLoads: [{ id: 'a', name: 'Q', caseType: 'L', nature: 'Fy', magnitude: 40, x: 2.2, y: 0 }],
      pointLoadTop: { enabled: true, Fy: 12, Fx: 0, name: 'Charge tête' } });
    const r = analyzeRetainingWall(geo, soil, loads, conc, REBAR);
    const bad: string[] = [];
    const scan = (o: unknown, path: string) => {
      if (typeof o === 'number') { if (Number.isNaN(o)) bad.push(path); return; }
      if (o && typeof o === 'object') for (const [k, v] of Object.entries(o as Record<string, unknown>)) scan(v, `${path}.${k}`);
    };
    scan(r.combinations, 'combinations'); scan(r.concreteDesign, 'concreteDesign'); scan(r.earthPressures, 'earthPressures'); scan(r.seismic, 'seismic');
    expect(bad).toEqual([]);
    expect(r.combinations.filter(x => x.caseNo === 5).every(x => x.kvSign !== 0)).toBe(true);
    expect(r.seismic.method).toBe('mononobe_okabe');
  });
  it('mur de sous-sol avec séisme (Wood) et charges : aucun NaN', () => {
    const geo: WallGeometry = { ...GEO, wallType: 'basement' };
    const r = analyzeRetainingWall(geo, soilG({}, { seismicMethod: 'mononobe_okabe', pga: 0.2 }), loadsG({ kv: 0.05 }), conc, REBAR);
    expect(r.combinations.every(x => Number.isFinite(x.Ms) && Number.isFinite(x.mur_Mf) && Number.isFinite(x.q_design))).toBe(true);
  });
});
