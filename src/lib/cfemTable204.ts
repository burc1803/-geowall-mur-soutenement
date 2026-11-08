// MUR-04 (APPROUVÉE le 2026-11-07), D11 : tableau 20.4 du CFEM 5e éd. (2023), p. 691 (PDF 723), alignement des colonnes confirmé visuellement.
// (a) angle de frottement δ entre le béton et le sol ; (b) adhérence dans les sols cohérents.

export type UscsClass = 'ROC' | 'ROCKFILL_WELL' | 'ROCKFILL_UNIFORM' | 'GW' | 'GP' | 'GM' | 'GC' | 'SW' | 'SP' | 'SM' | 'SC' | 'ML' | 'CL';
export type BaseContact = 'cast' | 'formed';

export const CONTACT_LABEL: Record<BaseContact, string> = {
  cast: 'béton coulé contre le sol (béton de masse)',
  formed: 'béton formé ou préfabriqué'
};

export const USCS_LABEL: Record<UscsClass, string> = {
  ROC: 'Roc sain et propre',
  ROCKFILL_WELL: 'Enrochement bien gradué',
  ROCKFILL_UNIFORM: 'Enrochement uniforme',
  GW: 'GW (gravier bien gradué)', GP: 'GP (gravier mal gradué)', GM: 'GM (gravier limoneux)', GC: 'GC (gravier argileux)',
  SW: 'SW (sable bien gradué)', SP: 'SP (sable mal gradué)', SM: 'SM (sable limoneux)', SC: 'SC (sable argileux)',
  ML: 'ML (silt non plastique)', CL: 'CL (argile ferme à dure), sols résiduels'
};

export const USCS_CLASSES = Object.keys(USCS_LABEL) as UscsClass[];

/** Bornes de δ (°) du tableau 20.4(a). Absent = pas de valeur au tableau pour ce contact. */
export interface DeltaRange { min: number; max: number }
type Row = { cast?: DeltaRange; formed?: DeltaRange };
const r = (min: number, max = min): DeltaRange => ({ min, max });

export const TABLE_20_4A: Record<UscsClass, Row> = {
  ROC: { cast: r(35) },
  ROCKFILL_WELL: { formed: r(22, 26) },
  ROCKFILL_UNIFORM: { formed: r(17, 22) },
  GW: { cast: r(29, 31), formed: r(22, 26) },
  GP: { cast: r(29, 31), formed: r(22, 26) },
  GM: { cast: r(24, 29), formed: r(17) },
  GC: { cast: r(24, 29), formed: r(17) },
  SW: { cast: r(24, 29), formed: r(17) },
  SP: { cast: r(24, 29), formed: r(17) },
  SM: { cast: r(19, 24), formed: r(14) },
  SC: { cast: r(19, 24), formed: r(14) },
  ML: { cast: r(17, 19), formed: r(14) },
  CL: { cast: r(22, 26) }
};

/** Sol cohérent : adhérence à court terme (tableau 20.4(b)). */
export const isCohesiveClass = (c: UscsClass | undefined): boolean => c === 'CL';

/** Tableau 20.4(b) : points (su ; ca) en kPa, bornes des plages. */
export const TABLE_20_4B: { su: number; ca: number }[] = [
  { su: 0, ca: 0 }, { su: 12, ca: 12 }, { su: 25, ca: 25 }, { su: 50, ca: 38 }, { su: 100, ca: 48 }, { su: 200, ca: 65 }
];

/** Adhérence ca (kPa) par interpolation linéaire entre les bornes du tableau (D2, À CONFIRMER), plafonnée à 65 kPa au-delà de 200 kPa et à ca ≤ su. */
export function adhesionFromCu(cu: number): number {
  if (!(cu > 0)) return 0;
  const t = TABLE_20_4B;
  let ca = t[t.length - 1].ca;
  if (cu < t[t.length - 1].su) {
    for (let i = 1; i < t.length; i++) {
      if (cu <= t[i].su) { ca = t[i - 1].ca + ((t[i].ca - t[i - 1].ca) * (cu - t[i - 1].su)) / (t[i].su - t[i - 1].su); break; }
    }
  }
  return Math.min(ca, cu);
}

/** R1 : δb proposé = borne inférieure du tableau 20.4(a), plafonné à φ′ d'assise. Undefined si le tableau n'a pas de valeur pour ce contact. */
export function proposedDeltaB(uscs: UscsClass | undefined, contact: BaseContact, phiDeg: number): { delta: number; capped: boolean; tableMin: number } | undefined {
  if (!uscs) return undefined;
  const range = TABLE_20_4A[uscs][contact];
  if (!range) return undefined;
  return { delta: Math.min(range.min, phiDeg), capped: range.min > phiDeg, tableMin: range.min };
}
