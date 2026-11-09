// Enregistrement / ouverture d'un projet GeoWall (fichier .geowall.json) et sauvegarde locale.
// Module d'interface : aucune règle de calcul ; seules les migrations du moteur sont appelées (sans modification).
import type { WallGeometry, SoilProperties, LoadsConfig, RebarCustomConfig, ConcreteProperties } from './types';
import { DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG, DEFAULT_SOIL_METHOD_CONFIG, resolveRebarConfig } from './analysis';
import { resolveBearingSoil } from './bearingSoil';

export const PROJECT_FORMAT = 'geowall-project';
export const PROJECT_VERSION = 1;
export const DEFAULT_PROJECT_NAME = 'projet-mur';
export const FILE_EXTENSION = '.geowall.json';
export const AUTOSAVE_KEY = 'geowall-pro:autosave:v1';

/** État utilisateur qui influence le calcul ou la note (site sismique = soil.siteSeismic ; édition CNB = loads.cnbEdition). */
export interface ProjectState {
  name: string;
  geo: WallGeometry;
  soil: SoilProperties;
  loads: LoadsConfig;
  conc: ConcreteProperties;
  rebarConfig: RebarCustomConfig;
}

export const INITIAL_GEO: WallGeometry = {
  wallType: 'cantilever',
  hMur: 3.80,
  epStem: 0.35,
  ePiedAv: 0.80,
  ePiedAr: 1.75,
  epBase: 0.35,
};

export const INITIAL_SOIL: SoilProperties = {
  gamma: 19.0,
  gamma_prime: 9.2,
  phi: 29.0,
  cohesion: 0.0,
  hSolAv: 1.50,
  qAllowable_SLS: 130.0,
  qUltimate_ULS: 392.0,
  // MUR-04 : sol d'assise (classe SW, béton coulé contre le sol -> δb = 24° par le tableau 20.4(a)) ; à confirmer par le rapport géotechnique
  bearingSoil: { uscs: 'SW', phi: 29.0, contact: 'cast' },
  methodConfig: DEFAULT_SOIL_METHOD_CONFIG,
  hasWaterTable: true,
  waterTableHeight: 2.50,
  gamma_w: 9.81,
  // MUR-02 §1 : φ du tableau 6.2 du CFEM 5e selon le degré de compréhension ; Ψ du tableau 6.4
  geotechLevel: 'typical',
  psi: 1.0,
  quFactored: false,
  // MUR-02 D9 / §11 : case « déduire la profondeur de gel » cochée ; df à saisir ; df non saisie -> butée nulle (défaut)
  frost: { deduct: true, df: 0, noDf: 'zero' }
};

export const INITIAL_LOADS: LoadsConfig = {
  surcharge: 12.0,
  surchargeType: 'L',
  surchargeAval: 0.0,
  pointLoadTop: {
    enabled: true,
    Fy: 12.0,
    Fx: 0.0,
    name: 'Charge Tête'
  },
  gammaM: 1.0,
  gammaF: 1.0,
  additionalLoads: [],
  countStabilizingVariableHM: true, // MUR-06 M6-A1 : Fx et Mz variables stabilisants comptés (défaut cochée ; validé comme booléen)
  countStabilizingVariable: true, // MUR-06 D5 : poids des charges variables compté comme stabilisant (défaut cochée ; validé comme booléen)
  // kv absent : kv = 2/3·kh par défaut (MUR-02 D6), tant que l'utilisateur n'a pas saisi de valeur
};

export function defaultProject(): ProjectState {
  return {
    name: DEFAULT_PROJECT_NAME,
    geo: { ...INITIAL_GEO },
    soil: { ...INITIAL_SOIL },
    loads: { ...INITIAL_LOADS },
    conc: { ...DEFAULT_CONCRETE_PROPS },
    rebarConfig: { ...DEFAULT_REBAR_CONFIG },
  };
}

export interface ProjectFile {
  format: typeof PROJECT_FORMAT;
  version: number;
  savedAt: string;
  appEdition: '2020' | '2025';
  name: string;
  geo: WallGeometry;
  soil: SoilProperties;
  loads: LoadsConfig;
  conc: ConcreteProperties;
  rebarConfig: RebarCustomConfig;
}

export function serializeProject(s: ProjectState, now: Date = new Date()): ProjectFile {
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    savedAt: now.toISOString(),
    appEdition: s.loads.cnbEdition ?? '2020',
    name: s.name,
    geo: s.geo,
    soil: s.soil,
    loads: s.loads,
    conc: s.conc,
    rebarConfig: s.rebarConfig,
  };
}

export function projectToJson(s: ProjectState, now?: Date): string {
  return JSON.stringify(serializeProject(s, now), null, 2);
}

