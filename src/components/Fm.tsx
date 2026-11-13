import React from 'react';
import { V } from './Eq';

/**
 * Typographie des symboles dans un texte courant (utilitaire unique de la note) : remplace les symboles usuels
 * (L_p, L_t, h_s,av, h_p, K_a, K_p, K_AE, φ_gu, φ_ov, γ′, f′c, fy, kv, kh, ah, Mr, Vf…) par leur forme en italique avec indice droit.
 * Les formes « h_r », « φ_ov », « q_adm,ÉLS » (indice après un trait bas) sont reconnues aussi. Aucune valeur n'est modifiée : seul le rendu change.
 */

/** Symboles écrits sans trait bas : texte → [nom, indice, prime]. */
const SUBS: Record<string, [string, string?, boolean?]> = {
  'Lp': ['L', 'p'], 'Lt': ['L', 't'], 'ts': ['t', 's'], 'hs,av': ['h', 's,av'], 'hp': ['h', 'p'], 'hw,av': ['h', 'w,av'], 'hw': ['h', 'w'], 'hr': ['h', 'r'],
  'Hp': ['H', 'p'], 'Ka': ['K', 'a'], 'K0': ['K', '0'], 'Kp': ['K', 'p'], 'KAE': ['K', 'AE'],
  'φgu': ['φ', 'gu'], 'φov': ['φ', 'ov'], 'φgs': ['φ', 'gs'], 'φcoh': ['φ', 'coh'], 'φp': ['φ', 'p'], 'φc': ['φ', 'c'], 'φs': ['φ', 's'],
  'γc': ['γ', 'c'], 'γw': ['γ', 'w'], 'γ′': ['γ', undefined, true], 'αH': ['α', 'H'], 'δb': ['δ', 'b'],
  'ah': ['a', 'h'], 'kh': ['k', 'h'], 'kv': ['k', 'v'], 'df': ['d', 'f'], 'qadm': ['q', 'adm'], 'Rf': ['R', 'f'], 'Rv': ['R', 'v'],
  'ca': ['c', 'a'], 'cu': ['c', 'u'], 'x1': ['x', '1'], 'q1': ['q', '1'], 'q2': ['q', '2'], 'Ms': ['M', 's'],
  'Ag': ['A', 'g'], 'As,min': ['A', 's,min'], 'As,req': ['A', 's,req'], 'As,fourni': ['A', 's,fourni'],
  'Δi,sus': ['Δ', 'i,sus'], 'Δdiff': ['Δ', 'diff'], 'ΔLT': ['Δ', 'LT'], 'Δi': ['Δ', 'i'], 'Ma': ['M', 'a'], 'Ie': ['I', 'e'], 'Ec': ['E', 'c'], 'Ig': ['I', 'g'], 'Icr': ['I', 'cr'], 'Pp': ['P', 'p'],
  'Mcr': ['M', 'cr'], 'Mr': ['M', 'r'], 'Mf': ['M', 'f'], 'Vr,max': ['V', 'r,max'], 'Vr': ['V', 'r'], 'Vf': ['V', 'f'],
  'Fh': ['F', 'h'], 'Fv': ['F', 'v'], 'Fx': ['F', 'x'], 'Fy': ['F', 'y'], 'Fs': ['F', 's'], 'Mz': ['M', 'z'],
  'fy': ['f', 'y'], 'ldh': ['l', 'dh'], 'ld': ['l', 'd'], 'lhb': ['l', 'hb'], 'dv': ['d', 'v'], 'db': ['d', 'b'], 'Pw,a': ['P', 'w,a'],
};
const SUB_KEYS = Object.keys(SUBS).sort((a, b) => b.length - a.length);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Autres formes : [motif, rendu]. Les groupes de capture sont passés au rendu. */
const SPECIAL: [string, (g: string[], txt: string) => React.ReactNode][] = [
  ['ΣHf', () => <span>Σ<V n="H" s="f" /></span>],
  ['ΣMstab', () => <span>Σ<V n="M" s="stab" /></span>],
  ['ΣMrenv', () => <span>Σ<V n="M" s="renv" /></span>],
  ['ΣV′', () => <span>Σ<V n="V" prime /></span>],
  ['ΔPAE', () => <span>Δ<V n="P" s="AE" /></span>],
  ['ΔP0E', () => <span>Δ<V n="P" s="0E" /></span>],
  ['P′p', () => <V n="P" s="p" prime />],
  ['f′c', () => <V n="f" s="c" prime />],
  ['c′a', () => <V n="c" s="a" prime />],
  ['c′', () => <V n="c" prime />],
  ['qu(?![’\'])', () => <V n="q" s="u" />],
  ['f′c_(\\p{L}+)', g => <span><i>f</i>′<sub className="text-[0.75em]">c,{g[0]}</sub></span>],
  ['h(?=\\s*[=/)])', () => <V n="h" />],
  ['tan δb',() => <span>tan <V n="δ" s="b" /></span>],
  ['B/6', () => <span><V n="B" />/6</span>],
  ['B′', () => <V n="B" prime />],
  ['([γφδ])′', g => <V n={g[0]} prime />],
  ['(\\p{L})_([\\p{L}\\d]+(?:,[\\p{L}\\d]+)?)', g => <V n={g[0]} s={g[1]} />],
  // lettre grecque seule : italique ; B et e seuls (e jamais précédé d'un chiffre : « 5e éd. »)
  ['[αβγδζλμσφψΨ]', (_g, txt) => <V n={txt} />],
];

const ALT = [
  ...SPECIAL.map(([p]) => `(?:${p})`),
  ...SUB_KEYS.map(k => esc(k)),
  'B', '(?<!\\d)e',
];
const RX = `(?<![\\p{L}\\d_])(?:${ALT.join('|')})(?![\\p{L}_])`;

export function Fm({ children }: { children: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  const rx = new RegExp(RX, 'gu');
  let m: RegExpExecArray | null;
  while ((m = rx.exec(children)) !== null) {
    if (m[0] === '') { rx.lastIndex++; continue; }
    if (m.index > last) out.push(children.slice(last, m.index));
    const txt = m[0];
    let node: React.ReactNode = txt;
    const sub = SUBS[txt];
    if (sub) node = <V n={sub[0]} s={sub[1]} prime={sub[2]} />;
    else if (txt === 'B' || txt === 'e' || txt === 'h') node = <V n={txt} />;
    else {
      for (const [p, render] of SPECIAL) {
        const mm = new RegExp(`^(?:${p})$`, 'u').exec(txt);
        if (mm) { node = render(mm.slice(1), txt); break; }
      }
    }
    out.push(<React.Fragment key={`s${k++}`}>{node}</React.Fragment>);
    last = m.index + txt.length;
  }
  if (last < children.length) out.push(children.slice(last));
  return <>{out.map((n, i) => (typeof n === 'string' ? <React.Fragment key={`t${i}`}>{n}</React.Fragment> : n))}</>;
}
