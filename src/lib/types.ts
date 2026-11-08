/** Édition du CNB pour le tableau 4.1.3.2.-A (amendement A1 de MUR-01) : 2020 par défaut. */
export type CnbEdition = '2020' | '2025';

export type LoadCaseType = 'D' | 'L' | 'S' | 'W' | 'E' | 'H';

export type ActivePressureMethod = 'rankine' | 'coulomb' | 'at_rest';
// MUR-02 §1 (E20) : l'option `reduced_cfem` (Kp x 0,50) est supprimée ; seul φ_p du tableau 6.2 réduit la butée.
export type PassivePressureMethod = 'rankine' | 'coulomb' | 'neglected';
export type SeismicMethod = 'seed_whitman' | 'mononobe_okabe' | 'none';

/**
 * Critère de renversement et de portance (MUR-01 §3.1, choix de l'utilisateur).
 * - moments : FS = Ms/Mr ; pression par distribution linéaire q = V/B·(1 ± 6e/B) ;
 * - eccentricity : largeur réduite B′ = B − 2e, pression uniforme V/B′ (limite de e : CFEM 5e, À CONFIRMER, non appliquée).
 */
export type StabilityCriterion = 'moments' | 'eccentricity';

export interface SoilMethodConfig {
  activeMethod: ActivePressureMethod;
  passiveMethod: PassivePressureMethod;
  seismicMethod: SeismicMethod;
  pga: number; // ah : accélération horizontale du site, en g (CFEM 5e, éq. 18.22 : kh = ah/g par défaut — MUR-02 D6)
  ahSource?: string; // source de ah saisie par l'utilisateur (RNCan, F(PGA)·PGA, etc.)
  /** Option avancée, DÉSACTIVÉE par défaut : kh = 0,5·ah et kv = 0 (CSA S6 citée par le CFEM p. 631), murs de remblais routiers ou autoroutiers. */
  csaS6Reduction?: boolean;
  /** MUR-02 §13 : « Négliger kv (kv = 0) », choix de l'utilisateur, non coché par défaut (anciens projets : false). */
  neglectKv?: boolean;
  /** Butée au séisme (MUR-02 D9) : 'none' (défaut) ou 'kpe' (réduite, CFEM éq. 18.27-18.31). */
  seismicPassive?: 'none' | 'kpe';
  /** @deprecated MUR-02 D6 : remplacé par `csaS6Reduction`. Ignoré par le moteur. */
  seismicDisplacementTolerance?: 'free_cantilever' | 'rigid_wall';
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
  /** Ancien champ, conservé pour compatibilité : valeur par défaut des deux faces horizontales (voir `resolveRebarConfig`). */
  mur_horizontal: RebarElementSelection;
  /** Plans : armature horizontale du voile, face extérieure (A3). Absent : `mur_horizontal`. */
  mur_horizontal_ext?: RebarElementSelection;
  /** Plans : armature horizontale du voile, face intérieure (A4). Absent : `mur_horizontal`. */
  mur_horizontal_int?: RebarElementSelection;
  semelle_talon: RebarElementSelection;
  semelle_orteil: RebarElementSelection;
  /** Plans : armature longitudinale de la semelle (A7), par lit (2 lits). Absent : 15M @ 250 (valeur antérieure du moteur). */
  semelle_longitudinale?: RebarElementSelection;
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

/** Degré de compréhension du site (CFEM 5e, tableau 6.2) — MUR-02 §1. */
export type GeotechLevel = 'low' | 'typical' | 'high';

/** @deprecated MUR-02 §1 : les φ géotechniques viennent du tableau 6.2 selon le degré de compréhension ; ces valeurs sont ignorées par le moteur. */
export interface GeotechnicalFactors {
  phi_gu: number;
  phi_gs: number;
  phi_renv: number;
  phi_p: number;
  phi_coh: number;
}

/** Facteurs géotechniques retenus par le moteur (tableau 6.2 du CFEM 5e, p. 199, et tableau 6.4, p. 200). */
export interface GeotechResolved {
  level: GeotechLevel;
  psi: number; // Ψ, facteur de conséquence (tableau 6.4)
  phi_gu: number; // portance (1,0 si qu est déjà pondérée)
  phi_ov: number; // renversement
  phi_gs: number; // glissement à la base (frottement)
  phi_coh: number; // glissement, sol cohésif
  phi_p: number; // butée
  phi_settle: number; // tassement (information : non appliqué, q_adm,ELS vient du rapport géotechnique)
  quFactored: boolean; // qu saisie déjà pondérée
}

/** Zone gelée à l'avant (MUR-02 D9) : la butée statique va de df à h_pass si `deduct` est vrai. */
export interface FrostConfig {
  deduct: boolean; // défaut : true
  df: number; // profondeur de gel (m), mesurée depuis la surface du sol avant
  /**
   * MUR-02 §11 (D9, décision de l'utilisateur) : traitement lorsque la case est cochée et df n'est pas saisie (df = 0).
   * 'zero' (défaut, absent = 'zero') : butée nulle ; 'not_verifiable' : butée nulle et glissement / renversement NON VÉRIFIABLES ;
   * 'full_with_notice' : butée pleine avec avis (comportement antérieur).
   */
  noDf?: FrostNoDfTreatment;
}
export type FrostNoDfTreatment = 'zero' | 'not_verifiable' | 'full_with_notice';

export interface SiteSeismicValues {
  locality: string; // localité ou coordonnées
  siteClass: string; // A à E, ou « Vs30 = … »
  sa02: number; // Sa(0,2), g (0 = non saisi)
  pga: number; // PGA du site pour la classe choisie, g (0 = non saisi)
  pgv: number; // PGV, m/s (facultatif, 0 = non saisi)
  // MUR-03 : sélection CNRC SHD-VAS 2020 (absents dans un projet ancien)
  province?: string; // code AB..YT
  siteId?: string; // nom brut du fichier CNRC (identifiant)
  source?: string; // source complète appliquée
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

/** Sol avant (MUR-04) : butée (Kp, couches A2/A3, gel §11) et poids sur le patin (déjaugé sous la nappe). La hauteur hs,av est `SoilProperties.hSolAv`. */
export interface FrontSoilProperties {
  gamma: number; // kN/m3
  phi: number; // φ′ (degrés) : coefficient de butée Kp
}
/** Nom conservé : sol avant. Le champ `cohesion` (ancien projet) n'est plus lu (MUR-04 R4 : c′a = 0). */
export interface FoundationSoilProperties extends FrontSoilProperties {
  cohesion?: number;
}

/** Sol d'assise (MUR-04) : glissement et portance. qadm et qu restent saisis dans `SoilProperties` (R6). */
export interface BearingSoilProperties {
  uscs?: import('./cfemTable204').UscsClass; // classe USCS du tableau 20.4 ; absente = non définie
  phi: number; // φ′ d'assise (degrés), borne de δb
  contact: import('./cfemTable204').BaseContact; // béton coulé contre le sol ou formé/préfabriqué
  deltaB?: number; // δb saisi (°) ; absent = valeur proposée par le tableau 20.4(a) (borne inférieure, plafonnée à φ′)
  deltaBOrigin?: 'legacy'; // migration d'un ancien projet
  cu?: number; // kPa, seulement pour la classe CL
}

/** Sol de REMBLAI (poussée sur le voile, poids sur le talon). Le sol de fondation est dans `foundation`. */
export interface SoilProperties {
  gamma: number; // Poids volumique du sol de remblai humide (kN/m3)
  hr?: number; // MUR-04 M4-A1 : hauteur du sol arrière depuis le dessus de la semelle (m), 0 < hr ≤ hMur ; défaut hMur
  gamma_prime?: number; // Poids volumique déjaugé (kN/m3)
  phi: number; // φ′ du remblai (degrés)
  cohesion?: number; // c′ du remblai (kPa) — négligée dans la poussée active (conservateur)
  foundation?: FoundationSoilProperties; // Sol avant (butée, poids sur le patin) ; absent = identique au remblai
  bearingSoil?: BearingSoilProperties; // Sol d'assise (MUR-04) ; absent = projet ancien, migré par resolveBearingSoil
  stabilityCriterion?: StabilityCriterion; // Défaut : 'moments'
  // Amendement A3 : eau à l'avant (scénario B), désactivée par défaut (scénario A : sol déjaugé, sans eau à l'avant)
  frontWater?: { enabled: boolean; hwAv?: number }; // hwAv mesuré depuis la sous-face ; défaut : h_pass
  /** @deprecated MUR-04 R5 : lu seulement pour migrer un ancien projet (δb = atan μ). Remplacé par bearingSoil.deltaB. */
  mu?: number;
  methodConfig?: SoilMethodConfig;
  hSolAv: number; // Hauteur de sol à l'avant (m)
  qAllowable_SLS: number; // Portance admissible SLS (kPa) pour tassement <= 25mm
  qUltimate_ULS: number; // Portance ultime ULS (kPa)
  geotechFactors?: GeotechnicalFactors; // @deprecated (ignoré)
  geotechLevel?: GeotechLevel; // défaut : 'typical' (MUR-02 D2)
  psi?: number; // Ψ (0,9 / 1,0 / 1,15), défaut 1,0
  quFactored?: boolean; // qu déjà pondérée par le géotechnicien (φ_gu = 1) ; défaut : non pondérée
  /** Valeurs du site (calculateur d'aléa sismique de RNCan) : enregistrées et affichées dans la note ; le moteur ne les utilise pas (kh = ah, D6). */
  siteSeismic?: SiteSeismicValues;
  frost?: FrostConfig; // défaut : déduction cochée (df non saisie = 0 -> avis)
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
  /** @deprecated MUR-02 D6 : kh est calculé par le moteur à partir de ah (`methodConfig.pga`) ; voir `AnalysisResult.seismic.kh`. */
  kh?: number;
  /** Coefficient vertical saisi (valeur absolue ; les deux signes sont étudiés). Absent : kv = 2/3·kh (CFEM p. 629, MUR-02 D6), suit kh. Option CSA S6 : forcé à 0. */
  kv?: number;
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
  
