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
  RebarElementSelection,
  FoundationSoilProperties,
  StabilityCriterion,
  CnbEdition,
  GeotechLevel,
  GeotechResolved,
  SeismicScenario,
  SeismicSummary
} from './types';
import { solveBeamFEM, SupportBoundary } from './fem';
import { coulombKp, linearSegmentEffect, StemItem, stemItemFactor, stemSectionEffort, proppedTopReaction, mononobeOkabeKae, mononobeOkabeKpe, lineLoadThrust } from './wallMechanics';

export const DEFAULT_SOIL_METHOD_CONFIG: SoilMethodConfig = {
  activeMethod: 'rankine',
  passiveMethod: 'rankine',
  seismicMethod: 'mononobe_okabe', // MUR-02 §4.2 : Mononobe-Okabe pour le mur libre (Wood pour le mur retenu)
  pga: 0.15, // ah (g) — à remplacer par la valeur du site (MUR-02 D6)
  ahSource: '',
  csaS6Reduction: false,
  seismicPassive: 'none',
  deltaFrictionRatio: 0.667
};

/**
 * Facteurs de résistance géotechnique — CFEM 5e éd. (2023), tableau 6.2, p. 199 (PDF 231) ; Ψ : tableau 6.4, p. 200 (PDF 232).
 * MUR-02 §1. Forme de vérification (éq. 6.1, p. 191) : Ψ·φgu·R̂u ≥ Σ αi·F̂i.
 */
export const GEOTECH_TABLE_6_2: Record<GeotechLevel, { bearing: number; overturning: number; sliding: number; slidingCohesive: number; passive: number; settlement: number }> = {
  low:     { bearing: 0.45, overturning: 0.45, sliding: 0.70, slidingCohesive: 0.55, passive: 0.40, settlement: 0.7 },
  typical: { bearing: 0.50, overturning: 0.50, sliding: 0.80, slidingCohesive: 0.60, passive: 0.50, settlement: 0.8 },
  high:    { bearing: 0.60, overturning: 0.55, sliding: 0.90, slidingCohesive: 0.65, passive: 0.55, settlement: 0.9 }
};
export const PSI_CHOICES = [0.9, 1.0, 1.15] as const; // tableau 6.4 : conséquence élevée, typique, faible
export const GEOTECH_LEVEL_LABEL: Record<GeotechLevel, string> = { low: 'faible', typical: 'typique', high: 'élevé' };

export const DEFAULT_REBAR_CONFIG: RebarCustomConfig = {
  mode: 'manual',
  mur_interieur: { barSize: '15M', spacing: 120 },
  mur_exterieur: { barSize: '15M', spacing: 240 },
  mur_horizontal: { barSize: '15M', spacing: 250 },
  semelle_talon: { barSize: '15M', spacing: 200 },
  semelle_orteil: { barSize: '15M', spacing: 200 },
  mur_horizontal_ext: { barSize: '15M', spacing: 250 }, // migration : = mur_horizontal
  mur_horizontal_int: { barSize: '15M', spacing: 250 },
  semelle_longitudinale: { barSize: '15M', spacing: 250 }
};

/** Armature longitudinale de la semelle avant l'ajout de la clé `semelle_longitudinale` (valeur fixe du moteur : 15M @ 250, 2 lits). */
export const DEFAULT_SEMELLE_LONGITUDINALE: RebarElementSelection = { barSize: '15M', spacing: 250 };

export type ResolvedRebarConfig = Required<RebarCustomConfig>;

/**
 * Migration de la configuration d'armature : `mur_horizontal` (ancien champ) sert de valeur par défaut aux deux faces
 * (`mur_horizontal_ext`, `mur_horizontal_int`) ; `semelle_longitudinale` absent = 15M @ 250. Idempotente, sans effet sur les autres clés.
 */
export function resolveRebarConfig(cfg: RebarCustomConfig): ResolvedRebarConfig {
  return {
    ...cfg,
    mur_horizontal_ext: cfg.mur_horizontal_ext ?? cfg.mur_horizontal,
    mur_horizontal_int: cfg.mur_horizontal_int ?? cfg.mur_horizontal,
    semelle_longitudinale: cfg.semelle_longitudinale ?? DEFAULT_SEMELLE_LONGITUDINALE
  };
}

/**
 * Armature tendue requise As,req (mm2/m) pour que Mr = Mf — LECTURE SEULE, inverse exact de la formule de Mr du moteur
 * (bloc rectangulaire 10.1.7) : Mf = φs·As·fy·(d − a/2), a = φs·As·fy/(α1·φc·f′c·b).
 * Avec T = φs·As·fy et K = α1·φc·f′c·b : Mf = T·d − T²/(2K), d'où T = K·(d − √(d² − 2·Mf/K)) (racine la plus petite).
 * Mf en kN·m/m, b et d en mm. Retourne 0 si Mf ≤ 0 et Infinity si d² < 2·Mf/K (section insuffisante).
 */
export function requiredAsForMf(p: { Mf: number; b: number; d: number; fc: number; fy: number; phi_s: number; phi_c: number; alpha1: number }): number {
  if (!(p.Mf > 0)) return 0;
  const K = p.alpha1 * p.phi_c * p.fc * p.b; // N
  const disc = p.d * p.d - (2 * p.Mf * 1e6) / K;
  if (disc < 0) return Infinity;
  const T = K * (p.d - Math.sqrt(disc)); // N
  return T / (p.phi_s * p.fy);
}

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

/**
 * Vérification d'un élément en béton armé, bande de 1 m — CSA A23.3-19 (MUR-02 §6).
 *  8.4.2/8.4.3 φc, φs ; 10.1.7 α1, β1 ; 10.5.2 ductilité c/d ≤ 0,8·700/(700 + fy) ;
 *  7.8.1/7.8.3 semelles (0,002Ag, espacement ≤ min(5h ; 500)) ; 14.1.8.2 à 14.1.8.6 voile (0,0015Ag vertical, 0,002Ag horizontal,
 *  espacement ≤ min(3t ; 500), db ≤ t/10) ; 10.5.1.2 b) et 10.5.1.3 (As,min = 0,2√f′c/fy·b·h, dispense si Mr ≥ 4/3·Mf) ;
 *  10.6.1 fissuration z = fs·(dc·A)^(1/3) (enrobage pris ≤ 50 mm) ; 11.3.3, 11.3.4, 11.3.6 cisaillement ;
 *  12.2 (ld) et 12.5 (ldh). Lecture des articles : A23.3-19 (MUR-02 §6) ; ceux non relus sont À CONFIRMER dans la note.
 */
