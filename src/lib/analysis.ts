import { 
  AnalysisResult, 
  CombinationResult, 
  LoadCaseType, 
  LoadsConfig, 
  SoilProperties, 
  WallGeometry, 
  ConcreteProperties, 
  ConcreteDesignSummary, 
  ConcreteElementDesign,
  EarthPressureCalculations,
  SoilMethodConfig,
  SoilPresetType,
  CanadianBarSize,
  CANADIAN_REBAR_CATALOG,
  RebarCustomConfig,
  FoundationSoilProperties,
  StabilityCriterion,
  CnbEdition
} from './types';
import { solveBeamFEM, SupportBoundary } from './fem';
import { coulombKp, StemItem, stemItemFactor, stemSectionEffort, proppedTopReaction } from './wallMechanics';

export const DEFAULT_SOIL_METHOD_CONFIG: SoilMethodConfig = {
  activeMethod: 'rankine',
  passiveMethod: 'rankine',
  seismicMethod: 'seed_whitman',
  pga: 0.15,
  seismicDisplacementTolerance: 'free_cantilever',
  deltaFrictionRatio: 0.667
};

export const DEFAULT_REBAR_CONFIG: RebarCustomConfig = {
  mode: 'manual',
  mur_interieur: { barSize: '15M', spacing: 120 },
  mur_exterieur: { barSize: '15M', spacing: 240 },
  mur_horizontal: { barSize: '15M', spacing: 250 },
  semelle_talon: { barSize: '15M', spacing: 200 },
  semelle_orteil: { barSize: '15M', spacing: 200 }
};

export const SOIL_PRESETS: Record<SoilPresetType, { 
  name: string; 
  description: string;
  gamma: number; 
  phi: number; 
  cohesion: number; 
  mu: number; 
  qAllowable_SLS: number; 
  qUltimate_ULS: number; 
}> = {
  dense_gravel: { 
    name: 'Gravier Dense / Enrochement', 
    description: 'Sol granulaire compact, haute friction, excellent drainage',
    gamma: 21.0, phi: 38.0, cohesion: 0, mu: 0.60, qAllowable_SLS: 250, qUltimate_ULS: 650 
  },
  compact_sand: { 
    name: 'Sable Compact (Standard)', 
    description: 'Remblai sélectionné standard selon CNB/CFEM',
    gamma: 19.0, phi: 32.0, cohesion: 0, mu: 0.55, qAllowable_SLS: 150, qUltimate_ULS: 420 
  },
  silty_sand: { 
    name: 'Sable Limoneux / Remblai Modéré', 
    description: 'Sable fin ou silteux de densité moyenne',
    gamma: 18.0, phi: 28.0, cohesion: 0, mu: 0.45, qAllowable_SLS: 110, qUltimate_ULS: 320 
  },
  cohesive_soil: { 
    name: 'Sol Cohésif Frottant (c-φ)', 
    description: 'Mélange argile/sable avec cohésion effective',
    gamma: 18.5, phi: 24.0, cohesion: 15.0, mu: 0.45, qAllowable_SLS: 120, qUltimate_ULS: 350 
  },
  stiff_clay: { 
    name: 'Argile Raide Non-drainée', 
    description: 'Argile consistante avec cohésion prépondérante',
    gamma: 17.5, phi: 18.0, cohesion: 35.0, mu: 0.35, qAllowable_SLS: 90, qUltimate_ULS: 260 
  },
  custom: { 
    name: 'Sol Personnalisé (Manuel)', 
    description: 'Valeurs définies manuellement par l’ingénieur géotechnique',
    gamma: 19.0, phi: 29.0, cohesion: 0, mu: 0.55, qAllowable_SLS: 130, qUltimate_ULS: 392 
  }
};

export const DEFAULT_CONCRETE_PROPS: ConcreteProperties = {
  fc_mur: 30.0,
  fc_semelle: 30.0,
  fy: 400.0,
  gamma_c: 24.0,
  phi_c: 0.65,
  phi_s: 0.85,
  aggregate_size: 20.0,
  cover_h: 60.0,
  cover_v: 60.0,
  cover_base_bottom: 75.0,
};

/**
 * Combinaisons de charges — CNB 2020 (défaut) ou CNB 2025, 4.1.3.2 et tableau 4.1.3.2.-A (sans pont roulant),
 * fiche MUR-01 §1 et amendement A1 (§5.1).
 *  Cas 1 : 1,4D
 *  Cas 2 : (1,25D ou 0,9D) + 1,5L ; accompagnement 2020 : 1,0S ou 0,4W ; 2025 : 0,7S ou 0,3W
 *  Cas 3 : (1,25D ou 0,9D) + 1,5S (2020) / 1,0S (2025) ; accompagnement 2020 : 1,0L ou 0,4W ; 2025 : 1,0L ou 0,3W
 *  Cas 4 : (1,25D ou 0,9D) + 1,4W (2020) / 1,0W (2025) ; accompagnement 2020 : 0,5L ou 0,5S ; 2025 : 0,5L ou 0,35S
 *  Cas 5 : 1,0D + 1,0E, accompagnement 0,5L + 0,25S (2020) / 0,5L + 0,15S (2025)
 * 4.1.3.2.(3) : chaque cas est aussi généré avec les charges d'accompagnement prises égales à zéro.
 * 4.1.3.2.(4) : poussée latérale des terres H avec le facteur 1,5.
 * 4.1.3.2.(5) : la charge permanente qui s'oppose vaut 0,9D (cas 2, 3, 4) ou 1,0D (cas 5) : variantes 0,9D générées
 *   explicitement, seules ces variantes (et le cas 5) sont soumises au glissement et au renversement.
 * Une combinaison = un seul jeu de facteurs. Une charge variable qui stabilise reçoit le facteur 0 dans
 * les vérifications où elle est favorable (voir analyzeRetainingWall).
 */
export const FACTEUR_H = 1.5; // 4.1.3.2.(4)
// Facteur de H au cas 5 (amendement A1, décision D16 option A) : 1,0 dans les deux éditions.
// Sources : note A-4.1.3.2.(4) du CNB 2020 (même texte en 2025) : « 1,5H doit être ajouté aux combinaisons 2, 3 et 4 » ;
// tableau A-3 du Commentaire A du CNB 2020 : 1,0 pour D, H, T et P avec E. Commentaire de 2025 : À CONFIRMER.
export const FACTEUR_H_SISMIQUE = 1.0;

export interface LoadCombination {
  name: string;
  formula: string;
  type: 'ULS' | 'SLS';
  factors: Record<LoadCaseType, number>;
  caseNo: number; // 1 à 5 (ELU), 0 (ELS)
  stabApplicable: boolean; // glissement / renversement applicables
  soilRule: 'case1' | 'raised' | 'same'; // facteur du poids du sol porté : 4.1.3.2.(8) et (9)
  Dunfav: number; // facteur maximal de D pour une action permanente DÉFAVORABLE (4.1.3.2.(5) ne réduit que D qui s'oppose)
}

function formatFormula(f: Record<LoadCaseType, number>): string {
  const order: LoadCaseType[] = ['D', 'L', 'S', 'W', 'E', 'H'];
  return order.filter(k => f[k] > 0).map(k => `${f[k]}${k}`).join(' + ');
}

function buildULSCombinations(edition: CnbEdition): LoadCombination[] {
  const is2020 = edition === '2020';
  const out: LoadCombination[] = [];
  const add = (caseNo: number, D: number, extra: Partial<Record<LoadCaseType, number>>, soilRule: LoadCombination['soilRule'], stab: boolean) => {
    const factors: Record<LoadCaseType, number> = { D, L: 0, S: 0, W: 0, E: 0, H: caseNo === 5 ? FACTEUR_H_SISMIQUE : FACTEUR_H, ...extra };
    const formula = formatFormula(factors);
    const Dunfav = caseNo === 1 ? 1.4 : caseNo === 5 ? 1.0 : 1.25;
    out.push({ name: `Cas ${caseNo} (${formula})`, formula, type: 'ULS', factors, caseNo, stabApplicable: stab, soilRule, Dunfav });
  };
  add(1, 1.4, {}, 'case1', false);
  for (const D of [1.25, 0.9]) {
    const stab = D === 0.9;
    const sr = stab ? 'same' : 'raised';
    for (const acc of [{}, is2020 ? { S: 1.0 } : { S: 0.7 }, is2020 ? { W: 0.4 } : { W: 0.3 }]) add(2, D, { L: 1.5, ...acc }, sr, stab);
    for (const acc of [{}, { L: 1.0 }, is2020 ? { W: 0.4 } : { W: 0.3 }]) add(3, D, { S: is2020 ? 1.5 : 1.0, ...acc }, sr, stab);
    for (const acc of [{}, { L: 0.5 }, is2020 ? { S: 0.5 } : { S: 0.35 }]) add(4, D, { W: is2020 ? 1.4 : 1.0, ...acc }, sr, stab);
  }
  for (const acc of [{}, { L: 0.5, S: is2020 ? 0.25 : 0.15 }]) add(5, 1.0, { E: 1.0, ...acc }, 'same', true);
  return out;
}

