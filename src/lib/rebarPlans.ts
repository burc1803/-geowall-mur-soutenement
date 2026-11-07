import {
  AnalysisResult,
  CanadianBarSize,
  CANADIAN_REBAR_CATALOG,
  ConcreteElementDesign,
  ConcreteProperties,
  LoadsConfig,
  RebarCustomConfig,
  RebarElementSelection,
  SoilProperties,
  WallGeometry
} from './types';
import { analyzeRetainingWall, resolveRebarConfig } from './analysis';

/**
 * Onglet « Plans » : tableau général des armatures par zone (A1 à A7) et nomenclature.
 * Aucune règle de conception nouvelle : As,req, As,min, spacing_max et ld/ldh viennent du moteur (analysis.ts).
 */

export type ZoneId = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7';
export type ZoneConfigKey =
  | 'mur_interieur'
  | 'mur_exterieur'
  | 'mur_horizontal_ext'
  | 'mur_horizontal_int'
  | 'semelle_orteil'
  | 'semelle_talon'
  | 'semelle_longitudinale';

export const BAR_SIZES: CanadianBarSize[] = ['10M', '15M', '20M', '25M', '30M', '35M'];
/** Espacements standard proposés (mm), du plus petit au plus grand. Les valeurs déjà saisies (120, 240…) restent sélectionnables. */
export const STANDARD_SPACINGS = [100, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500];

export interface ZoneDef {
  id: ZoneId;
  element: 'Voile' | 'Semelle';
  label: string; // ex. « Voile, verticales, face intérieure (remblai, tendue) »
  short: string; // ex. « verticales int. »
  key: ZoneConfigKey;
}

export const ZONES: ZoneDef[] = [
  { id: 'A1', element: 'Voile', label: 'Voile, verticales, face intérieure (côté remblai, tendue)', short: 'verticales int.', key: 'mur_interieur' },
  { id: 'A2', element: 'Voile', label: 'Voile, verticales, face extérieure', short: 'verticales ext.', key: 'mur_exterieur' },
  { id: 'A3', element: 'Voile', label: 'Voile, horizontales, face extérieure', short: 'horizontales ext.', key: 'mur_horizontal_ext' },
  { id: 'A4', element: 'Voile', label: 'Voile, horizontales, face intérieure', short: 'horizontales int.', key: 'mur_horizontal_int' },
  { id: 'A5', element: 'Semelle', label: 'Semelle, transversales, lit inférieur (patin tendu)', short: 'transv. inf.', key: 'semelle_orteil' },
  { id: 'A6', element: 'Semelle', label: 'Semelle, transversales, lit supérieur (talon tendu)', short: 'transv. sup.', key: 'semelle_talon' },
  { id: 'A7', element: 'Semelle', label: 'Semelle, longitudinales (répartition, 2 lits)', short: 'longitudinales', key: 'semelle_longitudinale' }
];

export interface ZoneRow {
  zone: ZoneDef;
  barSize: CanadianBarSize;
  spacing: number; // mm
  As_req: number | null; // mm2/m ; null = « — » (aucun effort de flexion)
  As_req_unreachable: boolean; // la section ne peut pas atteindre Mf
  As_min: number; // mm2/m (pour A3/A4 : total requis pour la paire de faces)
  As_min_basis: string;
  As_provided: number; // mm2/m (A7 : 2 lits)
  spacing_max: number; // mm
  ok: boolean;
  /** `checks_ok` du moteur pour l'élément (flexion, cisaillement, As,min, ductilité, fissuration, ancrage, espacement, db) */
  checks_ok: boolean;
  reasons: string[];
  /** A3/A4 : total requis et somme fournie pour la paire de faces (répartition entre faces : À CONFIRMER) */
  pair?: { ids: [ZoneId, ZoneId]; required: number; provided: number };
  ld: number | null; // mm (moteur)
  ldh: number | null; // mm (moteur)
}

export const barArea = (b: CanadianBarSize) => CANADIAN_REBAR_CATALOG[b].area;
export const asPerMetre = (sel: RebarElementSelection) => (barArea(sel.barSize) * 1000) / Math.max(sel.spacing, 50);

const designOf = (r: AnalysisResult, id: ZoneId): ConcreteElementDesign => {
  const c = r.concreteDesign;
  switch (id) {
    case 'A1': return c.mur_interieur;
    case 'A2': return c.mur_exterieur;
    case 'A3': return c.mur_horizontal_ext;
    case 'A4': return c.mur_horizontal_int;
    case 'A5': return c.semelle_orteil;
    case 'A6': return c.semelle_talon;
    default: return c.semelle_retrait;
  }
};

const EPS = 1e-6;

