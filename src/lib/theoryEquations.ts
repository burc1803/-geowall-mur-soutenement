import { AnalysisResult, CombinationResult, ConcreteProperties, SoilProperties, WallGeometry } from './types';

/**
 * Valeurs substituées des équations de l'onglet « Étapes & formules » : TOUTES lues de `result` (moteur), aucune règle recalculée.
 * Les champs numériques servent aux tests (recomposition de la valeur du moteur à partir des termes affichés).
 */

/** Format français : virgule décimale ; ∞ si non fini. Arrondi à l'affichage seulement. */
export const fr = (v: number, d = 2): string => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : v > 0 ? '∞' : 'non défini');

export interface SlidingEq {
  psi: number; phi_gs: number; sumV: number; mu: number; phi_coh: number; c: number; Bp: number; phi_p: number; Pp: number; Pw: number;
  sumHf: number; Fs: number; ratio: number;
  substituted: string; result: string;
}

/** Glissement (MUR-02 §2.1) : Ψ·[φgs·ΣV′·tan δb + φcoh·c′·B′ + φp·(P′p + Pw,a)] ≥ ΣHf. */
export function buildSlidingEq(c: CombinationResult, r: AnalysisResult, soil: SoilProperties): SlidingEq {
  const sumV = Math.max(c.sumV_min, 0);
  const cohesion = r.foundationSoil.cohesion ?? 0;
  const substituted = `${fr(c.psi)} · [ ${fr(c.phi_gs)} · ${fr(sumV, 1)} · ${fr(soil.mu)} + ${fr(c.phi_coh)} · ${fr(cohesion, 1)} · ${fr(c.B_slide)} + ${fr(c.phi_p)} · (${fr(c.Pp_used, 1)} + ${fr(c.Pw_front_used, 1)}) ]`;
  const result = `Fs = ${fr(c.Fs, 1)} kN/m ; ΣHf = ${fr(c.Fh_destab, 1)} kN/m ; Fs / ΣHf = ${fr(c.FOS_sliding)} ${c.FOS_sliding >= 1 ? '≥' : '<'} 1,00 (${c.status_sliding})`;
  return { psi: c.psi, phi_gs: c.phi_gs, sumV, mu: soil.mu, phi_coh: c.phi_coh, c: cohesion, Bp: c.B_slide, phi_p: c.phi_p, Pp: c.Pp_used, Pw: c.Pw_front_used, sumHf: c.Fh_destab, Fs: c.Fs, ratio: c.FOS_sliding, substituted, result };
}

export interface OverturningEq {
  psi: number; phi_ov: number; Mres: number; Mpass: number; Ms: number; Mr: number; ratio: number;
  substituted: string; result: string;
}

/** Renversement (MUR-02 §2.3, E08) : Ψ·φov·ΣMstab ≥ ΣMrenv, la butée faisant partie de ΣMstab. */
export function buildOverturningEq(c: CombinationResult): OverturningEq {
  const Mres = c.Ms_nominal - c.Ms_passive;
  const substituted = `${fr(c.psi)} · ${fr(c.phi_ov)} · (${fr(Mres, 1)} + ${fr(c.Ms_passive, 1)}) = ${fr(c.Ms, 1)} ; ΣMrenv = ${fr(c.Mr, 1)}`;
  const result = `Ψ·φov·ΣMstab / ΣMrenv = ${fr(c.FOS_overturning)} ${c.FOS_overturning >= 1 ? '≥' : '<'} 1,00 (${c.status_overturning})`;
  return { psi: c.psi, phi_ov: c.phi_ov, Mres, Mpass: c.Ms_passive, Ms: c.Ms, Mr: c.Mr, ratio: c.FOS_overturning, substituted, result };
}

export type BearingKind = 'outside' | 'uniform_Beff' | 'cas1' | 'cas2' | 'cas3' | 'cas4_toe' | 'cas4_heel';

export interface BearingEq {
  kind: BearingKind;
  Rv: number; B: number; x1: number; e: number; Bprime: number;
  qDesign: number; // pression comparée à la capacité, recomposée à partir des termes affichés
  substituted: string; result: string;
}

