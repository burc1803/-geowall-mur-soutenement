import { describe, it, expect } from 'vitest';
import { analyzeRetainingWall, CNB_2020_COMBINATIONS, CNB_2025_COMBINATIONS, DEFAULT_CNB_EDITION, FACTEUR_H_SISMIQUE, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG } from './analysis';
import { coulombKp, proppedTopReaction, stemSectionEffort, StemItem } from './wallMechanics';
import type { LoadsConfig, SoilProperties, WallGeometry } from './types';

const deg = (d: number) => (d * Math.PI) / 180;
const close = (a: number, b: number, relTol: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.abs(b) * relTol);

// Cas de référence MUR-00 §5 : mur en console, sans butée, sans surcharge, sans nappe
const GEO_R: WallGeometry = { wallType: 'cantilever', hMur: 3.0, epStem: 0.3, ePiedAv: 0.6, ePiedAr: 1.5, epBase: 0.4 };
const soilR = (over: Partial<SoilProperties> = {}): SoilProperties => ({
  gamma: 19, phi: 32, cohesion: 0, mu: 0.55, hSolAv: 0, qAllowable_SLS: 300, qUltimate_ULS: 2000,
  hasWaterTable: false, gamma_w: 9.81,
  methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'none', pga: 0.15, seismicDisplacementTolerance: 'free_cantilever', deltaFrictionRatio: 0.667 },
  geotechFactors: { phi_gu: 0.5, phi_gs: 0.8, phi_renv: 0.5, phi_p: 0.5, phi_coh: 0.6 },
  ...over
});
const loadsR = (over: Partial<LoadsConfig> = {}): LoadsConfig => ({
  surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1, kh: 0, kv: 0, ...over
});
const rebarR = { ...DEFAULT_REBAR_CONFIG, mur_interieur: { barSize: '15M' as const, spacing: 120 } };
const KA = Math.pow(Math.tan(deg(45 - 16)), 2);

describe('E19 - Kp de Coulomb', () => {
  it('phi = 32, delta = 0 : Rankine 3,25', () => {
    close(coulombKp(deg(32), 0), 3.2546, 0.002);
    close(coulombKp(deg(32), 0), Math.pow(Math.tan(deg(61)), 2), 1e-9);
  });
  it('delta = 21,34 deg : 7,34 (valeur de MUR-00)', () => {
    close(coulombKp(deg(32), deg(21.34)), 7.34, 0.005);
  });
  it('delta = 16 deg (phi/2) : valeur calculée 5,78 (et non 7,34 comme écrit dans MUR-01 §2)', () => {
    const kp = coulombKp(deg(32), deg(16));
    console.log('Kp Coulomb phi=32, delta=16 deg =', kp.toFixed(4));
    close(kp, 5.78, 0.005);
    expect(kp).toBeGreaterThan(coulombKp(deg(32), 0)); // l'ancienne formule donnait 1,69 < Rankine
  });
});

