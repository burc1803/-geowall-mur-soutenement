/**
 * Fonctions mécaniques pures du module mur de soutènement (sans dépendance à l'interface).
 * Référence : fiche MUR-01 (corrections approuvées), écarts E01, E10, E19 de MUR-00.
 */
import type { LoadCaseType } from './types';

/**
 * Coefficient de poussée passive de Coulomb (MUR-01 §2, E19).
 *   Kp = cos²(φ+θ) / [cos²θ · cos(θ−δ) · (1 − √(sin(φ+δ)·sin(φ+β) / (cos(θ−δ)·cos(θ−β))))²]
 * φ : frottement interne, δ : frottement sol-mur, θ : inclinaison du parement sur la verticale,
 * β : inclinaison du remblai sur l'horizontale (tous en radians). Parement vertical, remblai horizontal : θ = β = 0.
 * Retourne NaN si la formule est dégénérée (l'appelant choisit alors un repli).
 */
export function coulombKp(phi: number, delta: number, theta = 0, beta = 0): number {
  const cTD = Math.cos(theta - delta);
  const cTB = Math.cos(theta - beta);
  if (cTD <= 1e-9 || cTB <= 1e-9) return NaN;
  const arg = (Math.sin(phi + delta) * Math.sin(phi + beta)) / (cTD * cTB);
  if (arg < 0) return NaN;
  const bracket = 1 - Math.sqrt(arg);
  const denom = Math.pow(Math.cos(theta), 2) * cTD * bracket * bracket;
  if (!(denom > 1e-12)) return NaN;
  return Math.pow(Math.cos(phi + theta), 2) / denom;
}

/* -------------------------------------------------------------------------- */
/*  Modèle des charges latérales sur le voile (E01, E10)                       */
/* -------------------------------------------------------------------------- */

/**
 * Charge latérale sur le voile. z = profondeur sous le haut du voile (m), positive vers le bas.
 * - linear : pression p(z) = a + b·z (kN/m par m de hauteur) sur [z1, z2] ;
 * - point  : force F (kN/m) à la profondeur z ;
 * - moment : moment M (kN·m/m) appliqué à la profondeur z (même sens que la poussée des terres).
 */
export type StemItem =
  | { kind: 'linear'; type: LoadCaseType; label: string; z1: number; z2: number; a: number; b: number }
  | { kind: 'point'; type: LoadCaseType; label: string; z: number; F: number }
  | { kind: 'moment'; type: LoadCaseType; label: string; z: number; M: number };

/**
 * Facteur applicable à une charge latérale du voile pour une combinaison.
 * Une charge variable (ou sismique) de sens opposé à la poussée est favorable : facteur 0
 * (CNB, 4.1.3.2.(3), appliqué ici aux efforts du voile). La charge permanente garde le facteur de la combinaison.
 */
export function stemItemFactor(item: StemItem, factors: Record<LoadCaseType, number>, dUnfav?: number): number {
  let f = factors[item.type] ?? 0;
  const signed = item.kind === 'linear' ? item.a + item.b * (item.z1 + item.z2) / 2
    : item.kind === 'point' ? item.F : item.M;
  if (signed < 0 && item.type !== 'D') return 0;
  // CNB 4.1.3.2.(5) : seule la charge permanente qui s'oppose est réduite ; une action D défavorable garde le facteur maximal
  if (item.type === 'D' && signed >= 0 && dUnfav !== undefined) f = dUnfav;
  return f;
}

/** Intégrales d'une pression linéaire a + b·z sur [z1, min(z2, d)] : effort tranchant et moment à la profondeur d. */
export function linearSegmentEffect(a: number, b: number, z1: number, z2: number, d: number): { V: number; M: number } {
  const u = Math.min(z2, d);
  if (u <= z1) return { V: 0, M: 0 };
  const du = u - z1;
  const su = (u * u - z1 * z1) / 2;
  const cu = (u * u * u - z1 * z1 * z1) / 3;
  const V = a * du + b * su;
  const M = a * (d * du - su) + b * (d * su - cu);
  return { V, M };
}

/** Quadrature de Gauss-Legendre à 5 points (exacte jusqu'au degré 9). */
function gauss5(fn: (x: number) => number, x1: number, x2: number): number {
  const nodes = [0, 0.5384693101056831, -0.5384693101056831, 0.9061798459386640, -0.9061798459386640];
  const weights = [0.5688888888888889, 0.4786286704993665, 0.4786286704993665, 0.2369268850561891, 0.2369268850561891];
  const half = (x2 - x1) / 2;
  const mid = (x2 + x1) / 2;
  let s = 0;
  for (let i = 0; i < 5; i++) s += weights[i] * fn(mid + half * nodes[i]);
  return s * half;
}

/**
 * Réaction en tête d'un voile encastré au pied et appuyé en tête (poutre encastrée-appuyée, longueur L).
 * Pour une charge ponctuelle P à la distance a de l'encastrement : R = P·a²(3L − a) / (2L³).
 * Résultats connus : charge triangulaire nulle en tête, résultante P → R = 0,2·P ; charge uniforme W → R = 3W/8 (MUR-01 E10).
 * Moment M0 appliqué à la distance a de l'encastrement : R = 3·M0·a(2L − a) / (2L³) (même sens que la poussée).
 */
export function proppedTopReaction(items: StemItem[], factors: Record<LoadCaseType, number>, L: number, dUnfav?: number): number {
  if (!(L > 0)) return 0;
  const influence = (z: number) => {
    const a = Math.min(Math.max(L - z, 0), L);
    return (a * a * (3 * L - a)) / (2 * L * L * L);
  };
  let R = 0;
  for (const it of items) {
    const f = stemItemFactor(it, factors, dUnfav);
    if (f === 0) continue;
    if (it.kind === 'moment') {
      if (it.z <= L) {
        const a = Math.min(Math.max(L - it.z, 0), L);
        R += f * it.M * (3 * a * (2 * L - a)) / (2 * L * L * L);
      }
    } else if (it.kind === 'point') {
      if (it.z <= L) R += f * it.F * influence(it.z);
    } else if (it.kind === 'linear') {
      const z1 = Math.max(it.z1, 0);
      const z2 = Math.min(it.z2, L);
      if (z2 > z1) R += f * gauss5(z => (it.a + it.b * z) * influence(z), z1, z2);
    }
  }
  return R;
}

/**
 * Effort tranchant V et moment M du voile à la profondeur d sous le haut, pour une combinaison.
 * R = réaction en tête (0 pour un mur en console). V = ΣF − R ; M = ΣF·(d − z) − R·d.
 */
export function stemSectionEffort(
  items: StemItem[],
  factors: Record<LoadCaseType, number>,
  d: number,
  R = 0,
  dUnfav?: number
): { V: number; M: number } {
  let V = 0;
  let M = 0;
  for (const it of items) {
    const f = stemItemFactor(it, factors, dUnfav);
    if (f === 0) continue;
    if (it.kind === 'linear') {
      const e = linearSegmentEffect(it.a, it.b, it.z1, it.z2, d);
      V += f * e.V;
      M += f * e.M;
    } else if (it.kind === 'point') {
      if (it.z <= d) {
        V += f * it.F;
        M += f * it.F * (d - it.z);
      }
    } else if (it.z <= d) {
      // moment appliqué (console ou mur appuyé en tête : sa part est reprise par R)
      M += f * it.M;
    }
  }
  return { V: V - R, M: M - R * d };
}
