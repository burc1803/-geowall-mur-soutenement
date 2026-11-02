/** Édition du CNB pour le tableau 4.1.3.2.-A (amendement A1 de MUR-01) : 2020 par défaut. */
export type CnbEdition = '2020' | '2025';

export type LoadCaseType = 'D' | 'L' | 'S' | 'W' | 'E' | 'H';

export type ActivePressureMethod = 'rankine' | 'coulomb' | 'at_rest';
export type PassivePressureMethod = 'rankine' | 'coulomb' | 'reduced_cfem' | 'neglected';
export type SeismicMethod = 'seed_whitman' | 'mononobe_okabe' | 'none';

/**
 * Critère de renversement et de portance (MUR-01 §3.1, choix de l'utilisateur).
 * - moments : FS = Ms/Mr ; pression par distribution linéaire q = V/B·(1 ± 6e/B) ;
 * - eccentricity : largeur réduite B′ = B − 2e, pression uniforme V/B′ (limite de e : CFEM 5e, À CONFIRMER, non appliquée).
 */
export type StabilityCriterion = 'moments' | 'eccentricity';

export type SoilPresetType = 
  | 'dense_gravel' 
  | 'compact_sand' 
  | 'silty_sand' 
  | 'cohesive_soil' 
  | 'stiff_clay' 
  | 'custom';

export interface SoilMethodConfig {
  activeMethod: ActivePressureMethod;
  passiveMethod: PassivePressureMethod;
  seismicMethod: SeismicMethod;
  pga: number; // Accélération maximale du sol (g)
  seismicDisplacementTolerance: 'free_cantilever' | 'rigid_wall'; // 0.50 PGA vs 1.00 PGA
  deltaFrictionRatio: number; // Ratio delta / phi (ex: 0.667 pour 2/3 phi)
}

export type CanadianBarSize = '10M' | '15M' | '20M' | '25M' | '30M' | '35M';

export interface RebarBarInfo {
  name: CanadianBarSize;
  area: number; // mm²
  diameter: number; // mm
  mass: number; // kg/m
}

export const CANADIAN_REBAR_CATALOG: Record<CanadianBarSize, RebarBarInfo> = {
  '10M': { name: '10M', area: 100, diameter: 11.3, mass: 0.785 },
  '15M': { name: '15M', area: 200, diameter: 16.0, mass: 1.570 },
  '20M': { name: '20M', area: 300, diameter: 19.5, mass: 2.355 },
  '25M': { name: '25M', area: 500, diameter: 25.2, mass: 3.925 },
  '30M': { name: '30M', area: 700, diameter: 29.9, mass: 5.495 },
  '35M': { name: '35M', area: 1000, diameter: 35.7, mass: 7.850 }
};

export interface RebarElementSelection {
  barSize: CanadianBarSize;
  spacing: number; // mm (ex: 100, 125, 150, 175, 200, 225, 250, 300)
}

export interface RebarCustomConfig {
  mode: 'auto' | 'manual';
  mur_interieur: RebarElementSelection;
  mur_exterieur: RebarElementSelection;
  mur_horizontal: RebarElementSelection;
  semelle_talon: RebarElementSelection;
  semelle_orteil: RebarElementSelection;
}

export interface AppliedLoad {
  id: string;
  name: string;
  caseType: LoadCaseType;
  nature: 'Fx' | 'Fy' | 'Mz';
  magnitude: number;
  x: number;
  y: number;
  isDistributed?: boolean;
  length?: number;
}

export interface WallGeometry {
  wallType: 'cantilever' | 'basement';
  hMur: number; // Height of stem (voile) in m
  epStem: number; // Thickness of stem in m
  ePiedAv: number; // Toe width (patin avant) in m
  ePiedAr: number; // Heel width (talon arrière) in m
  epBase: number; // Thickness of base (semelle) in m
  supports?: { y: number; type: 'pinned' | 'fixed' }[]; // Heights above top of footing
}

export interface GeotechnicalFactors {
  phi_gu: number; // Portance (Bearing resistance factor) - default 0.50 (CFEM Table 8.1 / Tableau 6.2)
  phi_gs: number; // Glissement de base (Base sliding friction) - default 0.80
  phi_renv: number; // Renversement (Overturning passive factor) - default 0.50
  phi_p: number; // Résistance passive - default 0.50
  phi_coh: number; // Glissement base cohésion - default 0.60
}

