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

/* -------------------------------------------------------------------------- */
/*  Mononobe-Okabe (MUR-02 §4.2) — parement vertical (θ = 0), remblai de pente β */
/* -------------------------------------------------------------------------- */

/**
 * Coefficient actif sismique KAE (CFEM 5e, éq. 18.21 / 18.25 avec θ = 0) :
 *   KAE = cos²(φ − ψ) / [cos ψ · cos(δ + ψ) · (1 + √(sin(φ + δ)·sin(φ − β − ψ) / (cos(δ + ψ)·cos β)))²]
 * avec ψ = atan[kh/(1 − kv)]. Angles en radians.
 * Retourne `null` (jamais NaN) si KAE est indéterminé : φ − β < ψ (CFEM p. 632) ou dénominateur dégénéré.
 */
export function mononobeOkabeKae(phi: number, delta: number, psi: number, beta = 0): number | null {
  if (!Number.isFinite(phi) || !Number.isFinite(delta) || !Number.isFinite(psi) || !Number.isFinite(beta)) return null;
  if (phi - beta < psi) return null;
  const cDP = Math.cos(delta + psi);
  const cB = Math.cos(beta);
  if (cDP <= 1e-9 || cB <= 1e-9 || Math.cos(psi) <= 1e-9) return null;
  const arg = (Math.sin(phi + delta) * Math.sin(phi - beta - psi)) / (cDP * cB);
  if (arg < 0) return null;
  const denom = Math.cos(psi) * cDP * Math.pow(1 + Math.sqrt(arg), 2);
  if (!(denom > 1e-12)) return null;
  const K = Math.pow(Math.cos(phi - psi), 2) / denom;
  return Number.isFinite(K) ? K : null;
}

/**
 * Coefficient passif sismique KPE (CFEM 5e, éq. 18.28 avec θ = 0) :
 *   KPE = cos²(φ − ψ) / [cos ψ · cos(δ + ψ) · (1 − √(sin(φ + δ)·sin(φ + β − ψ) / (cos(δ + ψ)·cos β)))²]
 * Retourne `null` si la racine n'existe pas (φ + β < ψ) ou si le dénominateur est dégénéré.
 */
export function mononobeOkabeKpe(phi: number, delta: number, psi: number, beta = 0): number | null {
  if (!Number.isFinite(phi) || !Number.isFinite(delta) || !Number.isFinite(psi) || !Number.isFinite(beta)) return null;
  if (phi + beta < psi) return null;
  const cDP = Math.cos(delta + psi);
  const cB = Math.cos(beta);
  if (cDP <= 1e-9 || cB <= 1e-9 || Math.cos(psi) <= 1e-9) return null;
  const arg = (Math.sin(phi + delta) * Math.sin(phi + beta - psi)) / (cDP * cB);
  if (arg < 0) return null;
  const bracket = 1 - Math.sqrt(arg);
  const denom = Math.cos(psi) * cDP * bracket * bracket;
  if (!(denom > 1e-12)) return null;
  const K = Math.pow(Math.cos(phi - psi), 2) / denom;
  return Number.isFinite(K) ? K : null;
}

/* -------------------------------------------------------------------------- */
/*  Charge linéaire derrière le mur (CFEM 5e, fig. 20.8, p. 694) — MUR-02 §3, E25 */
/* -------------------------------------------------------------------------- */

export interface LineLoadThrust {
  PH: number; // kN/m — poussée horizontale résultante
  zc: number; // m — profondeur de la résultante sous la surface (centroïde du diagramme σh)
  sigmaAt: (z: number) => number; // kPa — pression horizontale à la profondeur z sous la surface, normalisée pour que ∫σh dz = PH sur [0, H]
}

/**
 * Charge linéaire QL (kN/m) parallèle au mur, à la distance m·H du mur (m = x/H), mur de hauteur H.
 * Fig. 20.8 : m ≤ 0,4 : σh·H/QL = 0,20·n/(0,16 + n²)² ; PH = 0,55·QL.
 *             m > 0,4 : σh·H/QL = 1,28·m²·n/(m² + n²)² ; PH = 0,64·QL/(m² + 1). n = z/H.
 * La forme du diagramme est celle de la figure ; son intégrale est ramenée à la valeur PH de la figure.
 * La charge ponctuelle de la fig. 20.8 n'est pas représentable dans une section 2D : non implémentée.
 */
export function lineLoadThrust(QL: number, m: number, H: number): LineLoadThrust {
  if (!(QL > 0) || !(H > 0) || !Number.isFinite(m) || m < 0) return { PH: 0, zc: H / 2, sigmaAt: () => 0 };
  const near = m <= 0.4;
  const g = (n: number) => (near ? (0.20 * n) / Math.pow(0.16 + n * n, 2) : (1.28 * m * m * n) / Math.pow(m * m + n * n, 2));
  const PH = near ? 0.55 * QL : (0.64 * QL) / (m * m + 1);
  const N = 400;
  let I0 = 0;
  let I1 = 0;
  for (let i = 0; i < N; i++) {
    const n = (i + 0.5) / N;
    I0 += g(n) / N;
    I1 += (g(n) * n) / N;
  }
  if (!(I0 > 0)) return { PH: 0, zc: H / 2, sigmaAt: () => 0 };
  const scale = PH / I0; // (kN/m) par unité de ∫g dn
  return { PH, zc: (I1 / I0) * H, sigmaAt: (z: number) => (z < 0 || z > H ? 0 : (scale * g(z / H)) / H) };
}
