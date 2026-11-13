import React from 'react';
import { Fm } from './Fm';

/**
 * Mise en forme typographique des équations (sans dépendance) : police unique de la note (pile serif système, voir `index.css`),
 * variables en italique avec indice droit, vrais indices et exposants, fractions empilées. Identique à l'écran et à l'impression.
 */

/**
 * Variable (symbole unique de la note) : nom en italique, indice `s` en romain (droit), exposant `p`, prime éventuelle (γ′).
 * Les unités ne passent pas par ce composant : elles restent en romain, séparées de la valeur par une espace insécable.
 */
export function V({ n, s, p, prime }: { n: React.ReactNode; s?: React.ReactNode; p?: React.ReactNode; prime?: boolean }) {
  return (
    <span>
      <i>{n}</i>
      {prime ? '′' : ''}
      {s !== undefined && <sub className="text-[0.75em]">{s}</sub>}
      {p !== undefined && <sup className="text-[0.75em]">{p}</sup>}
    </span>
  );
}

/** Alias de `V` : « Sym » désigne la grandeur écrite selon la convention unique de la note. */
export const Sym = V;

/** Fraction empilée. */
export function Frac({ n, d }: { n: React.ReactNode; d: React.ReactNode }) {
  return (
    <span className="inline-flex flex-col items-center align-middle mx-0.5 leading-tight">
      <span className="px-1 border-b border-current">{n}</span>
      <span className="px-1">{d}</span>
    </span>
  );
}

/** Racine carrée avec vinculum. */
export function Sqrt({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap">
      √<span className="border-t border-current">{children}</span>
    </span>
  );
}

const LINE = 'font-serif text-[13px] leading-7 text-slate-900 print:text-black';

/**
 * Équation sur trois lignes : formule symbolique, valeurs substituées (lues du moteur), résultat en gras avec unité, puis ligne de référence.
 * - `lhs` (facultatif) : membre de gauche commun aux trois lignes ; les signes « = » (ou `op`) sont alors alignés en colonne.
 *   Sans `lhs`, les lignes sont empilées (le résultat porte son propre membre de gauche).
 * - `no` : numéro de l'équation, affiché à droite, par exemple « 4.1 ».
 * - `note` : ligne de référence (norme, article) ou remarque ; `illustrative` : équation pédagogique sans équivalent direct dans le moteur.
 */
export type EqLine = { lhs: React.ReactNode; op?: React.ReactNode; general: React.ReactNode; substituted?: React.ReactNode; result?: React.ReactNode };

export function Eq({ general, substituted, result, note, illustrative, lhs, op = '=', no, lines }: {
  general?: React.ReactNode;
  /** Plusieurs relations alignées sous un même numéro (chaque ligne : membre de gauche, formule, valeurs, résultat). */
  lines?: EqLine[];
  substituted?: React.ReactNode;
  result?: React.ReactNode;
  note?: React.ReactNode;
  illustrative?: boolean;
  lhs?: React.ReactNode;
  op?: React.ReactNode;
  no?: string;
}) {
  return (
    <div className="note-eq break-inside-avoid print:break-inside-avoid border-l-2 border-slate-300 pl-3 py-1">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3">
        {lines ? (
          <div className="grid grid-cols-[max-content_max-content_1fr] gap-x-2 items-baseline">
            {lines.map((l, i) => (
              <React.Fragment key={i}>
                <div className={`${LINE} text-right`}>{l.lhs}</div>
                <div className={LINE}>{l.op ?? '='}</div>
                <div className={LINE}>{l.general}</div>
                {l.substituted !== undefined && <><div /><div className={`${LINE} text-slate-700`}>=</div><div className={`${LINE} text-slate-700`}>{l.substituted}</div></>}
                {l.result !== undefined && <><div /><div className={LINE}>=</div><div className={`${LINE} font-bold`}>{l.result}</div></>}
              </React.Fragment>
            ))}
          </div>
        ) : lhs !== undefined ? (
          <div className="grid grid-cols-[max-content_max-content_1fr] gap-x-2 items-baseline">
            <div className={`${LINE} text-right`}>{lhs}</div>
            <div className={LINE}>{op}</div>
            <div className={LINE}>{general}</div>
            {substituted !== undefined && <><div /><div className={`${LINE} text-slate-700`}>=</div><div className={`${LINE} text-slate-700`}>{substituted}</div></>}
            {result !== undefined && <><div /><div className={LINE}>=</div><div className={`${LINE} font-bold`}>{result}</div></>}
          </div>
        ) : (
          <div>
            <div className={LINE}>{general}</div>
            {substituted !== undefined && <div className={`${LINE} text-slate-700`}>{substituted}</div>}
            {result !== undefined && <div className={`${LINE} font-bold`}>{result}</div>}
          </div>
        )}
        {no && <div className={`${LINE} text-right whitespace-nowrap`}>({no})</div>}
      </div>
      {(note || illustrative) && (
        <div className="note-s text-[10.5px] text-slate-600 font-sans leading-snug">
          {illustrative && <strong className="text-amber-700">Équation illustrative (sans équivalent direct dans le moteur). </strong>}
          {typeof note === 'string' ? <Fm>{note}</Fm> : note}
        </div>
      )}
    </div>
  );
}

/**
 * Texte de résultat ou de substitution avec notation typographique : remplace les symboles courants (ΣHf, ΣMrenv, Fs, φov, B′, q(orteil)…)
 * par leurs formes avec indices, pour que les lignes de résultat suivent la notation de la formule.
 */
export function Tx({ children }: { children: string }) {
  const re = /(ΣHf|ΣMrenv|ΣMstab|ΔPAE|ΔP0E|φov|φgs|φcoh|Fs|q\((?:orteil|talon)\)|B′|B\/6|\bq\b|\bB\b|\be\b|Ψ)/g;
  const parts = children.split(re);
  return (
    <>
      {parts.map((t, i) => {
        if (i % 2 === 0) return <React.Fragment key={i}>{t}</React.Fragment>;
        switch (t) {
          case 'ΣHf': return <span key={i}>Σ<V n="H" s="f" /></span>;
          case 'ΣMrenv': return <span key={i}>Σ<V n="M" s="renv" /></span>;
          case 'ΣMstab': return <span key={i}>Σ<V n="M" s="stab" /></span>;
          case 'ΔPAE': return <span key={i}>Δ<V n="P" s="AE" /></span>;
          case 'ΔP0E': return <span key={i}>Δ<V n="P" s="0E" /></span>;
          case 'φov': return <span key={i}><V n="φ" s="ov" /></span>;
          case 'φgs': return <span key={i}><V n="φ" s="gs" /></span>;
          case 'φcoh': return <span key={i}><V n="φ" s="coh" /></span>;
          case 'Fs': return <span key={i}><V n="F" s="s" /></span>;
          case 'q(orteil)': return <span key={i}><V n="q" s="orteil" /></span>;
          case 'q(talon)': return <span key={i}><V n="q" s="talon" /></span>;
          case 'B′': return <span key={i}><V n="B" prime /></span>;
          case 'B/6': return <span key={i}><V n="B" />/6</span>;
          case 'q': return <span key={i}><V n="q" /></span>;
          case 'B': return <span key={i}><V n="B" /></span>;
          case 'e': return <span key={i}><V n="e" /></span>;
          case 'Ψ': return <span key={i}><V n="Ψ" /></span>;
          default: return <React.Fragment key={i}>{t}</React.Fragment>;
        }
      })}
    </>
  );
}