export interface ConcreteProperties {
  fc_mur: number; // MPa (ex: 30 MPa)
  fc_semelle: number; // MPa (ex: 30 MPa)
  fy: number; // MPa (ex: 400 MPa)
  gamma_c: number; // kN/m3 (ex: 24 kN/m3)
  phi_c: number; // 0.65
  phi_s: number; // 0.85
  aggregate_size: number; // mm (ex: 20 mm)
  cover_h: number; // mm (ex: 60 mm)
  cover_v: number; // mm (ex: 60 mm)
  cover_base_bottom: number; // mm (ex: 75 mm)
}

/** Sol de fondation (portance, glissement) : distinct du sol de remblai (poussée) — MUR-01 §3.3. */
export interface FoundationSoilProperties {
  gamma: number; // kN/m3 (sol de butée à l'avant et déjaugé sous la nappe)
  phi: number; // φ′ (degrés) : coefficient de butée Kp
  cohesion: number; // c′ (kPa) : adhérence au glissement de la base
}

/** Sol de REMBLAI (poussée sur le voile, poids sur le talon). Le sol de fondation est dans `foundation`. */
export interface SoilProperties {
  gamma: number; // Poids volumique du sol de remblai humide (kN/m3)
  gamma_prime?: number; // Poids volumique déjaugé (kN/m3)
  phi: number; // φ′ du remblai (degrés)
  cohesion?: number; // c′ du remblai (kPa) — négligée dans la poussée active (conservateur)
  foundation?: FoundationSoilProperties; // Sol de fondation ; absent = identique au remblai
  stabilityCriterion?: StabilityCriterion; // Défaut : 'moments'
  mu: number; // Coefficient de frottement sol-béton (tan delta) - default 0.55 (CFEM Table 24.4)
  soilFrictionType?: string; // e.g. 'compact_sand' | 'clean_gravel' | 'silty_sand' | 'custom'
  presetType?: SoilPresetType;
  methodConfig?: SoilMethodConfig;
  hSolAv: number; // Hauteur de sol à l'avant (m)
  qAllowable_SLS: number; // Portance admissible SLS (kPa) pour tassement <= 25mm
  qUltimate_ULS: number; // Portance ultime ULS (kPa)
  geotechFactors: GeotechnicalFactors;
  // Nappe phréatique amont (Niveau d'eau)
  hasWaterTable?: boolean; // Option à cocher pour ajouter la nappe
  waterTableHeight?: number; // Hauteur de la nappe au-dessus de la semelle (m)
  gamma_w?: number; // Poids volumique de l'eau (kN/m3), standard 9.81
}

export interface WallReactionLoad {
  Rx: number; // kN/m
  Ry: number; // kN/m
  M: number; // kNm/m
}

export interface PointLoadTopConfig {
  enabled: boolean;
  Fy: number; // kN/m (verticale, positive = descendante)
  Fx?: number; // kN/m (horizontale, positive = vers l'avant)
  Mz?: number; // kNm/m (moment en tête, positif = horaire / basculant)
  loadType?: LoadCaseType; // 'D' | 'L' | 'S' | 'W' | 'E' (assignation du type de charge)
  name?: string;
}

export interface LoadsConfig {
  surcharge: number; // Surface surcharge amont (kPa)
  surchargeType: LoadCaseType; // Type amont: D (permanente), L (exploitation), S (neige)...
  surchargeAval?: number; // Surface surcharge aval (kPa)
  surchargeAvalType?: LoadCaseType; // Type aval: D (permanente), L (exploitation), S (neige)...
  pointLoadTop?: PointLoadTopConfig; // Charge ponctuelle appliquée au milieu de la tête du mur
  gammaM: number; // generic
  gammaF: number; // generic
  additionalLoads: AppliedLoad[];
  reactionsTop?: Record<LoadCaseType, WallReactionLoad>; // Reactions on top of stem
  cnbEdition?: CnbEdition; // Défaut : '2020' (amendement A1)
  kh: number; // Horizontal seismic coefficient
  kv: number; // Vertical seismic coefficient
}

