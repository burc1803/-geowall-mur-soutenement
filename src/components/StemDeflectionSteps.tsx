import React from 'react';
import { Eq, V, Sqrt, Frac } from './Eq';
import { fr } from '../lib/theoryEquations';
import type { WallDeflectionResult, WallDeflectionRow } from '../lib/wallDeflection';

/**
 * Flèche du voile (ÉLS) : équations mises en forme, lues du moteur (`result.stemDeflection`), jamais recalculées ici.
 * Sources : CSA A23.3 9.8.2.2 à 9.8.2.5 (éq. 9.1, 9.2, 9.5), 8.6.2.3 (éq. 8.2), 8.6.4 (éq. 8.3) ; correspondance avec l'édition -19 À CONFIRMER ;
 * Chaallal (2012) §3.4.2, p. 33 à 36, éq. 3.22, 3.25 à 3.27 et tableau 3.3 ; fiche MUR-05 (APPROUVÉE le 2026-11-08).
 */
export const DEFLECTION_SOURCES = 'CSA A23.3 9.8.2.2 à 9.8.2.5 ; Chaallal (2012) §3.4.2, p. 33 à 36, éq. 3.22, 3.25 à 3.27, tableau 3.3 ; fiche MUR-05';

/** Notation « 1,939 × 10⁹ » pour les inerties (mm⁴ par mètre de mur). */
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export function fmtSci(v: number, d = 3): string {
  if (!Number.isFinite(v) || v === 0) return fr(v, d);
  const e = Math.floor(Math.log10(Math.abs(v)));
  return `${fr(v / Math.pow(10, e), d)} × 10${String(e).split('').map(c => SUP[Number(c)] ?? '⁻').join('')}`;
}

/** Nombre avec espace insécable comme séparateur de milliers (fr) pour h/Δ. */
export const fmtInt = (v: number): string => (Number.isFinite(v) ? Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : v === Infinity ? '∞' : 'non défini');

export const combId = (name: string): string => /ELS\s+(\S+)\s/.exec(name)?.[1] ?? name;

/** Équivalent K de Chaallal (tableau 3.3) : Δi = K·(5/48)·Ma·h²/(Ec·Ie). Comparaison seulement ; défini pour le mur libre. */
export function equivalentK(sd: WallDeflectionResult, row: WallDeflectionRow): number {
  if (!sd.props) return NaN;
  const MaNmm = row.Ma * 1e6;
  const hMm = sd.h * 1000;
  return row.deltaI / ((5 / 48) * MaNmm * hMm * hMm / (sd.props.Ec * row.Ie));
}

const I4 = () => <>mm<sup>4</sup>/m</>;

