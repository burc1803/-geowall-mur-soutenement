import React from 'react';
import { V } from './Eq';

/**
 * Typographie des symboles dans un texte courant : remplace les symboles usuels (γ′, γw, hw, Ag, As,min, Mr, Mcr, f′c, fy, kv, kh, ah…)
 * par leurs formes avec vrais indices. Aucune valeur n'est modifiée : seul le rendu change.
 */
const TOKENS: [RegExp, () => React.ReactNode][] = [
  [/H_p/, () => <V n="H" s="p" />],
  [/\bts\b/, () => <V n="t" s="s" />],
  [/γc/, () => <V n="γ" s="c" />],
  [/lhb/, () => <V n="l" s="hb" />],
  [/γ′/, () => <V n="γ" prime />],
  [/γw/, () => <V n="γ" s="w" />],
  [/hw,av/, () => <V n="h" s="w,av" />],
  [/hw/, () => <V n="h" s="w" />],
  [/As,min/, () => <V n="A" s="s,min" />],
  [/As,req/, () => <V n="A" s="s,req" />],
  [/As,fourni/, () => <V n="A" s="s,fourni" />],
  [/Ag/, () => <V n="A" s="g" />],
  [/Mcr/, () => <V n="M" s="cr" />],
  [/Mr/, () => <V n="M" s="r" />],
  [/Mf/, () => <V n="M" s="f" />],
  [/Vr,max/, () => <V n="V" s="r,max" />],
  [/f′c/, () => <span><i>f</i>′<sub className="text-[0.75em]">c</sub></span>],
  [/fy/, () => <V n="f" s="y" />],
  [/kv/, () => <V n="k" s="v" />],
  [/kh/, () => <V n="k" s="h" />],
  [/ah/, () => <V n="a" s="h" />],
  [/ldh/, () => <V n="l" s="dh" />],
  [/\bld\b/, () => <V n="l" s="d" />],
  [/\bdv\b/, () => <V n="d" s="v" />],
  [/\bdb\b/, () => <V n="d" s="b" />],
  [/φcoh/, () => <V n="φ" s="coh" />],
  [/φgs/, () => <V n="φ" s="gs" />],
  [/φp/, () => <V n="φ" s="p" />],
  [/tan δb/, () => <span>tan <V n="δ" s="b" /></span>],
  [/δb/, () => <V n="δ" s="b" />],
  [/c′a/, () => <V n="c" s="a" prime />],
  [/Hp/, () => <V n="H" s="p" />],
  [/hr/, () => <V n="h" s="r" />],
  [/Pw,a/, () => <V n="P" s="w,a" />],
  [/B′/, () => <V n="B" prime />],
];

const SOURCE = TOKENS.map(([re]) => `(?<![\\p{L}])${re.source}(?![\\p{L}])`).join('|');

export function Fm({ children }: { children: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const rx = new RegExp(SOURCE, 'gu');
  while ((m = rx.exec(children)) !== null) {
    if (m[0] === '') { rx.lastIndex++; continue; }
    if (m.index > last) out.push(children.slice(last, m.index));
    const tok = TOKENS.find(([re1]) => new RegExp(`^(?:${re1.source})$`, 'u').test(m![0]));
    out.push(tok ? <React.Fragment key={`s${k++}`}>{tok[1]()}</React.Fragment> : m[0]);
    last = m.index + m[0].length;
  }
  if (last < children.length) out.push(children.slice(last));
  return <>{out.map((n, i) => (typeof n === 'string' ? <React.Fragment key={`t${i}`}>{n}</React.Fragment> : n))}</>;
}
