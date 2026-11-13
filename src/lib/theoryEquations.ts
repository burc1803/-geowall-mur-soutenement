import { AnalysisResult, CombinationResult, ConcreteProperties, SoilProperties, WallGeometry, StemPassiveChoice } from './types';
import { STEM_PASSIVE_CHOICES, STEM_PASSIVE_LABEL, STEM_PASSIVE_FACTOR_TEXT } from './stemPassive';

/**
 * Valeurs substituées des équations de l'onglet « Étapes & formules » : TOUTES lues de `result` (moteur), aucune règle recalculée.
 * Les champs numériques servent aux tests (recomposition de la valeur du moteur à partir des termes affichés).
 */

/** Format français unique : virgule décimale, espace fine insécable pour les milliers ; ∞ si non fini. Arrondi à l'affichage seulement. */
export const fr = (v: number, d = 2): string => {
  if (!Number.isFinite(v)) return v > 0 ? '∞' : 'non défini';
  const [ent, dec] = v.toFixed(d).split('.');
  // Espace fine insécable (U+202F) entre les milliers (présentation seulement, la valeur n'est pas modifiée)
  const grouped = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  return dec === undefined ? grouped : `${grouped},${dec}`;
};

export interface SlidingEq {
  condition: 'drained' | 'undrained'; // condition qui gouverne (MUR-04 R2)
  psi: number; phi_gs: number; sumV: number; tanDeltaB: number; phi_coh: number; ca: number; Bp: number; phi_p: number; Pp: number; Pw: number;
  sumHf: number; Fs: number; ratio: number;
  substituted: string; result: string;
}

/**
 * Glissement (MUR-02 §2.1, MUR-04 R2-R4), condition qui gouverne :
 * long terme : Ψ·[φgs·ΣV′·tan δb + φp·(P′p + Pw,a)] ≥ ΣHf (c′a = 0) ;
 * court terme (assise CL) : Ψ·φcoh·ca·B′ ≥ ΣHf (butée nulle).
 */
export function buildSlidingEq(c: CombinationResult, r: AnalysisResult): SlidingEq {
  const sumV = Math.max(c.sumV_min, 0);
  const undrained = c.sliding_condition === 'undrained';
  const substituted = undrained
    ? `${fr(c.psi)} · ${fr(c.phi_coh)} · ${fr(c.ca_used, 1)} · ${fr(c.B_slide)}`
    : `${fr(c.psi)} · [ ${fr(c.phi_gs)} · ${fr(sumV, 1)} · ${fr(c.tanDeltaB, 4)} + ${fr(c.phi_p)} · (${fr(c.Pp_used, 1)} + ${fr(c.Pw_front_used, 1)}) ]`;
  const other = c.Fs_undrained !== undefined
    ? ` ; long terme : ${fr(c.FOS_drained)} ; court terme : ${fr(c.FOS_undrained ?? NaN)}`
    : '';
  const result = `Fs = ${fr(c.Fs, 1)} kN/m ; ΣHf = ${fr(c.Fh_destab, 1)} kN/m ; Fs / ΣHf = ${fr(c.FOS_sliding)} ${c.FOS_sliding >= 1 ? '≥' : '<'} 1,00 (${r.verifiable ? c.status_sliding : 'NON VÉRIFIABLE'}) ; condition retenue : ${undrained ? 'court terme (non drainée)' : 'long terme (drainée)'}${other}`;
  return {
    condition: c.sliding_condition, psi: c.psi, phi_gs: c.phi_gs, sumV, tanDeltaB: c.tanDeltaB, phi_coh: c.phi_coh, ca: c.ca_used, Bp: c.B_slide,
    phi_p: c.phi_p, Pp: c.Pp_used, Pw: c.Pw_front_used, sumHf: c.Fh_destab, Fs: c.Fs, ratio: c.FOS_sliding, substituted, result
  };
}

export interface OverturningEq {
  psi: number; phi_ov: number; Mres: number; Mpass: number; Ms: number; Mr: number; ratio: number;
  substituted: string; result: string;
}