/** Nom de fichier : nom du projet assaini + date AAAA-MM-JJ + extension. */
export function projectFileName(name: string, now: Date = new Date()): string {
  const base = (name || '').trim().replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/[\s-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '') || DEFAULT_PROJECT_NAME;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}${FILE_EXTENSION}`;
}

export type ParseResult = { ok: true; state: ProjectState } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Vérifie le type des champs connus (selon les valeurs par défaut) ; retourne le premier chemin fautif. */
function badField(defaults: Record<string, unknown>, given: Record<string, unknown>, path: string): string | null {
  for (const k of Object.keys(given)) {
    const d = defaults[k];
    const g = given[k];
    if (g === undefined || g === null) continue;
    if (typeof d === 'number' && !(typeof g === 'number' && Number.isFinite(g))) return `${path}.${k}`;
    if (typeof d === 'boolean' && typeof g !== 'boolean') return `${path}.${k}`;
    if (typeof d === 'string' && typeof g !== 'string') return `${path}.${k}`;
    if (isObj(d)) {
      if (!isObj(g)) return `${path}.${k}`;
      const r = badField(d, g, `${path}.${k}`);
      if (r) return r;
    }
  }
  return null;
}

/** Fusion superficielle + sous-objets connus ; les champs absents prennent les valeurs par défaut. */
function mergeSection<T extends object>(defaults: T, given: unknown, nested: string[] = []): T {
  const g = isObj(given) ? given : {};
  const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>), ...g };
  for (const k of nested) {
    const dv = (defaults as Record<string, unknown>)[k];
    if (isObj(dv) && isObj(g[k])) out[k] = { ...dv, ...(g[k] as object) };
  }
  return out as T;
}

/**
 * Lit un projet à partir d'un objet (JSON déjà analysé). Valide format et version, fusionne avec les valeurs par défaut,
 * puis applique les migrations du moteur (resolveRebarConfig ; sol d'assise ancien laissé absent pour resolveBearingSoil).
 */
export function projectFromData(data: unknown): ParseResult {
  if (!isObj(data)) return { ok: false, error: 'Fichier invalide : le contenu n’est pas un objet JSON.' };
  if (data.format !== PROJECT_FORMAT) return { ok: false, error: `Fichier invalide : format « ${PROJECT_FORMAT} » attendu.` };
  if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1) return { ok: false, error: 'Fichier invalide : version absente ou illisible.' };
  if (data.version > PROJECT_VERSION) return { ok: false, error: `Fichier créé par une version plus récente du logiciel (version ${data.version} ; ce logiciel lit jusqu’à ${PROJECT_VERSION}).` };

  const D = defaultProject();
  for (const [key, def] of [['geo', D.geo], ['soil', D.soil], ['loads', D.loads], ['conc', D.conc], ['rebarConfig', D.rebarConfig]] as const) {
    const v = data[key];
    if (v === undefined) continue;
    if (!isObj(v)) return { ok: false, error: `Fichier invalide : la section « ${key} » est illisible.` };
    const bad = badField(def as unknown as Record<string, unknown>, v, key);
    if (bad) return { ok: false, error: `Fichier invalide : valeur incorrecte pour « ${bad} ».` };
  }
  if (isObj(data.loads) && data.loads.additionalLoads !== undefined && !Array.isArray(data.loads.additionalLoads))
    return { ok: false, error: 'Fichier invalide : « loads.additionalLoads » doit être une liste.' };
  if (data.name !== undefined && typeof data.name !== 'string') return { ok: false, error: 'Fichier invalide : « name » doit être du texte.' };

  const soilGiven = isObj(data.soil) ? data.soil : {};
  const soil = mergeSection(D.soil, soilGiven, ['methodConfig', 'frost', 'bearingSoil']);
  // Ancien fichier sans sol d'assise : ne pas injecter le défaut, laisser resolveBearingSoil migrer (R5).
  if (isObj(data.soil) && !isObj(soilGiven.bearingSoil)) delete soil.bearingSoil;
  const loads = mergeSection(D.loads, data.loads, ['pointLoadTop']);
  if (loads.cnbEdition === undefined && (data.appEdition === '2020' || data.appEdition === '2025')) loads.cnbEdition = data.appEdition;
  if (loads.cnbEdition !== undefined && loads.cnbEdition !== '2020' && loads.cnbEdition !== '2025') return { ok: false, error: 'Fichier invalide : édition du CNB inconnue.' };

  // Armature : un ancien fichier sans faces ext./int. doit hériter de son mur_horizontal (migration), pas du défaut.
  const rebarGiven = isObj(data.rebarConfig) ? data.rebarConfig : {};
  const rebarMerged = mergeSection(D.rebarConfig, rebarGiven);
  if (!isObj(rebarGiven.mur_horizontal_ext)) delete rebarMerged.mur_horizontal_ext;
  if (!isObj(rebarGiven.mur_horizontal_int)) delete rebarMerged.mur_horizontal_int;
  if (isObj(rebarGiven.mur_horizontal)) {
    // l'héritage ne s'applique que si le fichier fournit mur_horizontal ; sinon les défauts complets restent valables
  } else {
    rebarMerged.mur_horizontal_ext = rebarMerged.mur_horizontal_ext ?? D.rebarConfig.mur_horizontal_ext;
    rebarMerged.mur_horizontal_int = rebarMerged.mur_horizontal_int ?? D.rebarConfig.mur_horizontal_int;
  }

  const state: ProjectState = {
    name: typeof data.name === 'string' && data.name.trim() ? data.name : DEFAULT_PROJECT_NAME,
    geo: mergeSection(D.geo, data.geo),
    soil,
    loads,
    conc: mergeSection(D.conc, data.conc),
    rebarConfig: resolveRebarConfig(rebarMerged),
  };
  try { resolveBearingSoil(state.soil); } catch { return { ok: false, error: 'Fichier invalide : sol d’assise illisible.' }; }
  return { ok: true, state };
}

export function parseProjectText(text: string): ParseResult {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, error: 'Fichier invalide : ce n’est pas du JSON lisible.' }; }
  return projectFromData(data);
}

// --- Sauvegarde locale (commodité ; ne remplace pas le fichier) ---
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function saveAutosave(s: ProjectState, storage?: StorageLike): boolean {
  try {
    const st = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!st) return false;
    st.setItem(AUTOSAVE_KEY, projectToJson(s));
    return true;
  } catch { return false; }
}

/** Dernier état local, ou null (absent, illisible ou stockage inaccessible). */
export function loadAutosave(storage?: StorageLike): ProjectState | null {
  try {
    const st = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    const raw = st?.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const r = parseProjectText(raw);
    return r.ok ? r.state : null;
  } catch { return null; }
}
