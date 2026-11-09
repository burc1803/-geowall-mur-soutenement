/**
 * Flèche du voile en service (ÉLS) — fiche MUR-05 (APPROUVÉE le 2026-11-08), décisions D1 à D8.
 * Fonctions pures, sans dépendance à l'interface. Unités : N, mm, MPa ; efforts en kN·m/m (1 kN·m/m = 10⁶ N·mm par mètre de mur).
 *
 * Articles CSA A23.3-14 lus visuellement (fiche MUR-05, section « Vérification visuelle ») ; correspondance avec -19 À CONFIRMER :
 *  8.5.4.1 Es = 200 000 MPa ; 8.6.2.3 (éq. 8.2) Ec = 4500√f′c ; 8.6.4 (éq. 8.3) fr = 0,6λ√f′c ;
 *  9.8.2.3 (éq. 9.1, 9.2) Ie = Icr + (Ig − Icr)(Mcr/Ma)³ ≤ Ig, Mcr = fr·Ig/yt avec fr égal à la moitié de l'éq. 8.3 ;
 *  9.8.2.5 (éq. 9.5) ζs = 1 + s/(1 + 50ρ′), s = 2,0 (charge soutenue de 5 ans ou plus).
 * Limite h/k : CRITÈRE DE L'UTILISATEUR (D7) — le tableau 9.3 ne vise ni les murs ni les murs de soutènement.
 * Rotation et translation de la semelle : NON VÉRIFIÉES (D8).
 */
import type { LoadCaseType } from './types';

export const ES_MPA = 200000; // CSA A23.3 8.5.4.1
export const DEFLECTION_S_LONG_TERM = 2.0; // 9.8.2.5 : charge soutenue ≥ 5 ans
export const DEFAULT_DEFLECTION_DIVISOR = 300; // D7 : critère de l'utilisateur

export interface WallSectionProps {
  b: number; // mm
  t: number; // mm
  d: number; // mm
  As: number; // mm²/m
  fc: number; // MPa
  lambda: number;
  Ec: number; // MPa — 8.6.2.3
  Es: number; // MPa
  n: number; // Es/Ec
  fr: number; // MPa — 8.6.4
  frHalf: number; // MPa — 9.8.2.3
  Ig: number; // mm⁴/m
  yt: number; // mm
  Mcr: number; // kN·m/m — avec fr/2
  c: number; // mm — axe neutre de la section fissurée
  Icr: number; // mm⁴/m
}

/** É1 — propriétés de section. Retourne null si les données sont invalides (aucune valeur fictive). */
export function wallSectionProps(t: number, d: number, As: number, fc: number, lambda = 1, Es = ES_MPA, b = 1000): WallSectionProps | null {
  if (![t, d, As, fc, lambda, Es, b].every(Number.isFinite) || !(t > 0) || !(d > 0) || !(As > 0) || !(fc > 0) || !(b > 0) || d >= t) return null;
  const Ec = 4500 * Math.sqrt(fc); // 8.6.2.3, éq. 8.2
  const n = Es / Ec;
  const fr = 0.6 * lambda * Math.sqrt(fc); // 8.6.4, éq. 8.3
  const frHalf = fr / 2; // 9.8.2.3
  const Ig = (b * t * t * t) / 12;
  const yt = t / 2;
  const Mcr = (frHalf * Ig / yt) / 1e6; // 9.8.2.3, éq. 9.2
  const nAs = n * As;
  const c = (-nAs + Math.sqrt(nAs * nAs + 2 * b * nAs * d)) / b; // (b/2)c² + nAs·c − nAs·d = 0
  const Icr = (b * c * c * c) / 3 + nAs * (d - c) * (d - c);
  return { b, t, d, As, fc, lambda, Ec, Es, n, fr, frHalf, Ig, yt, Mcr, c, Icr };
}