export interface VisualizerDisplayOptions {
  lateralPressures: boolean; // Pressions Latérales
  loadsAndSupports: boolean; // Charges & Appuis
  dimensions: boolean; // Dimensions
  soilParameters: boolean; // Paramètres Sols
  resultants: boolean; // Résultantes (Ry, Rx, M au pied + widget Résumé Stabilité)
  waterTable: boolean; // Nappe Phréatique
}

export interface CombinationResult {
  combName: string;
  formula: string;
  type: 'ULS' | 'SLS';
  factors: Record<LoadCaseType, number>;
  
  // Forces verticales
  sumV_min: number;
  sumV_max: number;
  sumH: number;
  
  // Stabilité au Glissement (CFEM Table 8.1 & Fig 24.12)
  Fs: number; // Force stabilisante totale
  Fh_destab: number; // Sollicitation horizontale déstabilisante
  FOS_sliding: number; // Fs / Fh
  status_sliding: 'OK' | 'NON';
  
  // Stabilité au Renversement (CFEM Fig 24.12)
  Ms: number; // Moment stabilisant total
  Mr: number; // Moment de renversement déstabilisant
  FOS_overturning: number; // Ms / Mr
  status_overturning: 'OK' | 'NON';
  
  // Capacité portante & Excentricité
  x1: number; // Distance résultante depuis point de renversement (orteil)
  ecc: number; // |L/2 - x1|
  limitL6: number; // L/6
  distributionCase: 'Cas 1' | 'Cas 2' | 'Cas 3' | 'Cas 4';
  q_toe: number; // q1 max (côté orteil)
  q_heel: number; // q2 min (côté talon)
  q_capacity: number; // q_ult (ULS) ou q_adm (SLS)
  FOS_bearing: number; // q_capacity / q_toe
  status_bearing: 'OK' | 'NON';
  B_eff: number; // B′ = B − 2e (m) — critère « eccentricity »
  q_design: number; // pression comparée à la capacité : q_toe (moments) ou V/B′ (eccentricity)
  outside_base: 'toe' | 'heel' | null; // résultante hors de la base (côté orteil ou talon) : renversement / portance NON
  stability_message: string; // message d'erreur de stabilité ('' si aucun)
  caseNo: number; // cas du tableau 4.1.3.2.-A du CNB (édition choisie ; 0 = ELS)
  stabApplicable: boolean; // vérification au glissement / renversement applicable (D stabilisant : 0,9D ou 1,0D)

  // Section des efforts au pied du mur et sur semelle
  mur_Mf: number;
  mur_Vf: number;
  toe_Mf: number;
  toe_Vf: number;
  heel_Mf: number;
  heel_Vf: number;
}

export interface ConcreteElementDesign {
  elementName: string;
  section_b: number; // mm
  section_h: number; // mm
  d: number; // mm
  dv: number; // mm
  beta: number;
  Vc: number; // kN
  Vf: number; // kN
  shear_ok: boolean;
  
  As_min: number; // mm2/m
  As_provided: number; // mm2/m
  As_ok: boolean; // As fourni >= As,min (comparaison calculée)
  checks_ok: boolean; // statut global : flexion, cisaillement, As,min, ductilité, fissuration, ancrage
  bar_designation: string; // e.g. "15M @ 120 mm"
  a_stress_block: number; // mm
  alpha1: number;
  beta1: number;
  c_depth: number; // mm (a / beta1)
  kr: number; // MPa = Mf / (b * d^2)
  rho: number; // As / (b * d)
  rho_b: number; // balanced ratio
  Mr: number; // kNm/m
  Mf: number; // kNm/m
  flexure_ok: boolean;
  
  ductility_c_over_d: number;
  ductility_limit: number;
  ductility_ok: boolean;

  // Crack control (Facteur Z - Omar Chaallal Éq. 3.15)
  crack_dc?: number; // mm
  crack_A?: number; // mm2/bar
  Z_factor?: number; // N/mm
  Z_limit?: number; // 30000 or 25000 N/mm
  Z_ok?: boolean;

  // Anchorage & Development (Omar Chaallal Chapitre 7)
  ld: number; // mm
  ld_k1?: number; // facteur de position des barres (1,3 barres supérieures)
  ld_k4?: number; // facteur de dimension des barres (0,8 si <= 20M ; 1,0 si >= 25M)
  lhb?: number; // mm
  ldh_required?: number; // mm
  ldh_available?: number; // mm
  anchorage_ok?: boolean;
}