  kvSign: 0 | 1 | -1; // signe de kv étudié (MUR-02 §4.1) : 0 si pas de séisme vertical ; +1 : vers le haut, -1 : vers le bas
  // Facteurs géotechniques appliqués à cette combinaison (1,0 à l'ELS) — MUR-02 §1
  psi: number;
  phi_gs: number;
  phi_coh: number;
  phi_p: number;
  phi_ov: number;
  phi_gu: number;
  // Composantes nominales de résistance utilisées dans cette combinaison (butée statique ou sismique)
  Pp_used: number; // kN/m — butée du sol
  Pw_front_used: number; // kN/m — eau à l'avant (moins l'effet de Westergaard au séisme)
  // Glissement : Ψ·[φgs·ΣV′·tanδb + φcoh·c′a·B′ + φp·(Pp + Pw,a)] ≥ ΣHf (MUR-02 §2.1)
  Rf_friction: number; // condition gouvernante : Ψ·φgs·ΣV′·tan δb (0 si court terme gouverne)
  Rf_cohesion: number; // condition gouvernante : Ψ·φcoh·ca·B′ (court terme seulement ; c′a = 0 à long terme, MUR-04 R4)
  Rf_passive: number; // 0 si court terme gouverne (MUR-04 R3)
  B_slide: number; // largeur comprimée B′ pour le terme d'adhérence (m)
  // MUR-04 R2 : conditions de glissement. Sol non cohérent : drainée seulement.
  sliding_condition: 'drained' | 'undrained'; // condition qui gouverne (le plus faible rapport)
  tanDeltaB: number; // tan δb de l'assise
  ca_used: number; // kPa — adhérence à court terme (0 si assise non cohérente)
  Fs_drained: number; FOS_drained: number;
  Fs_undrained?: number; FOS_undrained?: number; // seulement si l'assise est cohérente
  // Stabilité au Glissement (CFEM 5e éd., tableau 6.2)
  Fs: number; // Force stabilisante totale (pondérée : Rf_friction + Rf_cohesion + Rf_passive)
  Fh_destab: number; // Sollicitation horizontale déstabilisante
  FOS_sliding: number; // Fs / Fh
  status_sliding: 'OK' | 'NON' | 'NON VÉRIFIABLE' | 'SANS OBJET'; // 'SANS OBJET' : combinaison ÉLS (MUR-02 §12)
  