/** Propriétés de section et facteurs (É1, É3, É5) : Ec, fr/2, Ig, yt, Mcr, n, c, Icr, Ie, ζs. Combinaison `row` pour Ie. */
export function DeflectionPropEqs({ sd, row }: { sd: WallDeflectionResult; row: WallDeflectionRow }) {
  const p = sd.props!;
  return (
    <div className="space-y-2">
      <Eq
        general={<><V n="E" s="c" /> = 4500 <Sqrt><V n="f" s="c" prime /></Sqrt></>}
        substituted={<>4500 × √{fr(p.fc, 1)}</>}
        result={<><V n="E" s="c" /> = {fr(p.Ec, 1)} MPa</>}
        note="CSA A23.3 8.6.2.3, éq. 8.2 (béton de densité normale) ; Es = 200 000 MPa (8.5.4.1)."
      />
      <Eq
        general={<><V n="f" s="r" />/2 = 0,6 <V n="λ" /> <Sqrt><V n="f" s="c" prime /></Sqrt> / 2</>}
        substituted={<>0,6 × {fr(p.lambda, 2)} × √{fr(p.fc, 1)} / 2</>}
        result={<><V n="f" s="r" /> = {fr(p.fr, 3)} MPa ; <V n="f" s="r" />/2 = {fr(p.frHalf, 3)} MPa</>}
        note="CSA A23.3 8.6.4, éq. 8.3 ; 9.8.2.3 : fr pris égal à la moitié de l'éq. 8.3 pour Mcr (flèche)."
      />
      <Eq
        general={<><V n="I" s="g" /> = <V n="b" /><V n="t" p="3" />/12 ; <V n="y" s="t" /> = <V n="t" />/2 ; <V n="M" s="cr" /> = (<V n="f" s="r" />/2) <V n="I" s="g" /> / <V n="y" s="t" /></>}
        substituted={<><V n="I" s="g" /> = {fmtSci(p.b * p.t ** 3 / 12, 3)} ; <V n="M" s="cr" /> = {fr(p.frHalf, 3)} × {fmtSci(p.Ig, 3)} / {fr(p.yt, 0)}</>}
        result={<><V n="I" s="g" /> = {fmtSci(p.Ig, 3)} <I4 /> ; <V n="y" s="t" /> = {fr(p.yt, 0)} mm ; <V n="M" s="cr" /> = {fr(p.Mcr, 2)} kN·m/m</>}
        note="CSA A23.3 9.8.2.3, éq. 9.2 (Mcr = fr·Ig/yt, avec fr/2). b = 1 000 mm."
      />
      <Eq
        general={<><V n="n" /> = <V n="E" s="s" />/<V n="E" s="c" /> ; <V n="b" /><V n="c" p="2" />/2 + <V n="n" /><V n="A" s="s" /><V n="c" /> − <V n="n" /><V n="A" s="s" /><V n="d" /> = 0 ; <V n="I" s="cr" /> = <V n="b" /><V n="c" p="3" />/3 + <V n="n" /><V n="A" s="s" />(<V n="d" /> − <V n="c" />)<sup>2</sup></>}
        substituted={<><V n="n" /> = {fr(p.Es, 0)}/{fr(p.Ec, 1)} ; <V n="n" /><V n="A" s="s" /> = {fr(p.n, 4)} × {fr(p.As, 1)} = {fr(p.n * p.As, 0)} mm² ; <V n="d" /> = {fr(p.d, 0)} mm</>}
        result={<><V n="n" /> = {fr(p.n, 4)} ; <V n="c" /> = {fr(p.c, 2)} mm ; <V n="I" s="cr" /> = {fmtSci(p.Icr, 3)} <I4 /></>}
        note="Section fissurée transformée, armature tendue du voile (côté remblai) ; armature comprimée négligée (ρ′ = 0, MUR-05 D5). Chaallal §3.4.2."
      />
      <Eq
        general={<><V n="I" s="e" /> = <V n="I" s="cr" /> + (<V n="I" s="g" /> − <V n="I" s="cr" />)(<V n="M" s="cr" />/<V n="M" s="a" />)<sup>3</sup> ≤ <V n="I" s="g" /></>}
        substituted={row.cracked
          ? <>{fmtSci(p.Icr, 3)} + ({fmtSci(p.Ig, 3)} − {fmtSci(p.Icr, 3)}) × ({fr(p.Mcr, 2)}/{fr(row.Ma, 2)})<sup>3</sup></>
          : <><V n="M" s="a" /> = {fr(row.Ma, 2)} ≤ <V n="M" s="cr" /> = {fr(p.Mcr, 2)} kN·m/m : <V n="I" s="e" /> = <V n="I" s="g" /></>}
        result={<><V n="I" s="e" /> = {fmtSci(row.Ie, 4)} <I4 /> ({fr(row.Ie / p.Ig, 3)} <V n="I" s="g" />) : section {row.cracked ? 'fissurée' : 'non fissurée'}</>}
        note="CSA A23.3 9.8.2.3, éq. 9.1. Ie constant sur la hauteur, calculé avec Ma au pied (mur libre) ou le plus grand |M| (mur de sous-sol ; 9.8.2.4 non appliquée, À CONFIRMER) : MUR-05 D1."
      />
      <Eq
        general={<><V n="ζ" s="s" /> = 1 + <Frac n={<V n="s" />} d={<>1 + 50 <V n="ρ" prime /></>} /></>}
        substituted={<><V n="ζ" s="s" /> = 1 + {fr(sd.s, 1)} / (1 + 50 × {fr(sd.rhoPrime, 4)})</>}
        result={<><V n="ζ" s="s" /> = {fr(sd.zetaS, 3)}</>}
        note="CSA A23.3 9.8.2.5, éq. 9.5 : s = 2,0 (charge soutenue de 5 ans ou plus) ; ρ′ = 0 (MUR-05 D5)."
      />
    </div>
  );
}

/** Mentions obligatoires (limite = critère de l'utilisateur ; rotation de la semelle NON VÉRIFIÉE). */
export function DeflectionMentions({ sd }: { sd: WallDeflectionResult }) {
  return (
    <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
      <li>Limite h/{fr(sd.divisor, 0)} : critère de l'utilisateur, aucune limite de la CSA A23.3 tableau 9.3 pour un mur (le tableau vise les toits et les planchers).</li>
      <li>Rotation de la semelle : NON VÉRIFIÉE (MUR-05 D8). Elle n'est pas comprise dans la flèche (Chaallal, tableau 3.3, note a : à ajouter s'il y a lieu).</li>
      <li>Combinaisons : tableau 4.1.3.4 du CNB, H = 1,0 (4.1.3.4. 4)) ; 0,35L retenu (0,5L pour stockage, équipement et locaux techniques : usage non connu du moteur, À CONFIRMER). Le séisme n'en fait pas partie.</li>
      <li>Correspondance des articles A23.3 lus dans l'édition -14 avec l'édition -19 : À CONFIRMER.</li>
    </ul>
  );
}