export interface EarthPressureCalculations {
  Ka_rankine: number;
  Ka_coulomb: number;
  Kp_rankine: number;
  Kp_coulomb: number;
  K0_jaky: number;
  theta_eq_rad: number;
  theta_eq_deg: number;
  Kae_mo: number;
  delta_Kae_seed: number;
  delta_Pae_seed: number; // kN/m
  y_Pae: number; // m
  P_active_nominal: number; // kN/m
  y_Pa: number; // m
  P_passive_nominal: number; // kN/m
  y_Pp: number; // m
  P_surcharge_nominal: number; // kN/m
  y_Psur: number; // m
  E_stem_nominal: number; // kN/m
  E_base_nominal: number; // kN/m
  K_active_used: number;
  K_passive_used: number;
}

export interface ConcreteDesignSummary {
  mur_interieur: ConcreteElementDesign;
  mur_exterieur: ConcreteElementDesign;
  mur_horizontal: ConcreteElementDesign;
  semelle_talon: ConcreteElementDesign;
  semelle_orteil: ConcreteElementDesign;
  semelle_retrait: ConcreteElementDesign;
  cisaillement_friction: {
    Vr: number; // kN/m
    Vf: number; // kN/m
    sigma: number; // MPa
    status_ok: boolean;
    N: number; // kN/m — poids du voile seul à 0,9D
    As_crossing: number; // mm2/m — armature des deux faces qui traverse le joint
    rho_v: number;
  };
}

export interface AnalysisResult {
  // Config & Coeffs
  K_active: number;
  K_passive: number;
  K_0: number;
  baseWidth: number;
  totalHeight: number;
  
  // Earth pressure & seismic theoretical and calculated values
  earthPressures: EarthPressureCalculations;
  
  // Critère de stabilité retenu et sols
  stabilityCriterion: StabilityCriterion;
  cnbEdition: CnbEdition;
  // Poids propres NON pondérés (kN/m), lecture seule : exposés pour la note de calcul
  // Composantes horizontales NON pondérées réellement utilisées (celles qui entrent dans ΣH), lecture seule
  lateral_nominal: { name: string; type: LoadCaseType; Fx: number; y: number; applied: boolean }[];
  weights_nominal: { stem: number; base: number; heelSoil: number; toeSoil: number; waterHeel: number; waterToe: number };
  warnings: string[]; // alertes de validation des données (ex. γ ≤ γw avec nappe)
  verifiable: boolean; // false si une alerte rend les statuts globaux NON VÉRIFIABLES
  foundationSoil: FoundationSoilProperties;
  hydro: { hasWater: boolean; hw: number; gamma_w: number; gamma_prime: number; uplift_nominal: number };

  // All Combinations
  combinations: CombinationResult[];

  // Critical values (enveloppe)
  critical_q_toe_SLS: number;
  critical_q_toe_ULS: number;
  critical_sliding_ULS: number;
  critical_overturning_ULS: number;

  // Governing Combinations
  governingULS: CombinationResult;
  governingSLS: CombinationResult;
  governingOverturning: CombinationResult;
  governingSliding: CombinationResult;
  governingBearing: CombinationResult; // ELU : plus grand rapport q_toe / q_capacity
  governingStem: CombinationResult; // ELU : plus grand |Mf| au pied du voile
  governingToe: CombinationResult; // ELU : plus grand |Mf| du talon avant (orteil)
  governingHeel: CombinationResult; // ELU : plus grand |Mf| du talon arrière

  // Applied Method & Rebar configurations
  soilMethodConfig: SoilMethodConfig;
  rebarConfig: RebarCustomConfig;

  // Single default result to keep charts working
  q_toe: number;
  q_heel: number;
  sumH_active: number;
  R_top: number;
  sumV: number;
  
  // Design Forces (Envelope)
  stemMaxShear: number;
  stemMaxMoment: number;
  toeMaxShear: number;
  toeMaxMoment: number;
  heelMaxShear: number;
  heelMaxMoment: number;

  // CSA A23.3 Concrete Design Results
  concreteDesign: ConcreteDesignSummary;

  // Arrays for charts
  stemForces: { depth: number; shear: number; moment: number }[];
  toeForces: { x: number; shear: number; moment: number }[];
  heelForces: { x: number; shear: number; moment: number }[];
}