/** É3 — inertie effective, 9.8.2.3 éq. 9.1 : Ie = Icr + (Ig − Icr)(Mcr/Ma)³ ≤ Ig ; Ie = Ig si Ma ≤ Mcr. */
export function effectiveInertia(Ma: number, p: Pick<WallSectionProps, 'Ig' | 'Icr' | 'Mcr'>): number {
  const a = Math.abs(Ma);
  if (!(a > p.Mcr)) return p.Ig;
  return Math.min(p.Icr + (p.Ig - p.Icr) * Math.pow(p.Mcr / a, 3), p.Ig);
}

/** Charges soutenues d'une combinaison (D3, D4) : D, H et la fraction Ls de L. S, W et E sont transitoires. */
export function sustainedFactors(f: Record<LoadCaseType, number>, Ls: number): Record<LoadCaseType, number> {
  return { D: f.D, H: f.H, L: f.L * Ls, S: 0, W: 0, E: 0 };
}

export interface DeflectionProfile {
  tip: number; // mm — v(h), signé (positif vers l'avant)
  max: number; // mm — max |v(y)|
  yMax: number; // m depuis le pied
}

/**
 * É4 — double intégration de la courbure κ(y) = M(y)/(Ec·Ie) depuis le pied (v = 0, v′ = 0).
 * Le moment est celui de la statique (R en tête compris pour un voile appuyé), donc v(h) = 0 en tête appuyée.
 * Convention : M(y) positif quand les charges poussent vers l'avant (celle de stemSectionEffort).
 * Intégration exacte pour κ linéaire par segment : θ += (κ1 + κ2)·dy/2 ; v += θ·dy + (2κ1 + κ2)·dy²/6.
 * @param h hauteur du voile (m)  @param M moment à la hauteur y (m depuis le pied), kN·m/m  @param EI Ec·Ie (N·mm² par mètre)
 */
export function integrateDeflection(h: number, M: (y: number) => number, EI: number, nSeg = 600): DeflectionProfile {
  if (!(h > 0) || !(EI > 0)) return { tip: NaN, max: NaN, yMax: 0 };
  const dy = (h * 1000) / nSeg; // mm
  let theta = 0;
  let v = 0;
  let k1 = (M(0) * 1e6) / EI;
  let max = 0;
  let yMax = 0;
  for (let i = 1; i <= nSeg; i++) {
    const k2 = (M((i / nSeg) * h) * 1e6) / EI;
    v += theta * dy + ((2 * k1 + k2) * dy * dy) / 6;
    theta += ((k1 + k2) * dy) / 2;
    k1 = k2;
    if (Math.abs(v) > max) { max = Math.abs(v); yMax = (i / nSeg) * h; }
  }
  return { tip: v, max, yMax };
}

export type DeflectionStatus = 'OK' | 'NON' | 'NON VÉRIFIABLE';

export interface WallDeflectionCombInput {
  name: string;
  formula: string;
  factors: Record<LoadCaseType, number>;
  MaBase: number; // kN·m/m — |M| au pied (D1, mur libre)
  MaMax: number; // kN·m/m — max |M| (D1, mur de sous-sol)
  /** Flèche pour la combinaison complète (sustained = false) ou ses seules charges soutenues (true), avec Ec·Ie en N·mm² par mètre de mur. */
  solve: (sustained: boolean, EI: number) => DeflectionProfile;
}

export interface WallDeflectionRow {
  combName: string;
  formula: string;
  factors: Record<LoadCaseType, number>;
  Ma: number; // kN·m/m utilisé pour Ie
  cracked: boolean; // Ma > Mcr
  Ie: number; // mm⁴/m
  deltaI: number; // mm — |Δi| (tête, ou maximum pour un mur de sous-sol)
  deltaSus: number; // mm — |Δi,sus|
  deltaLT: number; // mm — |Δtotale| = |Δi| + (ζs − 1)|Δi,sus|
  hOverDelta: number; // h/|ΔLT| (Infinity si ΔLT = 0)
  limit: number; // mm
  utilization: number; // |ΔLT| / limite
  status: DeflectionStatus;
}