  // Stabilité au Renversement (CFEM 5e éd., fig. 20.10)
  Ms: number; // Moment stabilisant pondéré : Ψ·φ_ov·ΣM_stab (MUR-02 §2.3, E08)
  Ms_nominal: number; // ΣM_stab (butée comprise), avant Ψ·φ_ov
  Ms_passive: number; // part de la butée (sol + eau à l'avant) dans ΣM_stab, avant Ψ·φ_ov
  Mr: number; // Moment de renversement déstabilisant
  FOS_overturning: number; // Ms / Mr
  status_overturning: 'OK' | 'NON' | 'NON VÉRIFIABLE' | 'SANS OBJET'; // 'SANS OBJET' : combinaison ÉLS (MUR-02 §12)
  
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
  ecc_max: number; // e maximal sur les états étudiés (stabilité, portance, basculement vers le talon)
  status_ecc: 'OK' | 'NON'; // e ≤ B/6, ELU et ELS (MUR-02 §2.2, D3)
  B_eff: number; // B′ = B − 2e (m) — critère « eccentricity »
  q_linear_max: number; // kPa — lecture seule : q max de la pression linéaire q = V/B·(1 ± 6e/B), quel que soit le critère
  q_Beff: number; // kPa — lecture seule : V/B′ avec B′ = B − 2e, quel que soit le critère
  q_design: number; // pression comparée à la capacité : q_toe (moments) ou V/B′ (eccentricity)
  outside_base: 'toe' | 'heel' | null; // résultante hors de la base (côté orteil ou talon) : renversement / portance NON
  stability_message: string; // message d'erreur de stabilité ('' si aucun)
  caseNo: number; // cas du tableau 4.1.3.2.-A du CNB (édition choisie ; 0 = ELS)
  stabApplicable: boolean; // vérification au glissement / renversement applicable (D stabilisant : 0,9D ou 1,0D)

