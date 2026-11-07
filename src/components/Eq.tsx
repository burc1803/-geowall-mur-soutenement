import React from 'react';

/**
 * Mise en forme typographique des équations (sans dépendance) : police à empattements, variables en italique,
 * vrais indices et exposants, fractions empilées. Identique à l'écran et à l'impression.
 */

/** Variable : nom en italique, indice `s`, exposant `p`, prime éventuelle (γ′). */
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
 * Équation sur trois lignes : formule générale, formule avec les valeurs substituées (lues du moteur), résultat avec unités.
 * `illustrative` : équation pédagogique sans équivalent direct dans le moteur.
 */
export function Eq({ general, substituted, result, note, illustrative }: {
  general: React.ReactNode;
  substituted?: React.ReactNode;
  result?: React.ReactNode;
  note?: React.ReactNode;
  illustrative?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 px-3 py-2 break-inside-avoid print:break-inside-avoid">
      <div className={LINE}>{general}</div>
      {substituted !== undefined && <div className={`${LINE} text-slate-700 border-t border-dashed border-slate-200`}>{substituted}</div>}
      {result !== undefined && <div className={`${LINE} font-bold border-t border-dashed border-slate-200`}>{result}</div>}
      {(note || illustrative) && (
        <div className="text-[10.5px] text-slate-500 font-sans leading-snug">
          {illustrative && <strong className="text-amber-700">Équation illustrative (sans équivalent direct dans le moteur). </strong>}
          {note}
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
