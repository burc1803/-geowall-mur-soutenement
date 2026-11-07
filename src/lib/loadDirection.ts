// Direction d'une ligne de la section « Charges appliquées » de la note, déduite des composantes du moteur.
export type LoadDirection = 'H' | 'V' | 'M' | '—';

/** H si seule Fx est non nulle, V si seule Fy, M si seul Mz ; « — » si aucune composante (donnée qui n'est pas une force). */
export function directionOfComponent(c: { Fx?: number; Fy?: number; Mz?: number }): LoadDirection {
  const fx = !!c.Fx, fy = !!c.Fy, mz = !!c.Mz;
  if (fx && !fy && !mz) return 'H';
  if (fy && !fx && !mz) return 'V';
  if (mz && !fx && !fy) return 'M';
  return '—';
}