export interface WallDeflectionResult {
  valid: boolean;
  reason?: string;
  mode: 'cantilever' | 'basement';
  h: number; // m
  hr: number; // m
  props: WallSectionProps | null;
  s: number;
  rhoPrime: number; // D5 : 0
  lambdaDelta: number; // s/(1 + 50ρ′)
  zetaS: number; // 9.8.2.5 : 1 + s/(1 + 50ρ′)
  Ls: number; // fraction soutenue de L
  divisor: number;
  limit: number; // mm = h/divisor
  rows: WallDeflectionRow[];
  governingIndex: number;
  status: DeflectionStatus;
  footingRotation: 'NON VÉRIFIÉE'; // D8
}

export interface WallDeflectionInput {
  mode: 'cantilever' | 'basement';
  h: number; hr: number; // m
  t: number; d: number; As: number; fc: number; // mm, mm, mm²/m, MPa
  lambda?: number;
  Ls: number; // fraction soutenue de L, 0 à 1
  divisor: number;
  combos: WallDeflectionCombInput[];
}

/** É1 à É6 pour toutes les combinaisons ÉLS fournies. Les entrées invalides donnent `valid: false` (jamais une valeur fictive). */
export function computeWallDeflection(inp: WallDeflectionInput): WallDeflectionResult {
  const s = DEFLECTION_S_LONG_TERM;
  const rhoPrime = 0; // D5
  const lambdaDelta = s / (1 + 50 * rhoPrime);
  const base = {
    mode: inp.mode, h: inp.h, hr: inp.hr, s, rhoPrime, lambdaDelta, zetaS: 1 + lambdaDelta,
    Ls: inp.Ls, divisor: inp.divisor, limit: inp.h * 1000 / inp.divisor, footingRotation: 'NON VÉRIFIÉE' as const
  };
  const invalid = (reason: string): WallDeflectionResult => ({ ...base, valid: false, reason, props: null, rows: [], governingIndex: -1, status: 'NON VÉRIFIABLE' });
  const props = wallSectionProps(inp.t, inp.d, inp.As, inp.fc, inp.lambda ?? 1);
  if (!props) return invalid('Section du voile invalide (t, d, As ou f′c) : flèche non calculée.');
  if (!(inp.h > 0) || !(inp.divisor > 0) || !Number.isFinite(inp.divisor)) return invalid('Hauteur ou diviseur de la limite invalide : flèche non calculée.');

  const rows: WallDeflectionRow[] = inp.combos.map(cb => {
    const Ma = inp.mode === 'cantilever' ? Math.abs(cb.MaBase) : Math.abs(cb.MaMax); // D1
    const Ie = effectiveInertia(Ma, props);
    const EI = props.Ec * Ie;
    const pick = (p: DeflectionProfile) => Math.abs(inp.mode === 'cantilever' ? p.tip : p.max);
    const deltaI = pick(cb.solve(false, EI));
    const deltaSus = pick(cb.solve(true, EI));
    const deltaLT = deltaI + lambdaDelta * deltaSus; // D3 : Δi + (ζs − 1)·Δi,sus
    const ok = Number.isFinite(deltaLT);
    const hOverDelta = ok ? (deltaLT > 0 ? (inp.h * 1000) / deltaLT : Infinity) : NaN;
    return {
      combName: cb.name, formula: cb.formula, factors: cb.factors, Ma, cracked: Ma > props.Mcr, Ie,
      deltaI, deltaSus, deltaLT, hOverDelta, limit: base.limit, utilization: ok ? deltaLT / base.limit : NaN,
      status: ok ? (deltaLT <= base.limit * (1 + 1e-9) ? 'OK' : 'NON') : 'NON VÉRIFIABLE'
    };
  });
  let governingIndex = -1;
  rows.forEach((r, i) => { if (Number.isFinite(r.utilization) && (governingIndex < 0 || r.utilization > rows[governingIndex].utilization)) governingIndex = i; });
  const status: DeflectionStatus = rows.length === 0 || rows.some(r => r.status === 'NON VÉRIFIABLE') ? 'NON VÉRIFIABLE'
    : rows.some(r => r.status === 'NON') ? 'NON' : 'OK';
  return { ...base, valid: true, props, rows, governingIndex, status };
}
