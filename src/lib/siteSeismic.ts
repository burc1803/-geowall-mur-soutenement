// MUR-03 (approuvée le 2026-11-07) : aléa sismique du site, données CNRC SHD-VAS 2020 (CNB 2020, partie 4).
// ah = PGA(X) lue directement (CNB 2020, 4.1.8.4) ; aucun F(PGA) ; aucun arrondi de ah (décision M3-6).
import type { SiteSeismicValues } from './types';

export type SiteClassId = 'XA' | 'XB' | 'XC' | 'XD' | 'XE';
export const SITE_CLASSES: SiteClassId[] = ['XA', 'XB', 'XC', 'XD', 'XE'];
export const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'] as const;

export interface ShdClassValues { Sa0_2: number; Sa0_5: number; Sa1_0: number; Sa2_0: number; Sa5_0: number; Sa10_0: number; PGA: number; PGV: number }
export interface ShdSite { prov: string; name: string; lat: number; lon: number; classes: Partial<Record<SiteClassId, ShdClassValues>> }
export interface ShdData { meta: { source: string; probability: string; units: string; count: number }; sites: ShdSite[] }

export const SOURCE_PREFIX = 'CNRC SHD-VAS 2020';
export const MANUAL_SOURCE = 'saisie manuelle';
export const NOTE_2025 = 'Données CNRC du CNB 2020 ; données CNB 2025 : À CONFIRMER';

/** Nom affiché : espace devant les majuscules internes, « _ » -> « / ». « LaMalbaie » -> « La Malbaie ». */
export function formatSiteName(raw: string): string {
  return raw
    .split('_')
    .map(part => part
      // mots collés en minuscules, présents dans les noms de fichiers CNRC (« cityhall », « Hôteldeville »)
      .replace(/\s*cityhall/g, ' city hall')
      .replace(/(H[oô]tel)de(ville)/g, '$1 de $2')
      .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2').replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2').trim())
    .join(' / ');
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[\s_/-]+/g, '');

export function sitesOfProvince(data: ShdData, prov: string): ShdSite[] {
  return data.sites.filter(s => s.prov === prov).sort((a, b) => formatSiteName(a.name).localeCompare(formatSiteName(b.name), 'fr'));
}

/** Filtre par nom (sans accents ni espaces, insensible à la casse). */
export function searchSites(data: ShdData, prov: string, query: string): ShdSite[] {
  const q = norm(query);
  const all = sitesOfProvince(data, prov);
  return q ? all.filter(s => norm(formatSiteName(s.name)).includes(q) || norm(s.name).includes(q)) : all;
}

export function findSite(data: ShdData, prov: string, name: string): ShdSite | undefined {
  return data.sites.find(s => s.prov === prov && s.name === name);
}

export function classValues(site: ShdSite, cls: string): ShdClassValues | undefined {
  return SITE_CLASSES.includes(cls as SiteClassId) ? site.classes[cls as SiteClassId] : undefined;
}

const fmtG = (x: number) => String(x).replace('.', ',');

export function buildAhSource(site: ShdSite, cls: SiteClassId, pga: number): string {
  return `${SOURCE_PREFIX} (CNB 2020, partie 4), ${formatSiteName(site.name)}, ${site.prov}, ${cls}, 2 %/50 ans, PGA = ${fmtG(pga)} g`;
}

/** Applique : renvoie l'enregistrement du site et ah (valeur brute de la table, non arrondie) avec la source. Undefined si classe non choisie ou absente. */
export function applySiteSelection(site: ShdSite, cls: string): { site: SiteSeismicValues; ah: number; source: string } | undefined {
  const v = classValues(site, cls);
  if (!v) return undefined;
  const source = buildAhSource(site, cls as SiteClassId, v.PGA);
  return {
    site: { locality: formatSiteName(site.name), siteClass: cls, sa02: v.Sa0_2, pga: v.PGA, pgv: v.PGV, province: site.prov, siteId: site.name, source },
    ah: v.PGA,
    source
  };
}

/** Source de ah après une modification manuelle de la valeur : « saisie manuelle » si une valeur CNRC appliquée est changée. */
export function sourceAfterManualAh(prevSource: string | undefined, prevAh: number, newAh: number): string | undefined {
  if (newAh !== prevAh && (prevSource ?? '').startsWith(SOURCE_PREFIX)) return MANUAL_SOURCE;
  return prevSource;
}