/** Statut d'une zone : As,fourni ≥ max(As,req ; As,min) ET espacement ≤ spacing_max du moteur. Calculé, jamais écrit en dur. */
export function zoneStatus(p: { As_provided: number; As_req: number | null; As_min: number; spacing: number; spacing_max: number }): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (p.As_req !== null && !Number.isFinite(p.As_req)) reasons.push('As,req non atteignable (section insuffisante)');
  else if (p.As_req !== null && p.As_provided < p.As_req - EPS) reasons.push(`As,fourni < As,req (${p.As_provided.toFixed(0)} < ${p.As_req.toFixed(0)} mm²/m)`);
  if (p.As_provided < p.As_min - EPS) reasons.push(`As,fourni < As,min (${p.As_provided.toFixed(0)} < ${p.As_min.toFixed(0)} mm²/m)`);
  if (p.spacing > p.spacing_max + EPS) reasons.push(`espacement > maximal (${p.spacing} > ${p.spacing_max.toFixed(0)} mm)`);
  return { ok: reasons.length === 0, reasons };
}

/** Lignes du tableau général : toutes les valeurs viennent de `result.concreteDesign` (moteur). */
export function buildZoneRows(result: AnalysisResult): ZoneRow[] {
  const cfg = resolveRebarConfig(result.rebarConfig);
  const asExt = asPerMetre(cfg.mur_horizontal_ext);
  const asInt = asPerMetre(cfg.mur_horizontal_int);
  const pairRequired = result.concreteDesign.mur_horizontal.As_min; // 14.1.8.6 : 0,002Ag (information : somme des deux faces)
  const pairProvided = asExt + asInt;

  return ZONES.map(zone => {
    const sel = cfg[zone.key];
    const d = designOf(result, zone.id);
    const isHorizontal = zone.id === 'A3' || zone.id === 'A4';
    const isLong = zone.id === 'A7';
    const noMoment = isHorizontal || isLong;
    const As_provided = isHorizontal ? asPerMetre(sel) : isLong ? 2 * asPerMetre(sel) : d.As_provided;
    const As_req = noMoment || d.As_req === undefined ? null : d.As_req;
    const As_min = d.As_min;

    // A3 / A4 : règle actuelle du moteur, chaque face ≥ As,min (la somme n'est qu'informative : répartition À CONFIRMER)
    const status = zoneStatus({ As_provided, As_req, As_min, spacing: sel.spacing, spacing_max: d.spacing_max });
    return {
      zone,
      barSize: sel.barSize,
      spacing: sel.spacing,
      As_req,
      As_req_unreachable: As_req !== null && !Number.isFinite(As_req),
      As_min,
      As_min_basis: isHorizontal ? `${d.As_min_basis} — chaque face (règle actuelle du moteur)` : d.As_min_basis,
      As_provided,
      spacing_max: d.spacing_max,
      ok: status.ok,
      checks_ok: d.checks_ok,
      reasons: status.reasons,
      pair: isHorizontal ? { ids: ['A3', 'A4'], required: pairRequired, provided: pairProvided } : undefined,
      ld: Number.isFinite(d.ld) ? d.ld : null,
      ldh: d.ldh_required !== undefined && Number.isFinite(d.ldh_required) ? d.ldh_required : null
    } as ZoneRow;
  });
}

/** Applique une sélection à une zone dans la configuration (une seule configuration, partagée avec « Choix barres & Mr »). */
export function setZoneSelection(cfg: RebarCustomConfig, key: ZoneConfigKey, sel: RebarElementSelection): RebarCustomConfig {
  return { ...resolveRebarConfig(cfg), [key]: { ...sel } };
}

export interface AutoProposal {
  config: RebarCustomConfig;
  /** zones pour lesquelles aucune combinaison standard ne satisfait le statut de zone (la sélection actuelle est conservée) */
  unsatisfied: ZoneId[];
  /** zones où le statut de zone est satisfait mais pas `checks_ok` du moteur (ductilité, fissuration, ld, db, cisaillement…) : meilleure proposition retenue */
  engineChecksFailing: ZoneId[];
}

/**
 * Bouton « Auto » : pour chaque zone, la plus petite barre puis le plus grand espacement standard qui satisfont le statut.
 * Ne modifie rien : retourne une proposition. Une proposition exige le statut de zone ET `checks_ok` du moteur ; sinon la meilleure (statut de zone seul) est proposée et signalée. Zones traitées dans l'ordre A1, A2, A3 + A4, A5, A6, A7 (As,min de A2 dépend de A1).
 * A3 et A4 reçoivent la même sélection (hypothèse de proposition ; répartition entre faces : À CONFIRMER).
 */