/** Renversement (MUR-02 §2.3, E08) : Ψ·φov·ΣMstab ≥ ΣMrenv, la butée faisant partie de ΣMstab. */
export function buildOverturningEq(c: CombinationResult, verifiable = true): OverturningEq {
  const Mres = c.Ms_nominal - c.Ms_passive;
  const substituted = `${fr(c.psi)} · ${fr(c.phi_ov)} · (${fr(Mres, 1)} + ${fr(c.Ms_passive, 1)}) = ${fr(c.Ms, 1)} ; ΣMrenv = ${fr(c.Mr, 1)}`;
  const result = `Ψ·φov·ΣMstab / ΣMrenv = ${fr(c.FOS_overturning)} ${c.FOS_overturning >= 1 ? '≥' : '<'} 1,00 (${verifiable ? c.status_overturning : 'NON VÉRIFIABLE'})`;
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
  const H = r.soilHeight.Hp; // H_p = hr + ts (MUR-04 M4-A1)
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
  const H = r.soilHeight.Hp; // H_p = hr + ts (MUR-04 M4-A1)
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

export interface StemPassiveEq {
  comb: string; // combinaison qui gouverne le voile
  choice: StemPassiveChoice;
  active: boolean;
  layered: boolean; // nappe aval dans la zone de pression : intégration par couches γ / γ′
  seismicNull: boolean; // cas 5 avec butée sismique nulle : facteur effectif 0
  Kp: number; Kp_eff: number; gamma: number; gammaPrime: number; zDry: number;
  hSolAv: number; t0: number; hv: number;
  P: number; M: number; factor: number;
  P1: number; P2: number; M1: number; M2: number; // couches : sèche (γ) et déjaugée (γ′) ; P2 = M2 = 0 sans nappe dans la zone
  Mactive: number; Mnet: number;
  table: { choice: StemPassiveChoice; label: string; Mf: number; comb: string; governs: boolean }[]; // enveloppe ÉLU de chaque choix
  hvSub: string; PSub: string; MSub: string; PRes: string; MRes: string; factorSub: string; netSub: string;
}

/**
 * MUR-07 D5 : poussée passive du sol avant sur le voile, pour la combinaison qui gouverne le voile. Toutes les valeurs sont lues du moteur
 * (`governingStem.stem_passive`, `stemPassive`) ; le tableau des 4 choix reprend l'enveloppe ÉLU de M_f calculée par le moteur pour chaque choix.
 * Avec nappe aval : couche 1 (γ, de t₀ à la nappe) et couche 2 (γ′ sous la nappe), t = profondeur sous la surface du sol avant.
 */
export function buildStemPassiveEq(r: AnalysisResult, hSolAv: number): StemPassiveEq {
  const c = r.governingStem;
  const sp = r.stemPassive;
  const p = c.stem_passive;
  const H = hSolAv;
  const t0 = H - sp.hv; // début de la zone sous pression
  const layered = sp.active && sp.zDry < H - 1e-9;
  const K = p.Kp_eff;
  const g = sp.gamma, gp = sp.gammaPrime, zD = sp.zDry;
  const tD = Math.min(zD, H); // fin de la couche 1
  const tS = Math.max(t0, zD); // début de la couche 2
  const l1 = layered && tD > t0;
  const l2 = layered && H > tS;
  const P1 = l1 ? 0.5 * K * g * (tD * tD - t0 * t0) : 0;
  const M1 = l1 ? K * g * (H * (tD * tD - t0 * t0) / 2 - (tD ** 3 - t0 ** 3) / 3) : 0;
  const P2 = l2 ? K * ((g - gp) * zD * (H - tS) + gp * (H * H - tS * tS) / 2) : 0;
  const M2 = l2 ? K * ((g - gp) * zD * (H - tS) ** 2 / 2 + gp * (H * (H * H - tS * tS) / 2 - (H ** 3 - tS ** 3) / 3)) : 0;
  const hvSub = `${fr(H)} − ${fr(t0)}`;
  const PSub = layered
    ? `couche γ : 0,5 · ${fr(K, 4)} · ${fr(g, 1)} · (${fr(tD)}² − ${fr(t0)}²) = ${fr(P1, 2)} ; couche γ′ : ${fr(K, 4)} · [ (${fr(g, 1)} − ${fr(gp, 1)}) · ${fr(zD)} · (${fr(H)} − ${fr(tS)}) + ${fr(gp, 1)} · (${fr(H)}² − ${fr(tS)}²)/2 ] = ${fr(P2, 2)}`
    : `0,5 · ${fr(K, 4)} · ${fr(g, 1)} · (${fr(H)}² − ${fr(t0)}²)`;
  const MSub = layered
    ? `couche γ : ${fr(K, 4)} · ${fr(g, 1)} · [ ${fr(H)} · (${fr(tD)}² − ${fr(t0)}²)/2 − (${fr(tD)}³ − ${fr(t0)}³)/3 ] = ${fr(M1, 2)} ; couche γ′ : ${fr(K, 4)} · [ (${fr(g, 1)} − ${fr(gp, 1)}) · ${fr(zD)} · (${fr(H)} − ${fr(tS)})²/2 + ${fr(gp, 1)} · ( ${fr(H)} · (${fr(H)}² − ${fr(tS)}²)/2 − (${fr(H)}³ − ${fr(tS)}³)/3 ) ] = ${fr(M2, 2)}`
    : `${fr(K, 4)} · ${fr(g, 1)} · [ ${fr(H)} · (${fr(H)}² − ${fr(t0)}²)/2 − (${fr(H)}³ − ${fr(t0)}³)/3 ]`;
  const factorSub = p.seismic_null ? 'butée sismique nulle (option MUR-02 D9) : facteur effectif 0' : STEM_PASSIVE_FACTOR_TEXT[sp.choice];
  return {
    comb: c.combName, choice: sp.choice, active: sp.active, layered, seismicNull: p.seismic_null,
    Kp: sp.Kp, Kp_eff: K, gamma: g, gammaPrime: gp, zDry: zD,
    hSolAv: H, t0, hv: sp.hv, P: p.P_nominal, M: p.M_nominal, factor: p.factor,
    P1, P2, M1, M2,
    Mactive: p.foot_active, Mnet: p.foot_net,
    table: STEM_PASSIVE_CHOICES.map(ch => ({ choice: ch, label: STEM_PASSIVE_LABEL[ch], Mf: sp.envelope[ch].Mf, comb: sp.envelope[ch].comb, governs: ch === sp.choice })),
    hvSub, PSub, MSub,
    PRes: layered ? `P = P₁ + P₂ = ${fr(P1, 2)} + ${fr(P2, 2)} = ${fr(P1 + P2, 2)}` : `P = ${fr(p.P_nominal, 2)}`,
    MRes: layered ? `M = M₁ + M₂ = ${fr(M1, 2)} + ${fr(M2, 2)} = ${fr(M1 + M2, 2)}` : `M = ${fr(p.M_nominal, 2)}`,
    factorSub,
    netSub: `${fr(p.foot_active, 2)} − ${fr(p.factor, 3)} · ${fr(p.M_nominal, 2)}`
  };
}