export function computeElementConcreteDesign(params: {
  elementName: string;
  kind: 'footing' | 'wall_vertical' | 'wall_vertical_compression' | 'wall_horizontal';
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
  aggregate_size: number; // mm (11.3.6.3)
  distZeroShear_mm?: number; // semelle : distance du point de cisaillement nul à la face du voile (11.3.6.2)
  otherVerticalAs?: number; // voile, face en compression : armature verticale de l'autre face (mm2/m)
  available_hook_depth?: number;
  lateralCover?: number; // enrobage latéral du crochet (12.5.3)
  extCover?: number; // enrobage du prolongement du crochet (12.5.3)
  topBars?: boolean; // barres supérieures (talon) : k1 = 1,3 si plus de 300 mm de béton frais dessous (12.2.4)
}): ConcreteElementDesign {
  const barInfo = CANADIAN_REBAR_CATALOG[params.barSize] || CANADIAN_REBAR_CATALOG['15M'];
  const db = barInfo.diameter;
  const Ab = barInfo.area;
  const s = Math.max(params.spacing, 50);
  const Ag = params.bw * params.h_mm;

  const d = Math.max(params.h_mm - params.cover - db / 2, 50);
  const dv = Math.max(0.72 * params.h_mm, 0.9 * d); // définition de dv : À CONFIRMER (article 2 non relu)

  // Cisaillement sans armature d'effort tranchant (11.3.4 ; β : 11.3.6)
  let beta: number;
  let beta_rule: string;
  if (params.kind === 'footing' && (params.h_mm <= 350 || (params.distZeroShear_mm !== undefined && params.distZeroShear_mm < 2 * dv))) {
    beta = 0.21;
    beta_rule = '11.3.6.2 : β = 0,21 (semelle, h ≤ 350 mm ou distance au point de V nul < 2dv)';
  } else if (params.aggregate_size >= 20) {
    beta = 230 / (1000 + dv);
    beta_rule = '11.3.6.3 b) : β = 230/(1000 + dv), granulat ≥ 20 mm';
  } else {
    const sze = (35 * dv) / (15 + params.aggregate_size);
    beta = 230 / (1000 + sze);
    beta_rule = `11.3.6.3 c) : β = 230/(1000 + sze), sze = 35·dv/(15 + ag) = ${sze.toFixed(0)} mm`;
  }
  beta = Math.max(beta, 0.05); // 11.3.4 : β ≥ 0,05
  const sqrtFc = Math.min(Math.sqrt(params.fc), 8); // 11.3.4 : √f′c ≤ 8 MPa
  const Vc = params.phi_c * 1.0 * beta * sqrtFc * params.bw * dv * 1e-3;
  const Vr_max = 0.25 * params.phi_c * params.fc * params.bw * dv * 1e-3; // 11.3.3
  const As_provided = Ab * (1000 / s);

  const a = (params.phi_s * As_provided * params.fy) / (params.alpha1 * params.phi_c * params.fc * params.bw);
  const c = a / params.beta1;
  const Mr = (params.phi_s * As_provided * params.fy * (d - a / 2)) * 1e-6;
  // As,req : inverse exact de la formule de Mr ci-dessus (mêmes φs, φc, α1, d) — lecture seule, n'intervient dans aucun statut
  const As_req = requiredAsForMf({ Mf: params.Mf, b: params.bw, d, fc: params.fc, fy: params.fy, phi_s: params.phi_s, phi_c: params.phi_c, alpha1: params.alpha1 });

  // Armature minimale (MUR-02 §6, D20 : la plus exigeante des exigences applicables)
  const As_min_flexure = (0.2 * Math.sqrt(params.fc) / params.fy) * params.bw * params.h_mm; // 10.5.1.2 b)
  const flexure_min_waived = params.Mf > 0 && Mr >= (4 / 3) * params.Mf; // 10.5.1.3
  let As_min: number;
  let As_min_basis: string;
  let spacing_max: number;
  let db_max: number | undefined;
  if (params.kind === 'footing') {
    As_min = 0.002 * Ag; // 7.8.1, dans chaque direction
    As_min_basis = '7.8.1 : 0,002·Ag';
    spacing_max = Math.min(5 * params.h_mm, 500); // 7.8.3
  } else if (params.kind === 'wall_horizontal') {
    As_min = 0.002 * Ag; // 14.1.8.6
    As_min_basis = '14.1.8.6 : 0,002·Ag (horizontal)';
    spacing_max = Math.min(3 * params.h_mm, 500); // 14.1.8.4
    db_max = params.h_mm / 10; // 14.1.8.2
  } else if (params.kind === 'wall_vertical_compression') {
    As_min = Math.max(0.0015 * Ag - (params.otherVerticalAs ?? 0), 0); // 14.1.8.5 sur l'armature verticale totale des deux faces
    As_min_basis = '14.1.8.5 : 0,0015·Ag sur la somme des deux faces (14.1.8.3 : un lit permis)';
    spacing_max = Math.min(3 * params.h_mm, 500);
    db_max = params.h_mm / 10;
  } else {
    const a1 = 0.0015 * Ag; // 14.1.8.5
    As_min = flexure_min_waived ? a1 : Math.max(a1, As_min_flexure);
    As_min_basis = flexure_min_waived
      ? '14.1.8.5 : 0,0015·Ag ; 10.5.1.2 b) dispensée (10.5.1.3 : Mr ≥ 4/3·Mf)'
      : '14.1.8.5 : 0,0015·Ag et 10.5.1.2 b) : 0,2√f′c/fy·b·h (la plus grande)';
    spacing_max = Math.min(3 * params.h_mm, 500);
    db_max = params.h_mm / 10;
  }

  const rho = As_provided / (params.bw * d);
  const kr = (params.Mf * 1e6) / (params.bw * Math.pow(d, 2));
  const rho_b = ((params.alpha1 * params.beta1 * params.phi_c * params.fc) / (params.phi_s * params.fy)) * (700 / (700 + params.fy));
  // 10.5.2 : c/d ≤ 0,8·700/(700 + fy) (E28 : l'ancienne limite 700/(700 + fy) n'était pas sécuritaire)
  const duct_limit = 0.8 * (700 / (700 + params.fy));
  const c_over_d = c / d;

  // Fissuration (10.6.1) : z = fs·(dc·A)^(1/3) ; enrobage pris ≤ 50 mm pour dc et A ; fs = 0,6·fy permis
  const dc = Math.min(params.cover, 50) + db / 2;
  const A_crack = 2 * dc * s;
  const fs = 0.6 * params.fy;
  const Z_factor = fs * Math.cbrt(dc * A_crack);

  // Développement d'une barre droite (12.2) : ld = max(300 ; coef·k1·k2·k3·k4·(fy/√f′c)·db)
  const clearSpacing = s - db;
  // tableau 12.1 (fiche p. 92-93) : conditions enrobage ≥ db et espacement ≥ 1,4db ; sinon éq. 12.1 requise (À CONFIRMER), 0,6 retenu par prudence
  // espacement d'axe en axe ou libre : À CONFIRMER (A23.3 12.2.3) ; ici comparé en axe en axe (calcul inchangé)
  const ld_cond = params.cover >= db && s >= 1.4 * db;
  const ld_coeff = ld_cond && clearSpacing >= 2 * db ? 0.45 : 0.6;
  const ld_eq12_1_required = !ld_cond;
  const k1 = params.topBars && (params.h_mm - params.cover) > 300 ? 1.3 : 1.0;
  const k4 = params.barSize === '10M' || params.barSize === '15M' || params.barSize === '20M' ? 0.8 : 1.0;
  const ld = Math.max(ld_coeff * k1 * 1.0 * 1.0 * k4 * (params.fy / Math.sqrt(params.fc)) * db, 300);
  // Crochet standard (12.5) : lhb = 100·db/√f′c ; × fy/400 ; × 0,7 si enrobage latéral ≥ 60 mm et du prolongement ≥ 50 mm ; ≥ max(8db ; 150)
  const lhb = (100 * db) / Math.sqrt(params.fc);
  const hookReduction = (params.lateralCover ?? 0) >= 60 && (params.extCover ?? 0) >= 50;
  const ldh_required = Math.max(lhb * (params.fy / 400) * (hookReduction ? 0.7 : 1.0), 8 * db, 150);
  const ldh_factors = `lhb · fy/400${hookReduction ? ' · 0,7 (12.5.3)' : ' (12.5.3 non satisfait : pas de réduction)'} ≥ max(8db ; 150 mm)`;
  const ldh_available = params.available_hook_depth;

  // E05 : chaque statut vient d'une comparaison calculée
  const As_ok = As_provided >= As_min;
  const shear_ok = params.Vf <= Math.min(Vc, Vr_max);
  const flexure_ok = Mr >= params.Mf;
  const ductility_ok = c_over_d <= duct_limit;
  const Z_ok = Z_factor <= params.Z_limit;
  const spacing_ok = s <= spacing_max;
  const db_ok = db_max === undefined ? undefined : db <= db_max;
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
    Vr_max,
    beta_rule,
    As_req,
    As_min,
    As_min_basis,
    As_min_flexure,
    flexure_min_waived,
    spacing: s,
    spacing_max,
    spacing_ok,
    db,
    db_max,
    db_ok,
    As_provided,
    As_ok,
    checks_ok: As_ok && shear_ok && flexure_ok && ductility_ok && Z_ok && anchorage_ok && spacing_ok && (db_ok ?? true),
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
    ductility_rule: '10.5.2 : c/d ≤ 0,8·700/(700 + fy)',
    crack_dc: dc,
    crack_A: A_crack,
    Z_factor,
    Z_limit: params.Z_limit,
    Z_ok,
    ld,
    ld_coeff,
    ld_eq12_1_required,
    ld_status: ld_eq12_1_required ? 'À CONFIRMER' : 'VÉRIFIÉ',
    ld_k1: k1,
    ld_k4: k4,
    lhb,
    ldh_factors,
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

  const rebarCfg: ResolvedRebarConfig = resolveRebarConfig(customRebar || DEFAULT_REBAR_CONFIG);

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
  } else {
    Kp = Kp_rankine;
  }

  const baseWidth = geo.ePiedAv + geo.epStem + geo.ePiedAr;
  const totalHeight = geo.hMur + geo.epBase;

  // Séisme (MUR-02 §4.1, D6) : kh = ah par défaut (CFEM 5e, éq. 18.22) ; option avancée désactivée par défaut :
  // kh = 0,5·ah et kv = 0 (CSA S6 citée par le CFEM p. 631), réservée aux murs libres de remblais routiers ou autoroutiers.
  const seismicOn = soilMethod.seismicMethod !== 'none';
  const rigidWall = geo.wallType === 'basement' || soilMethod.activeMethod === 'at_rest'; // mur retenu : Wood (§4.3)
  const ah = seismicOn ? Math.max(Number.isFinite(soilMethod.pga) ? soilMethod.pga : 0, 0) : 0;
  const csaS6 = !!soilMethod.csaS6Reduction && seismicOn && !rigidWall;
  const kh_val = csaS6 ? 0.5 * ah : ah;
  // MUR-02 §4.1, D6 : kv = 2/3·kh à défaut d'étude du site (CFEM p. 629), deux signes étudiés ; option CSA S6 : kv = 0
  const kvIsDefault = !(loads.kv !== undefined && Number.isFinite(loads.kv));
  const kvInput = !seismicOn || csaS6 ? 0 : kvIsDefault ? (2 / 3) * kh_val : Math.abs(loads.kv as number);
  const kv_val = 0; // kv signé : voir `scenarios` (les deux signes de kvInput sont étudiés)

  // Static nominal forces
  const P_active_nominal = 0.5 * K_active * soil.gamma * totalHeight * totalHeight;
  const y_Pa = totalHeight / 3;
  // Amendement A2 de MUR-01 : hSolAv est mesurée depuis le dessus de la semelle ; la butée s'exerce depuis la sous-face
  // (h_pass = hSolAv + epBase). Sans sol à l'avant (hSolAv <= 0), la butée est nulle.
  const h_pass = soil.hSolAv > 0 ? soil.hSolAv + geo.epBase : 0;
  // Amendement A3 : butée effective par couches. σ′v = γ·z au-dessus de la nappe, γ·z_sec + γ′·(z − z_sec) en dessous
  // (γ′ = γ − γw). Pp′ = ∫ Kp·σ′v dz ; y_Pp = centroïde du diagramme depuis la sous-face. L'eau n'est jamais multipliée par Kp.
  const hwP = (!!soil.hasWaterTable && (soil.waterTableHeight ?? 0) > 0) ? Math.min(Math.max(soil.waterTableHeight || 0, 0), totalHeight) : 0;
  const gammaW_P = soil.gamma_w ?? 9.81;
  const zDryP = hwP > 0 ? Math.min(Math.max(h_pass - hwP, 0), h_pass) : h_pass; // profondeur de la nappe sous la surface avant
  const gammaPrimeP = foundation.gamma - gammaW_P;
  // MUR-02 D9 (choix de l'utilisateur) : butée statique de df à h_pass si la case « déduire la profondeur de gel » est cochée (défaut) ;
  // sinon sur toute la hauteur. La pression verticale σ′v garde le poids du sol de la zone gelée (surcharge sur la zone de butée).
  const frostDeduct = soil.frost?.deduct ?? true;
  const dfInput = Number.isFinite(soil.frost?.df) ? Math.max(soil.frost!.df, 0) : 0;
  const zPassiveTop = frostDeduct ? Math.min(dfInput, h_pass) : 0;
  let P_passive_nominal = 0;
  let M_passive_soil = 0;
  if (h_pass > 0 && Kp > 0 && zPassiveTop < h_pass) {
    const s1 = linearSegmentEffect(0, Kp * foundation.gamma, zPassiveTop, zDryP, h_pass);
    const zSub = Math.max(zPassiveTop, zDryP);
    const s2 = linearSegmentEffect(Kp * (foundation.gamma - gammaPrimeP) * zDryP, Kp * gammaPrimeP, zSub, h_pass, h_pass);
    P_passive_nominal = s1.V + s2.V;
    M_passive_soil = s1.M + s2.M;
  }
  const y_Pp = P_passive_nominal > 0 ? M_passive_soil / P_passive_nominal : h_pass / 3;
  // Eau à l'avant : composante séparée, résistante, de type H (scénario B seulement)
  // Tant que la sous-pression trapézoïdale n'est pas traitée (A3 §7.4), l'eau à l'avant exige une nappe à l'arrière
  // et hw,av_eff = min(hw,av ; hw ; h_pass) (sous-pression uniforme). Avis non bloquants dans `notices`.
  const notices: string[] = [];
  if (h_pass > 0 && soilMethod.passiveMethod !== 'neglected') {
    if (!frostDeduct) notices.push("Butée sur toute la hauteur : sol avant déclaré permanent et non gélif par l'utilisateur.");
    else if (!(dfInput > 0)) notices.push("Profondeur de gel df non saisie (0 m) : aucune déduction appliquée. Saisir df dans l'onglet Critères, ou décocher la case si le sol avant est permanent et non gélif.");
    else if (dfInput >= h_pass) notices.push(`Profondeur de gel df = ${dfInput.toFixed(2)} m ≥ profondeur de butée ${h_pass.toFixed(2)} m : butée statique nulle.`);
  }
  const frontWaterReq = !!soil.frontWater?.enabled;
  const frontWaterOn = frontWaterReq && hwP > 0;
  if (frontWaterReq && !frontWaterOn) notices.push("Eau à l'avant ignorée : elle exige une nappe à l'arrière (scénario A retenu).");
  const hwAvReq = Math.max(soil.frontWater?.hwAv ?? h_pass, 0);
  const hw_av = frontWaterOn ? Math.min(hwAvReq, hwP, h_pass) : 0;
  if (frontWaterOn && hwAvReq > hw_av + 1e-9) notices.push(`hw,av limité à ${hw_av.toFixed(2)} m (sous-pression uniforme, §7.4).`);
  const P_water_front = 0.5 * gammaW_P * hw_av * hw_av;
  const y_Pw_front = hw_av / 3;
  const P_surcharge_nominal = K_active * loads.surcharge * totalHeight;
  const y_Psur = totalHeight / 2;
  const E_stem_nominal = geo.hMur * geo.epStem * conc.gamma_c * kh_val;
  const E_base_nominal = baseWidth * geo.epBase * conc.gamma_c * kh_val;

  // ---------------------------------------------------------------------------
  // Scénarios sismiques (MUR-02 §4) : un par signe de kv (kv signé ; sign = +1 : vers le haut, poids W(1 − kv))
  // ---------------------------------------------------------------------------
  const warnings: string[] = [];
  const seisMethod: SeismicSummary['method'] = !seismicOn ? 'none' : rigidWall ? 'wood' : soilMethod.seismicMethod === 'seed_whitman' ? 'seed_whitman' : 'mononobe_okabe';
  const westergaard = seismicOn && hw_av > 0;
  if (!!soilMethod.csaS6Reduction && seismicOn && rigidWall) notices.push("Option CSA S6 (kh = 0,5·ah) non appliquée : elle ne vise pas les murs rigides ou retenus (MUR-02 §4.1). kh = ah.");
  if (seismicOn && hwP > 0) notices.push("Séisme avec nappe dans le remblai : ΔPAE calculé avec γ sur toute la hauteur (conservateur). Effet de Matsuzawa (CFEM éq. 18.34-18.35) NON APPLIQUÉ : exige Gs et e, absents du modèle — À CONFIRMER.");
  const deltaSeis = soilMethod.activeMethod === 'coulomb' ? delta_rad : 0; // D11 : δ = 0 sur le plan fictif (remblai horizontal) ; même δ pour Ka et KAE (E13b)
  const deltaPassSeis = soilMethod.passiveMethod === 'coulomb' ? delta_p_rad : 0;
  const signs: (0 | 1 | -1)[] = seismicOn ? (kvInput > 0 ? [1, -1] : [0]) : [];
  const gH2 = (h: number) => 0.5 * soil.gamma * h * h;
  const scenarios: SeismicScenario[] = signs.map(sign => {
    const kv = sign * kvInput;
    const psi = Math.atan(kh_val / Math.max(1 - kv, 0.1)); // éq. 18.21 : ψ = atan[kh/(1 − kv)]
    let Kae = 0;
    let indeterminate = false;
    let dPae = 0;
    let dPaeStem = 0;
    let yRel = 0.6; // fraction de H : 0,6 (Seed-Whitman, éq. 18.26) ; 0,58 (Wood, éq. 18.39)
    if (seisMethod === 'wood') {
      // Wood : ΔP0E = kh·γ·H² à 0,58H (CFEM 18.7.3, éq. 18.39)
      dPae = kh_val * soil.gamma * totalHeight * totalHeight;
      dPaeStem = kh_val * soil.gamma * geo.hMur * geo.hMur;
      yRel = 0.58;
    } else if (seisMethod === 'seed_whitman') {
      dPae = 0.375 * kh_val * soil.gamma * totalHeight * totalHeight;
      dPaeStem = 0.375 * kh_val * soil.gamma * geo.hMur * geo.hMur;
    } else if (seisMethod === 'mononobe_okabe') {
      const K = mononobeOkabeKae(phiRad, deltaSeis, psi);
      if (K === null) {
        indeterminate = true; // φ − β < ψ : jamais de NaN ; calcul sismique arrêté avec message (CFEM p. 632, 18.7.4)
      } else {
        Kae = K;
        dPae = Math.max(gH2(totalHeight) * ((1 - kv) * Kae - K_active), 0); // PAE = PA + ΔPAE (éq. 18.20, 18.23)
        dPaeStem = Math.max(gH2(geo.hMur) * ((1 - kv) * Kae - K_active), 0);
      }
    }
    let Kpe = 0;
    let ppFactor = 0;
    if (soilMethod.seismicPassive === 'kpe' && Kp > 0) {
      const kpe = mononobeOkabeKpe(phiF, deltaPassSeis, psi);
      if (kpe !== null) {
        Kpe = kpe;
        ppFactor = Math.min(Math.max((Kpe * (1 - kv)) / Kp, 0), 1); // PPE/PP ; ΔPPE s'oppose à PP (éq. 18.27-18.31)
      }
    }
    const Pw_dyn = westergaard ? (7 / 12) * kh_val * gammaW_P * hw_av * hw_av : 0; // Westergaard, éq. 18.33
    return { sign, kv, psi_rad: psi, psi_deg: (psi * 180) / Math_PI, Kae, indeterminate, dPae, dPae_stem: dPaeStem, y_dPae: yRel * totalHeight, Kpe, Pp_factor: ppFactor, Pw_dyn };
  });
  const sc0: SeismicScenario | undefined = scenarios[0];
  if (scenarios.some(sc => sc.indeterminate)) {
    warnings.push(`Mononobe-Okabe : KAE indéterminé (φ′ − β < ψ, ψ = ${Math.max(...scenarios.map(sc => sc.psi_deg)).toFixed(2)}° > φ′ = ${soil.phi}°). Calcul sismique ARRÊTÉ : NON VÉRIFIABLE. Utiliser l'équilibre limite (CFEM 18.7.4).`);
  }
  if (soilMethod.seismicPassive === 'kpe' && seismicOn && scenarios.some(sc => Kp > 0 && sc.Kpe === 0)) {
    notices.push("KPE indéterminé (φ′ + β < ψ) : butée sismique prise nulle.");
  }
  const seismic: SeismicSummary = {
    active: seismicOn && (kh_val > 0 || kvInput > 0),
    method: seisMethod,
    rigid: rigidWall,
    ah,
    ahSource: soilMethod.ahSource ?? '',
    kh: kh_val,
    csaS6,
    kvInput,
    kvIsDefault: kvIsDefault && !csaS6,
    scenarios,
    passiveMode: soilMethod.seismicPassive === 'kpe' ? 'kpe' : 'none',
    westergaard
  };

  const earthPressures: EarthPressureCalculations = {
    Ka_rankine,
    Ka_coulomb,
    Kp_rankine,
    Kp_coulomb,
    K0_jaky: K0,
    theta_eq_rad: sc0?.psi_rad ?? 0,
    theta_eq_deg: sc0?.psi_deg ?? 0,
    Kae_mo: sc0 && !sc0.indeterminate && seisMethod === 'mononobe_okabe' ? sc0.Kae : K_active,
    delta_Kae_seed: 0.75 * kh_val,
    delta_Pae_seed: sc0?.dPae ?? 0,
    y_Pae: sc0?.y_dPae ?? 0.6 * totalHeight,
    P_active_nominal,
    y_Pa,
    P_passive_nominal,
    y_Pp,
    P_water_front,
    y_Pw_front,
    hw_av,
    frontWaterScenario: frontWaterOn ? 'B' : 'A',
    h_pass,
    P_surcharge_nominal,
    y_Psur,
    E_stem_nominal,
    E_base_nominal,
    K_active_used: K_active,
    K_passive_used: Kp,
    W_heelSoil_inertia: 0,
    E_heelSoil_nominal: 0,
    y_heelSoil: 0,
    h_frost_df: frostDeduct ? zPassiveTop : 0,
    z_passive_top: zPassiveTop,
    Pp_seismic_factor: sc0 ? sc0.Pp_factor : 1
  };

  // Facteurs géotechniques (MUR-02 §1) : tableau 6.2 du CFEM 5e selon le degré de compréhension ; Ψ du tableau 6.4
  const level: GeotechLevel = soil.geotechLevel ?? 'typical';
  const tbl = GEOTECH_TABLE_6_2[level] ?? GEOTECH_TABLE_6_2.typical;
  const psiG = Number.isFinite(soil.psi) && (soil.psi as number) > 0 ? (soil.psi as number) : 1.0;
  const quFactored = !!soil.quFactored;
  const geotech: GeotechResolved = {
    level,
    psi: psiG,
    phi_gu: quFactored ? 1.0 : tbl.bearing,
    phi_ov: tbl.overturning,
    phi_gs: tbl.sliding,
    phi_coh: tbl.slidingCohesive,
    phi_p: tbl.passive,
    phi_settle: tbl.settlement,
    quFactored
  };
  const phi_gu = geotech.phi_gu;
  const phi_gs = geotech.phi_gs;
  const phi_renv = geotech.phi_ov;
  const phi_p = geotech.phi_p;
  const phi_coh = geotech.phi_coh;
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
    lineLoad?: { type: LoadCaseType; label: string; sigmaAt: (z: number) => number }; // poussée d'une charge linéaire (fig. 20.8) : diagramme σh(z), z sous la surface
  }
  const components: ForceComp[] = [];
  const lineLoadsInfo: { name: string; QL: number; m: number; PH: number; yPH: number }[] = [];

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

      // Charge verticale Fy > 0 sur le remblai amont, assimilée à une charge LINÉAIRE QL (kN/m) parallèle au mur :
      // poussée horizontale selon la fig. 20.8 du CFEM 5e (p. 694), MUR-02 §3 — corrige E25.
      // m = distance au mur / H (distance mesurée depuis la face arrière du voile, H = hauteur totale : hypothèse À CONFIRMER).
      // Une charge répartie sur une longueur est ramenée à sa résultante au centre : approximation À CONFIRMER.
      const stemBack = geo.ePiedAv + geo.epStem;
      if (al.nature === 'Fy' && fy > 0 && x_c >= stemBack) {
        const m = (x_c - stemBack) / totalHeight;
        const lt = lineLoadThrust(fy, m, totalHeight);
        if (lt.PH > 0) {
          lineLoadsInfo.push({ name: al.name, QL: fy, m, PH: lt.PH, yPH: totalHeight - lt.zc });
          components.push({
            name: `${al.name} (Poussée de la charge linéaire, fig. 20.8)`,
            type: al.caseType,
            Fx: lt.PH,
            y: totalHeight - lt.zc,
            Fy: 0,
            x: 0,
            Mz: 0,
            stemApplied: true,
            lineLoad: { type: al.caseType, label: `${al.name} (fig. 20.8)`, sigmaAt: lt.sigmaAt }
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

  // Action sismique (E) — MUR-02 §4.4 : ΔPAE (ou ΔP0E de Wood) et forces d'inertie kh·W (et ±kv·W) appliquées au centre de gravité
  // du voile, de la semelle et du sol situé au-dessus du talon (entre le voile et le plan fictif ; D21, source À CONFIRMER).
  // Un jeu de composantes par signe de kv ; le sol et le voile suivent la même accélération.
  const W_stem = geo.hMur * geo.epStem * conc.gamma_c;
  const W_base = baseWidth * geo.epBase * conc.gamma_c;
  const xHeel = geo.ePiedAv + geo.epStem + geo.ePiedAr / 2;
  // sol du talon : γ saisi pris comme poids saturé sous la nappe (masse d'inertie du sol saturé), sec au-dessus
  const W_heelSub = hSubHeel * geo.ePiedAr * soil.gamma;
  const W_heelDry = hDryHeel * geo.ePiedAr * soil.gamma;
  const W_heelSoil = W_heelSub + W_heelDry;
  const yHeelSub = geo.epBase + hSubHeel / 2;
  const yHeelDry = geo.epBase + hSubHeel + hDryHeel / 2;
  const y_heelSoil = W_heelSoil > 0 ? (W_heelSub * yHeelSub + W_heelDry * yHeelDry) / W_heelSoil : geo.epBase + geo.hMur / 2;
  earthPressures.W_heelSoil_inertia = W_heelSoil;
  earthPressures.E_heelSoil_nominal = W_heelSoil * kh_val;
  earthPressures.y_heelSoil = y_heelSoil;
  const seismicComps: ForceComp[][] = scenarios.map(sc => {
    const out: ForceComp[] = [];
    if (kh_val <= 0 && kvInput <= 0) return out;
    const tag = scenarios.length > 1 ? (sc.sign > 0 ? ' [kv ↑]' : ' [kv ↓]') : '';
    const nameDp = seisMethod === 'wood' ? 'Wood (ΔP0E)' : seisMethod === 'seed_whitman' ? 'Seed & Whitman' : 'Mononobe-Okabe (ΔPAE)';
    if (sc.dPae > 0) out.push({ name: `P_seismic_soil (${nameDp})${tag}`, type: 'E', Fx: sc.dPae, y: sc.y_dPae, Fy: 0, x: 0, Mz: 0 });
    // Westergaard (CFEM éq. 18.33) : poussée hydrodynamique de l'eau à l'avant, action E (facteur de E), à 0,4·hw,av de la base
    if (sc.Pw_dyn > 0) out.push({ name: `E_westergaard${tag}`, type: 'E', Fx: sc.Pw_dyn, y: 0.4 * hw_av, Fy: 0, x: 0, Mz: 0 });
    const masses: { name: string; W: number; y: number; x: number }[] = [
      { name: 'E_stem_inertia', W: W_stem, y: geo.epBase + geo.hMur / 2, x: geo.ePiedAv + geo.epStem / 2 },
      { name: 'E_base_inertia', W: W_base, y: geo.epBase / 2, x: baseWidth / 2 }
    ];
    if (hDryHeel > 0) masses.push({ name: 'E_heelSoil_inertia', W: W_heelDry, y: yHeelDry, x: xHeel });
    if (hSubHeel > 0) masses.push({ name: 'E_heelSoil_inertia_sat', W: W_heelSub, y: yHeelSub, x: xHeel });
    for (const m of masses) {
      if (m.W <= 0) continue;
      out.push({ name: `${m.name}${tag}`, type: 'E', Fx: kh_val * m.W, y: m.y, Fy: 0, x: m.x, Mz: 0 });
      // kv·W : force verticale opposée au poids si kv > 0 (poids effectif W(1 − kv)), dans le même sens si kv < 0
      if (sc.kv !== 0) out.push({ name: `${m.name}_kv${tag}`, type: 'E', Fx: 0, y: 0, Fy: -sc.kv * m.W, x: m.x, Mz: 0 });
    }
    return out;
  });

  // Poussée passive avant
  // moment par rapport à la sous-face : butée du sol (bras y_Pp) + eau à l'avant (bras hw,av/3) ; mêmes facteurs (A3, À CONFIRMER)
  const M_passive_nominal = P_passive_nominal * y_Pp + P_water_front * y_Pw_front; // statique (cas sans E)

  // ---------------------------------------------------------------------------
  // Charges latérales sur le voile, avec TOUTES les charges latérales (E01) :
  // terres, eau, surcharge, séisme, charges de tête, réactions de tête, charges ponctuelles et réparties Fx.
  // z = profondeur sous le haut du voile (m).
  // ---------------------------------------------------------------------------
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
  // Séisme : un jeu d'items par signe de kv (ΔPAE du voile à 0,6 h au-dessus du pied, ΔP0E de Wood à 0,58 h, inertie du voile à h/2)
  const stemItemsE: StemItem[][] = scenarios.map(sc => {
    const out: StemItem[] = [];
    if (kh_val <= 0 && kvInput <= 0) return out;
    const zFrac = seisMethod === 'wood' ? 1 - 0.58 : 1 - 0.6; // profondeur sous le haut = (1 − fraction) · h
    if (sc.dPae_stem > 0) out.push({ kind: 'point', type: 'E', label: seisMethod === 'wood' ? 'Incrément sismique de Wood (ΔP0E)' : 'Incrément sismique du sol (ΔPAE)', z: zFrac * geo.hMur, F: sc.dPae_stem });
    if (E_stem_nominal > 0) out.push({ kind: 'point', type: 'E', label: 'Inertie du voile', z: geo.hMur / 2, F: E_stem_nominal });
    return out;
  });
  for (const c of components) {
    if (!c.stemApplied || c.lineLoad) continue;
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
  // Charges linéaires (fig. 20.8) : diagramme σh(z) discrétisé en segments linéaires sur la hauteur du voile
  for (const c of components) {
    if (!c.lineLoad) continue;
    const nSeg = 24;
    const zEnd = Math.min(geo.hMur, totalHeight);
    for (let i = 0; i < nSeg; i++) {
      const z1 = (i / nSeg) * zEnd;
      const z2 = ((i + 1) / nSeg) * zEnd;
      const p1 = c.lineLoad.sigmaAt(z1);
      const p2 = c.lineLoad.sigmaAt(z2);
      if (p1 === 0 && p2 === 0) continue;
      const slope = (p2 - p1) / (z2 - z1);
      stemItems.push({ kind: 'linear', type: c.lineLoad.type, label: c.lineLoad.label, z1, z2, a: p1 - slope * z1, b: slope });
    }
  }

  const propped = geo.wallType === 'basement';
  const customSupports = propped && !!geo.supports && geo.supports.length > 0;
  const supportsFEM: SupportBoundary[] = [{ y: 0, v: true, theta: true }];
  if (customSupports) geo.supports!.forEach(s => supportsFEM.push({ y: s.y, v: true, theta: s.type === 'fixed' }));
  const E_fem = 2.5e7;
  const I_fem = 1.0 * Math.pow(geo.epStem, 3) / 12;

  // Efforts du voile pour un jeu de facteurs : sections de 0 à hMur, réaction(s) en tête (mur de sous-sol)
  const stemAnalysis = (factors: Record<LoadCaseType, number>, dUnfav: number, stemItems: StemItem[]) => {
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
  // Une combinaison avec E est étudiée pour chaque signe de kv (MUR-02 §4.1) ; les autres une seule fois.
  const expanded: { comb: LoadCombination; scIdx: number }[] = [];
  for (const comb of getCnbCombinations(cnbEdition)) {
    // Si aucun séisme n'est retenu (mode statique), les combinaisons sismiques (E > 0) ne sont pas applicables
    if (!seismicOn && (comb.factors.E || 0) > 0) continue;
    if ((comb.factors.E || 0) > 0 && scenarios.length > 0) scenarios.forEach((_, i) => expanded.push({ comb, scIdx: i }));
    else expanded.push({ comb, scIdx: -1 });
  }
  const stemVAtFns: ((dm: number) => number)[] = [];
  for (const { comb: comb0, scIdx } of expanded) {
    const sc = scIdx >= 0 ? scenarios[scIdx] : null;
    const kvSign: 0 | 1 | -1 = sc ? sc.sign : 0;
    const comb: LoadCombination = sc && scenarios.length > 1
      ? { ...comb0, name: `${comb0.name} [kv ${sc.sign > 0 ? '↑' : '↓'}]` }
      : comb0;
    const allComps = sc ? components.concat(seismicComps[scIdx]) : components;
    const stemItemsC = sc ? stemItems.concat(stemItemsE[scIdx]) : stemItems;
    // Résistances de la butée et de l'eau à l'avant : statiques, ou séisme (butée nulle / réduite KPE ; Westergaard sur l'eau à l'avant)
    let Pp_c = P_passive_nominal;
    let Mp_c = M_passive_soil;
    let Pw_c = P_water_front;
    let Mw_c = P_water_front * y_Pw_front;
    if (sc) {
      Pp_c = P_passive_nominal * sc.Pp_factor;
      Mp_c = M_passive_soil * sc.Pp_factor;
    }
    const Mpass_c = Mp_c + Mw_c;

    // Réaction(s) d'appui en tête (mur de sous-sol) : issue(s) des charges latérales du voile de CETTE combinaison (E10)
    const stemRes = stemAnalysis(comb.factors, comb.Dunfav, stemItemsC);
    {
      const Rtop = propped && !customSupports ? proppedTopReaction(stemItemsC, comb.factors, geo.hMur, comb.Dunfav) : 0;
      stemVAtFns.push((dm: number) => customSupports ? stemRes.maxV : Math.abs(stemSectionEffort(stemItemsC, comb.factors, Math.min(Math.max(geo.hMur - dm, 0), geo.hMur), Rtop, comb.Dunfav).V));
    }
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
      for (const comp of allComps) {
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

    // --- MUR-02 §2.1 : glissement  Ψ·[φgs·ΣV′·tanδb + φcoh·c′a·B′ + φp·(Pp + Pw,a)] ≥ ΣHf
    // ΣV′ = force verticale effective (poids déjaugé, sous-pression déduite) ; B′ = B − 2e (largeur comprimée) pour le terme cohésif (D13, À CONFIRMER).
    const isULS = comb.type === 'ULS';
    const psiC = isULS ? geotech.psi : 1.0;
    const phi_sliding_friction = isULS ? phi_gs : 1.0;
    const phi_passive = isULS ? phi_p : 1.0;
    const phi_cohesion = isULS ? phi_coh : 1.0;
    const phi_overturning = isULS ? phi_renv : 1.0;
    const B_slide = bZ.outside ? 0 : Math.min(bZ.B_eff, baseWidth);
    const Rf_friction = psiC * phi_sliding_friction * Math.max(sumV_min, 0) * soil.mu;
    const Rf_cohesion = psiC * phi_cohesion * c2 * B_slide;
    const Rf_passive = psiC * phi_passive * (Pp_c + Pw_c);
    const Fs = Rf_friction + Rf_cohesion + Rf_passive;
    const Fh_destab = Math.max(sumH, 0.01);
    const FOS_sl = sumH > 0 ? (Fs / Fh_destab) : Infinity;
    const status_sliding: 'OK' | 'NON' = FOS_sl >= 1.0 ? 'OK' : 'NON';

    // --- MUR-02 §2.3 (E08) : renversement  Ψ·φ_ov·ΣM_stab ≥ ΣM_renv (forme d'application À CONFIRMER) ; la butée fait partie de ΣM_stab
    const Ms_nominal = stab.Mres + Mpass_c;
    const Ms = psiC * phi_overturning * Ms_nominal;
    const Mr = Math.max(stab.Mover, 0.01);
    const FOS_over = stab.Mover > 0 ? (Ms / Mr) : Infinity;
    let status_overturning: 'OK' | 'NON' = FOS_over >= 1.0 ? 'OK' : 'NON';
    const bear = [bF, bH].reduce((best, b) => (b.q_design > best.q_design ? b : best), bZ);
    // Résultante hors de la base : renversement (vers l'orteil) ou basculement vers le talon -> NON, avec message
    const outsideSide = bZ.outside ?? bF.outside ?? bH.outside;
    const stability_message = outsideSide
      ? (outsideSide === 'toe'
        ? 'Résultante hors de la base côté orteil : renversement, portance non vérifiable'
        : 'Résultante hors de la base côté talon : basculement vers le talon, portance non vérifiable')
      : '';
    if (outsideSide) status_overturning = 'NON';

    // Portance : qf ≤ Ψ·φgu·qu (ELU) ; q_adm,ELS du rapport géotechnique à l'ELS (MUR-02 §1, §2.2)
    const qCap = isULS ? (psiC * phi_gu * soil.qUltimate_ULS) : soil.qAllowable_SLS;
    // Limite d'excentricité (D3) : e ≤ B/6 à l'ELU et à l'ELS, sur tous les états étudiés de la combinaison
    const ecc_max = Math.max(bZ.ecc, bF.ecc, bH.ecc);
    const status_ecc: 'OK' | 'NON' = (!outsideSide && ecc_max <= limitL6 + 1e-9) ? 'OK' : 'NON';
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
      kvSign,
      psi: psiC,
      phi_gs: phi_sliding_friction,
      phi_coh: phi_cohesion,
      phi_p: phi_passive,
      phi_ov: phi_overturning,
      phi_gu: isULS ? phi_gu : 1.0,
      Pp_used: Pp_c,
      Pw_front_used: Pw_c,
      Rf_friction,
      Rf_cohesion,
      Rf_passive,
      B_slide,
      sumV_min,
      sumV_max: bear.Rv,
      sumH,
      Fs,
      Fh_destab,
      FOS_sliding: FOS_sl,
      status_sliding,
      Ms,
      Ms_nominal,
      Ms_passive: Mpass_c,
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
      ecc_max,
      status_ecc,
      B_eff: bear.B_eff,
      q_design: bear.q_design,
      outside_base: outsideSide,
      stability_message,
      caseNo: comb.caseNo,
      stabApplicable: comb.stabApplicable,
      mur_Mf: stemRes.maxM,
      mur_Vf: stemRes.maxV,
      mur_Vf_dv: stemRes.maxV,
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

  const hookDb = (b: CanadianBarSize) => CANADIAN_REBAR_CATALOG[b]?.diameter || 16;
  const agg = conc.aggregate_size;

  // dv du voile (pour l'effort tranchant à dv de la face de la semelle — information, 11.3.2 À CONFIRMER)
  {
    const dMur = Math.max(hm_mm - conc.cover_h - hookDb(rebarCfg.mur_interieur.barSize) / 2, 50);
    const dvMur = Math.max(0.9 * dMur, 0.72 * hm_mm);
    results.forEach((r, i) => { r.mur_Vf_dv = stemVAtFns[i]?.(dvMur / 1000) ?? r.mur_Vf; });
  }
  const mur_Vf_dv = Math.max(...results.filter(r => r.type === 'ULS').map(r => r.mur_Vf_dv));

  // 1. Mur - Face Intérieure (Traction)
  const designMurInterieur = computeElementConcreteDesign({
    elementName: 'Voile - Face Intérieure (Traction)',
    kind: 'wall_vertical',
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
    aggregate_size: agg,
    available_hook_depth: hs_mm - conc.cover_base_bottom - 2 * hookDb(rebarCfg.mur_interieur.barSize),
    lateralCover: conc.cover_h,
    extCover: conc.cover_base_bottom
  });

  // 2. Mur - Face Extérieure (compression en flexion ; armature verticale totale selon 14.1.8.5)
  const designMurExterieur = computeElementConcreteDesign({
    elementName: 'Voile - Face Extérieure',
    kind: 'wall_vertical_compression',
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
    Z_limit: 25000,
    aggregate_size: agg,
    otherVerticalAs: designMurInterieur.As_provided
  });

  // 3. Mur - Armature Horizontale (Répartition) : chaque face est vérifiée séparément (règle : chaque face ≥ As,min, 14.1.8.6) ;
  //    `mur_horizontal` est l'enveloppe (pire des deux faces), compatible avec l'ancien format.
  const horizontalParams = (face: 'ext' | 'int') => {
    const sel = face === 'ext' ? rebarCfg.mur_horizontal_ext : rebarCfg.mur_horizontal_int;
    return {
      elementName: `Voile - Armature Horizontale (Face ${face === 'ext' ? 'Extérieure' : 'Intérieure'})`,
      kind: 'wall_horizontal' as const,
      bw,
      h_mm: hm_mm,
      cover: conc.cover_h,
      fc: conc.fc_mur,
      fy: conc.fy,
      phi_c: conc.phi_c,
      phi_s: conc.phi_s,
      barSize: sel.barSize,
      spacing: sel.spacing,
      Mf: 0,
      Vf: 0,
      alpha1,
      beta1,
      Z_limit: 25000,
      aggregate_size: agg
    };
  };
  const designMurHorizontalExt = computeElementConcreteDesign(horizontalParams('ext'));
  const designMurHorizontalInt = computeElementConcreteDesign(horizontalParams('int'));
  const weakerH = designMurHorizontalExt.As_provided <= designMurHorizontalInt.As_provided ? designMurHorizontalExt : designMurHorizontalInt;
  const worstH = !designMurHorizontalExt.checks_ok ? designMurHorizontalExt : !designMurHorizontalInt.checks_ok ? designMurHorizontalInt : weakerH;
  const bothH = (f: (d: ConcreteElementDesign) => boolean | undefined) => (f(designMurHorizontalExt) ?? true) && (f(designMurHorizontalInt) ?? true);
  const designMurHorizontal: ConcreteElementDesign = {
    ...worstH,
    elementName: 'Voile - Armature Horizontale (Répartition)',
    As_ok: bothH(d => d.As_ok),
    spacing_ok: bothH(d => d.spacing_ok),
    db_ok: worstH.db_max === undefined ? undefined : bothH(d => d.db_ok),
    Z_ok: bothH(d => d.Z_ok),
    checks_ok: bothH(d => d.checks_ok)
  };

  // 4. Semelle - Talon (Armature Supérieure en traction)
  const designTalon = computeElementConcreteDesign({
    elementName: 'Semelle - Talon (Armature Supérieure)',
    kind: 'footing',
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
    aggregate_size: agg,
    distZeroShear_mm: geo.ePiedAr * 1000,
    topBars: true // E12 : k1 = 1,3 si plus de 300 mm de béton frais dessous
  });

  // 5. Semelle - Orteil (Armature Inférieure en traction)
  const designOrteil = computeElementConcreteDesign({
    elementName: 'Semelle - Orteil (Armature Inférieure)',
    kind: 'footing',
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
    Z_limit: 25000,
    aggregate_size: agg,
    distZeroShear_mm: geo.ePiedAv * 1000
  });

  // 6. Semelle - Armature de Retrait et Température (2 lits longitudinaux, 15M @ 250 par défaut) : 7.8.1, 7.8.3
  const retrait_bar = rebarCfg.semelle_longitudinale.barSize;
  const retrait_s = Math.max(rebarCfg.semelle_longitudinale.spacing, 50);
  const retrait_Ab = CANADIAN_REBAR_CATALOG[retrait_bar].area;
  const retrait_As = 2 * retrait_Ab * (1000 / retrait_s);
  const retraitSpacingMax = Math.min(5 * hs_mm, 500);
  const designRetrait: ConcreteElementDesign = {
    ...designOrteil,
    elementName: 'Semelle - Armature Longitudinale (2 Lits Retrait)',
    Vf: 0,
    shear_ok: true,
    As_min_basis: '7.8.1 : 0,002·Ag (chaque direction)',
    As_provided: retrait_As,
    As_ok: retrait_As >= designOrteil.As_min,
    spacing: retrait_s,
    spacing_max: retraitSpacingMax,
    spacing_ok: retrait_s <= retraitSpacingMax,
    db: CANADIAN_REBAR_CATALOG[retrait_bar].diameter,
    db_max: undefined,
    db_ok: undefined,
    checks_ok: retrait_As >= designOrteil.As_min && retrait_s <= retraitSpacingMax,
    bar_designation: `${retrait_bar} @ ${retrait_s} mm (2 lits)`,
    As_req: undefined,
    a_stress_block: 0,
    c_depth: 0,
    kr: 0,
    rho: retrait_As / (bw * designTalon.d),
    Mr: 0,
    Mf: 0,
    flexure_ok: true,
    ductility_c_over_d: 0,
    ductility_ok: true,
    ld: designMurInterieur.ld
  };

  // 7. Cisaillement par frottement à l'interface voile / semelle (A23.3-19, 11.5.1 à 11.5.4) :
  //   vr = λφc(c + μσ) + φs·ρv·fy·cos αf, avec λφc(c + μσ) ≤ 0,25·φc·f′c ; αf = 90° (barres verticales) ;
  //   σ = ρv·fy·sin αf + N/Ag, N = charge permanente NON pondérée (11.5.4) — MUR-02 D19 (remplace 0,9D de MUR-01 E03).
  //   c = 0,25 MPa et μ = 0,60 (surface non rendue rugueuse, 11.5.2) : décision D14.
  //   armature traversant le joint = armature verticale des DEUX faces ; cumul avec l'armature tendue en flexion : À CONFIRMER.
  const c_frict = 0.25; // MPa
  const mu_frict = 0.60;
  const Acv = hm_mm * bw;
  const As_crossing = designMurInterieur.As_provided + designMurExterieur.As_provided; // mm2/m
  const rho_v = As_crossing / Acv;
  let N_perm = geo.hMur * geo.epStem * conc.gamma_c; // kN/m
  if (loads.pointLoadTop?.enabled && (loads.pointLoadTop.loadType || 'L') === 'D') N_perm += loads.pointLoadTop.Fy || 0;
  if (loads.reactionsTop?.D) N_perm += loads.reactionsTop.D.Ry || 0;
  const N_frict = N_perm; // kN/m, non pondéré
  const Ag = Acv;
  const sigma_frict = (rho_v * conc.fy * Math.sin(Math_PI / 2)) + (N_frict * 1000 / Ag);
  const vr_cap = 0.25 * conc.phi_c * Math.min(conc.fc_mur, conc.fc_semelle);
  const vr_conc = 1.0 * conc.phi_c * (c_frict + mu_frict * sigma_frict);
  const Vr_shear_friction = (Math.min(vr_conc, vr_cap) + rho_v * conc.phi_s * conc.fy * Math.cos(Math_PI / 2)) * Acv * 1e-3;

  const concreteDesign: ConcreteDesignSummary = {
    mur_interieur: designMurInterieur,
    mur_exterieur: designMurExterieur,
    mur_horizontal: designMurHorizontal,
    mur_horizontal_ext: designMurHorizontalExt,
    mur_horizontal_int: designMurHorizontalInt,
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
      rho_v,
      c: c_frict,
      mu: mu_frict,
      vr_cap,
      capped: vr_conc > vr_cap,
      surface: 'surface non rendue rugueuse (11.5.2 : c = 0,25 MPa, μ = 0,60)',
      Vf_dv: mur_Vf_dv
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
    geotech,
    seismic,
    frost: { deduct: frostDeduct, df: dfInput, df_entered: dfInput > 0, z_top: zPassiveTop },
    eccentricity_ok_ULS: results.filter(r => r.type === 'ULS').every(r => r.status_ecc === 'OK'),
    eccentricity_ok_SLS: results.filter(r => r.type === 'SLS').every(r => r.status_ecc === 'OK'),
    lateral_nominal: components.concat(seismicComps[0] ?? []).filter(c => c.Fx !== 0).map(c => ({ name: c.name, type: c.type, Fx: c.Fx, y: c.y, applied: !!c.stemApplied })),
    weights_nominal: {
      stem: components.filter(c => c.name === 'Wb1_Mur').reduce((s, c) => s + c.Fy, 0),
      base: components.filter(c => c.name === 'Wb2_Semelle').reduce((s, c) => s + c.Fy, 0),
      heelSoil: components.filter(c => c.name.startsWith('W1_sol_arrière')).reduce((s, c) => s + c.Fy, 0),
      toeSoil: components.filter(c => c.name.startsWith('W2_sol_avant')).reduce((s, c) => s + c.Fy, 0),
      waterHeel: components.filter(c => c.name === 'Weau_talon').reduce((s, c) => s + c.Fy, 0),
      waterToe: components.filter(c => c.name === 'Weau_patin').reduce((s, c) => s + c.Fy, 0)
    },
    warnings,
    notices,
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