const SLS_COMBINATIONS: LoadCombination[] = [
  // --- ÉLTS / SLS COMBINATIONS (inchangées) ---
  { name: 'Combinaison ELS 1 (1D + 1H + 1L)', formula: '1.0D + 1.0H + 1.0L', type: 'SLS', factors: { D: 1.0, L: 1.0, S: 0, W: 0, E: 0, H: 1.0 } },
  { name: 'Combinaison ELS 2 (1D + 0.5S + 1H + 1L)', formula: '1.0D + 0.5S + 1.0H + 1.0L', type: 'SLS', factors: { D: 1.0, L: 1.0, S: 0.5, W: 0, E: 0, H: 1.0 } },
  { name: 'Combinaison ELS 3 (1D + 0.5W + 1H + 1L)', formula: '1.0D + 0.5W + 1.0H + 1.0L', type: 'SLS', factors: { D: 1.0, L: 1.0, S: 0, W: 0.5, E: 0, H: 1.0 } },
  { name: 'Combinaison ELS 4 (1D + 1S + 1H)', formula: '1.0D + 1.0S + 1.0H', type: 'SLS', factors: { D: 1.0, L: 0, S: 1.0, W: 0, E: 0, H: 1.0 } },
  { name: 'Combinaison ELS 5 (1D + 1S + 1H + 0.5L)', formula: '1.0D + 1.0S + 1.0H + 0.5L', type: 'SLS', factors: { D: 1.0, L: 0.5, S: 1.0, W: 0, E: 0, H: 1.0 } },
  { name: 'Combinaison ELS 6 (1D + 1S + 0.5W + 1H)', formula: '1.0D + 1.0S + 0.5W + 1.0H', type: 'SLS', factors: { D: 1.0, L: 0, S: 1.0, W: 0.5, E: 0, H: 1.0 } },
  { name: 'Combinaison ELS 7 (1D + 1W + 1H)', formula: '1.0D + 1.0W + 1.0H', type: 'SLS', factors: { D: 1.0, L: 0, S: 0, W: 1.0, E: 0, H: 1.0 } },
  { name: 'Combinaison ELS 8 (1D + 1W + 1H + 0.5L)', formula: '1.0D + 1.0W + 1.0H + 0.5L', type: 'SLS', factors: { D: 1.0, L: 0.5, S: 0, W: 1.0, E: 0, H: 1.0 } },
  { name: 'Combinaison ELS 9 (1D + 0.5S + 1W + 1H)', formula: '1.0D + 0.5S + 1.0W + 1.0H', type: 'SLS', factors: { D: 1.0, L: 0, S: 0.5, W: 1.0, E: 0, H: 1.0 } },
  { name: 'Combinaison ELS 10 (1D + 1S + 1W + 1H)', formula: '1.0D + 1.0S + 1.0W + 1.0H', type: 'SLS', factors: { D: 1.0, L: 0, S: 1.0, W: 1.0, E: 0, H: 1.0 } },
  { name: 'Combinaison ELS 11 (1D + 1H)', formula: '1.0D + 1.0H', type: 'SLS', factors: { D: 1.0, L: 0, S: 0, W: 0, E: 0, H: 1.0 } },
].map(c => ({ ...c, type: 'SLS' as const, caseNo: 0, stabApplicable: true, soilRule: 'same' as const, Dunfav: 1.0 }));

export const CNB_2020_COMBINATIONS: LoadCombination[] = [...buildULSCombinations('2020'), ...SLS_COMBINATIONS];
export const CNB_2025_COMBINATIONS: LoadCombination[] = [...buildULSCombinations('2025'), ...SLS_COMBINATIONS];
export const DEFAULT_CNB_EDITION: CnbEdition = '2020';
export const getCnbCombinations = (edition: CnbEdition): LoadCombination[] =>
  edition === '2025' ? CNB_2025_COMBINATIONS : CNB_2020_COMBINATIONS;

/**
 * Facteur du poids du sol porté (talon, patin) — CNB 2020 / 2025, 4.1.3.2.(8) et (9).
 * 'raised' (D = 1,25) : 1,5 ; si l'épaisseur de sol hs > 1,2 m : 1 + 0,6/hs sans descendre sous 1,25.
 * 'case1' (D = 1,4) : sol sec 1,4 ; sol saturé 1,5 (4.1.3.2.(9)).
 * 'same' : facteur D de la combinaison (0,9 ; 1,0).
 */
export function soilWeightFactor(comb: LoadCombination, saturated: boolean, hs: number): number {
  if (comb.soilRule === 'raised') return hs > 1.2 ? Math.max(1 + 0.6 / hs, 1.25) : 1.5;
  if (comb.soilRule === 'case1') return saturated ? 1.5 : comb.factors.D;
  return comb.factors.D;
}

export function computeElementConcreteDesign(params: {
  elementName: string;
  bw: number; // 1000 mm
  h_mm: number;
  cover: number;
  fc: number;
  fy: number;
  phi_c: number;
  phi_s: number;
  barSize: CanadianBarSize;
  spacing: number;
  Mf: number;
  Vf: number;
  alpha1: number;
  beta1: number;
  Z_limit: number;
  available_hook_depth?: number;
  topBars?: boolean; // barres supérieures (talon) : k1 = 1,3 (E12)
}): ConcreteElementDesign {
  const barInfo = CANADIAN_REBAR_CATALOG[params.barSize] || CANADIAN_REBAR_CATALOG['15M'];
  const db = barInfo.diameter;
  const Ab = barInfo.area;
  const s = Math.max(params.spacing, 50);
  
  const d = Math.max(params.h_mm - params.cover - db / 2, 50);
  const dv = Math.max(0.72 * params.h_mm, 0.9 * d);
  const beta = 230 / (1000 + dv);
  const Vc = params.phi_c * 1.0 * beta * Math.sqrt(params.fc) * params.bw * dv * 1e-3;
  const As_min = 0.002 * params.bw * params.h_mm;
  const As_provided = Ab * (1000 / s);
  
  const a = (params.phi_s * As_provided * params.fy) / (params.alpha1 * params.phi_c * params.fc * params.bw);
  const c = a / params.beta1;
  const Mr = (params.phi_s * As_provided * params.fy * (d - a / 2)) * 1e-6;
  
  const kr = (params.Mf * 1e6) / (params.bw * Math.pow(d, 2));
  const rho = As_provided / (params.bw * d);
  const rho_b = ((params.alpha1 * params.beta1 * params.phi_c * params.fc) / (params.phi_s * params.fy)) * (700 / (700 + params.fy));
  const duct_limit = 700 / (700 + params.fy);
  const c_over_d = c / d;
  
  // Crack factor Z (Omar Chaallal Eq. 3.15, p. 31)
  const dc = params.cover + db / 2;
  const A_crack = 2 * dc * s;
  const fs = 0.6 * params.fy; // 240 MPa
  const Z_factor = fs * Math.cbrt(dc * A_crack);
  
  // Anchorage & Hook (Omar Chaallal Chapitre 7)
  // E12 (MUR-01 §2) : k1 = 1,3 barres supérieures ; k4 = 0,8 si <= 20M, 1,0 si >= 25M. A23.3 12.2.4 (page À CITER).
  const k1 = params.topBars ? 1.3 : 1.0;
  const k4 = params.barSize === '10M' || params.barSize === '15M' || params.barSize === '20M' ? 0.8 : 1.0;
  const ld = Math.max(0.45 * k1 * 1.0 * 1.0 * k4 * (params.fy / Math.sqrt(params.fc)) * db, 300);
  const lhb = (100 * db) / Math.sqrt(params.fc);
  const ldh_required = 0.70 * lhb;
  const ldh_available = params.available_hook_depth;
  // E05 : chaque statut vient d'une comparaison calculée
  const As_ok = As_provided >= As_min;
  const shear_ok = Vc >= params.Vf;
  const flexure_ok = Mr >= params.Mf;
  const ductility_ok = c_over_d <= duct_limit;
  const Z_ok = Z_factor <= params.Z_limit;
  const anchorage_ok = ldh_available !== undefined ? ldh_required <= ldh_available : true;
  
  return {
    elementName: params.elementName,
    section_b: params.bw,
    section_h: params.h_mm,
    d,
    dv,
    beta,
    Vc,
    Vf: params.Vf,
    shear_ok,
    As_min,
    As_provided,
    As_ok,
    checks_ok: As_ok && shear_ok && flexure_ok && ductility_ok && Z_ok && anchorage_ok,
    bar_designation: `${params.barSize} @ ${s} mm`,
    a_stress_block: a,
    alpha1: params.alpha1,
    beta1: params.beta1,
    c_depth: c,
    kr,
    rho,
    rho_b,
    Mr,
    Mf: params.Mf,
    flexure_ok,
    ductility_c_over_d: c_over_d,
    ductility_limit: duct_limit,
    ductility_ok,
    crack_dc: dc,
    crack_A: A_crack,
    Z_factor,
    Z_limit: params.Z_limit,
    Z_ok,
    ld,
    ld_k1: k1,
    ld_k4: k4,
    lhb,
    ldh_required,
    ldh_available,
    anchorage_ok
  };
}