  // Section des efforts au pied du mur et sur semelle
  mur_Mf: number;
  mur_Vf: number;
  mur_Vf_dv: number; // effort tranchant du voile à dv de la face de la semelle (information ; 11.3.2 À CONFIRMER)
  slab_ok: boolean; // au moins un état (Z, F, H) a la résultante dans la base : efforts du patin et du talon valides
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
  Vr_max: number; // kN — 0,25·φc·f′c·bw·dv (11.3.3)
  beta_rule: string; // règle de β retenue (11.3.6.2 ou 11.3.6.3)

  As_req?: number; // mm2/m — lecture seule : armature tendue requise pour Mr = Mf (inverse exact du bloc rectangulaire 10.1.7) ; Infinity si la section ne peut atteindre Mf
  As_min: number; // mm2/m
  As_min_basis: string; // article(s) qui fixent As,min
  As_min_flexure: number; // 10.5.1.2 b) — 0,2√f′c/fy·b·h (mm2/m), avant dispense
  flexure_min_waived: boolean; // dispense 10.5.1.3 : Mr ≥ 4/3·Mf
  spacing: number; // mm
  spacing_max: number; // mm
  spacing_ok: boolean;
  db: number; // mm
  db_max?: number; // mm — 14.1.8.2 (voile) : t/10
  db_ok?: boolean;
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
  ductility_rule: string;

  // Crack control (Facteur Z - Omar Chaallal Éq. 3.15)
  crack_dc?: number; // mm
  crack_A?: number; // mm2/bar
  Z_factor?: number; // N/mm
  Z_limit?: number; // 30000 or 25000 N/mm
  Z_ok?: boolean;