describe('CNB 2025 (option) - combinaisons', () => {
  const uls = CNB_2025_COMBINATIONS.filter(c => c.type === 'ULS');
  it('21 combinaisons ELU, H = 1,5 (cas 1-4) et 1,0 (cas 5, amendement A1), D stabilisant 0,9 (cas 2-4) ou 1,0 (cas 5)', () => {
    expect(uls.length).toBe(21);
    uls.forEach(c => expect(c.factors.H).toBe(c.caseNo === 5 ? 1.0 : 1.5));
    uls.filter(c => c.stabApplicable && c.caseNo >= 2 && c.caseNo <= 4).forEach(c => expect(c.factors.D).toBe(0.9));
    uls.filter(c => c.caseNo === 5).forEach(c => { expect(c.factors.D).toBe(1.0); expect(c.stabApplicable).toBe(true); });
    uls.filter(c => c.caseNo === 1).forEach(c => { expect(c.factors.D).toBe(1.4); expect(c.stabApplicable).toBe(false); });
  });
  it('charges d\'accompagnement prises égales à zéro : 4.1.3.2.(3)', () => {
    expect(uls.some(c => c.caseNo === 2 && c.factors.S === 0 && c.factors.W === 0 && c.factors.L === 1.5)).toBe(true);
    expect(uls.some(c => c.caseNo === 3 && c.factors.L === 0 && c.factors.W === 0 && c.factors.S === 1.0)).toBe(true);
    expect(uls.some(c => c.caseNo === 4 && c.factors.L === 0 && c.factors.S === 0 && c.factors.W === 1.0)).toBe(true);
  });
  it('charge variable stabilisante (surcharge sur le talon) : facteur 0 au glissement, facteur plein à la portance', () => {
    const base = analyzeRetainingWall(GEO_R, soilR(), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
    const withSur = analyzeRetainingWall(GEO_R, soilR(), loadsR({ surcharge: 10 }), DEFAULT_CONCRETE_PROPS, rebarR);
    const pick = (r: typeof base) => r.combinations.find(c => c.caseNo === 2 && c.factors.D === 0.9 && c.factors.S === 0 && c.factors.W === 0)!;
    // ΣV de stabilité identique : la surcharge ne stabilise pas
    close(pick(withSur).sumV_min, pick(base).sumV_min, 1e-9);
    // portance : on retient le pire des deux états (surcharge à 1,5 ou à 0) ; sumV_max vaut donc ΣV avec ou sans surcharge
    const dV = pick(withSur).sumV_max - pick(base).sumV_max;
    expect([0, 1.5 * 10 * 1.5].some(v => Math.abs(dV - v) < 1e-6)).toBe(true);
    expect(pick(withSur).q_design).toBeGreaterThanOrEqual(pick(base).q_design - 1e-9);
  });
});

describe('Cas R1 (MUR-00 §5.1)', () => {
  const r = analyzeRetainingWall(GEO_R, soilR(), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
  const c09 = r.combinations.find(c => c.caseNo === 2 && c.factors.D === 0.9 && c.factors.S === 0 && c.factors.W === 0)!;
  const c125 = r.combinations.find(c => c.caseNo === 2 && c.factors.D === 1.25 && c.factors.S === 0 && c.factors.W === 0)!;
  const c14 = r.combinations.find(c => c.caseNo === 1)!;
  it('Ka et Pa', () => { close(r.K_active, 0.3073, 0.002); close(r.earthPressures.P_active_nominal, 33.74, 0.005); });
  it('glissement 0,9D + 1,5H : FS = 1,018 ; 1,25D : 1,414', () => {
    close(c09.FOS_sliding, 1.018, 0.005);
    close(c125.FOS_sliding, 1.414, 0.005);
  });
  // MUR-02 §2.3 et §7.1 (E08) : Ψ·φ_ov·ΣM_stab / ΣM_renv = 0,50 x 2,901 = 1,451 (l'ancien test attendait 2,901 sans φ_ov)
  it('renversement 0,9D + 1,5H : Ψφ_ov·Ms/Mr = 1,451 (MUR-02 §7.1)', () => { close(c09.FOS_overturning, 1.451, 0.005); });
  it('portance cas 1 (1,4D + 1,5H) facteurs cohérents : e = 0,094, q_toe = 93,7, q_heel = 58,1', () => {
    close(c14.ecc, 0.094, 0.02);
    close(c14.q_toe, 93.7, 0.005);
    close(c14.q_heel, 58.1, 0.005);
    expect(c14.distributionCase).toBe('Cas 2');
  });
  it('portance 0,9D + 1,5H : q_toe = 81,6', () => { close(c09.q_toe, 81.6, 0.005); });
  it('critère excentricité : B′ = 2,212 m, q = 82,4 kPa (cas 1) ; B′ = 1,862, q = 62,9 (0,9D)', () => {
    const re = analyzeRetainingWall(GEO_R, soilR({ stabilityCriterion: 'eccentricity' }), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
    const e14 = re.combinations.find(c => c.caseNo === 1)!;
    const e09 = re.combinations.find(c => c.caseNo === 2 && c.factors.D === 0.9 && c.factors.S === 0 && c.factors.W === 0)!;
    close(e14.B_eff, 2.212, 0.005); close(e14.q_design, 82.4, 0.005);
    close(e09.B_eff, 1.862, 0.005); close(e09.q_design, 62.9, 0.005);
    expect(re.stabilityCriterion).toBe('eccentricity');
  });
  it('voile 1,5H : Mf = Vf = 39,41', () => { close(c14.mur_Mf, 39.41, 0.005); close(c14.mur_Vf, 39.41, 0.005); });
  it('béton : d, dv, Vc, a, Mr, z, ld', () => {
    const d = r.concreteDesign.mur_interieur;
    expect(d.d).toBeCloseTo(232, 0);
    expect(d.dv).toBeCloseTo(216, 0);
    close(d.Vc, 145.5, 0.005);
    close(d.a_stress_block, 36.10, 0.005);
    close(d.Mr, 121.24, 0.005);
    close(d.Z_factor!, 22350, 0.005); // MUR-02 §7.1 : enrobage pris ≤ 50 mm pour dc et A (10.6.1) ; l'ancien test attendait 24 850 avec un enrobage de 60 mm
    close(d.ld, 420.7, 0.005); // 15M : k4 = 0,8, k1 = 1,0
    expect(d.As_ok).toBe(true);
  });
  it('E12 : talon (barres supérieures) k1 = 1,3 ; 25M k4 = 1,0', () => {
    expect(r.concreteDesign.semelle_talon.ld_k1).toBe(1.3);
    const r25 = analyzeRetainingWall(GEO_R, soilR(), loadsR(), DEFAULT_CONCRETE_PROPS, { ...rebarR, mur_interieur: { barSize: '25M', spacing: 250 } });
    expect(r25.concreteDesign.mur_interieur.ld_k4).toBe(1.0);
    expect(r.concreteDesign.mur_interieur.ld_k4).toBe(0.8);
  });
  it('E03 / MUR-02 D19 (11.5.4) : N = poids du voile NON pondéré ; armature des deux faces', () => {
    const f = r.concreteDesign.cisaillement_friction;
    close(f.N, 3.0 * 0.3 * 24, 1e-9); // l'ancien test attendait 0,9 x le poids (MUR-01 E03)
    close(f.As_crossing, r.concreteDesign.mur_interieur.As_provided + r.concreteDesign.mur_exterieur.As_provided, 1e-9);
  });
});

describe('Cas R2 (MUR-00 §5.2) - sismique kh = 0,15', () => {
  const soilS = soilR({ methodConfig: { ...soilR().methodConfig!, seismicMethod: 'seed_whitman' } });
  const r = analyzeRetainingWall(GEO_R, soilS, loadsR({ kh: 0.15 }), DEFAULT_CONCRETE_PROPS, rebarR);
  it('valeurs nominales : ΔPae = 12,35 à 2,04 m ; inerties 3,24 et 3,456', () => {
    close(r.earthPressures.delta_Pae_seed, 12.35, 0.005);
    close(r.earthPressures.y_Pae, 2.04, 1e-9);
    close(r.earthPressures.E_stem_nominal, 3.24, 1e-9);
    close(r.earthPressures.E_base_nominal, 3.456, 1e-9);
  });
  it('Kae (M-O, δ = 0 sur le plan fictif, D11) = 0,4025 ; Ka Coulomb = 0,2750', () => {
    // MUR-02 §4.2 et §7.2 : PA et KAE prennent le même δ (E13b) ; δ = 0 avec Rankine -> KAE = 0,4025 (l'ancien test utilisait δ = 21,34° : 0,3799)
    const rm = analyzeRetainingWall(GEO_R, soilR({ methodConfig: { ...soilR().methodConfig!, seismicMethod: 'mononobe_okabe' } }), loadsR({ kh: 0.15 }), DEFAULT_CONCRETE_PROPS, rebarR);
    close(rm.earthPressures.Kae_mo, 0.4025, 0.002);
    close(rm.earthPressures.Ka_coulomb, 0.2750, 0.002);
    close(rm.earthPressures.Kp_coulomb, 7.34, 0.005); // Kp avec δ = 21,34° (E19)
  });
  it('E01 : efforts du voile avec 1,0H + 1,0E (facteurs de MUR-00) : Mf = 48,44, Vf = 39,13', () => {
    const f = { D: 1, L: 0, S: 0, W: 0, E: 1, H: 1 };
    const kg = KA * 19;
    const items: StemItem[] = [
      { kind: 'linear', type: 'H', label: 'terres', z1: 0, z2: 3, a: 0, b: kg },
      { kind: 'point', type: 'E', label: 'dPae', z: 1.2, F: 0.375 * 0.15 * 19 * 9 },
      { kind: 'point', type: 'E', label: 'inertie', z: 1.5, F: 0.15 * 3 * 0.3 * 24 }
    ];
    const e = stemSectionEffort(items, f, 3);
    close(e.M, 48.44, 0.005);
    close(e.V, 39.13, 0.005);
  });
  it('E01 : combinaison du cas 5 (H = 1,0 selon amendement A1) : Mf = 48,44, Vf = 39,13', () => {
    const c5 = r.combinations.find(c => c.caseNo === 5)!;
    close(c5.mur_Mf, 1.0 * 26.27 + 17.31 + 4.86, 0.005);
    close(c5.mur_Vf, 1.0 * 26.27 + 9.62 + 3.24, 0.005);
  });
  it('glissement cas 5 (1,0D + 1,0E + 1,0H, avec inertie du sol du talon : MUR-02 §4.4, D21)', () => {
    const c5 = r.combinations.find(c => c.caseNo === 5)!;
    const sumH = 1.0 * 33.746 + 12.355 + 3.24 + 3.456 + 12.825; // + kh·W du sol du talon = 0,15 x 85,5
    close(c5.sumH, sumH, 0.005);
    close(c5.FOS_sliding, (130.14 * 0.55 * 0.8) / sumH, 0.005);
  });
});

describe('E10 - réaction en tête 0,2·P', () => {
  const f = { D: 1, L: 0, S: 0, W: 0, E: 0, H: 1 };
  it('poussée triangulaire de résultante P : R = 0,2·P', () => {
    const L = 3; const w = 20; // pression max w au pied, nulle en tête
    const P = 0.5 * w * L;
    const items: StemItem[] = [{ kind: 'linear', type: 'H', label: 'tri', z1: 0, z2: L, a: 0, b: w / L }];
    close(proppedTopReaction(items, f, L), 0.2 * P, 1e-9);
    const e = stemSectionEffort(items, f, L, 0.2 * P);
    close(e.M, w * L * L / 15, 1e-6); // moment d'encastrement wL²/15
  });
  it('charge uniforme W : R = 3W/8', () => {
    const items: StemItem[] = [{ kind: 'linear', type: 'H', label: 'unif', z1: 0, z2: 4, a: 10, b: 0 }];
    close(proppedTopReaction(items, f, 4), 0.375 * 40, 1e-9);
  });
  it('analyse complète, mur de sous-sol : R_top (cas 1) = 1,5 x 0,2 x ½·K0·γ·h²', () => {
    const geo: WallGeometry = { ...GEO_R, wallType: 'basement' };
    const r = analyzeRetainingWall(geo, soilR(), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
    const K0 = 1 - Math.sin(deg(32));
    close(r.R_top, 1.5 * 0.2 * 0.5 * K0 * 19 * 9, 1e-6);
  });
});

describe('E02 - nappe : sous-pression et sol déjaugé', () => {
  it('la nappe réduit le glissement (sous-pression) par rapport au sol sec', () => {
    const dry = analyzeRetainingWall(GEO_R, soilR(), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
    const wet = analyzeRetainingWall(GEO_R, soilR({ hasWaterTable: true, waterTableHeight: 2.0 }), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
    expect(wet.critical_sliding_ULS).toBeLessThan(dry.critical_sliding_ULS);
    expect(wet.hydro.uplift_nominal).toBeCloseTo(9.81 * 2.0 * 2.4, 6);
    const c = (r: typeof dry) => r.combinations.find(x => x.caseNo === 2 && x.factors.D === 0.9 && x.factors.S === 0 && x.factors.W === 0)!;
    // ΣV(stabilité) = 0,9·(voile + semelle + sol à γ′ sous la nappe) + 1,5·(poids de l eau sur le talon) − 1,5·U (audit MUR-01 : 60,62)
    const hSub = 2.0 - 0.4;
    const W = 21.6 + 23.04 + (1.4 * 19 + hSub * (19 - 9.81)) * 1.5;
    const eau = 9.81 * hSub * 1.5;
    const U = 9.81 * 2.0 * 2.4;
    close(c(wet).sumV_min, 0.9 * W + 1.5 * eau - 1.5 * U, 1e-6);
    close(c(wet).sumV_min, 60.62, 0.002);
    // cas 1 : V = 116,12 ; e = 0,247 ; q = 78,2
    const c1 = wet.combinations.find(x => x.caseNo === 1)!;
    close(c1.sumV_max, 116.12, 0.002);
    close(c1.ecc, 0.247, 0.01);
    close(c1.q_toe, 78.2, 0.005);
  });
});

describe('Deux sols et critère par défaut', () => {
  it('fondation : c′ de la fondation entre dans le glissement ; critère par défaut = moments', () => {
    const a = analyzeRetainingWall(GEO_R, soilR(), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
    const b = analyzeRetainingWall(GEO_R, soilR({ foundation: { gamma: 19, phi: 32, cohesion: 10 } }), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
    expect(a.stabilityCriterion).toBe('moments');
    expect(b.critical_sliding_ULS).toBeGreaterThan(a.critical_sliding_ULS);
  });
});

describe('Audit MUR-01 - résultante côté talon / hors base', () => {
  const reac = (M: number) => ({ D: { Rx: 0, Ry: 0, M }, L: { Rx: 0, Ry: 0, M: 0 }, S: { Rx: 0, Ry: 0, M: 0 }, W: { Rx: 0, Ry: 0, M: 0 }, E: { Rx: 0, Ry: 0, M: 0 }, H: { Rx: 0, Ry: 0, M: 0 } });
  const pick = (r: ReturnType<typeof analyzeRetainingWall>) => r.combinations.find(c => c.caseNo === 2 && c.factors.D === 0.9 && c.factors.S === 0 && c.factors.W === 0)!;
  it('M = -100 kN·m/m, 0,9D : côté talon ; moment D vers le talon à 1,25 (contre-audit) : x1 = 1,998, q = 194,4 kPa au talon (111,5 si le moment était à 0,9)', () => {
    const c = pick(analyzeRetainingWall(GEO_R, soilR(), loadsR({ reactionsTop: reac(-100) }), DEFAULT_CONCRETE_PROPS, rebarR));
    close(c.q_heel, 2 * 117.13 / (3 * (2.4 - 1.998)), 0.005);
    expect(c.q_toe).toBe(0);
    close(c.q_design, 194.4, 0.005);
    expect(c.outside_base).toBeNull();
  });
  it('M = -250 : résultante hors de la base -> portance et renversement NON avec message', () => {
    const c = pick(analyzeRetainingWall(GEO_R, soilR(), loadsR({ reactionsTop: reac(-250) }), DEFAULT_CONCRETE_PROPS, rebarR));
    expect(c.outside_base).toBe('heel');
    expect(c.status_bearing).toBe('NON');
    expect(c.status_overturning).toBe('NON');
    expect(c.stability_message.length).toBeGreaterThan(0);
  });
});

describe('Audit MUR-01 - D défavorable au facteur maximal', () => {
  it('surcharge de 10 kPa de type D, 0,9D : H = 63,67 ; FS = 0,903', () => {
    const r = analyzeRetainingWall(GEO_R, soilR(), loadsR({ surcharge: 10, surchargeType: 'D' }), DEFAULT_CONCRETE_PROPS, rebarR);
    const c = r.combinations.find(x => x.caseNo === 2 && x.factors.D === 0.9 && x.factors.S === 0 && x.factors.W === 0)!;
    close(c.sumH, 63.67, 0.002);
    close(c.FOS_sliding, 0.903, 0.005);
  });
});

describe('Amendement A2 - hauteur de butée depuis la sous-face', () => {
  const geoA2: WallGeometry = { ...GEO_R, epBase: 0.35 };
  it('hSolAv = 1,50, epBase = 0,35, φ = 29°, γ = 19 : Kp = 2,8821, Pp = 93,70 kN/m à 0,617 m', () => {
    const r = analyzeRetainingWall(geoA2, soilR({ phi: 29, hSolAv: 1.5 }), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
    close(r.K_passive, 2.8821, 0.001);
    close(r.earthPressures.h_pass, 1.85, 1e-9);
    close(r.earthPressures.P_passive_nominal, 93.70, 0.001);
    close(r.earthPressures.y_Pp, 0.617, 0.001);
  });
  it('hSolAv = 0 : butée nulle', () => {
    const r = analyzeRetainingWall(geoA2, soilR({ phi: 29, hSolAv: 0 }), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
    expect(r.earthPressures.P_passive_nominal).toBe(0);
    expect(r.earthPressures.h_pass).toBe(0);
  });
});

describe('Amendement A3 - butée sous la nappe et eau à l\'avant', () => {
  const geoA3: WallGeometry = { ...GEO_R, epBase: 0.35 };
  const wet = (hw: number, extra: Partial<SoilProperties> = {}) =>
    analyzeRetainingWall(geoA3, soilR({ phi: 29, hSolAv: 1.5, hasWaterTable: true, waterTableHeight: hw, ...extra }), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
  it('exemple par défaut (hw = 2,5, zone de butée entièrement sous la nappe) : Pp′ = 45,32 kN/m à 0,617 m', () => {
    const r = wet(2.5);
    close(r.earthPressures.P_passive_nominal, 0.5 * 2.8821 * 9.19 * 1.85 * 1.85, 0.001);
    close(r.earthPressures.P_passive_nominal, 45.32, 0.002);
    close(r.earthPressures.y_Pp, 0.617, 0.001);
    expect(r.earthPressures.frontWaterScenario).toBe('A');
    expect(r.earthPressures.P_water_front).toBe(0);
  });
  it('option B, hw,av = 1,85 : Pw,a = 16,79 kN/m à 0,617 m', () => {
    const r = wet(2.5, { frontWater: { enabled: true, hwAv: 1.85 } });
    close(r.earthPressures.P_water_front, 16.79, 0.002);
    close(r.earthPressures.y_Pw_front, 0.617, 0.001);
    expect(r.earthPressures.frontWaterScenario).toBe('B');
    // Pw,a est ajoutée à la résistance au glissement (mêmes facteurs que la butée)
    const a = wet(2.5);
    expect(r.critical_sliding_ULS).toBeGreaterThan(a.critical_sliding_ULS);
  });
  it('sans nappe : Pw,a = 0 même si l\'option est cochée (avis non bloquant)', () => {
    const r = analyzeRetainingWall(geoA3, soilR({ phi: 29, hSolAv: 1.5, frontWater: { enabled: true, hwAv: 1.85 } }), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
    expect(r.earthPressures.P_water_front).toBe(0);
    expect(r.earthPressures.frontWaterScenario).toBe('A');
    expect(r.notices.length).toBeGreaterThan(0);
    expect(r.verifiable).toBe(true);
  });
  it('hw,av > hw : Pw,a calculée avec hw (avis)', () => {
    const r = wet(1.0, { frontWater: { enabled: true, hwAv: 1.85 } });
    close(r.earthPressures.P_water_front, 0.5 * 9.81 * 1.0 * 1.0, 1e-9);
    close(r.earthPressures.hw_av, 1.0, 1e-9);
    expect(r.notices.some(n => n.includes('limité'))).toBe(true);
    expect(r.verifiable).toBe(true);
  });
  it('butée partiellement sous la nappe (hw = 1,0 : sec sur 0,85 m, déjaugé sur 1,0 m) : intégration par couches', () => {
    const r = wet(1.0);
    const Kp = r.K_passive; const g = 19; const gp = 19 - 9.81; const zd = 0.85; const h = 1.85;
    const P = Kp * (0.5 * g * zd * zd + g * zd * (h - zd) + 0.5 * gp * (h - zd) * (h - zd));
    // moment par rapport à la sous-face : ∫ p(z)·(h − z) dz, intégré numériquement
    let M = 0; const n = 20000; const dz = h / n;
    for (let i = 0; i < n; i++) { const z = (i + 0.5) * dz; const sv = z <= zd ? g * z : g * zd + gp * (z - zd); M += Kp * sv * (h - z) * dz; }
    close(r.earthPressures.P_passive_nominal, P, 1e-6);
    close(r.earthPressures.y_Pp, M / P, 1e-4);
  });
  it('sans nappe : Pp = 93,70 kN/m (A2 inchangé)', () => {
    const r = analyzeRetainingWall(geoA3, soilR({ phi: 29, hSolAv: 1.5 }), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
    close(r.earthPressures.P_passive_nominal, 93.70, 0.001);
    close(r.earthPressures.y_Pp, 0.617, 0.001);
  });
});

describe('Note de calcul - composantes horizontales exposées', () => {
  it('somme des composantes = ΣH non pondéré du moteur, avec et sans nappe', () => {
    for (const water of [false, true]) {
      const r = analyzeRetainingWall(GEO_R, soilR(water ? { hasWaterTable: true, waterTableHeight: 2.0 } : {}), loadsR({ surcharge: 10, surchargeType: 'H' }), DEFAULT_CONCRETE_PROPS, rebarR);
      // ELS 11 : 1,0D + 1,0H, sans appui en tête -> ΣH = somme des Fx non pondérées de type H
      const els11 = r.combinations.find(c => c.combName.includes('ELS 11'))!;
      const sum = r.lateral_nominal.reduce((s, c) => s + c.Fx, 0);
      close(sum, els11.sumH, 1e-9);
      if (water) expect(r.lateral_nominal.some(c => c.name === 'Pw_eau_hydrostatique')).toBe(true);
    }
  });
});

describe('Moment de tête, mur appuyé', () => {
  it('moment M0 en tête : R = 3·M0/(2L)', () => {
    const f = { D: 1, L: 0, S: 0, W: 0, E: 0, H: 1 };
    const items: StemItem[] = [{ kind: 'moment', type: 'H', label: 'M', z: 0, M: 10 }];
    close(proppedTopReaction(items, f, 3), 3 * 10 / (2 * 3), 1e-9);
  });
});

describe('Contre-audit MUR-01 - D vers le talon au facteur maximal', () => {
  it('reactionsTop.D.M = -150, 0,9D : poids à 0,9 et moment à 1,25 -> x1 = 2,532 > B : hors base, portance NON', () => {
    const reac = { D: { Rx: 0, Ry: 0, M: -150 }, L: { Rx: 0, Ry: 0, M: 0 }, S: { Rx: 0, Ry: 0, M: 0 }, W: { Rx: 0, Ry: 0, M: 0 }, E: { Rx: 0, Ry: 0, M: 0 }, H: { Rx: 0, Ry: 0, M: 0 } };
    const r = analyzeRetainingWall(GEO_R, soilR(), loadsR({ reactionsTop: reac }), DEFAULT_CONCRETE_PROPS, rebarR);
    const c = r.combinations.find(x => x.caseNo === 2 && x.factors.D === 0.9 && x.factors.S === 0 && x.factors.W === 0)!;
    expect(c.outside_base).toBe('heel');
    expect(c.status_bearing).toBe('NON');
    expect(c.status_overturning).toBe('NON');
    expect(r.governingOverturning.status_overturning).toBe('NON');
    expect(r.critical_overturning_ULS).toBe(0);
    // x1 de l'état « talon » : (166,43 + 1,25 x 150 - 57,36) / 117,13
    close((166.43 + 187.5 - 57.36) / 117.13, 2.532, 0.002);
  });
});

describe('Contre-audit n°2 - mode talon : Fx > 0 et Mz > 0 gardent 0,9', () => {
  it('surcharge D 10 kPa + moment de tête D = -135, 0,9D : x1 = 2,175, q = 387,0 kPa', () => {
    const reac = { D: { Rx: 0, Ry: 0, M: -135 }, L: { Rx: 0, Ry: 0, M: 0 }, S: { Rx: 0, Ry: 0, M: 0 }, W: { Rx: 0, Ry: 0, M: 0 }, E: { Rx: 0, Ry: 0, M: 0 }, H: { Rx: 0, Ry: 0, M: 0 } };
    const r = analyzeRetainingWall(GEO_R, soilR(), loadsR({ surcharge: 10, surchargeType: 'D', reactionsTop: reac }), DEFAULT_CONCRETE_PROPS, rebarR);
    const c = r.combinations.find(x => x.caseNo === 2 && x.factors.D === 0.9 && x.factors.S === 0 && x.factors.W === 0)!;
    close(c.q_heel, 387.0, 0.005);
    close(c.x1, 2.175, 0.003);
  });
  it('γ ≤ γw avec nappe : alerte', () => {
    const r = analyzeRetainingWall(GEO_R, soilR({ gamma: 9, hasWaterTable: true, waterTableHeight: 1 }), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.verifiable).toBe(false);
    expect(analyzeRetainingWall(GEO_R, soilR(), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR).verifiable).toBe(true);
  });
});

describe('Amendement A1 - édition du CNB', () => {
  const u20 = CNB_2020_COMBINATIONS.filter(c => c.type === 'ULS');
  const u25 = CNB_2025_COMBINATIONS.filter(c => c.type === 'ULS');
  const has = (l: typeof u20, caseNo: number, f: Partial<Record<'D' | 'L' | 'S' | 'W' | 'E' | 'H', number>>) =>
    l.some(c => c.caseNo === caseNo && (Object.keys(f) as (keyof typeof f)[]).every(k => c.factors[k] === f[k]));
  it('2020 est l\'édition par défaut', () => {
    expect(DEFAULT_CNB_EDITION).toBe('2020');
    expect(analyzeRetainingWall(GEO_R, soilR(), loadsR(), DEFAULT_CONCRETE_PROPS, rebarR).cnbEdition).toBe('2020');
    expect(analyzeRetainingWall(GEO_R, soilR(), loadsR({ cnbEdition: '2025' }), DEFAULT_CONCRETE_PROPS, rebarR).cnbEdition).toBe('2025');
  });
  it('facteurs du tableau 4.1.3.2.-A, CNB 2020', () => {
    expect(u20.length).toBe(21);
    expect(has(u20, 1, { D: 1.4 })).toBe(true);
    expect(has(u20, 2, { L: 1.5, S: 1.0 })).toBe(true);
    expect(has(u20, 2, { L: 1.5, W: 0.4 })).toBe(true);
    expect(has(u20, 3, { S: 1.5, L: 1.0 })).toBe(true);
    expect(has(u20, 3, { S: 1.5, W: 0.4 })).toBe(true);
    expect(has(u20, 4, { W: 1.4, L: 0.5 })).toBe(true);
    expect(has(u20, 4, { W: 1.4, S: 0.5 })).toBe(true);
    expect(has(u20, 5, { D: 1.0, E: 1.0, L: 0.5, S: 0.25 })).toBe(true);
  });
  it('facteurs du tableau 4.1.3.2.-A, CNB 2025', () => {
    expect(has(u25, 2, { L: 1.5, S: 0.7 })).toBe(true);
    expect(has(u25, 2, { L: 1.5, W: 0.3 })).toBe(true);
    expect(has(u25, 3, { S: 1.0, L: 1.0 })).toBe(true);
    expect(has(u25, 3, { S: 1.0, W: 0.3 })).toBe(true);
    expect(has(u25, 4, { W: 1.0, L: 0.5 })).toBe(true);
    expect(has(u25, 4, { W: 1.0, S: 0.35 })).toBe(true);
    expect(has(u25, 5, { D: 1.0, E: 1.0, L: 0.5, S: 0.15 })).toBe(true);
    expect(has(u20, 3, { S: 1.0, L: 0 })).toBe(false); // cas 3 : 1,5S en 2020
  });
  it('H = 1,0 au cas 5 (deux éditions), 1,5 aux cas 1 à 4', () => {
    expect(FACTEUR_H_SISMIQUE).toBe(1.0);
    for (const l of [u20, u25]) {
      l.forEach(c => expect(c.factors.H).toBe(c.caseNo === 5 ? 1.0 : 1.5));
    }
  });
});