export function analyzeRetainingWall(
  geo: WallGeometry,
  soil: SoilProperties,
  loads: LoadsConfig,
  conc: ConcreteProperties = DEFAULT_CONCRETE_PROPS,
  customRebar?: RebarCustomConfig
): AnalysisResult {
  const Math_PI = Math.PI;
  const phiRad = (soil.phi * Math_PI) / 180;

  // Deux sols (MUR-01 §3.3) : remblai (poussée, poids sur le talon) et fondation (butée, cohésion de glissement, poids à l'avant)
  const foundation: FoundationSoilProperties = soil.foundation ?? { gamma: soil.gamma, phi: soil.phi, cohesion: soil.cohesion ?? 0 };
  const phiF = (foundation.phi * Math_PI) / 180;
  const criterion: StabilityCriterion = soil.stabilityCriterion ?? 'moments';
  
  const soilMethod: SoilMethodConfig = {
    ...DEFAULT_SOIL_METHOD_CONFIG,
    ...(soil.methodConfig || {})
  };

  const rebarCfg: RebarCustomConfig = customRebar || DEFAULT_REBAR_CONFIG;

  // Earth pressure coefficients
  const Ka_rankine = Math.pow(Math.tan(Math_PI / 4 - phiRad / 2), 2);
  const K0 = 1 - Math.sin(phiRad);
  const Kp_rankine = Math.pow(Math.tan(Math_PI / 4 + phiF / 2), 2); // sol de fondation

  // Coulomb active & passive with wall friction delta = min(atan(mu), delta_ratio * phi)
  const delta_ratio = soilMethod.deltaFrictionRatio ?? (2 / 3);
  const delta_rad = Math.min(Math.atan(soil.mu), delta_ratio * phiRad);
  const cosDelta = Math.cos(delta_rad);
  const sinPhi = Math.sin(phiRad);
  const sinPhiDelta = Math.sin(phiRad + delta_rad);
  
  const denomCoulombA = 1 + Math.sqrt((sinPhiDelta * sinPhi) / cosDelta);
  const Ka_coulomb = (Math.pow(Math.cos(phiRad), 2)) / (cosDelta * Math.pow(denomCoulombA, 2));

  // E19 : Kp de Coulomb exact (sin(φ + δ), et non sin(φ − δ)), sol de fondation
  const delta_p_rad = Math.min(Math.atan(soil.mu), delta_ratio * phiF);
  const Kp_coulombRaw = coulombKp(phiF, delta_p_rad);
  const Kp_coulomb = Number.isFinite(Kp_coulombRaw) ? Kp_coulombRaw : Kp_rankine;

  // Active pressure method selection
  let K_active = Ka_rankine;
  if (geo.wallType === 'basement' || soilMethod.activeMethod === 'at_rest') {
    K_active = K0;
  } else if (soilMethod.activeMethod === 'coulomb') {
    K_active = Ka_coulomb;
  } else {
    K_active = Ka_rankine;
  }

  // Passive pressure method selection
  let Kp = Kp_rankine;
  if (soilMethod.passiveMethod === 'neglected') {
    Kp = 0;
  } else if (soilMethod.passiveMethod === 'coulomb') {
    Kp = Kp_coulomb;
  } else if (soilMethod.passiveMethod === 'reduced_cfem') {
    Kp = Kp_rankine * 0.50; // CFEM Table 8.1 recommended mobilisation
  } else {
    Kp = Kp_rankine;
  }

  const baseWidth = geo.ePiedAv + geo.epStem + geo.ePiedAr;
  const totalHeight = geo.hMur + geo.epBase;

  // Seismic angle and Mononobe-Okabe / Seed & Whitman (CFEM 6.7 & 24.9)
  let kh_val = loads.kh || 0;
  let kv_val = loads.kv || 0;
  if (soilMethod.seismicMethod === 'none') {
    kh_val = 0;
    kv_val = 0;
  }

  const theta_eq_rad = kh_val > 0 ? Math.atan(kh_val / Math.max(1 - kv_val, 0.1)) : 0;
  const theta_eq_deg = (theta_eq_rad * 180) / Math_PI;

  let Kae_mo = Ka_rankine;
  if (kh_val > 0 && phiRad > theta_eq_rad) {
    const cosTheta = Math.cos(theta_eq_rad);
    const numMO = Math.pow(Math.cos(phiRad - theta_eq_rad), 2);
    const denomMO_inner = 1 + Math.sqrt((Math.sin(phiRad + delta_rad) * Math.sin(phiRad - theta_eq_rad)) / (Math.cos(delta_rad + theta_eq_rad)));
    Kae_mo = numMO / (cosTheta * Math.cos(delta_rad + theta_eq_rad) * Math.pow(denomMO_inner, 2));
  }
  const delta_Kae_seed = 0.75 * kh_val; // Seed & Whitman (1970) / CFEM 24.9
  
  let delta_Pae_seed = 0;
  if (soilMethod.seismicMethod === 'seed_whitman') {
    delta_Pae_seed = 0.375 * kh_val * soil.gamma * totalHeight * totalHeight; // kN/m
  } else if (soilMethod.seismicMethod === 'mononobe_okabe') {
    delta_Pae_seed = Math.max(Kae_mo - K_active, 0) * 0.5 * soil.gamma * totalHeight * totalHeight;
  } else {
    delta_Pae_seed = 0;
  }

  const y_Pae = 0.60 * totalHeight; // m from base

  // Static nominal forces
  const P_active_nominal = 0.5 * K_active * soil.gamma * totalHeight * totalHeight;
  const y_Pa = totalHeight / 3;
  // Amendement A2 de MUR-01 : hSolAv est mesurée depuis le dessus de la semelle ; la butée s'exerce depuis la sous-face
  // (h_pass = hSolAv + epBase). Sans sol à l'avant (hSolAv <= 0), la butée est nulle.
  const h_pass = soil.hSolAv > 0 ? soil.hSolAv + geo.epBase : 0;
  const P_passive_nominal = 0.5 * Kp * foundation.gamma * h_pass * h_pass;
  const y_Pp = h_pass / 3;
  const P_surcharge_nominal = K_active * loads.surcharge * totalHeight;
  const y_Psur = totalHeight / 2;
  const E_stem_nominal = geo.hMur * geo.epStem * conc.gamma_c * kh_val;
  const E_base_nominal = baseWidth * geo.epBase * conc.gamma_c * kh_val;

  const earthPressures: EarthPressureCalculations = {
    Ka_rankine,
    Ka_coulomb,
    Kp_rankine,
    Kp_coulomb,
    K0_jaky: K0,
    theta_eq_rad,
    theta_eq_deg,
    Kae_mo,
    delta_Kae_seed,
    delta_Pae_seed,
    y_Pae,
    P_active_nominal,
    y_Pa,
    P_passive_nominal,
    y_Pp,
    h_pass,
    P_surcharge_nominal,
    y_Psur,
    E_stem_nominal,
    E_base_nominal,
    K_active_used: K_active,
    K_passive_used: Kp
  };

  // Ensure CFEM factors default
  const phi_gu = soil.geotechFactors?.phi_gu ?? 0.50;
  const phi_gs = soil.geotechFactors?.phi_gs ?? 0.80;
  const phi_renv = soil.geotechFactors?.phi_renv ?? 0.50;
  const phi_p = soil.geotechFactors?.phi_p ?? 0.50;
  const phi_coh = soil.geotechFactors?.phi_coh ?? 0.60;
  const c2 = foundation.cohesion; // c′ du sol de fondation (adhérence de la base)

  interface ForceComp { 
    name: string; 
    type: LoadCaseType; 
    Fx: number; 
    y: number; 
    Fy: number; 
    x: number; 
    Mz: number; 
    soil?: { saturated: boolean; hs: number }; // poids de sol porté : facteur 4.1.3.2.(8) et (9)
    stemApplied?: boolean; // charge appliquée au voile (E01)
    dist?: { yBottom: number; yTop: number; w: number }; // charge Fx répartie (kN/m par m), y depuis la sous-face de la semelle
  }
  const components: ForceComp[] = [];

  // Poids propres (D)
  // W_stem (voile)
  components.push({ 
    name: 'Wb1_Mur', 
    type: 'D', 
    Fx: 0, 
    y: 0, 
    Fy: geo.hMur * geo.epStem * conc.gamma_c, 
    x: geo.ePiedAv + geo.epStem / 2, 
    Mz: 0 
  });
  
  // W_base (semelle)
  components.push({ 
    name: 'Wb2_Semelle', 
    type: 'D', 
    Fx: 0, 
    y: 0, 
    Fy: baseWidth * geo.epBase * conc.gamma_c, 
    x: baseWidth / 2, 
    Mz: 0 
  });

  // Nappe (E02) : hw = hauteur de la nappe au-dessus de la sous-face de la semelle
  const hasWater = !!soil.hasWaterTable && (soil.waterTableHeight ?? 0) > 0;
  const hw = hasWater ? Math.min(Math.max(soil.waterTableHeight || 0, 0), totalHeight) : 0;
  const gamma_w = soil.gamma_w ?? 9.81;
  // γ′ = γ − γw, sans plancher : le γ saisi est pris comme poids volumique saturé (hypothèse signalée dans la note)
  const warnings: string[] = [];
  if (hasWater && soil.gamma <= gamma_w) warnings.push(`Remblai : γ = ${soil.gamma} kN/m³ ≤ γw = ${gamma_w} kN/m³ avec nappe — poids déjaugé non physique, résultats NON VÉRIFIABLES.`);
  if (hasWater && foundation.gamma <= gamma_w) warnings.push(`Fondation : γ = ${foundation.gamma} kN/m³ ≤ γw = ${gamma_w} kN/m³ avec nappe — poids déjaugé non physique, résultats NON VÉRIFIABLES.`);
  const gamma_prime = soil.gamma - gamma_w; // remblai
  const gamma_prime_f = foundation.gamma - gamma_w; // fondation

  // Hauteurs de sol sec / déjaugé au-dessus de la semelle (E02)
  const hSubHeel = hasWater ? Math.min(Math.max(hw - geo.epBase, 0), geo.hMur) : 0;
  const hDryHeel = geo.hMur - hSubHeel;
  const hSubToe = hasWater ? Math.min(Math.max(Math.min(hw, geo.epBase + soil.hSolAv) - geo.epBase, 0), soil.hSolAv) : 0;
  const hDryToe = Math.max(soil.hSolAv - hSubToe, 0);

  // W_heel (sol de remblai sur le talon) : sec au-dessus de la nappe, déjaugé (γ′) en dessous
  if (hDryHeel > 0) {
    components.push({ name: 'W1_sol_arrière', type: 'D', Fx: 0, y: 0, Fy: hDryHeel * geo.ePiedAr * soil.gamma,
      x: geo.ePiedAv + geo.epStem + geo.ePiedAr / 2, Mz: 0, soil: { saturated: false, hs: geo.hMur } });
  }
  if (hSubHeel > 0) {
    components.push({ name: 'W1_sol_arrière_déjaugé', type: 'D', Fx: 0, y: 0, Fy: hSubHeel * geo.ePiedAr * gamma_prime,
      x: geo.ePiedAv + geo.epStem + geo.ePiedAr / 2, Mz: 0, soil: { saturated: true, hs: geo.hMur } });
  }

  // W_toe (sol de fondation à l'avant sur le patin)
  if (hDryToe > 0) {
    components.push({ name: 'W2_sol_avant', type: 'D', Fx: 0, y: 0, Fy: hDryToe * geo.ePiedAv * foundation.gamma,
      x: geo.ePiedAv / 2, Mz: 0, soil: { saturated: false, hs: soil.hSolAv } });
  }
  if (hSubToe > 0) {
    components.push({ name: 'W2_sol_avant_déjaugé', type: 'D', Fx: 0, y: 0, Fy: hSubToe * geo.ePiedAv * gamma_prime_f,
      x: geo.ePiedAv / 2, Mz: 0, soil: { saturated: true, hs: soil.hSolAv } });
  }

  // Poids de l'eau au-dessus de la semelle, sur le talon et sur le patin (sol à γ′ + eau γw : pas de double comptage
  // de la poussée d'Archimède, la sous-pression ci-dessous porte sur toute la hauteur d'eau hw). Classé H comme la sous-pression.
  if (hSubHeel > 0) {
    components.push({ name: 'Weau_talon', type: 'H', Fx: 0, y: 0, Fy: gamma_w * hSubHeel * geo.ePiedAr,
      x: geo.ePiedAv + geo.epStem + geo.ePiedAr / 2, Mz: 0 });
  }
  if (hSubToe > 0) {
    components.push({ name: 'Weau_patin', type: 'H', Fx: 0, y: 0, Fy: gamma_w * hSubToe * geo.ePiedAv,
      x: geo.ePiedAv / 2, Mz: 0 });
  }

  // Sous-pression sous la semelle (E02) : pression uniforme γw·hw sur la largeur B (hypothèse conservatrice ;
  // diagramme selon le drainage : décision D8 de MUR-00 non tranchée). Facteur de H (1,5) : classement À CONFIRMER (E24).
  const uplift_nominal = hasWater ? gamma_w * hw * baseWidth : 0;
  if (uplift_nominal > 0) {
    components.push({ name: 'U_sous_pression', type: 'H', Fx: 0, y: 0, Fy: -uplift_nominal, x: baseWidth / 2, Mz: 0 });
  }

  // Poussée active du sol arrière et Nappe Phréatique (H)

  if (hasWater && hw > 0) {
    const h1 = totalHeight - hw; // Hauteur de sol sec au-dessus de la nappe
    const h2 = hw; // Hauteur immergée
    
    // Couche 1 supérieure (sol sec)
    if (h1 > 0) {
      const Pa1 = 0.5 * K_active * soil.gamma * h1 * h1;
      components.push({
        name: 'Pa_sol_sec',
        type: 'H',
        Fx: Pa1,
        y: h2 + h1 / 3,
        Fy: 0,
        x: 0,
        Mz: 0
      });
    }

    // Couche 2 inférieure - Poussée due à la surcharge du sol sec supérieur
    if (h1 > 0 && h2 > 0) {
      const Pa2 = K_active * (soil.gamma * h1) * h2;
      components.push({
        name: 'Pa_sol_sub_surch',
        type: 'H',
        Fx: Pa2,
        y: h2 / 2,
        Fy: 0,
        x: 0,
        Mz: 0
      });
    }

    // Couche 2 inférieure - Poussée due au poids déjaugé gamma'
    const Pa3 = 0.5 * K_active * gamma_prime * h2 * h2;
    components.push({
      name: 'Pa_sol_déjaugé',
      type: 'H',
      Fx: Pa3,
      y: h2 / 3,
      Fy: 0,
      x: 0,
      Mz: 0
    });

    // Pression hydrostatique de l'eau Pw
    const Pw = 0.5 * gamma_w * h2 * h2;
    components.push({
      name: 'Pw_eau_hydrostatique',
      type: 'H',
      Fx: Pw,
      y: h2 / 3,
      Fy: 0,
      x: 0,
      Mz: 0
    });
  } else {
    // Sol sec standard
    const P_active_soil = 0.5 * K_active * soil.gamma * totalHeight * totalHeight;
    components.push({ 
      name: 'Pa_sol', 
      type: 'H', 
      Fx: P_active_soil, 
      y: totalHeight / 3, 
      Fy: 0, 
      x: 0, 
      Mz: 0 
    });
  }

  // Surcharge uniforme amont en surface
  const surType = loads.surchargeType || 'L';
  if (loads.surcharge > 0) {
    const W_sur = loads.surcharge * geo.ePiedAr;
    const P_sur = K_active * loads.surcharge * totalHeight;
    components.push({ 
      name: `W_surcharge_amont (${surType})`, 
      type: surType, 
      Fx: 0, 
      y: 0, 
      Fy: W_sur, 
      x: geo.ePiedAv + geo.epStem + geo.ePiedAr / 2, 
      Mz: 0 
    });
    components.push({ 
      name: `Pa_surcharge_amont (${surType})`, 
      type: surType, 
      Fx: P_sur, 
      y: totalHeight / 2, 
      Fy: 0, 
      x: 0, 
      Mz: 0 
    });
  }

  // Surcharge uniforme aval en surface
  const surAvalType = loads.surchargeAvalType || 'L';
  if (loads.surchargeAval && loads.surchargeAval > 0) {
    const W_sur_av = loads.surchargeAval * geo.ePiedAv;
    components.push({
      name: `W_surcharge_aval (${surAvalType})`,
      type: surAvalType,
      Fx: 0,
      y: 0,
      Fy: W_sur_av,
      x: geo.ePiedAv / 2,
      Mz: 0
    });
  }

  // Charge ponctuelle / moment appliquée au milieu de la tête du mur (Stem Top)
  if (loads.pointLoadTop?.enabled) {
    const ptFy = loads.pointLoadTop.Fy || 0;
    const ptFx = loads.pointLoadTop.Fx || 0;
    const ptMz = loads.pointLoadTop.Mz || 0;
    const ptType = loads.pointLoadTop.loadType || 'L';

    if (ptFy !== 0 || ptFx !== 0 || ptMz !== 0) {
      components.push({
        name: loads.pointLoadTop.name || `Charge_Tête (${ptType})`,
        type: ptType,
        Fx: ptFx,
        y: totalHeight,
        Fy: ptFy,
        x: geo.ePiedAv + geo.epStem / 2,
        Mz: ptMz,
        stemApplied: true
      });
    }
  }

  // Additional Loads (ponctuelles ou réparties)
  if (loads.additionalLoads) {
    for (const al of loads.additionalLoads) {
      let fx = al.nature === 'Fx' ? al.magnitude : 0;
      let fy = al.nature === 'Fy' ? al.magnitude : 0;
      let y_c = al.y;
      let x_c = al.x;

      if (al.isDistributed && al.length) {
        if (al.nature === 'Fx') { 
          fx = al.magnitude * al.length;
          y_c = al.y + al.length / 2;
        } else if (al.nature === 'Fy') {
          fy = al.magnitude * al.length;
          x_c = al.x + al.length / 2;
        }
      }

      components.push({
        name: al.name, 
        type: al.caseType,
        Fx: fx, 
        y: y_c,
        Fy: fy,
        x: x_c,
        Mz: al.nature === 'Mz' ? al.magnitude : 0,
        stemApplied: true,
        dist: al.isDistributed && al.length && al.nature === 'Fx' ? { yBottom: al.y, yTop: al.y + al.length, w: al.magnitude } : undefined
      });

      // Si c'est une charge verticale (Fy > 0) située sur le remblai amont (derrière le voile)
      // Selon la géotechnique (Terzaghi / Boussinesq / CFEM), elle engendre également une poussée latérale active sur le voile
      const stemBack = geo.ePiedAv + geo.epStem;
      if (al.nature === 'Fy' && fy > 0 && x_c >= stemBack) {
        const distFromStem = x_c - stemBack;
        // Coin de rupture actif à 45° - phi/2
        const wedgeDist = totalHeight * Math.tan(((45 - soil.phi / 2) * Math.PI) / 180);
        // Facteur d'atténuation en fonction de la distance au mur
        const eta = distFromStem <= wedgeDist 
          ? 1.0 
          : Math.max(0, 1.0 - (distFromStem - wedgeDist) / (1.5 * totalHeight));
        
        if (eta > 0) {
          const inducedFx = K_active * fy * eta;
          const yThrust = Math.min(Math.max(geo.epBase + geo.hMur * 0.4, y_c / 2), totalHeight * 0.85);
          components.push({
            name: `${al.name} (Poussée latérale induite)`,
            type: al.caseType,
            Fx: inducedFx,
            y: yThrust,
            Fy: 0,
            x: 0,
            Mz: 0,
            stemApplied: true
          });
        }
      }
    }
  }

  // Reactions at top of wall (si fournies, ex. plancher ou superstructure)
  if (loads.reactionsTop) {
    for (const key of Object.keys(loads.reactionsTop) as LoadCaseType[]) {
      const rxn = loads.reactionsTop[key];
      if (rxn && (rxn.Rx !== 0 || rxn.Ry !== 0 || rxn.M !== 0)) {
        components.push({
          name: `Rxn_top_${key}`,
          type: key,
          Fx: rxn.Rx,
          y: totalHeight,
          Fy: rxn.Ry,
          x: geo.ePiedAv + geo.epStem / 2,
          Mz: rxn.M,
          stemApplied: true
        });
      }
    }
  }

  // Action Sismique (E) selon Mononobe-Okabe / Seed & Whitman (CFEM Section 6.7 & Section 24.9)
  if (soilMethod.seismicMethod !== 'none' && kh_val > 0) {
    const delta_P_ae = delta_Pae_seed;
    // Appliqué à 0.6H de la base
    if (delta_P_ae > 0) {
      components.push({ 
        name: `P_seismic_soil (${soilMethod.seismicMethod === 'mononobe_okabe' ? 'Mononobe-Okabe' : 'Seed & Whitman'})`, 
        type: 'E', 
        Fx: delta_P_ae, 
        y: y_Pae, 
        Fy: 0, 
        x: 0, 
        Mz: 0 
      });
    }
    // Inertie du voile
    const E_stem = geo.hMur * geo.epStem * conc.gamma_c * kh_val;
    if (E_stem > 0) {
      components.push({ 
        name: 'E_stem_inertia', 
        type: 'E', 
        Fx: E_stem, 
        y: geo.epBase + geo.hMur / 2, 
        Fy: 0, 
        x: geo.ePiedAv + geo.epStem / 2, 
        Mz: 0 
      });
    }
    // Inertie de la semelle
    const E_base = baseWidth * geo.epBase * conc.gamma_c * kh_val;
    if (E_base > 0) {
      components.push({ 
        name: 'E_base_inertia', 
        type: 'E', 
        Fx: E_base, 
        y: geo.epBase / 2, 
        Fy: 0, 
        x: baseWidth / 2, 
        Mz: 0 
      });
    }
    // Séisme vertical kv si configuré
    if (kv_val !== 0) {
      const Ev_stem = geo.hMur * geo.epStem * conc.gamma_c * kv_val;
      components.push({ 
        name: 'Ev_stem_inertia', 
        type: 'E', 
        Fx: 0, 
        y: geo.epBase + geo.hMur / 2, 
        Fy: Ev_stem, 
        x: geo.ePiedAv + geo.epStem / 2, 
        Mz: 0 
      });
    }
  }

  // Poussée passive avant
  const M_passive_nominal = P_passive_nominal * y_Pp; // moment par rapport à la sous-face (bras = y_Pp = h_pass/3)

  // ---------------------------------------------------------------------------
  // Charges latérales sur le voile, avec TOUTES les charges latérales (E01) :
  // terres, eau, surcharge, séisme, charges de tête, réactions de tête, charges ponctuelles et réparties Fx.
  // z = profondeur sous le haut du voile (m).
  // ---------------------------------------------------------------------------
  const deltaPaeFor = (h: number): number => {
    if (soilMethod.seismicMethod === 'seed_whitman') return 0.375 * kh_val * soil.gamma * h * h;
    if (soilMethod.seismicMethod === 'mononobe_okabe') return Math.max(Kae_mo - K_active, 0) * 0.5 * soil.gamma * h * h;
    return 0;
  };
  const stemItems: StemItem[] = [];
  const zWater = hasWater ? Math.max(totalHeight - hw, 0) : Infinity;
  const zDryEnd = Math.min(zWater, geo.hMur);
  if (zDryEnd > 0) {
    stemItems.push({ kind: 'linear', type: 'H', label: 'Poussée des terres (sol sec)', z1: 0, z2: zDryEnd, a: 0, b: K_active * soil.gamma });
  }
  if (zWater < geo.hMur) {
    stemItems.push({ kind: 'linear', type: 'H', label: 'Poussée des terres (sol déjaugé)', z1: zWater, z2: geo.hMur,
      a: K_active * (soil.gamma - gamma_prime) * zWater, b: K_active * gamma_prime });
    stemItems.push({ kind: 'linear', type: 'H', label: "Pression d'eau", z1: zWater, z2: geo.hMur, a: -gamma_w * zWater, b: gamma_w });
  }
  if (loads.surcharge > 0) {
    stemItems.push({ kind: 'linear', type: surType, label: 'Poussée de la surcharge', z1: 0, z2: geo.hMur, a: K_active * loads.surcharge, b: 0 });
  }
  if (soilMethod.seismicMethod !== 'none' && kh_val > 0) {
    const dPaeStem = deltaPaeFor(geo.hMur);
    // résultante à 0,6·h au-dessus du pied du voile, soit à 0,4·h sous le haut
    if (dPaeStem > 0) stemItems.push({ kind: 'point', type: 'E', label: 'Incrément sismique du sol', z: 0.4 * geo.hMur, F: dPaeStem });
    const E_stem_only = geo.hMur * geo.epStem * conc.gamma_c * kh_val;
    if (E_stem_only > 0) stemItems.push({ kind: 'point', type: 'E', label: 'Inertie du voile', z: geo.hMur / 2, F: E_stem_only });
  }
  for (const c of components) {
    if (!c.stemApplied) continue;
    if (c.Fx !== 0) {
      if (c.dist) {
        const zT = Math.max(totalHeight - c.dist.yTop, 0);
        const zB = Math.min(totalHeight - c.dist.yBottom, geo.hMur);
        if (zB > zT) stemItems.push({ kind: 'linear', type: c.type, label: c.name, z1: zT, z2: zB, a: c.dist.w, b: 0 });
      } else if (c.y >= geo.epBase - 1e-9) {
        stemItems.push({ kind: 'point', type: c.type, label: c.name, z: Math.max(totalHeight - c.y, 0), F: c.Fx });
      }
    }
    if (c.Mz !== 0 && c.y >= geo.epBase - 1e-9) {
      stemItems.push({ kind: 'moment', type: c.type, label: c.name, z: Math.max(totalHeight - c.y, 0), M: c.Mz });
    }
  }

  const propped = geo.wallType === 'basement';
  const customSupports = propped && !!geo.supports && geo.supports.length > 0;
  const supportsFEM: SupportBoundary[] = [{ y: 0, v: true, theta: true }];
  if (customSupports) geo.supports!.forEach(s => supportsFEM.push({ y: s.y, v: true, theta: s.type === 'fixed' }));
  const E_fem = 2.5e7;
  const I_fem = 1.0 * Math.pow(geo.epStem, 3) / 12;

  // Efforts du voile pour un jeu de facteurs : sections de 0 à hMur, réaction(s) en tête (mur de sous-sol)
  const stemAnalysis = (factors: Record<LoadCaseType, number>, dUnfav: number) => {
    const nSec = 40;
    if (customSupports) {
      // appuis intermédiaires saisis : poutre MEF avec les mêmes charges factorisées (charges nodales comprises)
      const loadFns: ((y: number) => number)[] = [(y: number) => {
        const z = geo.hMur - y;
        let p = 0;
        for (const it of stemItems) {
          if (it.kind !== 'linear' || z < it.z1 || z > it.z2) continue;
          p += stemItemFactor(it, factors, dUnfav) * (it.a + it.b * z);
        }
        return p;
      }];
      const nodal: { y: number; Fx: number; Mz?: number }[] = [];
      for (const it of stemItems) {
        const f = stemItemFactor(it, factors, dUnfav);
        if (f === 0) continue;
        if (it.kind === 'point') nodal.push({ y: geo.hMur - it.z, Fx: f * it.F });
        else if (it.kind === 'moment') nodal.push({ y: geo.hMur - it.z, Fx: 0, Mz: f * it.M });
      }
      const fem = solveBeamFEM(geo.hMur, E_fem, I_fem, supportsFEM, loadFns, 40, nodal);
      return {
        maxM: fem.maxMoment, maxV: fem.maxShear,
        Rt: fem.reactions.filter(r => r.y > 1e-9).map(r => ({ y: r.y, F: -r.Fx })),
        sections: fem.forces.map(f => ({ depth: f.depth, shear: f.shear, moment: f.moment })).reverse()
      };
    }
    const R = propped ? proppedTopReaction(stemItems, factors, geo.hMur, dUnfav) : 0;
    let maxM = 0;
    let maxV = 0;
    const sections: { depth: number; shear: number; moment: number }[] = [];
    for (let i = 0; i <= nSec; i++) {
      const d = (i / nSec) * geo.hMur;
      const e = stemSectionEffort(stemItems, factors, d, R, dUnfav);
      sections.push({ depth: d, shear: e.V, moment: e.M });
      maxM = Math.max(maxM, Math.abs(e.M));
      maxV = Math.max(maxV, Math.abs(e.V));
    }
    return { maxM, maxV, Rt: propped ? [{ y: geo.hMur, F: R }] : [], sections };
  };

  const results: CombinationResult[] = [];
  const slabEnvFns: ((kind: 'toe' | 'heel', x: number) => { V: number; M: number })[] = [];
  const stemSectionsByComb: { depth: number; shear: number; moment: number }[][] = [];

  let critical_q_toe_SLS = 0;
  let critical_q_toe_ULS = 0;
  let critical_sliding_ULS = Infinity;
  let critical_over_ULS = Infinity;
  let R_top_default = 0;

  const cnbEdition: CnbEdition = loads.cnbEdition ?? DEFAULT_CNB_EDITION;
  for (const comb of getCnbCombinations(cnbEdition)) {
    // Si aucun séisme n'est retenu (mode statique), les combinaisons sismiques (E > 0) ne sont pas applicables
    if (soilMethod.seismicMethod === 'none' && (comb.factors.E || 0) > 0) {
      continue;
    }

    // Réaction(s) d'appui en tête (mur de sous-sol) : issue(s) des charges latérales du voile de CETTE combinaison (E10)
    const stemRes = stemAnalysis(comb.factors, comb.Dunfav);
    let sumRt = 0;
    let momRt = 0;
    for (const r of stemRes.Rt) {
      sumRt += r.F;
      momRt += r.F * (geo.epBase + r.y);
    }
    if (comb.caseNo === 1) R_top_default = sumRt;

    // Agrégation des actions pour une combinaison. zeroFav = true : les charges variables (et E) qui stabilisent
    // reçoivent le facteur 0 (CNB, 4.1.3.2.(3)). La charge permanente garde le facteur de la combinaison.
    // heelMode = true : basculement vers le talon. Les actions D qui poussent la résultante vers le talon (Fx < 0, Mz < 0)
    // ne sont pas des charges « qui s'opposent » à ce basculement : facteur maximal Dunfav (4.1.3.2.(5)); poids à 0,9D.
    const aggregate = (zeroFav: boolean, heelMode = false) => {
      let sumV = 0;
      let sumH = 0;
      let Mres = 0;
      let Mover = 0;
      const fOf = (comp: ForceComp, favourable: boolean, vertical = false, opposesHeel = false): number => {
        if (comp.type === 'D') {
          // D qui s'oppose : 0,9D / 1,0D (4.1.3.2.(5)) ; D défavorable : facteur maximal de la combinaison
          // Fx > 0 et Mz > 0 s'opposent au basculement vers le talon : ils gardent le facteur de la variante (0,9)
          if (heelMode && opposesHeel) return comb.factors.D;
          if (!favourable || (heelMode && !vertical)) return comb.Dunfav;
          return comp.soil ? soilWeightFactor(comb, comp.soil.saturated, comp.soil.hs) : comb.factors.D;
        }
        // H (poids et poussée de l'eau, terres) n'est jamais mis à zéro ; seules les charges variables et E le sont
        return favourable && zeroFav && comp.type !== 'H' ? 0 : (comb.factors[comp.type] || 0);
      };
      for (const comp of components) {
        if (comp.Fy > 0) {
          const f = fOf(comp, true, true);
          sumV += comp.Fy * f;
          Mres += comp.Fy * comp.x * f;
        } else if (comp.Fy < 0) {
          const f = fOf(comp, false);
          sumV += comp.Fy * f;
          Mover += (-comp.Fy * comp.x) * f;
        }
        if (comp.Fx > 0) {
          const f = fOf(comp, false, false, true);
          sumH += comp.Fx * f;
          Mover += comp.Fx * comp.y * f;
        } else if (comp.Fx < 0) {
          const f = fOf(comp, true);
          sumH += comp.Fx * f;
          Mres += (-comp.Fx * comp.y) * f;
        }
        if (comp.Mz > 0) {
          Mover += comp.Mz * fOf(comp, false, false, true);
        } else if (comp.Mz < 0) {
          Mres += (-comp.Mz) * fOf(comp, true);
        }
      }
      // appui(s) en tête : réduit la poussée à reprendre par la base
      sumH -= sumRt;
      Mover -= momRt;
      return { sumV, sumH, Mres, Mover };
    };

    const stab = aggregate(true); // glissement, renversement : stabilisants variables à 0
    const full = aggregate(false); // portance : tous les facteurs de la combinaison
    const heel = aggregate(false, true); // basculement vers le talon : poids à 0,9D, actions D vers le talon à Dunfav

    const sumV_min = stab.sumV;
    const sumH = stab.sumH;

    // CFEM : glissement Fs = c'·B·φcoh + Pp·φp + ΣV·μ·φgs (facteurs φ inchangés, fiche suivante)
    const phi_sliding_friction = comb.type === 'ULS' ? phi_gs : 1.0;
    const phi_passive = comb.type === 'ULS' ? phi_p : 1.0;
    const phi_cohesion = comb.type === 'ULS' ? phi_coh : 1.0;

    const Fs = (c2 * baseWidth * phi_cohesion) +
               (P_passive_nominal * phi_passive) +
               (Math.max(sumV_min, 0) * soil.mu * phi_sliding_friction);
    const Fh_destab = Math.max(sumH, 0.01);
    const FOS_sl = sumH > 0 ? (Fs / Fh_destab) : Infinity;
    const status_sliding: 'OK' | 'NON' = FOS_sl >= 1.0 ? 'OK' : 'NON';

    // Renversement (critère « moments ») : Ms = ΣM stabilisants + butée·φ_renv ; Mr = ΣM renversants
    const phi_overturning = comb.type === 'ULS' ? phi_renv : 1.0;
    const Ms = stab.Mres + (M_passive_nominal * phi_overturning);
    const Mr = Math.max(stab.Mover, 0.01);
    const FOS_over = stab.Mover > 0 ? (Ms / Mr) : Infinity;
    let status_overturning: 'OK' | 'NON' = FOS_over >= 1.0 ? 'OK' : 'NON';

    // Portance et excentricité (E06) : ΣV, ΣM et e du MÊME jeu de facteurs ; sans résistance (butée) dans e
    const limitL6 = baseWidth / 6;
    const bearingOf = (st: { sumV: number; Mres: number; Mover: number }) => {
      const uplift = st.sumV <= 0;
      const Rv = Math.max(st.sumV, 1.0);
      const x1raw = (st.Mres - st.Mover) / Rv; // position de la résultante depuis l'orteil (peut sortir de [0, B])
      const outside: 'toe' | 'heel' | null = x1raw <= 0 ? 'toe' : x1raw >= baseWidth ? 'heel' : null;
      const x1 = Math.min(Math.max(x1raw, 1e-3), baseWidth - 1e-3);
      const eS = baseWidth / 2 - x1; // > 0 : résultante côté orteil ; < 0 : côté talon
      const ecc = Math.abs(eS);
      const B_eff = outside ? 1e-3 : Math.max(baseWidth - 2 * ecc, 1e-3);
      const toeSide = eS >= 0;
      let distributionCase: 'Cas 1' | 'Cas 2' | 'Cas 3' | 'Cas 4' = 'Cas 2';
      let q_t = 0;
      let q_h = 0;
      let Lc = baseWidth; // longueur comprimée (cas triangulaire)
      if (ecc < 0.001) {
        distributionCase = 'Cas 1';
        q_t = Rv / baseWidth;
        q_h = q_t;
      } else if (ecc < limitL6 - 0.001) {
        distributionCase = 'Cas 2';
        q_t = (Rv / baseWidth) * (1 + (6 * eS) / baseWidth);
        q_h = (Rv / baseWidth) * (1 - (6 * eS) / baseWidth);
      } else if (Math.abs(ecc - limitL6) <= 0.001) {
        distributionCase = 'Cas 3';
        q_t = toeSide ? (2 * Rv) / baseWidth : 0;
        q_h = toeSide ? 0 : (2 * Rv) / baseWidth;
      } else {
        // triangle : longueur comprimée 3 × distance de la résultante au bord le plus proche
        distributionCase = 'Cas 4';
        Lc = 3 * (toeSide ? x1 : baseWidth - x1);
        if (toeSide) { q_t = (2 * Rv) / Lc; q_h = 0; } else { q_h = (2 * Rv) / Lc; q_t = 0; }
      }
      let q_design = Math.max(q_t, q_h);
      let pAt: (x: number) => number;
      if (criterion === 'eccentricity') {
        // Meyerhof : B' = B - 2e, pression uniforme V/B' sur [s0, s0 + B'] (CFEM 5e : limite de e À CONFIRMER, non appliquée)
        q_design = Rv / B_eff;
        const s0 = Math.min(Math.max(x1 - B_eff / 2, 0), baseWidth - B_eff);
        const s1 = s0 + B_eff;
        q_t = s0 <= 1e-9 ? q_design : 0;
        q_h = s1 >= baseWidth - 1e-9 ? q_design : 0;
        pAt = (x: number) => (x >= s0 - 1e-12 && x <= s1 + 1e-12 ? q_design : 0);
      } else if (distributionCase === 'Cas 4') {
        pAt = toeSide
          ? (x: number) => (x < Lc ? q_t * (1 - x / Lc) : 0)
          : (x: number) => (x > baseWidth - Lc ? q_h * (1 - (baseWidth - x) / Lc) : 0);
      } else {
        pAt = (x: number) => q_t + ((q_h - q_t) * x) / baseWidth;
      }
      return { Rv, uplift, x1, ecc, B_eff, distributionCase, q_t, q_h, q_design, pAt, outside };
    };
    const bZ = bearingOf(stab);
    const bF = bearingOf(full);
    const bH = bearingOf(heel);
    const bear = [bF, bH].reduce((best, b) => (b.q_design > best.q_design ? b : best), bZ);
    // Résultante hors de la base : renversement (vers l'orteil) ou basculement vers le talon -> NON, avec message
    const outsideSide = bZ.outside ?? bF.outside ?? bH.outside;
    const stability_message = outsideSide
      ? (outsideSide === 'toe'
        ? 'Résultante hors de la base côté orteil : renversement, portance non vérifiable'
        : 'Résultante hors de la base côté talon : basculement vers le talon, portance non vérifiable')
      : '';
    if (outsideSide) status_overturning = 'NON';

    const qCap = comb.type === 'ULS' ? (soil.qUltimate_ULS * phi_gu) : soil.qAllowable_SLS;
    const FOS_b = bear.q_design > 0 ? (qCap / bear.q_design) : Infinity;
    const status_bearing: 'OK' | 'NON' = (bear.q_design <= qCap && !bear.uplift && !outsideSide) ? 'OK' : 'NON';

    // Efforts dans la semelle au nu du voile : distribution réelle de la pression, mêmes facteurs (E11, E11b)
    const fH = comb.factors['H'] || 0;
    const fSur = comb.factors[surType] || 0;
    const fSoil = (saturated: boolean, hs: number) => soilWeightFactor(comb, saturated, hs);
    const slabEffort = (pAt: (x: number) => number, kind: 'toe' | 'heel', xLen: number): { V: number; M: number } => {
      if (xLen <= 0) return { V: 0, M: 0 };
      const n = 100;
      const dx = xLen / n;
      const uplift = hasWater ? fH * gamma_w * hw : 0;
      let down: number;
      if (kind === 'heel') {
        down = comb.factors.D * conc.gamma_c * geo.epBase
          + fSoil(false, geo.hMur) * soil.gamma * hDryHeel
          + fSoil(true, geo.hMur) * gamma_prime * hSubHeel
          + fH * gamma_w * hSubHeel
          + loads.surcharge * fSur; // charge directe sur le talon : défavorable, facteur plein
      } else {
        down = comb.factors.D * conc.gamma_c * geo.epBase
          + fSoil(false, soil.hSolAv) * foundation.gamma * hDryToe
          + fSoil(true, soil.hSolAv) * gamma_prime_f * hSubToe
          + fH * gamma_w * hSubToe; // charge variable à l'avant : favorable, facteur 0
      }
      let V = 0;
      let M = 0;
      for (let i = 0; i < n; i++) {
        const xi = (i + 0.5) * dx; // distance depuis l'extrémité libre
        const pos = kind === 'toe' ? xi : baseWidth - xi;
        const qn = pAt(pos) + uplift - down;
        V += qn * dx;
        M += qn * dx * (xLen - xi);
      }
      return { V: Math.abs(V), M: Math.abs(M) };
    };
    const toeZ = slabEffort(bZ.pAt, 'toe', geo.ePiedAv);
    const toeF = slabEffort(bF.pAt, 'toe', geo.ePiedAv);
    const heelZ = slabEffort(bZ.pAt, 'heel', geo.ePiedAr);
    const heelF = slabEffort(bF.pAt, 'heel', geo.ePiedAr);
    const toeH = slabEffort(bH.pAt, 'toe', geo.ePiedAv);
    const heelH = slabEffort(bH.pAt, 'heel', geo.ePiedAr);
    slabEnvFns.push((kind, x) => {
      const len = kind === 'toe' ? geo.ePiedAv : geo.ePiedAr;
      const a = slabEffort(bZ.pAt, kind, Math.min(x, len));
      const b = slabEffort(bF.pAt, kind, Math.min(x, len));
      const h = slabEffort(bH.pAt, kind, Math.min(x, len));
      return [b, h].reduce((best, e) => (e.M > best.M ? e : best), a);
    });
    stemSectionsByComb.push(stemRes.sections);

    results.push({
      combName: comb.name,
      formula: comb.formula,
      type: comb.type,
      factors: comb.factors,
      sumV_min,
      sumV_max: bear.Rv,
      sumH,
      Fs,
      Fh_destab,
      FOS_sliding: FOS_sl,
      status_sliding,
      Ms,
      Mr,
      FOS_overturning: FOS_over,
      status_overturning,
      x1: bear.x1,
      ecc: bear.ecc,
      limitL6,
      distributionCase: bear.distributionCase,
      q_toe: bear.q_t,
      q_heel: bear.q_h,
      q_capacity: qCap,
      FOS_bearing: FOS_b,
      status_bearing,
      B_eff: bear.B_eff,
      q_design: bear.q_design,
      outside_base: outsideSide,
      stability_message,
      caseNo: comb.caseNo,
      stabApplicable: comb.stabApplicable,
      mur_Mf: stemRes.maxM,
      mur_Vf: stemRes.maxV,
      toe_Mf: Math.max(toeZ.M, toeF.M, toeH.M),
      toe_Vf: Math.max(toeZ.V, toeF.V, toeH.V),
      heel_Mf: Math.max(heelZ.M, heelF.M, heelH.M),
      heel_Vf: Math.max(heelZ.V, heelF.V, heelH.V)
    });

    if (comb.type === 'SLS') {
      if (bear.q_design > critical_q_toe_SLS) critical_q_toe_SLS = bear.q_design;
    } else {
      if (bear.q_design > critical_q_toe_ULS) critical_q_toe_ULS = bear.q_design;
      if (comb.stabApplicable) {
        if (FOS_sl < critical_sliding_ULS) critical_sliding_ULS = FOS_sl;
      }
      // résultante hors de la base : renversement / basculement NON, FS critique ramené à 0
      if (comb.stabApplicable || outsideSide) {
        const fosO = outsideSide ? 0 : FOS_over;
        if (fosO < critical_over_ULS) critical_over_ULS = fosO;
      }
    }
  }

  const defaultComb = results.find(r => r.combName.includes('ELS 1')) || results[0];

  // Diagrammes d'efforts : combinaison ELU qui gouverne (même jeu de facteurs que le calcul, E11b)
  let iMaxBase = -1;
  let iMaxStem = -1;
  results.forEach((r, i) => {
    if (r.type !== 'ULS') return;
    if (iMaxBase < 0 || r.q_design > results[iMaxBase].q_design) iMaxBase = i;
    if (iMaxStem < 0 || Math.abs(r.mur_Mf) > Math.abs(results[iMaxStem].mur_Mf)) iMaxStem = i;
  });
  if (iMaxBase < 0) iMaxBase = 0;
  if (iMaxStem < 0) iMaxStem = 0;

  const toeForces: { x: number; shear: number; moment: number }[] = [];
  const heelForces: { x: number; shear: number; moment: number }[] = [];
  const numPts = 20;
  for (let i = 0; i <= numPts; i++) {
    const x = (i / numPts) * geo.ePiedAv;
    const e = slabEnvFns[iMaxBase]('toe', x);
    toeForces.push({ x, shear: e.V, moment: e.M });
  }
  for (let i = 0; i <= numPts; i++) {
    const x = (i / numPts) * geo.ePiedAr;
    const e = slabEnvFns[iMaxBase]('heel', x);
    heelForces.push({ x, shear: e.V, moment: e.M });
  }
  // profondeur décroissante comme l'ancien tracé MEF (du pied au haut)
  const stemForces = [...stemSectionsByComb[iMaxStem]].reverse();

  // --- CSA A23.3-19 CONCRETE DESIGN CALCULATIONS ---
  const bw = 1000; // mm (1m de mur)
  const hm_mm = geo.epStem * 1000; // mm
  const hs_mm = geo.epBase * 1000; // mm
  const alpha1 = Math.max(0.85 - 0.0015 * conc.fc_mur, 0.67);
  const beta1 = Math.max(0.97 - 0.0025 * conc.fc_mur, 0.67);
  // semelle : f'c propre (saisissable)
  const alpha1_s = Math.max(0.85 - 0.0015 * conc.fc_semelle, 0.67);
  const beta1_s = Math.max(0.97 - 0.0025 * conc.fc_semelle, 0.67);

  // Maximum design forces from combinations and FEM
  const mur_Mf = Math.max(...results.filter(r => r.type === 'ULS').map(r => r.mur_Mf));
  const mur_Vf = Math.max(...results.filter(r => r.type === 'ULS').map(r => r.mur_Vf));
  const talon_Mf = Math.max(...results.filter(r => r.type === 'ULS').map(r => r.heel_Mf));
  const talon_Vf = Math.max(...results.filter(r => r.type === 'ULS').map(r => r.heel_Vf));
  const orteil_Mf = Math.max(...results.filter(r => r.type === 'ULS').map(r => r.toe_Mf));
  const orteil_Vf = Math.max(...results.filter(r => r.type === 'ULS').map(r => r.toe_Vf));

  // 1. Mur - Face Intérieure (Traction)
  const designMurInterieur = computeElementConcreteDesign({
    elementName: 'Voile - Face Intérieure (Traction)',
    bw,
    h_mm: hm_mm,
    cover: conc.cover_h,
    fc: conc.fc_mur,
    fy: conc.fy,
    phi_c: conc.phi_c,
    phi_s: conc.phi_s,
    barSize: rebarCfg.mur_interieur.barSize,
    spacing: rebarCfg.mur_interieur.spacing,
    Mf: mur_Mf,
    Vf: mur_Vf,
    alpha1,
    beta1,
    Z_limit: 25000,
    available_hook_depth: hs_mm - conc.cover_base_bottom - 2 * (CANADIAN_REBAR_CATALOG[rebarCfg.mur_interieur.barSize]?.diameter || 16)
  });

  // 2. Mur - Face Extérieure
  const designMurExterieur = computeElementConcreteDesign({
    elementName: 'Voile - Face Extérieure',
    bw,
    h_mm: hm_mm,
    cover: conc.cover_h,
    fc: conc.fc_mur,
    fy: conc.fy,
    phi_c: conc.phi_c,
    phi_s: conc.phi_s,
    barSize: rebarCfg.mur_exterieur.barSize,
    spacing: rebarCfg.mur_exterieur.spacing,
    Mf: 0,
    Vf: 0,
    alpha1,
    beta1,
    Z_limit: 25000
  });

  // 3. Mur - Armature Horizontale (Répartition)
  const designMurHorizontal = computeElementConcreteDesign({
    elementName: 'Voile - Armature Horizontale (Répartition)',
    bw,
    h_mm: hm_mm,
    cover: conc.cover_h,
    fc: conc.fc_mur,
    fy: conc.fy,
    phi_c: conc.phi_c,
    phi_s: conc.phi_s,
    barSize: rebarCfg.mur_horizontal.barSize,
    spacing: rebarCfg.mur_horizontal.spacing,
    Mf: 0,
    Vf: 0,
    alpha1,
    beta1,
    Z_limit: 25000
  });

  // 4. Semelle - Talon (Armature Supérieure en traction)
  const designTalon = computeElementConcreteDesign({
    elementName: 'Semelle - Talon (Armature Supérieure)',
    bw,
    h_mm: hs_mm,
    cover: conc.cover_v,
    fc: conc.fc_semelle,
    fy: conc.fy,
    phi_c: conc.phi_c,
    phi_s: conc.phi_s,
    barSize: rebarCfg.semelle_talon.barSize,
    spacing: rebarCfg.semelle_talon.spacing,
    Mf: talon_Mf,
    Vf: talon_Vf,
    alpha1: alpha1_s,
    beta1: beta1_s,
    Z_limit: 25000,
    topBars: true // E12 : k1 = 1,3
  });

  // 5. Semelle - Orteil (Armature Inférieure en traction)
  const designOrteil = computeElementConcreteDesign({
    elementName: 'Semelle - Orteil (Armature Inférieure)',
    bw,
    h_mm: hs_mm,
    cover: conc.cover_base_bottom,
    fc: conc.fc_semelle,
    fy: conc.fy,
    phi_c: conc.phi_c,
    phi_s: conc.phi_s,
    barSize: rebarCfg.semelle_orteil.barSize,
    spacing: rebarCfg.semelle_orteil.spacing,
    Mf: orteil_Mf,
    Vf: orteil_Vf,
    alpha1: alpha1_s,
    beta1: beta1_s,
    Z_limit: 25000
  });

  // 6. Semelle - Armature de Retrait et Température (2 lits longitudinaux 15M @ 250)
  const retrait_s = 250;
  const retrait_Ab = CANADIAN_REBAR_CATALOG['15M'].area;
  const retrait_As = 2 * retrait_Ab * (1000 / retrait_s);
  const designRetrait: ConcreteElementDesign = {
    elementName: 'Semelle - Armature Longitudinale (2 Lits Retrait)',
    section_b: bw,
    section_h: hs_mm,
    d: designTalon.d,
    dv: designTalon.dv,
    beta: designTalon.beta,
    Vc: designTalon.Vc,
    Vf: 0,
    shear_ok: true,
    As_min: designOrteil.As_min,
    As_provided: retrait_As,
    As_ok: retrait_As >= designOrteil.As_min,
    checks_ok: retrait_As >= designOrteil.As_min,
    bar_designation: `15M @ ${retrait_s} mm (2 lits)`,
    a_stress_block: 0,
    alpha1: alpha1_s,
    beta1: beta1_s,
    c_depth: 0,
    kr: 0,
    rho: retrait_As / (bw * designTalon.d),
    rho_b: designTalon.rho_b,
    Mr: 0,
    Mf: 0,
    flexure_ok: true,
    ductility_c_over_d: 0,
    ductility_limit: designMurInterieur.ductility_limit,
    ductility_ok: true,
    ld: designMurInterieur.ld
  };

  // 7. Cisaillement-friction à l'interface voile / semelle (CSA A23.3-19, art. 11.5 ; c et μ : décision D14, valeurs inchangées)
  // E03 : N = poids du voile seul au-dessus du joint à 0,9D (+ charges permanentes de tête à 0,9D, sans charge variable) ;
  //       armature traversant le joint = armature verticale des DEUX faces.
  const c_frict = 0.25; // MPa
  const mu_frict = 0.60;
  const Acv = hm_mm * bw;
  const As_crossing = designMurInterieur.As_provided + designMurExterieur.As_provided; // mm2/m
  const rho_v = As_crossing / Acv;
  let N_perm = geo.hMur * geo.epStem * conc.gamma_c; // kN/m
  if (loads.pointLoadTop?.enabled && (loads.pointLoadTop.loadType || 'L') === 'D') N_perm += loads.pointLoadTop.Fy || 0;
  if (loads.reactionsTop?.D) N_perm += loads.reactionsTop.D.Ry || 0;
  const N_frict = 0.9 * N_perm; // kN/m
  const Ag = Acv;
  const sigma_frict = (rho_v * conc.fy * Math.sin(Math_PI / 2)) + (N_frict * 1000 / Ag);
  const Vr_shear_friction = (1.0 * conc.phi_c * (c_frict + mu_frict * sigma_frict) * Acv + (rho_v * conc.phi_s * conc.fy * Math.cos(Math_PI / 2) * Acv)) * 1e-3;

  const concreteDesign: ConcreteDesignSummary = {
    mur_interieur: designMurInterieur,
    mur_exterieur: designMurExterieur,
    mur_horizontal: designMurHorizontal,
    semelle_talon: designTalon,
    semelle_orteil: designOrteil,
    semelle_retrait: designRetrait,
    cisaillement_friction: {
      Vr: Vr_shear_friction,
      Vf: mur_Vf,
      sigma: sigma_frict,
      status_ok: Vr_shear_friction >= mur_Vf,
      N: N_frict,
      As_crossing,
      rho_v
    }
  };

  // Governing Combinations
  const ulsCombs = results.filter(r => r.type === 'ULS');
  const slsCombs = results.filter(r => r.type === 'SLS');

  const governingULS = ulsCombs.reduce((max, c) => (c.q_design > max.q_design ? c : max), ulsCombs[0] || results[0]);
  const governingSLS = slsCombs.reduce((max, c) => (c.q_design > max.q_design ? c : max), slsCombs[0] || results[0]);
  // glissement / renversement : seules les combinaisons où D stabilise (0,9D, 1,0D) s'appliquent — 4.1.3.2.(5)
  const ulsStab = ulsCombs.filter(c => c.stabApplicable);
  // renversement : une combinaison NON (hors base) l'emporte sur le FS minimal
  const ulsOverturn = ulsCombs.filter(c => c.stabApplicable || c.outside_base);
  const governingOverturning = ulsOverturn.reduce((best, c) => {
    const bestOut = best.outside_base ? 1 : 0;
    const cOut = c.outside_base ? 1 : 0;
    if (cOut !== bestOut) return cOut > bestOut ? c : best;
    return c.FOS_overturning < best.FOS_overturning ? c : best;
  }, ulsOverturn[0] || ulsCombs[0] || results[0]);
  const governingSliding = ulsStab.reduce((min, c) => (c.FOS_sliding < min.FOS_sliding ? c : min), ulsStab[0] || ulsCombs[0] || results[0]);
  // combinaisons gouvernantes utilisées par la note de calcul (surlignage des lignes)
  const maxBy = (f: (c: CombinationResult) => number) =>
    ulsCombs.reduce((best, c) => (f(c) > f(best) ? c : best), ulsCombs[0] || results[0]);
  const governingBearing = maxBy(c => (c.q_capacity > 0 ? c.q_design / c.q_capacity : Infinity));
  const governingStem = maxBy(c => Math.abs(c.mur_Mf));
  const governingToe = maxBy(c => Math.abs(c.toe_Mf));
  const governingHeel = maxBy(c => Math.abs(c.heel_Mf));

  return {
    K_active,
    K_passive: Kp,
    K_0: K0,
    baseWidth,
    totalHeight,
    earthPressures,
    stabilityCriterion: criterion,
    cnbEdition,
    lateral_nominal: components.filter(c => c.Fx !== 0).map(c => ({ name: c.name, type: c.type, Fx: c.Fx, y: c.y, applied: !!c.stemApplied })),
    weights_nominal: {
      stem: components.filter(c => c.name === 'Wb1_Mur').reduce((s, c) => s + c.Fy, 0),
      base: components.filter(c => c.name === 'Wb2_Semelle').reduce((s, c) => s + c.Fy, 0),
      heelSoil: components.filter(c => c.name.startsWith('W1_sol_arrière')).reduce((s, c) => s + c.Fy, 0),
      toeSoil: components.filter(c => c.name.startsWith('W2_sol_avant')).reduce((s, c) => s + c.Fy, 0),
      waterHeel: components.filter(c => c.name === 'Weau_talon').reduce((s, c) => s + c.Fy, 0),
      waterToe: components.filter(c => c.name === 'Weau_patin').reduce((s, c) => s + c.Fy, 0)
    },
    warnings,
    verifiable: warnings.length === 0,
    foundationSoil: foundation,
    hydro: { hasWater, hw, gamma_w, gamma_prime, uplift_nominal },
    combinations: results,
    critical_q_toe_SLS,
    critical_q_toe_ULS,
    critical_sliding_ULS,
    critical_overturning_ULS: critical_over_ULS,
    governingULS,
    governingSLS,
    governingOverturning,
    governingSliding,
    governingBearing,
    governingStem,
    governingToe,
    governingHeel,
    soilMethodConfig: soilMethod,
    rebarConfig: rebarCfg,
    q_toe: defaultComb.q_toe,
    q_heel: defaultComb.q_heel,
    sumH_active: defaultComb.sumH,
    R_top: R_top_default,
    sumV: defaultComb.sumV_max,
    stemMaxShear: mur_Vf,
    stemMaxMoment: mur_Mf,
    toeMaxShear: Math.max(...toeForces.map(f => Math.abs(f.shear))),
    toeMaxMoment: Math.max(...toeForces.map(f => Math.abs(f.moment))),
    heelMaxShear: Math.max(...heelForces.map(f => Math.abs(f.shear))),
    heelMaxMoment: Math.max(...heelForces.map(f => Math.abs(f.moment))),
    concreteDesign,
    stemForces,
    toeForces,
    heelForces
  };
}