  // Anchorage & Development (Omar Chaallal Chapitre 7)
  ld: number; // mm
  ld_coeff?: number; // 0,45 ou 0,6 (tableau 12.1)
  ld_k1?: number; // facteur de position des barres (1,3 barres supérieures)
  ld_k4?: number; // facteur de dimension des barres (0,8 si <= 20M ; 1,0 si >= 25M)
  lhb?: number; // mm
  ld_status?: 'VÉRIFIÉ' | 'À CONFIRMER'; // À CONFIRMER si l'éq. 12.1 est requise (ld à 0,6 indicatif)
  ld_eq12_1_required?: boolean; // conditions du tableau 12.1 non remplies : éq. 12.1 requise, À CONFIRMER (0,6 retenu par prudence)
  ldh_factors?: string; // facteurs de 12.5.2 / 12.5.3 appliqués
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
  P_passive_nominal: number; // kN/m — butée effective du SOL Pp′ (γ au-dessus de la nappe, γ′ en dessous)
  y_Pp: number; // m — centroïde réel du diagramme de butée
  P_water_front: number; // kN/m — Pw,a = ½·γw·hw,av² (scénario B ; 0 en scénario A)
  y_Pw_front: number; // m — hw,av/3
  hw_av: number; // m — niveau d'eau à l'avant retenu (0 en scénario A)
  frontWaterScenario: 'A' | 'B'; // A : sol déjaugé sans eau à l'avant ; B : eau à l'avant comptée
  h_pass: number; // m — profondeur de butée depuis la sous-face (hSolAv + epBase ; 0 si hSolAv <= 0)
  P_surcharge_nominal: number; // kN/m
  y_Psur: number; // m
  E_stem_nominal: number; // kN/m
  E_base_nominal: number; // kN/m
  K_active_used: number;
  K_passive_used: number;
  delta_deg: number; // lecture seule : δ = min(atan μ ; rapport·φ), côté actif (Coulomb)
  delta_p_deg: number; // lecture seule : δ côté passif (sol de fondation)
  // Séisme (MUR-02 §4) — valeurs du scénario de référence (premier signe de kv)
  W_heelSoil_inertia: number; // kN/m — poids du sol au-dessus du talon (masse d'inertie)
  E_heelSoil_nominal: number; // kN/m — kh·W du sol du talon
  y_heelSoil: number; // m — centre de gravité de cette masse au-dessus de la sous-face
  h_frost_df: number; // m — df effectivement déduite (0 si case décochée)
  z_passive_top: number; // m — profondeur (sous la surface avant) où commence la butée
  Pp_seismic_factor: number; // rapport PPE/PP (1 si butée sismique non réduite ou non offerte)
}

/** Résultat de Mononobe-Okabe / Wood pour un signe de kv — MUR-02 §4. */
export interface SeismicScenario {
  sign: 0 | 1 | -1;
  kv: number; // kv signé
  psi_rad: number;
  psi_deg: number;
  Kae: number; // 0 si indéterminé ou sans objet
  indeterminate: boolean; // φ − β < ψ : KAE indéterminé
  dPae: number; // kN/m — ΔPAE (ou ΔP0E de Wood) sur H
  dPae_stem: number; // kN/m — idem sur la hauteur du voile
  y_dPae: number; // m depuis la sous-face
  Kpe: number; // 0 si non offert / indéterminé
  Pp_factor: number; // PPE/PP
  Pw_dyn: number; // kN/m — Westergaard (eau à l'avant)
}

export interface SeismicSummary {
  active: boolean;
  method: 'mononobe_okabe' | 'seed_whitman' | 'wood' | 'none';
  rigid: boolean;
  ah: number;
  ahSource: string;
  kh: number;
  csaS6: boolean;
  kvNeglected: boolean; // kv = 0 par choix de l'utilisateur (MUR-02 §13)
  kvInput: number;
  kvIsDefault: boolean; // kv = 2/3·kh (non saisi)
  scenarios: SeismicScenario[];
  passiveMode: 'none' | 'kpe';
  westergaard: boolean;
}

export interface ConcreteDesignSummary {
  mur_interieur: ConcreteElementDesign;
  mur_exterieur: ConcreteElementDesign;
  mur_horizontal: ConcreteElementDesign; // enveloppe : pire des deux faces
  mur_horizontal_ext: ConcreteElementDesign;
  mur_horizontal_int: ConcreteElementDesign;
  semelle_talon: ConcreteElementDesign;
  semelle_orteil: ConcreteElementDesign;
  semelle_retrait: ConcreteElementDesign;
  cisaillement_friction: {
    Vr: number; // kN/m
    Vf: number; // kN/m
    sigma: number; // MPa
    status_ok: boolean;
    N: number; // kN/m — charge permanente NON pondérée au joint (11.5.4)
    As_crossing: number; // mm2/m — armature des deux faces qui traverse le joint
    rho_v: number;
    c: number; // MPa (11.5.2)
    mu: number; // (11.5.2)
    vr_cap: number; // MPa — limite 0,25·φc·f′c
    capped: boolean; // limite atteinte
    surface: string; // état de surface retenu (D14)
    Vf_dv: number; // kN/m — effort tranchant du voile à dv (information)
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
  geotech: GeotechResolved;
  seismic: SeismicSummary;
  frost: { deduct: boolean; df: number; df_entered: boolean; z_top: number; no_df_treatment: FrostNoDfTreatment; df_missing: boolean };
  eccentricity_ok_ULS: boolean; // e ≤ B/6 pour toutes les combinaisons ELU applicables
  eccentricity_ok_SLS: boolean; // e ≤ B/6 pour toutes les combinaisons ELS
  // Poids propres NON pondérés (kN/m), lecture seule : exposés pour la note de calcul
  // Composantes horizontales NON pondérées réellement utilisées (celles qui entrent dans ΣH), lecture seule
  lateral_nominal: { name: string; type: LoadCaseType; Fx: number; y: number; applied: boolean }[];
  weights_nominal: { stem: number; base: number; heelSoil: number; toeSoil: number; waterHeel: number; waterToe: number };
  warnings: string[]; // alertes de validation des données (ex. γ ≤ γw avec nappe)
  notices: string[]; // avis non bloquants (n'affectent pas `verifiable`)
  verifiable: boolean; // false si une alerte rend les statuts globaux NON VÉRIFIABLES
  foundationSoil: FoundationSoilProperties; // sol avant (butée, poids sur le patin)
  bearingSoil: import('./bearingSoil').ResolvedBearingSoil; // sol d'assise (MUR-04)
  soilHeight: { hr: number; Hp: number }; // M4-A1 : hauteur du remblai et hauteur de poussée H_p = hr + ts (m)
  coulombRatio: number; // r : δ = r·φ du remblai (Coulomb), sans plafond par la base (MUR-04 D10)
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
  toeForcesComb: string; // combinaison ÉLU tracée pour le patin
  heelForcesComb: string; // combinaison ÉLU tracée pour le talon
}