/** Détail pas à pas de la combinaison qui gouverne (plus grand Δ/limite), pour l'onglet « Étapes & formules ». */
export function DeflectionGoverningSteps({ sd }: { sd: WallDeflectionResult }) {
  if (!sd.valid || !sd.props || sd.governingIndex < 0) {
    return <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-3">Flèche du voile NON VÉRIFIABLE : {sd.reason ?? 'données insuffisantes'}.</div>;
  }
  const p = sd.props;
  const row = sd.rows[sd.governingIndex];
  const cant = sd.mode === 'cantilever';
  const K = equivalentK(sd, row);
  const lambdaTxt = fr(sd.lambdaDelta, 3);
  return (
    <div className="space-y-4 text-xs">
      <p className="text-slate-600">
        Combinaison qui gouverne (plus grand |Δ<sub>LT</sub>|/limite) : <strong className="font-mono">{combId(row.combName)} ({row.formula})</strong>. Sources : {DEFLECTION_SOURCES}.
      </p>
      <DeflectionPropEqs sd={sd} row={row} />
      <Eq
        general={<><V n="M" s="a" /> = max |<V n="M" />(<V n="y" />)| {cant ? 'au pied du voile' : 'sur la hauteur'} (charges de service)</>}
        substituted={<>Combinaison {row.formula} ; charges latérales du voile du moteur, <V n="h" /> = {fr(sd.h, 2)} m, <V n="h" s="r" /> = {fr(sd.hr, 2)} m</>}
        result={<><V n="M" s="a" /> = {fr(row.Ma, 2)} kN·m/m</>}
      />
      <Eq
        general={<><V n="Δ" s="i" /> = ∬ <Frac n={<><V n="M" />(<V n="y" />)</>} d={<><V n="E" s="c" /><V n="I" s="e" /></>} /> d<V n="y" /> d<V n="y" /> {cant ? '(en tête)' : '(maximum entre les appuis)'}</>}
        substituted={<><V n="E" s="c" /><V n="I" s="e" /> = {fr(p.Ec, 1)} × {fmtSci(row.Ie, 4)} = {fmtSci(p.Ec * row.Ie, 4)} N·mm² ; v = 0 et v′ = 0 au pied ; charge réelle sur <V n="h" s="r" />, prolongée par θ·(<V n="h" /> − <V n="h" s="r" />)</>}
        result={<><V n="Δ" s="i" /> = {fr(row.deltaI, 3)} mm ; <V n="Δ" s="i,sus" /> = {fr(row.deltaSus, 3)} mm (D + H + <V n="L" s="s" />, <V n="L" s="s" /> = {fr(sd.Ls, 2)} <V n="L" />)</>}
        note={cant && Number.isFinite(K)
          ? <>Comparaison seulement : Δ<sub>i</sub> = K·(5/48)·M<sub>a</sub>·h²/(E<sub>c</sub>I<sub>e</sub>) donne K = {fr(K, 2)} pour la charge réelle du moteur ; le tableau 3.3 de Chaallal donne K = 2,4 pour une charge uniforme (Chaallal §3.4.2, p. 33 à 36, éq. 3.22). Le moteur intègre la charge réelle (triangulaire ou trapézoïdale), sans K.</>
          : 'Intégration de la courbure par la charge réelle ; mur de sous-sol : modèle encastré au pied, appuyé en tête.'}
      />
      <Eq
        general={<><V n="Δ" s="LT" /> = <V n="Δ" s="i" /> + (<V n="ζ" s="s" /> − 1)·<V n="Δ" s="i,sus" /></>}
        substituted={<>{fr(row.deltaI, 3)} + {lambdaTxt} × {fr(row.deltaSus, 3)}</>}
        result={<>|<V n="Δ" s="LT" />| = {fr(row.deltaLT, 3)} mm</>}
        note="CSA A23.3 9.8.2.5 : flèche différée sous charges soutenues (D3 : D + H + Ls, avec le même Ie) ; Chaallal §3.4.2."
      />
      <Eq
        general={<><V n="Δ" s="adm" /> = <V n="h" />/<V n="k" /> ; |<V n="Δ" s="LT" />| ≤ <V n="Δ" s="adm" /></>}
        substituted={<>{fr(sd.h * 1000, 0)}/{fr(sd.divisor, 0)} = {fr(row.limit, 2)} mm ; {fr(row.deltaLT, 3)} ≤ {fr(row.limit, 2)}</>}
        result={<><V n="h" />/|<V n="Δ" s="LT" />| = {fmtInt(row.hOverDelta)} ; taux {fr(row.utilization, 3)} : {row.status === 'OK' ? 'CONFORME au critère de l\'utilisateur' : row.status === 'NON' ? 'NON CONFORME au critère de l\'utilisateur' : 'NON VÉRIFIABLE'}</>}
        note={<>Limite h/{fr(sd.divisor, 0)} : critère de l'utilisateur (aucune limite pour un mur au tableau 9.3 de la CSA A23.3). Rotation de la semelle non comprise (Chaallal, tableau 3.3, note a : à ajouter s'il y a lieu) : <strong>NON VÉRIFIÉE</strong>.</>}
      />
    </div>
  );
}
