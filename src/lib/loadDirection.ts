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

export type StabilizingRole = 'stabilizing' | 'destabilizing' | 'none';

/**
 * Rôle d'une charge par rapport au glissement et au renversement autour de l'orteil, déduit des signes des composantes du moteur
 * (convention de analysis.ts : Fy > 0 vers le bas, Fx > 0 vers l'orteil, Mz > 0 vers l'orteil).
 * `resistance` : composante portée en valeur positive mais qui résiste (butée P′p, eau à l'avant Pw,a).
 * « none » : aucune composante (donnée qui n'est pas une force, ex. niveau de nappe). Une charge à composantes mixtes est « none ».
 */
export function stabilizingRole(c: { Fx?: number; Fy?: number; Mz?: number; resistance?: boolean }): StabilizingRole {
  const fx = c.Fx ?? 0, fy = c.Fy ?? 0, mz = c.Mz ?? 0;
  if (!fx && !fy && !mz) return 'none';
  if (c.resistance) return 'stabilizing';
  const signs = [fy > 0 ? 1 : fy < 0 ? -1 : 0, fx < 0 ? 1 : fx > 0 ? -1 : 0, mz < 0 ? 1 : mz > 0 ? -1 : 0].filter(x => x !== 0);
  if (signs.length === 0) return 'none';
  if (signs.every(x => x > 0)) return 'stabilizing';
  if (signs.every(x => x < 0)) return 'destabilizing';
  return 'none';
}