export function proposeAutoConfig(
  geo: WallGeometry, soil: SoilProperties, loads: LoadsConfig, conc: ConcreteProperties, current: RebarCustomConfig
): AutoProposal {
  let cfg: RebarCustomConfig = resolveRebarConfig(current);
  const unsatisfied: ZoneId[] = [];
  const engineChecksFailing: ZoneId[] = [];
  const groups: ZoneId[][] = [['A1'], ['A2'], ['A3', 'A4'], ['A5'], ['A6'], ['A7']];
  const spacingsDesc = [...STANDARD_SPACINGS].sort((a, b) => b - a);
  for (const group of groups) {
    const defs = group.map(id => ZONES.find(z => z.id === id)!);
    let found: RebarElementSelection | null = null;
    let fallback: RebarElementSelection | null = null; // statut de zone OK seulement
    outer: for (const bar of BAR_SIZES) {
      for (const sp of spacingsDesc) {
        let trial = cfg;
        for (const def of defs) trial = setZoneSelection(trial, def.key, { barSize: bar, spacing: sp });
        const rows = buildZoneRows(analyzeRetainingWall(geo, soil, loads, conc, trial));
        const zr = group.map(id => rows.find(r => r.zone.id === id)!);
        if (zr.every(r => r.ok && r.checks_ok)) { found = { barSize: bar, spacing: sp }; break outer; }
        if (!fallback && zr.every(r => r.ok)) fallback = { barSize: bar, spacing: sp };
      }
    }
    const pick = found ?? fallback;
    if (pick) for (const def of defs) cfg = setZoneSelection(cfg, def.key, pick);
    if (!found) (fallback ? engineChecksFailing : unsatisfied).push(...group);
  }
  return { config: cfg, unsatisfied, engineChecksFailing };
}

/** Prolongement du crochet standard : 12·db, valeur indicative À CONFIRMER (article non lu dans le moteur). */
export const HOOK_EXTENSION_FACTOR = 12;

export type BarShape = 'droite' | 'en L' | 'en U';
export interface ScheduleRow {
  id: ZoneId;
  barSize: CanadianBarSize;
  spacing: number;
  shape: BarShape;
  length: number; // m, longueur unitaire
  countPerM: number; // nombre de barres par mètre de mur
  massPerM: number; // kg/m de mur
  remark: string;
}

/**
 * Nomenclature par mètre de longueur de mur. Longueurs = géométrie − enrobage + ancrages ld / ldh du moteur.
 * Barres verticales et transversales : n = 1000/s par mètre de mur. Barres horizontales et longitudinales : longueur 1,00 m par mètre de mur,
 * n = nombre de barres sur la hauteur (voile) ou sur la largeur (semelle). Chevauchements non inclus.
 */
export function buildBarSchedule(result: AnalysisResult, geo: WallGeometry, conc: ConcreteProperties): ScheduleRow[] {
  const rows = buildZoneRows(result);
  const hStem = geo.hMur * 1000;
  const B = (geo.ePiedAv + geo.epStem + geo.ePiedAr) * 1000;
  return rows.map(r => {
    const mass = CANADIAN_REBAR_CATALOG[r.barSize].mass;
    const db = CANADIAN_REBAR_CATALOG[r.barSize].diameter;
    let shape: BarShape = 'droite';
    let lengthMm = 0;
    let n = 1000 / r.spacing;
    let remark = '';
    switch (r.zone.id) {
      case 'A1':
      case 'A2': {
        shape = 'en L';
        const ldh = r.ldh;
        lengthMm = hStem - conc.cover_h + (ldh ?? 0) + HOOK_EXTENSION_FACTOR * db;
        remark = ldh === null ? 'ancrage : voir nomenclature' : `ldh = ${ldh.toFixed(0)} mm (moteur) + crochet ${HOOK_EXTENSION_FACTOR}db (À CONFIRMER)`;
        break;
      }
      case 'A3':
      case 'A4':
        lengthMm = 1000;
        n = Math.max(Math.floor((hStem - conc.cover_h) / r.spacing) + 1, 1);
        remark = 'par mètre de mur ; barres sur la hauteur du voile';
        break;
      case 'A5':
      case 'A6':
        // enrobage de la semelle aux extrémités : patin (cover_base_bottom) et talon (cover_v)
        lengthMm = B - conc.cover_base_bottom - conc.cover_v;
        remark = `pleine largeur ; ld${r.ld === null ? ' : voir nomenclature' : ` = ${r.ld.toFixed(0)} mm (moteur)`} non ajouté à la longueur ; pas de crochet`;
        break;
      default:
        lengthMm = 1000;
        n = 2 * Math.max(Math.floor((B - 2 * conc.cover_h) / r.spacing) + 1, 1);
        remark = 'par mètre de mur ; 2 lits, barres sur la largeur de la semelle';
    }
    const length = Math.max(lengthMm, 0) / 1000;
    return { id: r.zone.id, barSize: r.barSize, spacing: r.spacing, shape, length, countPerM: n, massPerM: length * n * mass, remark };
  });
}

export const totalScheduleMass = (rows: ScheduleRow[]) => rows.reduce((s, r) => s + r.massPerM, 0);

export const SCHEDULE_DISCLAIMER = 'Longueurs indicatives : détails d\'ancrage et de chevauchement à confirmer par l\'ingénieur.';