/** Portance : le cas réel de la distribution (trapèze, triangle, B′, hors base) est choisi comme dans le moteur. */
export function buildBearingEq(c: CombinationResult, B: number, criterion: 'moments' | 'eccentricity'): BearingEq {
  const Rv = c.sumV_max;
  const e = c.ecc;
  const x1 = c.x1;
  const base = { Rv, B, x1, e, Bprime: c.B_eff };
  if (c.outside_base) {
    return { kind: 'outside', ...base, qDesign: NaN, substituted: 'résultante hors de la base : pression sans objet', result: 'NON VÉRIFIABLE (résultante hors base)' };
  }
  if (criterion === 'eccentricity') {
    const q = Rv / c.B_eff;
    return { kind: 'uniform_Beff', ...base, qDesign: q, substituted: `q = ${fr(Rv, 1)} / ${fr(c.B_eff, 3)}`, result: `q = ${fr(q, 1)} kPa (B′ = B − 2e = ${fr(B, 2)} − 2 · ${fr(e, 3)} = ${fr(c.B_eff, 3)} m)` };
  }
  const toeSide = B / 2 - x1 >= 0;
  const eS = toeSide ? e : -e;
  switch (c.distributionCase) {
    case 'Cas 1': {
      const q = Rv / B;
      return { kind: 'cas1', ...base, qDesign: q, substituted: `q = ${fr(Rv, 1)} / ${fr(B)}`, result: `q = ${fr(q, 1)} kPa (pression uniforme, e ≈ 0)` };
    }
    case 'Cas 2': {
      const qt = (Rv / B) * (1 + (6 * eS) / B);
      const qh = (Rv / B) * (1 - (6 * eS) / B);
      return {
        kind: 'cas2', ...base, qDesign: Math.max(qt, qh),
        substituted: `q(orteil) = (${fr(Rv, 1)} / ${fr(B)}) · (1 + 6 · ${fr(eS, 3)} / ${fr(B)}) ; q(talon) = (${fr(Rv, 1)} / ${fr(B)}) · (1 − 6 · ${fr(eS, 3)} / ${fr(B)})`,
        result: `q(orteil) = ${fr(qt, 1)} kPa ; q(talon) = ${fr(qh, 1)} kPa (e = ${fr(e, 3)} ≤ B/6 = ${fr(B / 6, 3)} m : trapèze)`
      };
    }
    case 'Cas 3': {
      const q = (2 * Rv) / B;
      return { kind: 'cas3', ...base, qDesign: q, substituted: `q = 2 · ${fr(Rv, 1)} / ${fr(B)}`, result: `q = ${fr(q, 1)} kPa (e = B/6 = ${fr(B / 6, 3)} m : triangle sur toute la base)` };
    }
    default: {
      const arm = toeSide ? x1 : B - x1;
      const Lc = 3 * arm;
      const q = (2 * Rv) / Lc;
      const side = toeSide ? 'orteil' : 'talon';
      return {
        kind: toeSide ? 'cas4_toe' : 'cas4_heel', ...base, qDesign: q,
        substituted: `q(${side}) = 2 · ${fr(Rv, 1)} / (3 · ${fr(arm, 3)})`,
        result: `q(${side}) = ${fr(q, 1)} kPa ; q = 0 de l'autre côté (e = ${fr(e, 3)} > B/6 = ${fr(B / 6, 3)} m : triangle, décollement sur ${fr(B - Lc, 2)} m)`
      };
    }
  }
}

export interface SeismicEq {
  psiDeg: number; Kae: number; dPae: number; y: number; substituted: string; result: string;
}

/** ΔPAE (Mononobe-Okabe, éq. 18.20-18.23) : ½·γ·H²·[(1 − kv)·KAE − KA], plancher 0 ; Wood : kh·γ·H² ; Seed & Whitman : 0,375·kh·γ·H². */
export function buildDeltaPaeEq(r: AnalysisResult, soil: SoilProperties, geo: WallGeometry, scIdx = 0): SeismicEq | null {
  const sc = r.seismic.scenarios[scIdx];
  if (!sc) return null;
  const H = geo.hMur + geo.epBase;
  const g = soil.gamma;
  const kh = r.seismic.kh;
  let substituted = '';
  if (r.seismic.method === 'mononobe_okabe') {
    substituted = `ΔPAE = 0,5 · ${fr(g, 1)} · ${fr(H)}² · [(1 − ${fr(sc.kv, 3)}) · ${fr(sc.Kae, 4)} − ${fr(r.earthPressures.K_active_used, 4)}]`;
  } else if (r.seismic.method === 'wood') {
    substituted = `ΔP0E = ${fr(kh, 3)} · ${fr(g, 1)} · ${fr(H)}²`;
  } else if (r.seismic.method === 'seed_whitman') {
    substituted = `ΔPAE = 0,375 · ${fr(kh, 3)} · ${fr(g, 1)} · ${fr(H)}²`;
  } else return null;
  return { psiDeg: sc.psi_deg, Kae: sc.Kae, dPae: sc.dPae, y: sc.y_dPae, substituted, result: `ΔP = ${fr(sc.dPae, 2)} kN/m, appliquée à ${fr(sc.y_dPae, 2)} m de la sous-face` };
}

/** Recompose ΔPAE à partir des termes affichés (pour les tests). */
export function recomposeDeltaPae(r: AnalysisResult, soil: SoilProperties, geo: WallGeometry, scIdx = 0): number {
  const sc = r.seismic.scenarios[scIdx];
  const H = geo.hMur + geo.epBase;
  const kh = r.seismic.kh;
  if (r.seismic.method === 'mononobe_okabe') return Math.max(0.5 * soil.gamma * H * H * ((1 - sc.kv) * sc.Kae - r.earthPressures.K_active_used), 0);
  if (r.seismic.method === 'wood') return kh * soil.gamma * H * H;
  return 0.375 * kh * soil.gamma * H * H;
}

/** Inerties du voile et de la semelle : W · kh (poids nominal, γc de la saisie). */
export function inertiaStrings(r: AnalysisResult, geo: WallGeometry, conc: ConcreteProperties) {
  const kh = r.seismic.kh;
  return {
    stem: `${fr(conc.gamma_c, 1)} · ${fr(geo.hMur)} · ${fr(geo.epStem)} · ${fr(kh, 3)} = ${fr(r.earthPressures.E_stem_nominal, 2)} kN/m`,
    base: `${fr(conc.gamma_c, 1)} · ${fr(r.baseWidth)} · ${fr(geo.epBase)} · ${fr(kh, 3)} = ${fr(r.earthPressures.E_base_nominal, 2)} kN/m`
  };
}
