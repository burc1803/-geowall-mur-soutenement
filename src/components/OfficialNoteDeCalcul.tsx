import React, { useState } from 'react';
import { AnalysisResult, WallGeometry, SoilProperties, ConcreteProperties, LoadsConfig } from '../lib/types';
import { BearingPressureDiagram } from './BearingPressureDiagram';
import { FACTEUR_H_SISMIQUE } from '../lib/analysis';
import { buildLoadTables, countStabilizingHM, countStabilizingVariable, sumsByType } from './loadTables';
import { buildBarSchedule, buildZoneRows, SCHEDULE_DISCLAIMER, totalScheduleMass } from '../lib/rebarPlans';
import { Fm } from './Fm';
import { Eq, Frac, Tx, V } from './Eq';
import { DeflectionPropEqs, DeflectionMentions, combId, fmtInt } from './StemDeflectionSteps';
import { buildBearingEq, buildOverturningEq, buildSlidingEq, fr } from '../lib/theoryEquations';
import { STEM_PASSIVE_LABEL, STEM_PASSIVE_EXPLAIN, STEM_PASSIVE_FACTOR_TEXT } from '../lib/stemPassive';
import { Printer, FileText, Info } from 'lucide-react';

/*
 * Note de calcul officielle : PRÉSENTATION seulement. Toutes les valeurs sont lues du moteur (`result`) ; aucune n'est recalculée ici.
 * Conventions de présentation :
 *  - une seule famille de police (voir `index.css`, #note-officielle) et 4 tailles : titre de section, sous-titre, texte courant, petit ;
 *  - hiérarchie « 1. », « 1.1 », « 1.1.1 » ; tableaux « Tableau s.n — titre » (légende au-dessus), figures « Figure s.n — titre » (légende dessous) ;
 *  - symboles : composants `V` (nœuds) et `Fm` (texte) ; nombres : `fr` (virgule décimale, espace fine insécable pour les milliers) ;
 *  - équations : gabarit `Eq` (formule, valeurs substituées, résultat en gras, ligne de référence, numéro à droite).
 */

interface OfficialNoteDeCalculProps {
  projectName?: string; // nom du projet saisi dans l'en-tête
  geo: WallGeometry;
  soil: SoilProperties;
  conc: ConcreteProperties;
  result: AnalysisResult;
  loads?: LoadsConfig; // charges saisies (absentes : « non disponible »)
}

/** Espace insécable entre une valeur et son unité. */
const NB = ' ';

/** Format unique des nombres : virgule décimale, espace fine pour les milliers (`fr`). */
const fmt = (v: number, d: number) => (Number.isFinite(v) ? fr(v, d) : v === Infinity ? '∞' : 'non disponible');
/** Valeur suivie de son unité (espace insécable). */
const fu = (v: number, d: number, unit: string) => `${fmt(v, d)}${NB}${unit}`;
/** Facteurs de charge : une décimale ou deux selon la valeur (1,0 ; 1,25 ; 0,9). */
const fac = (v: number) => fr(v, Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 ? 1 : 2);
/** Textes du moteur contenant un point décimal (noms de combinaisons : 1.25D) : virgule décimale à l'affichage. */
const dec = (t: string) => t.replace(/(?<![\d.])(\d+)\.(\d+)(?![\d.])/g, '$1,$2');

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="text-slate-950 border-b border-slate-700 pb-1 pt-2 break-after-avoid print:break-after-avoid">
      {n}. {title}
    </h2>
  );
}

function SubTitle({ n, title }: { n: string; title: string }) {
  return <h3 className="text-slate-900 break-after-avoid print:break-after-avoid">{n} {title}</h3>;
}

/** Sous-sous-titre « 1.1.1 » : texte courant en gras. */
function SubSubTitle({ n, title }: { n: string; title: string }) {
  return <div className="font-bold text-slate-900 break-after-avoid print:break-after-avoid">{n} {title}</div>;
}

/** Légende de tableau, au-dessus : « Tableau 4.3 — Titre ». */
function Caption({ no, title }: { no: string; title: string }) {
  return <div className="note-caption"><span>Tableau {no} — </span><Fm>{title}</Fm></div>;
}

/** Figure : contenu, puis légende en dessous (« Figure 1.1 — Titre »). */
function Figure({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <figure className="note-fig">
      {children}
      <figcaption className="note-caption-fig"><span>Figure {no} — </span><Fm>{title}</Fm></figcaption>
    </figure>
  );
}

/** Valeur numérique simple (ex. « 12,00 », « −0,25 », « 24 647,5 ») : alignée à droite. */
const isNumeric = (s: string) => /^[−-]?\d+(?:[   ]\d{3})*(?:[.,]\d+)?$/.test(s.trim());

/** Contenu d'une cellule : les textes passent par `Fm` (symboles en italique avec indice droit), les nœuds restent tels quels. */
const cellContent = (c: React.ReactNode) => (typeof c === 'string' ? <Fm>{c}</Fm> : c);

/** Tableau de la note : en-tête clair, filets fins, légende au-dessus ; nom puis unité en dessous dans l'en-tête. */
type NoteCol = { name: string; unit?: string; align?: 'left' | 'right' | 'center'; title?: string };
function NoteTable({ caption, cols, rows, footer, after }: {
  caption?: { no: string; title: string };
  cols: NoteCol[];
  rows: React.ReactNode[][];
  footer?: { cells: React.ReactNode[]; shaded?: boolean }[];
  after?: React.ReactNode;
}) {
  const al = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  return (
    <div className={rows.length <= 8 ? 'break-inside-avoid print:break-inside-avoid' : ''}>
      {caption && <Caption {...caption} />}
      <div className="overflow-x-auto">
        <table className="note-table text-left">
          <thead>
            <tr className="align-bottom">
              <th>No</th>
              {cols.map(c => (
                <th key={c.name} title={c.title ?? c.name} className={`leading-tight ${al(c.align)}`}>
                  <Fm>{c.name}</Fm>
                  {c.unit && <span className="block font-normal text-slate-600">{c.unit}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="text-slate-500">{i + 1}</td>
                {r.map((cell, j) => (
                  <td key={j} className={`${al(cols[j]?.align)} ${j === 0 ? 'text-slate-900 font-bold min-w-[5.5rem]' : 'whitespace-nowrap'}`}>{cellContent(cell)}</td>
                ))}
              </tr>
            ))}
            {footer?.map((f, i) => (
              <tr key={`f${i}`} className={`font-bold text-slate-900 ${f.shaded ? 'bg-sky-100' : ''}`}>
                <td>Σ</td>
                {f.cells.map((cell, j) => <td key={j} className={`whitespace-nowrap ${al(cols[j]?.align)}`}>{cellContent(cell)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {after}
    </div>
  );
}

const StatusPill = ({ status, verifiable }: { status: string; verifiable: boolean }) => {
  const nv = !verifiable || status === 'NON VÉRIFIABLE';
  return (
    <span className={`px-1.5 py-0.5 rounded-sm font-bold ${nv ? 'bg-amber-100 text-amber-800' : status === 'OK' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
      {nv ? 'non vérifiable' : status === 'OK' ? 'OK' : 'NON'}
    </span>
  );
};
/** Noms d'éléments du moteur en casse de titre (« Voile - Face Intérieure ») : casse de phrase et tiret cadratin. */
const phrase = (s: string) => {
  const [h, ...r] = s.split(' - ');
  if (!r.length) return s;
  return `${h} — ${r.join(' — ').replace(/\b([A-ZÉÈÀ])([a-zéèêàùôîïç]{2,})\b/g, (_m, a: string, b: string) => a.toLowerCase() + b)}`;
};
const shortComb = (n: string) => dec(n.replace(/^Combinaison\s+\S+\s+\d+\s*\((.*)\)$/, '$1'));

const CENTERED_HEADS = ['Valeur', 'Symbole', 'Unité', 'Type CNB', 'Dir.'];
/** Tableau à colonnes de texte (désignation, symbole, valeur, unité…), même style que `NoteTable`. */
function DataTable({ head, rows, caption, after }: { head: string[]; rows: string[][]; caption?: { no: string; title: string }; after?: React.ReactNode }) {
  const ctr = (j: number) => CENTERED_HEADS.includes(head[j]);
  const numCol = (j: number) => j > 0 && !ctr(j) && rows.filter(r => isNumeric(r[j] ?? '')).length * 2 >= rows.length;
  const cell = (c: string, j: number) => {
    if (head[j] === 'Unité') return c;
    if (head[j] === 'Symbole' && /^[A-Za-z]$/.test(c)) return <V n={c} />; // symbole d'une seule lettre : italique
    return isNumeric(c) ? c : <Fm>{c}</Fm>;
  };
  return (
    <div className={rows.length <= 8 ? 'break-inside-avoid print:break-inside-avoid' : ''}>
      {caption && <Caption {...caption} />}
      <div className="overflow-x-auto">
        <table className="note-table text-left">
          <thead>
            <tr>
              {head.map((h, j) => <th key={h} className={ctr(j) ? 'text-center' : numCol(j) ? 'text-right' : ''}><Fm>{h}</Fm></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td
                    key={j}
                    className={`${ctr(j) ? 'text-center whitespace-nowrap' : numCol(j) ? 'text-right whitespace-nowrap' : ''} ${j === 0 && head[0] === 'N°' ? 'text-slate-500' : ''}`}
                  >
                    {cell(c, j)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {after}
    </div>
  );
}

/** Symbole dans un texte SVG : nom en italique, indice droit en baisse. */
function SvgSym({ n, s }: { n: string; s?: string }) {
  return (
    <>
      <tspan fontStyle="italic">{n}</tspan>
      {s && <tspan baselineShift="sub" fontSize="0.75em" fontStyle="normal">{s}</tspan>}
    </>
  );
}

/** Croquis coté de la coupe : formes et cotes issues de la géométrie (pas de moteur de dessin). */
function WallSketch({ geo, B, totalHeight, hSolAv, hPass, hr }: { geo: WallGeometry; B: number; totalHeight: number; hSolAv: number; hPass: number; hr: number }) {
  const sc = 200 / Math.max(B, totalHeight);
  const ox = hSolAv > 0 ? 74 : 46; // marge gauche (cotes H, hp et hs,av)
  const oy = 26; // marge haute (cote t)
  const H = totalHeight * sc;
  const W = B * sc;
  const x = (m: number) => ox + m * sc;
  const y = (m: number) => oy + H - m * sc; // m depuis la sous-face de la semelle
  const xs0 = x(geo.ePiedAv);
  const xs1 = x(geo.ePiedAv + geo.epStem);
  const dimC = '#1d4ed8';
  const yDimB = y(0) + 30; // cotes horizontales sous la semelle
  const yDimParts = y(0) + 14;
  const xDimRight = x(B) + 16; // cotes verticales à droite
  const xDimH = ox - 22 - (hSolAv > 0 ? 28 : 0);
  const xDimP = ox - 36; // cote hp (profondeur de butée)
  const xDimS = ox - 18; // cote hs,av

  /** Cote avec traits d'attache et flèches aux deux bouts ; le texte est centré. */
  const Dim = ({ x1, y1, x2, y2, label, vertical }: { x1: number; y1: number; x2: number; y2: number; label: React.ReactNode; vertical?: boolean }) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={dimC} strokeWidth="0.8" markerStart="url(#skArrow)" markerEnd="url(#skArrow)" />
      {vertical ? (
        <text x={x1 - 3} y={(y1 + y2) / 2} fontSize="8" fill={dimC} stroke="#ffffff" strokeWidth="3" paintOrder="stroke" textAnchor="middle" transform={`rotate(-90 ${x1 - 3} ${(y1 + y2) / 2})`}>{label}</text>
      ) : (
        <text x={(x1 + x2) / 2} y={y1 - 3} fontSize="8" fill={dimC} stroke="#ffffff" strokeWidth="3" paintOrder="stroke" textAnchor="middle">{label}</text>
      )}
    </g>
  );
  const ext = { stroke: '#94a3b8', strokeWidth: 0.5 };

  return (
    <svg viewBox={`0 0 ${ox + W + 70} ${oy + H + 44}`} className="w-full max-w-sm border border-slate-300 bg-white" role="img" aria-label="Croquis coté du mur">
      <defs>
        <marker id="skArrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={dimC} />
        </marker>
        <pattern id="skSoil" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#fde68a" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#d97706" strokeWidth="0.6" />
        </pattern>
        <pattern id="skConcrete" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#cbd5e1" />
          <circle cx="2" cy="2" r="0.6" fill="#64748b" />
          <circle cx="6" cy="5" r="0.5" fill="#64748b" />
        </pattern>
      </defs>

      {/* Sol avant sur le patin et terrain naturel à gauche (hs,av) */}
      {hSolAv > 0 && (
        <g>
          <rect x={x(0)} y={y(geo.epBase + hSolAv)} width={xs0 - x(0)} height={hSolAv * sc} fill="url(#skSoil)" opacity="0.8" />
          <rect x={2} y={y(geo.epBase + hSolAv)} width={x(0) - 2} height={(geo.epBase + hSolAv) * sc} fill="url(#skSoil)" opacity="0.8" />
          <line x1={2} y1={y(geo.epBase + hSolAv)} x2={xs0} y2={y(geo.epBase + hSolAv)} stroke="#b45309" strokeWidth="1" />
          <text x={(x(0) + xs0) / 2} y={y(geo.epBase + hSolAv) - 3} fontSize="8" fontWeight="bold" fill="#92400e" textAnchor="middle">Sol avant</text>
        </g>
      )}

      {/* Remblai sur le talon */}
      <rect x={xs1} y={y(geo.epBase + hr)} width={x(B) - xs1} height={hr * sc} fill="url(#skSoil)" opacity="0.8" />
      <line x1={xs1} y1={y(geo.epBase + hr)} x2={x(B) + 8} y2={y(geo.epBase + hr)} stroke="#b45309" strokeWidth="1" />
      <text x={(xs1 + x(B)) / 2} y={y(geo.epBase + hr) + 12} fontSize="8" fontWeight="bold" fill="#92400e" textAnchor="middle">Remblai</text>

      {/* Béton : semelle et voile */}
      <rect x={x(0)} y={y(geo.epBase)} width={W} height={geo.epBase * sc} fill="url(#skConcrete)" stroke="#0f172a" strokeWidth="1.2" />
      <rect x={xs0} y={y(totalHeight)} width={geo.epStem * sc} height={geo.hMur * sc} fill="url(#skConcrete)" stroke="#0f172a" strokeWidth="1.2" />
      <text x={(xs0 + xs1) / 2} y={y(geo.epBase + geo.hMur / 2)} fontSize="8" fontWeight="bold" fill="#0f172a" textAnchor="middle" transform={`rotate(-90 ${(xs0 + xs1) / 2} ${y(geo.epBase + geo.hMur / 2)})`}>Voile</text>
      <text x={x(geo.ePiedAv / 2)} y={y(geo.epBase / 2) + 3} fontSize="7" fill="#0f172a" textAnchor="middle">Patin</text>
      <text x={(xs1 + x(B)) / 2} y={y(geo.epBase / 2) + 3} fontSize="7" fill="#0f172a" textAnchor="middle">Talon</text>
      {/* Sol de fondation */}
      <line x1={x(0) - 10} y1={y(0)} x2={x(B) + 10} y2={y(0)} stroke="#78350f" strokeWidth="0.8" strokeDasharray="4 2" />

      {/* Cote t (épaisseur du voile), en haut */}
      <line x1={xs0} y1={y(totalHeight) - 2} x2={xs0} y2={y(totalHeight) - 16} {...ext} />
      <line x1={xs1} y1={y(totalHeight) - 2} x2={xs1} y2={y(totalHeight) - 16} {...ext} />
      <Dim x1={xs0} y1={y(totalHeight) - 12} x2={xs1} y2={y(totalHeight) - 12} label={<><SvgSym n="t" /> = {fmt(geo.epStem, 2)}</>} />

      {/* Cotes horizontales sous la semelle : patin, voile, talon, puis B */}
      {[x(0), xs0, xs1, x(B)].map((xx, i) => <line key={i} x1={xx} y1={y(0) + 2} x2={xx} y2={yDimB + 4} {...ext} />)}
      <Dim x1={x(0)} y1={yDimParts} x2={xs0} y2={yDimParts} label={<><SvgSym n="L" s="p" /> = {fmt(geo.ePiedAv, 2)}</>} />
      <Dim x1={xs1} y1={yDimParts} x2={x(B)} y2={yDimParts} label={<><SvgSym n="L" s="t" /> = {fmt(geo.ePiedAr, 2)}</>} />
      <Dim x1={x(0)} y1={yDimB} x2={x(B)} y2={yDimB} label={<><SvgSym n="B" /> = {fmt(B, 2)}{NB}m</>} />

      {/* Cotes verticales à droite : ts et h ; à gauche : H */}
      {[y(0), y(geo.epBase), y(totalHeight)].map((yy, i) => <line key={i} x1={x(B) + 2} y1={yy} x2={xDimRight + 4} y2={yy} {...ext} />)}
      <Dim vertical x1={xDimRight} y1={y(0)} x2={xDimRight} y2={y(geo.epBase)} label="" />
      <text x={xDimRight + 4} y={y(geo.epBase / 2) + 3} fontSize="8" fill={dimC} stroke="#ffffff" strokeWidth="3" paintOrder="stroke"><SvgSym n="t" s="s" /> = {fmt(geo.epBase, 2)}</text>
      <Dim vertical x1={xDimRight} y1={y(geo.epBase)} x2={xDimRight} y2={y(totalHeight)} label={<><SvgSym n="h" /> = {fmt(geo.hMur, 2)}</>} />
      {[y(0), y(totalHeight)].map((yy, i) => <line key={i} x1={(i === 0 ? x(0) : xs0) - 2} y1={yy} x2={xDimH - 4} y2={yy} {...ext} />)}
      <Dim vertical x1={xDimH} y1={y(0)} x2={xDimH} y2={y(totalHeight)} label={<><SvgSym n="H" /> = {fmt(totalHeight, 2)}</>} />
      {hSolAv > 0 && (
        <g>
          {[y(geo.epBase + hSolAv), y(geo.epBase), y(0)].map((yy, i) => <line key={i} x1={xDimP - 4} y1={yy} x2={x(0) - 2} y2={yy} {...ext} />)}
          <Dim vertical x1={xDimS} y1={y(geo.epBase)} x2={xDimS} y2={y(geo.epBase + hSolAv)} label={<><SvgSym n="h" s="s,av" /> = {fmt(hSolAv, 2)}</>} />
          <Dim vertical x1={xDimP} y1={y(0)} x2={xDimP} y2={y(hPass)} label={<><SvgSym n="h" s="p" /> = {fmt(hPass, 2)}</>} />
        </g>
      )}
      <text x={ox + W + 64} y={oy + H + 42} fontSize="7" fill="#64748b" textAnchor="end">Cotes en m</text>
    </svg>
  );
}

export function OfficialNoteDeCalcul({ projectName, geo, soil, conc, result, loads }: OfficialNoteDeCalculProps) {
  const [engineerComment, setEngineerComment] = useState<string>(
    'Commentaire de l\'ingénieur : à compléter.'
  );
  const [showToleranceBox, setShowToleranceBox] = useState<boolean>(true);

  const B = geo.ePiedAv + geo.epStem + geo.ePiedAr;
  const B_over_6 = B / 6;

  const handlePrint = () => {
    window.print();
  };

  const ulsCombs = result.combinations.filter(c => c.type === 'ULS');
  const showStemPassiveCol = result.stemPassive.choice !== 0 && result.stemPassive.active; // MUR-07 : colonne « Butée voile »
  const showOtherStem = ulsCombs.some(c => Math.abs(c.stem_lateral.autres) > 0.05); // charges de tête, charges linéaires, etc.
  const slsCombs = result.combinations.filter(c => c.type === 'SLS');

  const seismicOn = result.soilMethodConfig.seismicMethod !== 'none';
  const ep = result.earthPressures;
  const loadTables = buildLoadTables(geo, soil, result, loads);
  const countVar = countStabilizingVariable(loads); // MUR-06 D5/D7
  const countHM = countStabilizingHM(loads); // MUR-06 M6-A1
  const MUR06_MENTION = 'Choix de l’utilisateur, moins prudent que le facteur 0. L’article 4.1.3.2 du CNB 2020 ne fixe pas lui-même ce facteur, mais le Commentaire A (Calcul aux états limites, ¶40) indique que, pour les combinaisons 2 à 5, « les charges variables contraires sont donc considérées être égales à zéro » : ce choix s’écarte du Commentaire. Pratique CFEM : À CONFIRMER.';

  // ---- Numérotation : tableaux « s.n » (par section, en continu), sous-sections et équations de la section 4 ----
  const sd = result.stemDeflection;
  const gi = sd.governingIndex;
  const deflOk = sd.valid && !!sd.props && gi >= 0;
  const seismTable = seismicOn && result.seismic.scenarios.length > 0;
  const tabOrder: [string, string, boolean][] = [
    ['geo', '1', true], ['mat', '1', true], ['soilBack', '1', true], ['soilFront', '1', true], ['soilBase', '1', true], ['soilBaseFS', '1', true], ['thrust', '1', true],
    ['stab', '2', true], ['destab', '2', true],
    ['combos', '3', true],
    ['gel', '4', true], ['crit', '4', true], ['synth', '4', true], ['factors', '4', true], ['seism', '4', seismTable], ['stability', '4', true],
    ['bearULS', '4', true], ['bearSLS', '4', true], ['bearDiag', '4', true], ['concrete', '4', true], ['concreteParams', '4', true], ['stem', '4', true], ['footing', '4', true], ['defl', '4', deflOk],
    ['assumptions', '5', true],
    ['zones', '6', true], ['asmin', '6', true], ['bars', '6', true],
  ];
  const T: Record<string, string> = {};
  const tabCount: Record<string, number> = {};
  for (const [k, sec, inc] of tabOrder) if (inc) { tabCount[sec] = (tabCount[sec] ?? 0) + 1; T[k] = `${sec}.${tabCount[sec]}`; }
  const sub4Order = ['choix', 'synthese', 'facteurs', ...(seismTable ? ['seisme'] : []), 'stabilite', 'portance', 'beton', 'voile', 'semelle', 'fleche'];
  const S4 = (k: string) => `4.${sub4Order.indexOf(k) + 1}`;
  const E = { slide: '4.1', slideCheck: '4.2', ovt: '4.3', ovtCheck: '4.4', ecc: '4.5', press: '4.6', limit: '4.7' };
  const eqDefl = (i: number) => `4.${8 + i}`;
  const F = { sketch: '1.1', pressure: '4.1' };

  // Combinaisons gouvernantes (choisies par le moteur) et équations de la section 4
  const gSl = result.governingSliding;
  const gOv = result.governingOverturning;
  const gBr = result.governingBearing;
  const slE = buildSlidingEq(gSl, result);
  const ovE = buildOverturningEq(gOv, result.verifiable);
  const brE = buildBearingEq(gBr, B, result.stabilityCriterion);
  const nvLabel = (s: string) => (!result.verifiable || s === 'NON VÉRIFIABLE' ? 'NON VÉRIFIABLE' : s);

  return (
    <div id="note-officielle" className="flex flex-col gap-8 w-full max-w-6xl mx-auto p-2 md:p-6 print:p-0 print:max-w-none text-slate-900">
      {/* Barre d'action (écran seulement) */}
      <div className="flex items-center justify-between bg-white p-4 rounded-md border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-md">
            <FileText size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Note de calcul officielle (CNB {result.cnbEdition} / CSA A23.3-19)</h3>
            <p className="note-s text-slate-500">
              Format prêt pour la révision de l'ingénieur, l'approbation municipale et l'impression en PDF
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-md font-bold shadow-md transition-all"
        >
          <Printer size={16} />
          Imprimer / exporter en PDF
        </button>
      </div>

      {/* Feuille de la note */}
      <div className="bg-white rounded-md border border-slate-200 shadow-lg p-8 md:p-12 space-y-8 print:border-none print:shadow-none print:p-4">
        {/* Cartouche */}
        {/* div et non header : l'impression masque les éléments header de l'application */}
        <div className="border-y-2 border-slate-900 py-3 space-y-3" data-testid="note-cartouche">
          <div>
            <h1 className="text-slate-950">Note de calcul — mur de soutènement</h1>
            <p className="font-bold text-slate-600">
              Rapport d'ingénierie géotechnique et structurale
            </p>
          </div>
          <table className="w-full border-collapse">
            <tbody className="align-top">
              {([
                ['Projet', projectName?.trim() || 'projet-mur', 'Date', new Date().toLocaleDateString('fr-CA')],
                ['Type d\'écran', geo.wallType === 'cantilever' ? 'Mur en porte-à-faux' : 'Mur de sous-sol appuyé en tête', 'Logiciel', 'GeoWall PRO v2.4'],
                ['Normes', `CNB ${result.cnbEdition} (partie 4) ; CFEM 5e éd. (*Manuel canadien d'ingénierie des fondations*) ; CSA A23.3-19 (articles béton du mur)`, 'Méthode sismique', result.seismic.method === 'wood' ? 'Wood (mur retenu)' : result.seismic.method === 'seed_whitman' ? 'Seed & Whitman (1970)' : (result.seismic.method === 'mononobe_okabe' ? 'Mononobe-Okabe' : 'Statique')],
                ['Juridiction', 'Projet au Québec — code applicable : Code de construction du Québec, Chapitre I – Bâtiment (CNB adopté avec modifications) ; référence de calcul : CNB ' + result.cnbEdition, 'Préparé par', ' '],
                [' ', ' ', 'Vérifié par', ' '],
              ] as [string, string, string, string][]).map(([k1, v1, k2, v2], i) => (
                <tr key={i} className="border-b border-slate-300">
                  <td className="pr-2 py-1 font-bold text-slate-700 w-[14%]">{k1}</td>
                  <td className="pr-4 py-1 w-[46%]">{v1.includes('*') ? <>{v1.split('*')[0]}<i>{v1.split('*')[1]}</i>{v1.split('*')[2]}</> : v1}</td>
                  <td className="pr-2 py-1 font-bold text-slate-700 w-[14%]">{k2}</td>
                  <td className="py-1 w-[26%]">{v2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {result.notices.length > 0 && (
          <div className="border border-amber-400 bg-amber-50 p-3 space-y-1 break-inside-avoid print:break-inside-avoid" data-testid="note-avis">
            <div className="font-bold text-amber-900">Avis</div>
            {result.notices.map((n, i) => <p key={i} className="text-amber-900">{n}</p>)}
          </div>
        )}

        {/* 1. DONNÉES DE CALCUL */}
        <SectionTitle n="1" title="Données de calcul" />

        <div className="space-y-2">
          <SubTitle n="1.1" title="Géométrie et dimensions" />
          {/* Tableau et croquis côte à côte, aussi à l'impression */}
          <div className="grid grid-cols-1 lg:grid-cols-3 print:grid-cols-[3fr_2fr] gap-4 items-start">
            <div className="lg:col-span-2 print:col-span-1">
              <DataTable
                caption={{ no: T.geo, title: 'Géométrie et dimensions du mur' }}
                head={['Désignation', 'Symbole', 'Valeur', 'Unité']}
                rows={[
                  ['Type d\'écran', '—', geo.wallType === 'cantilever' ? 'Mur en porte-à-faux' : 'Mur de sous-sol appuyé en tête', '—'],
                  ['Hauteur du voile', 'h', fmt(geo.hMur, 2), 'm'],
                  ['Épaisseur du voile (en tête et en pied)', 't', `${fmt(geo.epStem, 3)} (constante ; fruit non modélisé)`, 'm'],
                  ['Longueur du patin (avant)', 'Lp', fmt(geo.ePiedAv, 2), 'm'],
                  ['Longueur du talon (arrière)', 'Lt', fmt(geo.ePiedAr, 2), 'm'],
                  ['Épaisseur de la semelle', 'ts', fmt(geo.epBase, 3), 'm'],
                  ['Largeur totale de la semelle', 'B', fmt(B, 2), 'm'],
                  ['Sixième de la largeur', 'B/6', fmt(B_over_6, 3), 'm'],
                  ['Hauteur totale (sous-face de la semelle au haut du voile)', 'H', fmt(result.totalHeight, 2), 'm'],
                  ['Hauteur du sol arrière hr (depuis le dessus de la semelle ; hauteur de poussée Hp = hr + ts = ' + fu(result.soilHeight.Hp, 2, 'm') + ')', 'hr', fmt(result.soilHeight.hr, 2) + (soil.hr === undefined ? ' (défaut : hr = h)' : ''), 'm'],
                  ['Hauteur de sol à l\'avant', 'hs,av', fmt(soil.hSolAv, 2), 'm'],
                  ['Profondeur de butée (depuis la sous-face)', 'hp', soil.hSolAv > 0 ? fmt(result.earthPressures.h_pass, 2) : '0 (sans sol à l\'avant, butée nulle)', 'm'],
                  ['Pente du remblai', 'β', 'non disponible (remblai horizontal seulement)', '°'],
                  ['Clé de cisaillement', '—', 'non disponible (non modélisée)', '—'],
                ]}
              />
            </div>
            <Figure no={F.sketch} title="Coupe du mur avec cotes (m)">
              <WallSketch geo={geo} B={B} totalHeight={result.totalHeight} hSolAv={soil.hSolAv} hPass={result.earthPressures.h_pass} hr={result.soilHeight.hr} />
            </Figure>
          </div>
        </div>

        <div className="space-y-2">
          <SubTitle n="1.2" title="Matériaux et masses volumiques" />
          <DataTable
            caption={{ no: T.mat, title: 'Matériaux et masses volumiques' }}
            head={['Désignation', 'Symbole', 'Valeur', 'Unité']}
            rows={[
              ['Béton : poids volumique utilisé par le calcul', 'γc', fmt(conc.gamma_c, 1), 'kN/m³'],
              ['Béton du voile : résistance en compression', 'f′c_voile', fmt(conc.fc_mur, 0), 'MPa'],
              ['Béton de la semelle : résistance en compression', 'f′c_semelle', fmt(conc.fc_semelle, 0), 'MPa'],
              ['Acier d\'armature : limite élastique', 'fy', fmt(conc.fy, 0), 'MPa'],
              ['Enrobage du voile', 'c_voile', fmt(conc.cover_h, 0), 'mm'],
              ['Enrobage du talon (lit supérieur)', 'c_talon', fmt(conc.cover_v, 0), 'mm'],
              ['Enrobage de l\'orteil (lit inférieur)', 'c_orteil', fmt(conc.cover_base_bottom, 0), 'mm'],
              ['Eau : poids volumique', 'γw', fmt(result.hydro.gamma_w, 2), 'kN/m³'],
              ['Nappe : hauteur au-dessus de la sous-face de la semelle', 'hw', result.hydro.hasWater ? fmt(result.hydro.hw, 2) : 'nappe inactive', result.hydro.hasWater ? 'm' : '—'],
              ['Poids volumique déjaugé retenu (γ − γw, hypothèse : γ saisi = γ saturé)', 'γ′', result.hydro.hasWater ? fmt(result.hydro.gamma_prime, 2) : 'sans objet', result.hydro.hasWater ? 'kN/m³' : '—'],
            ]}
          />
        </div>

        <div className="space-y-2">
          <SubTitle n="1.3" title="Sol arrière (remblai) : poussée sur le voile, poids sur le talon" />
          <DataTable
            caption={{ no: T.soilBack, title: 'Sol arrière (remblai)' }}
            head={['Désignation', 'Symbole', 'Valeur', 'Unité']}
            rows={[
              ['Poids volumique', 'γ', fmt(soil.gamma, 1), 'kN/m³'],
              ['Angle de frottement interne', 'φ′', fmt(soil.phi, 1), '°'],
              ['Cohésion (négligée dans la poussée active ; plus utilisée comme adhérence de la base)', 'c′', fmt(soil.cohesion ?? 0, 1), 'kPa'],
              ['Hauteur du sol arrière (depuis le dessus de la semelle)', 'hr', fmt(result.soilHeight.hr, 2), 'm'],
              ['Frottement de Coulomb sur le plan fictif : δ = r·φ, sans plafond par la base (MUR-04, D10)', 'r', fmt(result.coulombRatio, 3), '—'],
            ]}
          />
        </div>

        <div className="space-y-2">
          <SubTitle n="1.4" title="Sol avant : butée, poids sur le patin" />
          <DataTable
            caption={{ no: T.soilFront, title: 'Sol avant' }}
            head={['Désignation', 'Symbole', 'Valeur', 'Unité']}
            rows={[
              ['Poids volumique (déjaugé sous la nappe)', 'γ', fmt(result.foundationSoil.gamma, 1), 'kN/m³'],
              ['Angle de frottement interne (coefficient de butée Kp)', 'φ′', fmt(result.foundationSoil.phi, 1), '°'],
              ['Hauteur du sol avant', 'hs,av', fmt(soil.hSolAv, 2), 'm'],
            ]}
          />
        </div>

        <div className="space-y-2">
          <SubTitle n="1.5" title="Sol d'assise de la fondation : glissement (c′a = 0 au long terme), portance" />
          <DataTable
            caption={{ no: T.soilBase, title: 'Sol d\'assise de la fondation' }}
            head={['Désignation', 'Symbole', 'Valeur', 'Unité']}
            rows={[
              ['Type de sol (USCS, CFEM 5e éd., tableau 20.4)', '—', result.bearingSoil.classLabel, '—'],
              ['Angle de frottement interne d’assise (borne de δb)', 'φ′', fmt(result.bearingSoil.phi, 1), '°'],
              ['Contact de la base', '—', result.bearingSoil.contactLabel, '—'],
              ['Angle de frottement de base, avec sa source : ' + result.bearingSoil.deltaBSource, 'δb', result.bearingSoil.deltaB !== undefined ? fmt(result.bearingSoil.deltaB, 2) : 'non défini', '°'],
              ['Coefficient de frottement de base', 'tan δb', result.bearingSoil.deltaB !== undefined ? fmt(result.bearingSoil.tanDeltaB, 4) : 'non défini', '—'],
              ['Adhérence à long terme (CFEM 5e éd., § 10.6, p. 351 : adhérence « s’il y en a »)', 'c′a', '0', 'kPa'],
              ...(result.bearingSoil.cohesive ? [
                ['Résistance au cisaillement non drainée (classe CL)', 'cu', fmt(result.bearingSoil.cu, 1), 'kPa'],
                ['Adhérence à court terme (tableau 20.4(b), interpolée : À CONFIRMER)', 'ca', fmt(result.bearingSoil.ca, 1) + (result.bearingSoil.cu > 0 ? ' (α = ca/cu = ' + fmt(result.bearingSoil.ca / result.bearingSoil.cu, 2) + ')' : ''), 'kPa'],
                ['Condition gouvernante du glissement (nombre de combinaisons ÉLU : court terme / long terme)', '—', result.combinations.filter(c => c.type === 'ULS' && c.sliding_condition === 'undrained').length + ' / ' + result.combinations.filter(c => c.type === 'ULS' && c.sliding_condition === 'drained').length, '—'],
              ] : [['Condition de glissement', '—', 'drainée seulement (sol non cohérent)', '—']]),
              ['Portance admissible saisie (ÉLS)', 'qadm', fmt(soil.qAllowable_SLS, 0), 'kPa'],
              [result.geotech.quFactored ? 'Portance ultime saisie (ÉLU, déclarée déjà pondérée : φgu = 1)' : 'Portance ultime saisie (ÉLU, non pondérée : le programme applique Ψ·φgu)', 'qu', fmt(soil.qUltimate_ULS, 0), 'kPa'],
            ]}
          />
          <NoteTable
            caption={{ no: T.soilBaseFS, title: 'Facteurs de sécurité au glissement par combinaison ÉLU' }}
            cols={result.bearingSoil.cohesive
              ? [{ name: 'Combinaison ÉLU' }, { name: 'FS long terme', unit: '(drainé)', align: 'right' }, { name: 'FS court terme', unit: '(non drainé)', align: 'right' }, { name: 'Condition', align: 'center' }]
              : [{ name: 'Combinaison ÉLU' }, { name: 'FS long terme', unit: '(drainé)', align: 'right' }, { name: 'Condition', align: 'center' }]}
            rows={result.combinations.filter(c => c.type === 'ULS' && c.stabApplicable).map(c => result.bearingSoil.cohesive
              ? [shortComb(c.combName), fmt(c.FOS_drained, 2), c.FOS_undrained !== undefined ? fmt(c.FOS_undrained, 2) : '—', c.sliding_condition === 'undrained' ? 'CT gouverne' : 'LT gouverne']
              : [shortComb(c.combName), fmt(c.FOS_drained, 2), 'LT'])}
          />
          <p className="note-s text-slate-600"><Fm>Sources : CFEM 5e éd., tableau 20.4, p. 691 (PDF 723) ; § 10.6, p. 351. δb proposé = borne inférieure du tableau, plafonnée à φ′. Butée nulle à court terme (MUR-04, R3, À CONFIRMER). qu saisi : il doit correspondre à la condition la plus défavorable (p. 344). CT : court terme ; LT : long terme.</Fm></p>
        </div>

        <div className="space-y-2">
          <SubTitle n="1.6" title="Coefficients de poussée" />
          <DataTable
            caption={{ no: T.thrust, title: 'Coefficients de poussée et paramètres sismiques' }}
            head={['Désignation', 'Symbole', 'Valeur', 'Unité']}
            rows={[
              ['Méthode de poussée active retenue', '—', geo.wallType === 'basement' ? 'K0 (mur de sous-sol, tête non déplaçable)' : ({ rankine: 'Rankine', coulomb: 'Coulomb', at_rest: 'Repos (K0)' } as Record<string, string>)[result.soilMethodConfig.activeMethod], '—'],
              ['Coefficient de poussée actif utilisé', 'Ka', fmt(result.K_active, 4), '—'],
              ['Coefficient de poussée au repos', 'K0', fmt(result.K_0, 4), '—'],
              ['Méthode de butée', '—', ({ rankine: 'Rankine', coulomb: 'Coulomb', neglected: 'Butée négligée' } as Record<string, string>)[result.soilMethodConfig.passiveMethod], '—'],
              ['Coefficient de butée utilisé (sol de fondation)', 'Kp', fmt(result.K_passive, 4), '—'],
              ['Séisme : méthode', '—', result.seismic.method === 'wood' ? 'Wood (mur retenu, ΔP0E = kh·γ·H² à 0,58H)' : result.seismic.method === 'seed_whitman' ? 'Seed & Whitman (1970) — hors fiche MUR-02 (méthode simplifiée, sans (1 − kv) ni contrôle d\'indétermination)' : result.seismic.method === 'mononobe_okabe' ? 'Mononobe-Okabe' : 'Statique (séisme non pris en compte)', '—'],
              ['Séisme : accélération du site (valeur du moteur)', 'ah', seismicOn ? fmt(result.seismic.ah, 3) : 'sans objet', 'g'],
              ['Séisme : coefficient horizontal (valeur du moteur)', 'kh', seismicOn ? fmt(result.seismic.kh, 3) : 'sans objet', '—'],
              ['Séisme : coefficient vertical saisi (les deux signes sont étudiés)', 'kv', seismicOn ? (result.seismic.scenarios.length > 1 ? `±${fmt(result.seismic.kvInput, 3)}` : fmt(result.seismic.kvInput, 3)) : 'sans objet', '—'],
              ['Séisme : coefficient de poussée dynamique (Mononobe-Okabe)', 'KAE', result.seismic.method === 'mononobe_okabe' && result.seismic.scenarios[0] ? (result.seismic.scenarios[0].indeterminate ? 'indéterminé (NON VÉRIFIABLE)' : fmt(result.seismic.scenarios[0].Kae, 4)) : 'sans objet', '—'],
            ]}
          />
        </div>

        {/* 2. CHARGES APPLIQUÉES */}
        <SectionTitle n="2" title="Charges appliquées" />
        <div className="space-y-2">
          <p className="text-slate-700">
            Valeurs caractéristiques, non pondérées. Les facteurs de la section 3 s'appliquent ensuite. Positions mesurées depuis l'orteil (<V n="x" />) et la sous-face de la semelle (<V n="y" />).
          </p>
          {([['2.1', 'stab', 'Charges stabilisantes', loadTables.stabilizing], ['2.2', 'destab', 'Charges déstabilisantes', loadTables.destabilizing]] as const).map(([n, key, title, rowsR]) => {
            const sums = sumsByType(rowsR);
            const num = (v: number | null) => (v === null ? '—' : fmt(v, 2));
            return (
              <div key={n} className="space-y-1">
                <SubTitle n={n} title={title} />
                <NoteTable
                  caption={{ no: T[key], title }}
                  cols={[
                    { name: 'Charges' },
                    { name: 'Type CNB', align: 'center' },
                    { name: 'Fh', unit: '(kN/m)', align: 'center' },
                    { name: 'Fv', unit: '(kN/m)', align: 'center' },
                    { name: 'Bras de levier', unit: '(m)', align: 'center' },
                    { name: 'Moment / orteil', unit: '(kN·m/m)', align: 'center' },
                  ]}
                  rows={rowsR.map(r => [r.desc, r.type + (key === 'stab' && (r.type === 'L' || r.type === 'S' || r.type === 'W') && (!countVar || (!countHM && (r.kind === 'moment' || (r.kind === 'force' && r.fh !== null)))) ? ' *' : ''), num(r.fh), r.kind === 'data' ? 'non comptée' : num(r.fv), num(r.arm), r.moment === null ? '—' : fmt(r.moment, 2)])}
                  footer={sums.map(t => ({ shaded: t.shaded, cells: [t.label, '', fmt(t.fh, 2), fmt(t.fv, 2), '', fmt(t.moment, 2)] }))}
                />
              </div>
            );
          })}
          {loadTables.dataNotes.length > 0 && (
            <p className="note-s text-slate-600">Données hors force : {loadTables.dataNotes.join(' ; ')}.</p>
          )}
          <p className="note-s text-slate-600"><Fm>{`Classement par rapport au glissement et au renversement autour de l’orteil. ${countVar
            ? `Les charges variables verticales stabilisantes (L, S, W) sont comptées avec le facteur de la combinaison (MUR-06). ${countHM ? 'Les forces horizontales et les moments variables stabilisants (L, S, W) le sont aussi (MUR-06, amendement A1).' : '* Les forces horizontales et les moments variables stabilisants (L, S, W) sont pris à 0 : case « Compter aussi les forces horizontales et les moments » décochée (amendement A1).'} ${MUR06_MENTION}`
            : '* Une charge variable stabilisante (L, S) est prise à 0 dans les vérifications de stabilité (CNB 4.1.3.2.(3)) : option « Compter les charges variables stabilisantes » décochée.'}`}</Fm></p>
          <p className="note-s text-slate-600"><Fm>{`Fh : force horizontale, Fv : force verticale (valeurs absolues). Bras de levier : x depuis l’orteil pour Fv, y depuis la sous-face de la semelle pour Fh ; « — » pour un moment saisi (moment direct). Moment = force × bras, positif dans son tableau. Les moments saisis, la butée et l’eau à l’avant sont inclus ; le type CNB H désigne ici les terres et l’eau. ${countVar
            ? `Surcharges uniformes (kPa) : leur poids vertical Fv = q × longueur (talon ou patin) est compté dans Σ L, avec son bras et son moment ; leur poussée horizontale figure au tableau ${T.destab}.`
            : `Surcharges uniformes (kPa) : leur poids vertical n’est pas compté dans ΣV par le moteur (charge variable stabilisante prise à 0, CNB 4.1.3.2.(3)) ; il n’entre donc pas dans les sommes, et leur poussée horizontale figure au tableau ${T.destab}.`}`}</Fm></p>
        </div>

        {/* 3. COMBINAISONS DE CHARGES */}
        <SectionTitle n="3" title="Combinaisons de charges" />
        <div className="space-y-3 text-slate-800">
          <SubTitle n="3.1" title="Règles de combinaison retenues" />
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Édition retenue :</strong> CNB {result.cnbEdition}, 4.1.3.2 et tableau 4.1.3.2.-A (défaut : 2020 ; option : 2025).</li>
            <li><strong>Cas 5 :</strong> {result.cnbEdition === '2020' ? '1,0D + 1,0E + 1,0H + 0,5L + 0,25S' : '1,0D + 1,0E + 1,0H + 0,5L + 0,15S'}.</li>
            <li><strong>Facteur 1,0H au cas 5 :</strong> note A-4.1.3.2.(4) (1,5H pour les cas 2, 3 et 4) et tableau A-3 du Commentaire A du CNB 2020 (1,0 pour D, H, T et P avec E). Commentaire 2025 : À CONFIRMER.</li>
            <li>{countVar
              ? <>Charges variables verticales (L, S, W) stabilisantes comptées avec le facteur de la combinaison (poids de la surcharge, charge de tête, charges verticales saisies) ; le séisme E garde son traitement. <Fm>{MUR06_MENTION}</Fm> </>
              : <>Charges variables favorables prises à zéro (option « Compter les charges variables stabilisantes » décochée) ; </>}0,9D ou 1,0D (cas 5) pour la charge permanente qui s'oppose ; poids du sol porté selon 4.1.3.2.(8) et (9).</li>
            <li><strong>ÉLS (portance, <V n="e" /> ≤ <V n="B" />/6, flèche) :</strong> tableau 4.1.3.4 du CNB (identique en 2020 et 2025), H = 1,0 (4.1.3.4. 4)) : S0 = 1,0D + 1,0H ; charges principales seules S1, S2, S3 ; accompagnements 0,35L, 0,35S, 0,3W (MUR-05 D6). Le séisme n'en fait pas partie. 0,5L (stockage, équipement, locaux techniques) : usage non connu du moteur, 0,35L retenu, À CONFIRMER.</li>
          </ul>
          <SubTitle n="3.2" title="Combinaisons de calcul à l'état limite ultime" />
          <DataTable
            caption={{ no: T.combos, title: `Combinaisons de charges du CNB ${result.cnbEdition}` }}
            head={['Cas', 'Charges principales', 'Charges d\'accompagnement']}
            rows={
              result.cnbEdition === '2020'
                ? [
                    ['1', '1,4D', '—'],
                    ['2', '(1,25D ou 0,9D) + 1,5L', '1,0S ou 0,4W'],
                    ['3', '(1,25D ou 0,9D) + 1,5S', '1,0L ou 0,4W'],
                    ['4', '(1,25D ou 0,9D) + 1,4W', '0,5L ou 0,5S'],
                    ['5', '1,0D + 1,0E', '0,5L + 0,25S'],
                  ]
                : [
                    ['1', '1,4D', '—'],
                    ['2', '(1,25D ou 0,9D) + 1,5L', '0,7S ou 0,3W'],
                    ['3', '(1,25D ou 0,9D) + 1,0S', '1,0L ou 0,3W'],
                    ['4', '(1,25D ou 0,9D) + 1,0W', '0,5L ou 0,35S'],
                    ['5', '1,0D + 1,0E', '0,5L + 0,15S'],
                  ]
            }
            after={<p className="note-s text-slate-600 mt-1">La poussée des terres H est affectée du facteur 1,5 aux cas 1 à 4 et 1,0 au cas 5 (voir 3.1). Chaque cas est aussi évalué avec les charges d'accompagnement prises égales à zéro (4.1.3.2.(3)).</p>}
          />
        </div>

        {/* 4. VÉRIFICATIONS */}
        <SectionTitle n="4" title="Vérifications" />

        {/* 4.1 Choix de calcul (texte seulement : aucune valeur n'est recalculée ici) */}
        {(() => {
          const fr_ = result.frost;
          const hPass = result.earthPressures.h_pass;
          const gb = result.governingBearing;
          const moments = result.stabilityCriterion === 'moments';
          const dfApplies = fr_.df_missing;
          const treat = (k: typeof fr_.no_df_treatment) => (!dfApplies ? 'sans objet' : fr_.no_df_treatment === k ? 'APPLIQUÉ ACTUELLEMENT' : 'non');
          let example: string;
          if (hPass <= 0) example = "Aucun sol à l'avant : la butée est nulle.";
          else if (!fr_.deduct) example = `La butée agit sur hp = ${fu(hPass, 2, 'm')}. Case « profondeur de gel » décochée : butée comptée sur toute la hauteur (sol avant déclaré permanent et non gélif).`;
          else if (fr_.df_entered) example = `La butée agit sur hp = ${fu(hPass, 2, 'm')}. Avec df = ${fu(fr_.df, 2, 'm')}, il reste hp − df = ${fu(Math.max(hPass - fr_.df, 0), 2, 'm')} de butée.`;
          else example = `La butée agit sur hp = ${fu(hPass, 2, 'm')}. Sans df, la butée est comptée sur toute la hauteur.`;
          const seisPassive = result.soilMethodConfig.seismicPassive === 'kpe' ? 'butée réduite KPE (CFEM 5e éd., éq. 18.27 à 18.31)' : 'butée nulle (aucune butée sismique)';
          return (
            <div className="space-y-3">
              <SubTitle n={S4('choix')} title="Choix de calcul" />
              <div className="space-y-2">
                <SubSubTitle n={`${S4('choix')}.1`} title="Butée et profondeur de gel" />
                <p className="text-slate-800">
                  <Fm>Le sol avant qui gèle ou qui peut être excavé ne retient pas le mur. Le CFEM 5e éd. (fig. 20.10) ne compte la butée que sous la profondeur de gel df.</Fm>{' '}
                  Au Québec, <V n="d" s="f" /> vaut souvent environ 1,2 à 1,8 m selon la région ; c'est une valeur indicative, à prendre dans le rapport géotechnique.
                </p>
                <p className="text-slate-900 font-semibold"><Fm>{example}</Fm></p>
                <p className="text-slate-800">Traitement possible lorsque la case gel est cochée et que <V n="d" s="f" /> n'est pas saisie :</p>
                <DataTable
                  caption={{ no: T.gel, title: 'Traitements de la butée sans profondeur de gel saisie' }}
                  head={['Traitement', 'Effet', 'Appliqué']}
                  rows={[
                    ['Butée nulle', 'Prudent ; le résultat reste vérifiable', treat('zero')],
                    ['Non vérifiable', "Bloque le résultat tant que df n'est pas saisie", treat('not_verifiable')],
                    ['Butée pleine avec avis', 'Pas prudent ; un avis est affiché', treat('full_with_notice')]
                  ]}
                />
                <p className="text-slate-800"><Fm>Choix courant lorsque df n'est pas saisie :</Fm> <strong>{fr_.no_df_treatment === 'zero' ? 'butée nulle (défaut)' : fr_.no_df_treatment === 'not_verifiable' ? 'non vérifiable' : 'butée pleine avec avis'}</strong> (MUR-02 §11){dfApplies ? '' : " ; sans effet ici : df saisie, case décochée ou aucune butée"}.</p>
                <p className="text-slate-800">Butée au séisme : choix courant = <strong><Fm>{seisPassive}</Fm></strong> (choix possibles : butée nulle ou réduite KPE).</p>
              </div>
              <div className="space-y-2">
                <SubSubTitle n={`${S4('choix')}.2`} title="Critère de portance et de renversement" />
                <DataTable
                  caption={{ no: T.crit, title: 'Options du critère de portance et de renversement' }}
                  head={['Option', 'Pression', 'Cohérente avec', 'Vérifications', 'Retenu']}
                  rows={[
                    ['Largeur réduite B′', 'B′ = B − 2e, pression uniforme V/B′ (CFEM 5e éd., éq. 10.12, Meyerhof)', 'qu du rapport géotechnique calculée pour une charge excentrée', 'Renversement et e ≤ B/6 vérifiés aussi', moments ? 'non' : 'OUI'],
                    ['Moments, pression linéaire', 'q = V/B·(1 ± 6e/B), ou triangulaire si e > B/6 (Paultre ch. 17)', 'Pression admissible au bord', `Ms/Mr avec φov = ${fmt(result.geotech.phi_ov, 2)}`, moments ? 'OUI' : 'non']
                  ]}
                />
                <p className="text-slate-900 font-semibold">
                  <Fm>{gb.outside_base
                    ? `Combinaison de portance gouvernante (${dec(gb.combName)}) : résultante hors de la base, les deux pressions sont sans objet.`
                    : `Exemple, combinaison de portance gouvernante (${dec(gb.combName)}) : q selon B′ = V/B′ = ${fu(gb.q_Beff, 1, 'kPa')} (B′ = ${fu(gb.B_eff, 2, 'm')}) ; q max selon la pression linéaire = ${fu(gb.q_linear_max, 1, 'kPa')}.`}</Fm>
                </p>
                <p className="text-slate-800">Les efforts du talon et du patin (armature) utilisent toujours la pression linéaire, quel que soit le critère.</p>
                <p className="text-slate-800">Critère retenu pour ce projet (choix de l'utilisateur, onglet Critères) : <strong>{moments ? 'moments, pression linéaire' : <>largeur réduite <V n="B" prime /></>}</strong>.</p>
              </div>
            </div>
          );
        })()}

        {/* 4.2 Synthèse des vérifications */}
        <div className="space-y-2">
          <SubTitle n={S4('synthese')} title="Synthèse des vérifications" />
          <p className="text-slate-800">
            <strong>Critère de renversement et de portance :</strong>{' '}
            {result.stabilityCriterion === 'moments'
              ? <>moments (FS = <V n="M" s="s" />/<V n="M" s="r" />) et pression linéaire <V n="q" /> = <V n="V" />/<V n="B" />·(1 ± 6<V n="e" />/<V n="B" />)</>
              : <>excentricité, largeur réduite <V n="B" prime /> = <V n="B" /> − 2<V n="e" />, pression uniforme <V n="V" />/<V n="B" prime /> (CFEM 5e éd., éq. 10.12, p. 348 ; valable si <V n="e" /> &lt; <V n="B" />/6)</>}
            {' '}— combinaison de portance gouvernante : <V n="e" /> = {fu(result.governingBearing.ecc, 3, 'm')}, <V n="B" prime /> = <V n="B" /> − 2<V n="e" /> = {fu(result.governingBearing.B_eff, 3, 'm')}.
          </p>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-rose-700 font-bold">{w}</p>
          ))}
          {result.combinations.filter(c => c.stability_message).map(c => (
            <p key={c.combName} className="text-rose-700 font-bold">{dec(c.combName)} : {c.stability_message}</p>
          ))}
          {(() => {
            const items: [string, boolean | 'nv', string][] = [
              ['Glissement', result.governingSliding.status_sliding === 'NON VÉRIFIABLE' ? 'nv' : result.governingSliding.status_sliding === 'OK', `FS = ${fmt(result.governingSliding.FOS_sliding, 2)}`],
              ['Renversement', result.governingOverturning.status_overturning === 'NON VÉRIFIABLE' ? 'nv' : result.governingOverturning.status_overturning === 'OK', result.governingOverturning.outside_base ? 'hors base' : `FS = ${fmt(result.governingOverturning.FOS_overturning, 2)}`],
              ['Excentricité e ≤ B/6 (ÉLU et ÉLS)', result.eccentricity_ok_ULS && result.eccentricity_ok_SLS, `ÉLU : ${result.eccentricity_ok_ULS ? 'respectée' : 'non respectée'} ; ÉLS : ${result.eccentricity_ok_SLS ? 'respectée' : 'non respectée'}`],
              ['Portance ÉLU', result.governingBearing.status_bearing === 'OK', result.governingBearing.outside_base ? 'non vérifiable (résultante hors base)' : `q = ${fmt(result.governingBearing.q_design, 1)} / ${fmt(result.governingBearing.q_capacity, 1)}${NB}kPa`],
              ['Béton du mur et de la semelle', Object.values(result.concreteDesign).every((d: any) => (d.checks_ok ?? d.status_ok) === true), 'flexion, cisaillement, As,min, ductilité, fissuration, ancrage, frottement'],
            ];
            return (
              <div className="break-inside-avoid print:break-inside-avoid">
                <Caption no={T.synth} title="Synthèse des vérifications (combinaisons gouvernantes)" />
                <table className="note-table text-left">
                  <thead><tr><th>Vérification</th><th className="text-center">Résultat</th><th>Détail</th></tr></thead>
                  <tbody>
                    {items.map(([label, ok, detail]) => {
                      const nv = !result.verifiable || ok === 'nv';
                      return (
                        <tr key={label}>
                          <td className="font-bold text-slate-900"><Fm>{label}</Fm></td>
                          <td className="text-center">
                            <span className={`px-1.5 py-0.5 rounded-sm font-bold ${nv ? 'bg-amber-100 text-amber-800' : ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {nv ? 'NON VÉRIFIABLE' : ok ? 'CONFORME' : 'NON CONFORME'}
                            </span>
                          </td>
                          <td><Fm>{detail}</Fm></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>

        {/* 4.3 FACTEURS GÉOTECHNIQUES, SÉISME ET BUTÉE : VALEURS, SOURCES, STATUTS (MUR-02 §9) */}
        <div className="space-y-2">
          <SubTitle n={S4('facteurs')} title="Facteurs géotechniques, séisme et butée : valeurs, sources et statut" />
          <DataTable
            caption={{ no: T.factors, title: 'Facteurs géotechniques, séisme et butée : valeurs, sources et statut' }}
            head={['Désignation', 'Symbole', 'Valeur', 'Source', 'Statut']}
            rows={[
              ['Degré de compréhension du site', '—', result.geotech.level === 'low' ? 'faible' : result.geotech.level === 'high' ? 'élevé' : 'typique', 'CFEM 5e éd., tableau 6.2, p. 199 (PDF 231)', 'Choix de l\'utilisateur'],
              ['Facteur de conséquence', 'Ψ', fmt(result.geotech.psi, 2), 'CFEM 5e éd., tableau 6.4, p. 200 (PDF 232) ; éq. 6.1, p. 191', 'Choix de l\'utilisateur ; lu'],
              ['Portance de la semelle du mur', 'φgu', fmt(result.geotech.phi_gu, 2), 'CFEM 5e éd., tableau 6.2 (systèmes de soutènement, portance)', result.geotech.quFactored ? 'Lu ; qu déclarée déjà pondérée (φgu = 1)' : 'Lu ; qu non pondérée'],
              ['Renversement', 'φov', fmt(result.geotech.phi_ov, 2), 'CFEM 5e éd., tableau 6.2 (systèmes de soutènement, renversement)', 'Lu ; application à ΣMstab : À CONFIRMER'],
              ['Glissement à la base (frottement)', 'φgs', fmt(result.geotech.phi_gs, 2), 'CFEM 5e éd., tableau 6.2 (systèmes de soutènement, glissement de la base)', 'Lu'],
              ['Glissement, sol cohésif (terme c′a·B′)', 'φcoh', fmt(result.geotech.phi_coh, 2), 'CFEM 5e éd., tableau 6.2 (fondations superficielles, glissement en sol cohésif)', 'Lu ; application sur B′ : À CONFIRMER (D13)'],
              ['Butée', 'φp', fmt(result.geotech.phi_p, 2), 'CFEM 5e éd., tableau 6.2 (fondations superficielles, résistance passive)', 'Lu ; aucune autre réduction de Kp'],
              ['Tassement, déplacement (ÉLS)', 'φ', fmt(result.geotech.phi_settle, 1), 'CFEM 5e éd., tableau 6.2 (systèmes de soutènement, tassement)', 'Non appliqué : q_adm,ÉLS vient du rapport géotechnique — À CONFIRMER'],
              ['Facteur de H au cas 5', 'αH', fmt(FACTEUR_H_SISMIQUE, 1), 'CNB, note A-4.1.3.2.(4) ; tableau A-3, Commentaire A du CNB 2020', 'Lu (2020) ; Commentaire 2025 : À CONFIRMER'],
              ['Accélération horizontale du site', 'ah', seismicOn ? fu(result.seismic.ah, 3, 'g') : 'sans objet', seismicOn ? (result.seismic.ahSource.trim() || 'source non renseignée') : '—', seismicOn ? (result.seismic.ahSource.trim() ? 'Saisi par l\'utilisateur' : 'À CONFIRMER : source de ah non renseignée') : '—'],
              ...(soil.siteSeismic?.source
                ? [[
                    'Site (données CNRC SHD-VAS 2020)', 'PGA(X)',
                    `${soil.siteSeismic.locality} ; ${soil.siteSeismic.province ?? 'province non renseignée'} ; classe ${soil.siteSeismic.siteClass || 'non renseignée'} ; PGA(${soil.siteSeismic.siteClass}) = ${fu(soil.siteSeismic.pga, 3, 'g')} ; ah = ${fu(result.seismic.ah, 3, 'g')} ; kh = ${fmt(result.seismic.kh, 3)} ; kv = ${result.seismic.csaS6 ? '0' : fmt(result.seismic.kvInput, 3)}`,
                    `${soil.siteSeismic.source} ; CNB 2020, 4.1.8.4 ; CFEM 5e éd., p. 629 (classe du sol sous la semelle, remblai exclu)`,
                    result.seismic.ahSource.startsWith('CNRC SHD-VAS') ? 'Lu dans les tables du CNRC ; aucun F(PGA)' : `ah modifié : source de ah « ${result.seismic.ahSource || 'non renseignée'} »`
                  ]]
                : []),
              ...(result.cnbEdition === '2025' ? [['Données sismiques, édition CNB 2025', '—', 'Données CNRC du CNB 2020 ; données CNB 2025 : À CONFIRMER', 'CNB 2025, annexe C, p. C-48', 'À CONFIRMER']] : []),
              ...(soil.siteSeismic && (soil.siteSeismic.locality.trim() || soil.siteSeismic.pga > 0 || soil.siteSeismic.sa02 > 0)
                ? [[
                    'Valeurs du site (calculateur d\'aléa de RNCan)', '—',
                    `${soil.siteSeismic.locality.trim() || 'localité non renseignée'} ; classe ${soil.siteSeismic.siteClass.trim() || 'non renseignée'} ; Sa(0,2) = ${soil.siteSeismic.sa02 > 0 ? fu(soil.siteSeismic.sa02, 3, 'g') : 'non saisi'} ; PGA = ${soil.siteSeismic.pga > 0 ? fu(soil.siteSeismic.pga, 3, 'g') : 'non saisi'} ; PGV = ${soil.siteSeismic.pgv > 0 ? fu(soil.siteSeismic.pgv, 3, 'm/s') : 'non saisi'}`,
                    'RNCan, calculateur d\'aléa sismique (CNB) ; CFEM 5e éd., p. 629 (PGA de la classe d\'emplacement sous la semelle)',
                    'Enregistrées seulement : le moteur utilise ah (kh = ah) ; conversion F(PGA) non programmée : À CONFIRMER'
                  ]]
                : []),
              ['Coefficient sismique horizontal', 'kh', seismicOn ? fmt(result.seismic.kh, 3) : 'sans objet', 'CFEM 5e éd., éq. 18.22, p. 629 (kh = ah/g)', result.seismic.csaS6 ? 'Option avancée active : kh = 0,5·ah (CSA S6 citée par le CFEM p. 631, non du CNB) ; déplacement admis de 25 à 50 mm non vérifié par le logiciel' : 'Lu ; kh = ah (défaut)'],
              ['Coefficient sismique vertical', 'kv', seismicOn ? (result.seismic.csaS6 ? '0 (option CSA S6)' : result.seismic.kvNeglected ? '0 (kv négligé)' : result.seismic.scenarios.length > 1 ? `±${fmt(result.seismic.kvInput, 3)} (deux signes étudiés)` : fmt(result.seismic.kvInput, 3)) : 'sans objet', 'CFEM 5e éd., p. 629 (kv = 2/3·kh à défaut d\'étude du site)', result.seismic.kvNeglected ? 'kv négligé (kv = 0) : choix de l’utilisateur ; le CFEM 5e éd. (p. 629) propose kv = ⅔·kh à défaut d’étude du site' : 'Valeur saisie par l\'utilisateur'],
              ['Butée statique : profondeur de gel', 'df', result.frost.deduct ? fu(result.frost.df, 2, 'm') + ' (déduite)' : 'non déduite', 'CFEM 5e éd., 20.7.3.3, p. 698 ; fig. 20.10', result.frost.deduct ? (result.frost.df_entered ? 'Choix de l\'utilisateur ; zone de butée de df à hp' : 'À CONFIRMER : df non saisie') : 'Sol avant déclaré permanent et non gélif par l\'utilisateur'],
              ['Butée au séisme', '—', result.seismic.passiveMode === 'kpe' ? 'réduite (KPE)' : 'nulle', 'CFEM 5e éd., éq. 18.27-18.31, p. 630-631', 'Choix de l\'utilisateur'],
              ['Frottement sur le plan fictif (séisme)', 'δ', result.soilMethodConfig.activeMethod === 'coulomb' ? 'δ de Coulomb (même valeur pour Ka et KAE)' : '0 (remblai horizontal)', 'MUR-02 D11', 'Approuvé'],
              ['Inertie du sol au-dessus du talon', '—', 'incluse', 'CFEM 5e éd., fig. 18.34 (kh·W du coin mobilisé)', 'À CONFIRMER : source de la règle pour un mur en porte-à-faux'],
              ['Westergaard (eau à l\'avant) / Matsuzawa (remblai saturé)', '—', result.seismic.westergaard ? 'Westergaard appliqué (réduit Pw,a)' : 'sans objet', 'CFEM 5e éd., éq. 18.33-18.35, p. 632-633', 'Matsuzawa NON APPLIQUÉ (Gs et e absents) — À CONFIRMER ; sens de Westergaard retenu : défavorable, À CONFIRMER'],
              ['Code de construction du Québec', '—', 'édition et modifications non vérifiées', 'Chapitre I – Bâtiment', 'À CONFIRMER (D17)'],
              ['Mur isolé hors bâtiment : application de la partie 4 du CNB', '—', 'partie 4 appliquée', 'MUR-02 D18', 'À CONFIRMER'],
            ]}
          />
        </div>

        {/* 4.4 SÉISME : résultats par signe de kv */}
        {seismTable && (
          <div className="space-y-2">
            <SubTitle n={S4('seisme')} title="Séisme : coefficients et incréments de poussée (valeurs du moteur)" />
            <DataTable
              caption={{ no: T.seism, title: 'Séisme : coefficients et incréments de poussée par signe de kv' }}
              head={['Signe de kv', 'kv', 'ψ (°)', 'KAE', 'ΔPAE ou ΔP0E (kN/m)', 'Hauteur (m)', 'Butée sismique PPE/PP', 'Statut']}
              rows={result.seismic.scenarios.map(sc => [
                sc.sign === 0 ? 'kv = 0' : sc.sign > 0 ? 'vers le haut (+)' : 'vers le bas (−)',
                fmt(sc.kv, 3), fmt(sc.psi_deg, 3),
                result.seismic.method === 'mononobe_okabe' ? (sc.indeterminate ? 'indéterminé' : fmt(sc.Kae, 4)) : 'sans objet',
                sc.indeterminate ? 'non calculé' : fmt(sc.dPae, 2),
                fmt(sc.y_dPae, 2),
                result.seismic.passiveMode === 'kpe' ? fmt(sc.Pp_factor, 3) : '0 (butée nulle)',
                sc.indeterminate ? 'NON VÉRIFIABLE (φ′ − β < ψ)' : 'calculé'
              ])}
              after={
                <p className="note-s text-slate-600 mt-1">
                  <Fm>{`Inertie (kN/m) : voile ${fmt(ep.E_stem_nominal, 2)}, semelle ${fmt(ep.E_base_nominal, 2)}, sol du talon ${fmt(ep.E_heelSoil_nominal, 2)} (poids ${fu(ep.W_heelSoil_inertia, 2, 'kN/m')} à y = ${fu(ep.y_heelSoil, 2, 'm')}).
              Matsuzawa (CFEM 5e éd., 18.7.2.2) : NON APPLIQUÉ, À CONFIRMER ; liquéfaction et déplacements permanents : NON VÉRIFIÉS. Westergaard : action E ajoutée à ΣHf. Hypothèse conservatrice : la force kv·W dirigée vers le bas est prise égale à zéro au glissement et au renversement (hypothèse conservatrice, À CONFIRMER) ; elle est comptée à la portance. ${result.seismic.method === 'seed_whitman' ? 'Seed & Whitman : hors fiche MUR-02 (méthode simplifiée, sans (1 − kv) ni contrôle d\'indétermination).' : ''}`}</Fm>
                </p>
              }
            />
          </div>
        )}

        {/* 4.5 GLISSEMENT ET RENVERSEMENT */}
        <div className="space-y-3">
          <SubTitle n={S4('stabilite')} title="Stabilité : glissement et renversement (ÉLU)" />
          <p className="note-s text-slate-600"><Fm>Glissement et renversement : combinaisons ÉLU avec la charge permanente stabilisante (0,9D aux cas 2 à 4, 1,0D au cas 5 ; CNB 4.1.3.2.(5)) ; ÉLS sans objet (MUR-02 §12). Équations ci-dessous : combinaison qui gouverne, valeurs lues du moteur ; le tableau donne toutes les combinaisons.</Fm></p>
          <p className="text-slate-800"><strong>Glissement</strong> — combinaison gouvernante : {dec(gSl.combName)}. Condition retenue : {slE.condition === 'undrained' ? 'court terme (non drainée)' : 'long terme (drainée)'}.</p>
          <Eq
            no={E.slide}
            lhs={<V n="F" s="s" />}
            general={<>
              <div>long terme (drainé), <V n="c" s="a" prime /> = 0 : <V n="Ψ" />·[ <V n="φ" s="gs" />·Σ<V n="V" prime />·tan <V n="δ" s="b" /> + <V n="φ" s="p" />·(<V n="P" s="p" prime /> + <V n="P" s="w,a" />) ]</div>
              <div>court terme (assise CL, butée nulle) : <V n="Ψ" />·<V n="φ" s="coh" />·<V n="c" s="a" />·<V n="B" prime /></div>
            </>}
            substituted={<>{slE.condition === 'undrained' ? 'court terme' : 'long terme'} : {slE.substituted}</>}
            result={<>{fu(gSl.Fs, 1, 'kN/m')}</>}
            note={<><Fm>Résistance pondérée au glissement ; le plus défavorable des deux cas gouverne. ΣV′ : force verticale effective (poids déjaugé, sous-pression déduite). Terme d’adhérence à court terme sur B′ = B − 2e (À CONFIRMER). Fiche MUR-02 §2.1 et MUR-04 (R2 à R4) ; facteurs φ : CFEM 5e éd., tableau 6.2.</Fm></>}
          />
          <Eq
            no={E.slideCheck}
            lines={[{ lhs: <><V n="F" s="s" /> / Σ<V n="H" s="f" /></>, op: '≥', general: <>1,00</>, substituted: <>{fmt(gSl.Fs, 1)} / {fmt(gSl.Fh_destab, 1)}</>, result: <>{fmt(gSl.FOS_sliding, 2)} {gSl.FOS_sliding >= 1 ? '≥' : '<'} 1,00 — {nvLabel(gSl.status_sliding)}</> }]}
            note={<Fm>ΣHf inclut l’inertie, la poussée dynamique et, au séisme, Westergaard. Valeurs en kN/m.</Fm>}
          />
          <p className="text-slate-800"><strong>Renversement</strong> — combinaison gouvernante : {dec(gOv.combName)}.</p>
          <Eq
            no={E.ovt}
            lhs={<V n="M" s="s" />}
            general={<><V n="Ψ" />·<V n="φ" s="ov" />·Σ<V n="M" s="stab" /> avec Σ<V n="M" s="stab" /> = Σ<V n="M" s="rés" /> + <V n="M" s="butée" /></>}
            substituted={gOv.outside_base ? <>non vérifiable : résultante hors base</> : <>{fmt(ovE.psi, 2)}·{fmt(ovE.phi_ov, 2)}·({fmt(ovE.Mres, 1)} + {fmt(ovE.Mpass, 1)})</>}
            result={gOv.outside_base ? <>non vérifiable</> : <>{fu(ovE.Ms, 1, 'kN·m/m')}</>}
            note={<><Fm>Facteurs de D : 0,9D aux cas 2 à 4 (stabilisant), 1,0D au cas 5, et Dunfav pour les actions D défavorables (CNB 4.1.3.2.(5)). La butée fait partie de ΣMstab (MUR-02 §2.3, E08 ; forme d’application À CONFIRMER).</Fm></>}
          />
          <Eq
            no={E.ovtCheck}
            lines={[{ lhs: <><V n="M" s="s" /> / Σ<V n="M" s="renv" /></>, op: '≥', general: <>1,00</>, substituted: gOv.outside_base ? undefined : <>{fmt(ovE.Ms, 1)} / {fmt(ovE.Mr, 1)}</>, result: gOv.outside_base ? <>non vérifiable : résultante hors base</> : <>{fmt(ovE.ratio, 2)} {ovE.ratio >= 1 ? '≥' : '<'} 1,00 — {nvLabel(gOv.status_overturning)}</> }]}
          />
          <NoteTable
            caption={{ no: T.stability, title: 'Glissement et renversement : toutes les combinaisons ÉLU' }}
            cols={[
              { name: 'Combinaison' },
              { name: 'ΣV′', unit: '(kN/m)', align: 'right' },
              { name: 'Frottement', unit: '(kN/m)', align: 'right' },
              { name: 'Cohésion', unit: '(kN/m)', align: 'right' },
              { name: 'Butée', unit: '(kN/m)', align: 'right' },
              { name: 'Fs', unit: '(kN/m)', align: 'right' },
              { name: 'ΣHf', unit: '(kN/m)', align: 'right' },
              { name: 'Fs/ΣHf', align: 'right' },
              { name: 'Gliss.', title: 'Glissement', align: 'center' },
              { name: 'Ψ·φov·ΣMstab', unit: '(kN·m/m)', align: 'right' },
              { name: 'ΣMrenv', unit: '(kN·m/m)', align: 'right' },
              { name: 'Ms/Mr', align: 'right' },
              { name: 'Renv.', title: 'Renversement', align: 'center' },
            ]}
            rows={result.combinations.filter(c => c.type === 'ULS' && c.stabApplicable).map(c => [
              shortComb(c.combName),
              fmt(c.sumV_min, 1), fmt(c.Rf_friction, 1), fmt(c.Rf_cohesion, 1), fmt(c.Rf_passive, 1), fmt(c.Fs, 1), fmt(c.Fh_destab, 1),
              <strong key="r1">{c.FOS_sliding === Infinity ? '∞' : fmt(c.FOS_sliding, 3)}</strong>,
              <React.Fragment key="s1"><StatusPill status={c.status_sliding} verifiable={result.verifiable} /></React.Fragment>,
              fmt(c.Ms, 1), fmt(c.Mr, 1),
              <strong key="r2">{c.FOS_overturning === Infinity ? '∞' : fmt(c.FOS_overturning, 3)}</strong>,
              <React.Fragment key="s2"><StatusPill status={c.status_overturning} verifiable={result.verifiable} /></React.Fragment>,
            ])}
            after={
              <p className="note-s text-slate-600 mt-1">
                Σ<V n="V" prime /> : force verticale effective (poids déjaugé, sous-pression déduite). Terme d’adhérence à court terme sur <V n="B" prime /> = <V n="B" /> − 2<V n="e" /> (À CONFIRMER). Facteurs : <V n="Ψ" /> = {fmt(result.geotech.psi, 2)}, <V n="φ" s="gs" /> = {fmt(result.geotech.phi_gs, 2)}, <V n="φ" s="coh" /> = {fmt(result.geotech.phi_coh, 2)}, <V n="φ" s="p" /> = {fmt(result.geotech.phi_p, 2)}, <V n="φ" s="ov" /> = {fmt(result.geotech.phi_ov, 2)}.
                {result.stabilityCriterion === 'eccentricity' && <> Critère <V n="B" prime /> = <V n="B" /> − 2<V n="e" /> : le renversement est en principe couvert par la portance et la limite de <V n="e" /> (CFEM 5e éd., 20.7.3.4) ; la vérification <V n="Ψ" />·<V n="φ" s="ov" />·Σ<V n="M" s="stab" /> est tout de même conservée et affichée.</>}
              </p>
            }
          />
        </div>

        {/* 4.6 PORTANCE : équations, tableaux ÉLU et ÉLS, diagramme */}
        <div className="space-y-3">
          <SubTitle n={S4('portance')} title="Portance et excentricité" />
          <p className="text-slate-800">Combinaison de portance gouvernante : {dec(gBr.combName)}. Critère retenu : <strong>{result.stabilityCriterion === 'eccentricity' ? <>largeur réduite <V n="B" prime /> (Meyerhof, CFEM 5e éd., éq. 10.12)</> : 'moments, pression linéaire (Paultre ch. 17)'}</strong>.</p>
          <Eq
            no={E.ecc}
            lhs={<V n="e" />}
            general={<>|<V n="B" />/2 − <V n="x" s="1" />|</>}
            substituted={<>|{fmt(B / 2, 3)} − {fmt(brE.x1, 3)}|</>}
            result={<>{fu(brE.e, 3, 'm')} ; <V n="B" />/6 = {fu(B / 6, 3, 'm')} ({brE.e <= B / 6 + 1e-9 ? <><V n="e" /> ≤ <V n="B" />/6</> : <><V n="e" /> &gt; <V n="B" />/6</>})</>}
            note={<><Fm>x1 = (ΣMstab − ΣMrenv)/Rv, butée exclue ; Rv = ΣV = </Fm>{fu(brE.Rv, 1, 'kN/m')}.</>}
          />
          {(() => {
            // segments « membre de gauche = valeur » des chaînes du moteur (valeurs substituées et résultats), alignés en lignes
            const sg = (s: string) => s.split(' ; ').map(x => { const i = x.indexOf(' = '); return i < 0 ? { l: '', r: x } : { l: x.slice(0, i), r: x.slice(i + 3) }; });
            const gens: Record<string, React.ReactNode[]> = {
              uniform_Beff: [<><V n="R" s="v" />/<V n="B" prime /></>],
              cas1: [<><V n="R" s="v" />/<V n="B" /></>],
              cas2: [<><V n="R" s="v" />/<V n="B" />·(1 + 6<V n="e" />/<V n="B" />)</>, <><V n="R" s="v" />/<V n="B" />·(1 − 6<V n="e" />/<V n="B" />)</>],
              cas3: [<>2<V n="R" s="v" />/<V n="B" /></>],
              cas4_toe: [<Frac n={<>2<V n="R" s="v" /></>} d={<>3<V n="x" s="1" /></>} />, <>0</>],
              cas4_heel: [<Frac n={<>2<V n="R" s="v" /></>} d={<>3<V n="x" s="1" /></>} />, <>0</>],
            };
            const subS = sg(brE.substituted);
            const resS = sg(brE.result);
            const lines = gBr.outside_base
              ? [{ lhs: <V n="q" />, general: <>—</>, result: <>non vérifiable : résultante hors base</> }]
              : resS.map((r, i) => ({ lhs: <Tx>{r.l}</Tx>, general: gens[brE.kind]?.[i] ?? <>—</>, substituted: subS[i] ? <Tx>{subS[i].r}</Tx> : undefined, result: <Tx>{r.r}</Tx> }));
            return (
              <Eq
                no={E.press}
                lines={lines}
                note={<>Les efforts du talon et du patin (armature) utilisent toujours la pression linéaire (MUR-02 §5), quel que soit le critère.{gBr.outside_base ? '' : <> Valeurs : {fu(gBr.q_linear_max, 1, 'kPa')} (pression linéaire, maximum) et {fu(gBr.q_Beff, 1, 'kPa')} (<V n="R" s="v" />/<V n="B" prime />).</>}</>}
              />
            );
          })()}
          <Eq
            no={E.limit}
            lines={[
              { lhs: <><V n="q" s="res" /> (ÉLU)</>, general: <><V n="Ψ" />·<V n="φ" s="gu" />·<V n="q" s="u" /></>, substituted: gBr.outside_base ? undefined : <>{fmt(result.geotech.psi, 2)}·{fmt(result.geotech.phi_gu, 2)}·{fmt(soil.qUltimate_ULS, 1)}</>, result: <>{fu(gBr.q_capacity, 1, 'kPa')}</> },
              { lhs: <V n="q" />, general: <>pression de contact (4.6)</>, result: gBr.outside_base ? <>non vérifiable : résultante hors base</> : <>{fu(gBr.q_design, 1, 'kPa')} {gBr.q_design <= gBr.q_capacity ? '≤' : '>'} {fu(gBr.q_capacity, 1, 'kPa')} (ÉLU)</> },
              { lhs: <V n="q" s="adm,ÉLS" />, general: <>valeur saisie (ÉLS : <V n="q" /> ≤ <V n="q" s="adm,ÉLS" />)</>, result: <>{fu(soil.qAllowable_SLS, 1, 'kPa')}</> },
            ]}
            note={result.geotech.quFactored ? <><V n="q" s="u" /> saisie déjà pondérée (<V n="φ" s="gu" /> = 1,0).</> : <><V n="q" s="u" /> non pondérée : <V n="φ" s="gu" /> du tableau 6.2 du CFEM 5e éd.</>}
          />

          {/* Tableaux 4.x ÉLU et ÉLS : pression de contact, excentricité et portance */}
          {([
            { key: 'ULS', tkey: 'bearULS', combs: ulsCombs, title: `Combinaisons ÉLU : portance pondérée (CNB ${result.cnbEdition}, ${ulsCombs.length} combinaisons)`, limit: <>Limite : <V n="q" s="res" /> (ÉLU) = <V n="Ψ" />·<V n="φ" s="gu" />·<V n="q" s="u" /> = {fu(result.geotech.psi * result.geotech.phi_gu * soil.qUltimate_ULS, 1, 'kPa')}</> },
            { key: 'SLS', tkey: 'bearSLS', combs: slsCombs, title: `Combinaisons ÉLS : pression de contact et tiers central (${slsCombs.length} combinaisons)`, limit: <>Limite : <V n="q" s="adm" /> (ÉLS) = {fu(soil.qAllowable_SLS, 1, 'kPa')}</> },
          ] as const).map(({ key, tkey, combs, title, limit }) => (
            <div key={key} className="space-y-1">
              <div className={combs.length <= 8 ? 'break-inside-avoid print:break-inside-avoid' : ''}>
                <Caption no={T[tkey]} title={title} />
                <div className="overflow-x-auto">
                  <table className="note-table text-left">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Combinaison</th>
                        {['D', 'L', 'S', 'W', 'E', 'H'].map(k => <th key={k} className="text-center">{k}</th>)}
                        <th className="text-right"><V n="R" s="v" /> (kN/m)</th>
                        <th className="text-right"><V n="e" /> (m)</th>
                        <th className="text-right"><V n="B" />/6 (m)</th>
                        <th className="text-center"><V n="e" /> ≤ <V n="B" />/6</th>
                        <th className="text-right"><V n="x" s="1" /> (m)</th>
                        <th className="text-right bg-blue-100"><V n="q" s="1" /> (kPa)</th>
                        <th className="text-right"><V n="q" s="2" /> (kPa)</th>
                        <th className="text-right">Limite (kPa)</th>
                        <th className="text-center">Taux</th>
                        <th className="text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combs.map((c, idx) => {
                        const qLimit = c.q_capacity; // Ψ·φgu·qu (ÉLU) ou qadm (ÉLS), calculé par le moteur
                        const isExceeded = c.status_bearing === 'NON';
                        const isGoverning = c.type === 'SLS'
                          ? (result.governingSLS && result.governingSLS.combName === c.combName)
                          : (result.governingBearing && result.governingBearing.combName === c.combName);
                        const ratio = qLimit > 0 ? (c.q_design / qLimit) : 0;

                        return (
                          <tr key={c.combName} className={`${isGoverning ? 'bg-amber-50 font-bold' : ''}`}>
                            <td className="text-slate-500">{idx + 1}</td>
                            <td className="text-slate-900 font-bold min-w-[5.5rem]">
                              {/* « Combinaison ELS 1 (1D + 1H + 1L) » → « 1D + 1H + 1L » : l'en-tête dit déjà « Combinaison » */}
                              {shortComb(c.combName)}
                              {isGoverning && (
                                <span className="ml-1.5 px-1 py-0.5 rounded-sm bg-amber-200 text-amber-900 font-bold">
                                  Gouvernant
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap text-center text-slate-600">{fac(c.factors.D)}</td>
                            <td className="whitespace-nowrap text-center text-slate-600">{fac(c.factors.L)}</td>
                            <td className="whitespace-nowrap text-center text-slate-600">{fac(c.factors.S)}</td>
                            <td className="whitespace-nowrap text-center text-slate-600">{fac(c.factors.W)}</td>
                            <td className="whitespace-nowrap text-center text-slate-600">{fac(c.factors.E || 0)}</td>
                            <td className="whitespace-nowrap text-center text-slate-600">{fac(c.factors.H)}</td>
                            <td className="whitespace-nowrap text-right">{fmt(c.sumV_max, 1)}</td>
                            <td className="whitespace-nowrap text-right">{fmt(Math.abs(c.ecc), 3)}</td>
                            <td className="whitespace-nowrap text-right text-slate-500">{fmt(B_over_6, 3)}</td>
                            <td className="whitespace-nowrap text-center font-bold">{!result.verifiable ? 'n. v.' : c.status_ecc === 'OK' ? 'OK' : 'NON'}</td>
                            <td className="whitespace-nowrap text-right">{fmt(c.x1, 3)}</td>
                            <td className="whitespace-nowrap text-right font-bold text-blue-900 bg-blue-50">{c.outside_base ? 'n. v.' : fmt(c.q_toe, 1)}</td>
                            <td className="whitespace-nowrap text-right">{c.outside_base ? 'n. v.' : fmt(c.q_heel, 1)}</td>
                            <td className="whitespace-nowrap text-right text-slate-600 font-semibold">{fmt(qLimit, 1)}</td>
                            <td className="whitespace-nowrap text-center">{c.outside_base ? '—' : `${fmt(ratio * 100, 0)}${NB}%`}</td>
                            <td className="whitespace-nowrap text-center">
                              <span className={`px-1 py-0.5 rounded-sm font-bold ${
                                !isExceeded ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {!isExceeded ? 'OK' : (c.stability_message ? 'NON' : 'Surcharge')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="note-s text-slate-600 mt-1">{limit}{combs.some(c => c.outside_base) ? ' — n. v. : non vérifiable, la résultante sort de la base.' : ''}</p>
              </div>
            </div>
          ))}

          {/* Diagramme des pressions au sol et résultante */}
          <BearingPressureDiagram geo={geo} soil={soil} result={result} variant="note" tableNo={T.bearDiag}
            renderFigure={svg => <Figure no={F.pressure} title="Diagramme des pressions au sol et vecteur résultante Rv">{svg}</Figure>} />
        </div>

        {/* 4.7 BÉTON ARMÉ : CSA A23.3-19 (MUR-02 §6) — statuts calculés */}
        <div className="space-y-2">
          <SubTitle n={S4('beton')} title="Béton armé : vérifications CSA A23.3-19 (valeurs du moteur)" />
          <div className="break-inside-avoid print:break-inside-avoid">
            <Caption no={T.concrete} title="Vérifications du béton armé par élément (CSA A23.3-19)" />
            <div className="overflow-x-auto">
              <table className="note-table text-left">
                <thead>
                  <tr className="align-bottom">
                    <th>Élément</th>
                    <th>Armature</th>
                    <th><V n="A" s="s" /> / <V n="A" s="s,min" /><span className="block font-normal text-slate-600">(mm²/m) — article</span></th>
                    <th>Espacement / max<span className="block font-normal text-slate-600">(mm)</span></th>
                    <th><V n="M" s="r" /> / <V n="M" s="f" /><span className="block font-normal text-slate-600">(kN·m/m)</span></th>
                    <th><V n="c" />/<V n="d" /> ≤ limite<span className="block font-normal text-slate-600">(10.5.2)</span></th>
                    <th><V n="V" s="f" /> / min(<V n="V" s="c" /> ; <V n="V" s="r,max" />)<span className="block font-normal text-slate-600">(kN/m)</span></th>
                    <th><V n="z" /> / limite<span className="block font-normal text-slate-600">(N/mm) — 10.6.1</span></th>
                    <th><V n="l" s="d" /> / <V n="l" s="dh" /><span className="block font-normal text-slate-600">(mm)</span></th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    result.concreteDesign.mur_interieur,
                    result.concreteDesign.mur_exterieur,
                    { ...result.concreteDesign.mur_horizontal_ext, elementName: 'Voile - horizontales ext. (A3)' },
                    { ...result.concreteDesign.mur_horizontal_int, elementName: 'Voile - horizontales int. (A4)' },
                    { ...result.concreteDesign.mur_horizontal, elementName: 'Voile - total horizontal (A3 + A4) / 0,002Ag' },
                    result.concreteDesign.semelle_talon,
                    result.concreteDesign.semelle_orteil,
                    result.concreteDesign.semelle_retrait
                  ]).map((d) => (
                    <tr key={d.elementName}>
                      <td className="font-bold min-w-[6rem]"><Fm>{phrase(d.elementName)}</Fm></td>
                      <td>{d.bar_designation}</td>
                      <td className="max-w-[11rem] whitespace-normal">{/horizontales (ext|int)\./.test(d.elementName)
                        ? <>{fmt(d.As_provided, 0)} (face) ; Σ A3 + A4 = {fmt(result.concreteDesign.mur_horizontal.As_provided, 0)} {d.As_ok ? '≥' : '<'} {fmt(d.As_min, 0)} <span className="block text-slate-600">(14.1.8.6)</span></>
                        : <>{fmt(d.As_provided, 0)} {d.As_ok ? '≥' : '<'} {fmt(d.As_min, 0)} <span className="block leading-tight text-slate-600"><Fm>{`(${d.As_min_basis})`}</Fm></span></>}</td>
                      <td className="whitespace-normal">{fmt(d.spacing, 0)} / {fmt(d.spacing_max, 0)} {d.spacing_ok ? '' : '(dépassé)'}{d.db_max !== undefined ? <Fm>{` ; db ${fmt(d.db, 1)} / ${fmt(d.db_max, 0)}`}</Fm> : ''}</td>
                      <td className="whitespace-nowrap">{d.Mr > 0 ? `${fmt(d.Mr, 1)} / ${fmt(d.Mf, 1)}` : '—'}</td>
                      <td className="whitespace-nowrap">{d.Mr > 0 ? `${fmt(d.ductility_c_over_d, 3)} ≤ ${fmt(d.ductility_limit, 3)}` : '—'}</td>
                      <td className="whitespace-nowrap">{d.Vf > 0 ? `${fmt(d.Vf, 1)} / ${fmt(Math.min(d.Vc, d.Vr_max), 1)}` : '—'}</td>
                      <td className="whitespace-nowrap">{d.Z_factor !== undefined && d.Z_limit !== undefined ? `${fmt(d.Z_factor, 0)} / ${fmt(d.Z_limit, 0)}` : '—'}</td>
                      <td className="whitespace-nowrap">{fmt(d.ld, 0)} / {d.ldh_required !== undefined ? fmt(d.ldh_required, 0) : '—'}</td>
                      <td className="max-w-[6rem] whitespace-normal leading-tight">
                        <span className={`px-1.5 py-0.5 rounded-sm font-bold ${!result.verifiable ? 'bg-amber-100 text-amber-800' : !d.checks_ok ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {!result.verifiable ? 'non vérifiable' : !d.checks_ok ? 'NON' : 'OK'}
                        </span>
                        {result.verifiable && d.checks_ok && d.ld_status === 'À CONFIRMER' && <span className="block text-amber-800 font-bold mt-0.5"><Fm>ld : À CONFIRMER</Fm></span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {(() => {
            const cdz = result.concreteDesign;
            const fr_ = cdz.cisaillement_friction;
            const eq121 = [cdz.mur_interieur, cdz.semelle_talon, cdz.semelle_orteil].some(d => d.ld_eq12_1_required);
            const rows: [string, React.ReactNode, React.ReactNode][] = [
              ['Voile (face intérieure)', <>Facteur <V n="β" /> (11.3.6) [<Fm>{cdz.mur_interieur.beta_rule}</Fm>]</>, <><V n="β" /> = {fmt(cdz.mur_interieur.beta, 4)}</>],
              ['Voile (face intérieure)', <><V n="V" s="r,max" /> = 0,25·<V n="φ" s="c" />·<V n="f" s="c" prime />·<V n="b" s="w" />·<V n="d" s="v" /> (11.3.3) ; <V n="V" s="f" /> à <V n="d" s="v" /> (information)</>, <><V n="V" s="f" /> = {fu(fr_.Vf_dv, 1, 'kN/m')}</>],
              ['Talon', <>Facteur <V n="β" /> [<Fm>{cdz.semelle_talon.beta_rule}</Fm>]</>, <><V n="β" /> = {fmt(cdz.semelle_talon.beta, 4)}</>],
              ['Patin', <>Facteur <V n="β" /> [<Fm>{cdz.semelle_orteil.beta_rule}</Fm>]</>, <><V n="β" /> = {fmt(cdz.semelle_orteil.beta, 4)}</>],
              ['Ductilité (10.5.2)', <><Fm>{cdz.mur_interieur.ductility_rule}</Fm> ; l’ancienne limite 700/(700 + <V n="f" s="y" />) non sécuritaire est retirée</>, <><V n="c" />/<V n="d" /> ≤ limite (colonne du tableau {T.concrete})</>],
              ['Longueur d’ancrage (12.2)', <><V n="l" s="d" /> = {cdz.mur_interieur.ld_coeff !== undefined ? fmt(cdz.mur_interieur.ld_coeff, 2) : ''}·<V n="k" s="1" />·<V n="k" s="4" />·<V n="f" s="y" />/√<V n="f" s="c" prime />·<V n="d" s="b" /> ≥ 300{NB}mm</>, <>talon : <V n="k" s="1" /> = {cdz.semelle_talon.ld_k1 !== undefined ? fmt(cdz.semelle_talon.ld_k1, 1) : ''}</>],
              ['Tableau 12.1 (CSA A23.3)', eq121 ? <>Enrobage ≥ <V n="d" s="b" /> et espacement ≥ 1,4<V n="d" s="b" /> non remplis pour au moins un élément : éq. 12.1 requise. Statut de <V n="l" s="d" /> À CONFIRMER (non vérifié ; valeur à 0,6 indicative). Espacement comparé d’axe en axe ; axe en axe ou libre : À CONFIRMER (A23.3 12.2.3).</> : <>Conditions remplies (enrobage ≥ <V n="d" s="b" />, espacement ≥ 1,4<V n="d" s="b" />).</>, eq121 ? 'À CONFIRMER' : 'remplies'],
              ['Crochet (12.5)', <><V n="l" s="dh" /> : <Fm>{cdz.mur_interieur.ldh_factors}</Fm></>, '—'],
              ['Joint voile-semelle (11.5)', <><V n="V" s="r" /> {fr_.status_ok ? '≥' : '<'} <V n="V" s="f" /> ; <V n="N" /> non pondéré ; <V n="σ" /> ; <V n="c" /> et <V n="μ" /> : <Fm>{fr_.surface}</Fm>{fr_.capped ? <> ; limite 0,25·<V n="φ" s="c" />·<V n="f" s="c" prime /> atteinte</> : ''}</>, <><V n="V" s="r" /> = {fu(fr_.Vr, 1, 'kN/m')} ; <V n="V" s="f" /> = {fu(fr_.Vf, 1, 'kN/m')} ; <V n="N" /> = {fu(fr_.N, 1, 'kN/m')} ; <V n="σ" /> = {fu(fr_.sigma, 3, 'MPa')} — {!result.verifiable ? 'NON VÉRIFIABLE' : fr_.status_ok ? 'OK' : 'NON'}</>],
            ];
            return (
              <NoteTable
                caption={{ no: T.concreteParams, title: 'Paramètres complémentaires de calcul du béton' }}
                cols={[{ name: 'Élément' }, { name: 'Vérification' }, { name: 'Valeur' }]}
                rows={rows.map(([e, v, val]) => [e, <span key="v" className="whitespace-normal">{v}</span>, <span key="x" className="whitespace-normal">{val}</span>])}
              />
            );
          })()}
        </div>

        {/* 4.8 SOLLICITATIONS DU VOILE (ÉLU) */}
        <div className="space-y-2">
          <SubTitle n={S4('voile')} title="Sollicitations du voile à l'ÉLU" />
          <div className={ulsCombs.length <= 8 ? 'break-inside-avoid print:break-inside-avoid' : ''}>
            <Caption no={T.stem} title={`Sollicitations du voile à l'ÉLU : flexion Mf et cisaillement Vf (${ulsCombs.length} combinaisons)`} />
            <div className="overflow-x-auto">
              <table className="note-table text-left">
                <thead>
                  <tr className="align-bottom">
                    <th>No</th>
                    <th>Combinaison</th>
                    <th className="text-right">Terres<span className="block font-normal text-slate-600">(kN/m)</span></th>
                    <th className="text-right">Eau<span className="block font-normal text-slate-600">(kN/m)</span></th>
                    <th className="text-right">Surcharge<span className="block font-normal text-slate-600">(kN/m)</span></th>
                    <th className="text-right">Séisme<span className="block font-normal text-slate-600">(kN/m)</span></th>
                    {showOtherStem && <th className="text-right">Autres<span className="block font-normal text-slate-600">(kN/m)</span></th>}
                    {showStemPassiveCol && <th className="text-right">Butée voile<span className="block font-normal text-slate-600">(kN/m)</span></th>}
                    <th className="text-right bg-indigo-100"><V n="M" s="f" /><span className="block font-normal text-slate-600">(kN·m/m)</span></th>
                    <th className="text-right"><V n="V" s="f" /><span className="block font-normal text-slate-600">(kN/m)</span></th>
                    <th className="text-right"><V n="A" s="s" /> fournie<span className="block font-normal text-slate-600">(mm²/m)</span></th>
                    <th className="text-center">Taux<span className="block font-normal text-slate-600"><V n="M" s="f" />/<V n="M" s="r" /></span></th>
                    <th className="text-center">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {ulsCombs.map((c, idx) => {
                    const mr = result.concreteDesign.mur_interieur.Mr;
                    const ratio = mr > 0 ? (c.mur_Mf / mr) : 0;
                    const isOk = c.mur_Mf <= mr;
                    const isGovStem = result.governingStem && result.governingStem.combName === c.combName;

                    return (
                      <tr key={c.combName} className={`${isGovStem ? 'bg-amber-50 font-bold' : ''}`}>
                        <td className="text-slate-500">{idx + 1}</td>
                        <td className="text-slate-900 font-bold min-w-[5.5rem]">
                          {shortComb(c.combName)}
                          {isGovStem && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-sm bg-amber-200 text-amber-900 font-bold">
                              Gouvernant <V n="M" s="f" />
                            </span>
                          )}
                        </td>
                        <td className="text-right">{fmt(c.stem_lateral.terre, 1)}</td>
                        <td className="text-right">{fmt(c.stem_lateral.eau, 1)}</td>
                        <td className="text-right">{fmt(c.stem_lateral.surcharge, 1)}</td>
                        <td className="text-right">{fmt(c.stem_lateral.seisme, 1)}</td>
                        {showOtherStem && <td className="text-right">{fmt(c.stem_lateral.autres, 1)}</td>}
                        {showStemPassiveCol && <td className="text-right">{fmt(c.stem_lateral.butee_voile, 1)}</td>}
                        <td className="text-right font-bold text-indigo-900 bg-indigo-50">{fmt(c.mur_Mf, 1)}</td>
                        <td className="text-right">{fmt(c.mur_Vf, 1)}</td>
                        <td className="text-right">{fmt(result.concreteDesign.mur_interieur.As_provided, 0)}</td>
                        <td className="text-center">{fmt(ratio * 100, 0)}{NB}%</td>
                        <td className="text-center">
                          <span className={`px-1.5 py-0.5 rounded-sm font-bold ${
                            isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isOk ? 'OK' : 'Dépassement'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="note-s text-slate-600 mt-1">
              Armature fournie : {result.concreteDesign.mur_interieur.bar_designation} (<V n="M" s="r" /> = {fu(result.concreteDesign.mur_interieur.Mr, 1, 'kN·m/m')}).
              Forces latérales pondérées réellement appliquées au voile par le calcul (sol sec et déjaugé, hauteur remblayée <V n="h" s="r" />, nappe, surcharge, séisme). Mur en porte-à-faux : la somme des colonnes de forces (terres, eau, surcharge, séisme, autres, butée voile) égale l’effort tranchant net au pied du voile ; <V n="V" s="f" /> affiché est le maximum en valeur absolue le long du voile (il peut différer de l’effort au pied lorsque l’effort tranchant change de signe, notamment avec la butée sur le voile). Mur de sous-sol : la réaction de tête <V n="R" s="top" /> utilisée pour la stabilité provient du choix 0 (MUR-07 D2) ; les diagrammes et les efforts du voile utilisent le choix retenu.
            </p>
          </div>
          {(() => {
            // MUR-07 D5 : ligne « Poussée passive sur le voile », valeurs lues du moteur (combinaison qui gouverne le voile)
            const sp = result.stemPassive;
            const g = result.governingStem;
            const q = g.stem_passive;
            return (
              <p className="note-s text-slate-800" data-testid="note-stem-passive">
                <strong>Poussée passive sur le voile</strong> (MUR-07) : choix {sp.choice}, {STEM_PASSIVE_LABEL[sp.choice]}.{' '}
                {sp.choice === 0 || !sp.active
                  ? (sp.choice === 0 ? 'Non comptée.' : <>Aucune pression sur le voile (<V n="h" s="v" /> = 0 ou <V n="K" s="p" /> = 0).</>)
                  : <><V n="h" s="v" /> = {fu(sp.hv, 2, 'm')} ; <V n="K" s="p" /> = {fmt(q.Kp_eff, 3)} ; résultante nominale <V n="P" s="p,v" /> = {fu(q.P_nominal, 1, 'kN/m')} ; facteur {fmt(q.factor, 3)}{q.seismic_null ? ' (butée sismique nulle, option MUR-02 D9)' : ''} ; moment retranché au pied = {fu(q.factor * q.M_nominal, 2, 'kN·m/m')} (moment nominal {fmt(q.M_nominal, 2)}) dans « {shortComb(g.combName)} ».</>}
                {sp.choice === 3 && !q.seismic_null && <strong className="text-rose-700"> Moins sécuritaire : augmente une résistance par un facteur de charge.</strong>}
              </p>
            );
          })()}
        </div>

        {/* 4.9 SOLLICITATIONS DE LA SEMELLE (ÉLU) */}
        <div className="space-y-2">
          <SubTitle n={S4('semelle')} title="Sollicitations de la semelle à l'ÉLU" />
          <div className={ulsCombs.length <= 8 ? 'break-inside-avoid print:break-inside-avoid' : ''}>
            <Caption no={T.footing} title={`Sollicitations de la semelle à l'ÉLU : patin avant et talon arrière (${ulsCombs.length} combinaisons)`} />
            <div className="overflow-x-auto">
              <table className="note-table text-left">
                <thead>
                  <tr className="align-bottom">
                    <th>No</th>
                    <th>Combinaison</th>
                    <th className="text-right bg-emerald-100">Patin <V n="M" s="f" /><span className="block font-normal text-slate-600">(kN·m/m)</span></th>
                    <th className="text-right">Patin <V n="V" s="f" /><span className="block font-normal text-slate-600">(kN/m)</span></th>
                    <th className="text-right bg-emerald-100">Talon <V n="M" s="f" /><span className="block font-normal text-slate-600">(kN·m/m)</span></th>
                    <th className="text-right">Talon <V n="V" s="f" /><span className="block font-normal text-slate-600">(kN/m)</span></th>
                    <th className="text-center">Taux<span className="block font-normal text-slate-600">patin</span></th>
                    <th className="text-center">Taux<span className="block font-normal text-slate-600">talon</span></th>
                    <th className="text-center">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {ulsCombs.map((c, idx) => {
                    const mrToe = result.concreteDesign.semelle_orteil.Mr;
                    const mrHeel = result.concreteDesign.semelle_talon.Mr;
                    const ratioToe = mrToe > 0 ? (c.toe_Mf / mrToe) : 0;
                    const ratioHeel = mrHeel > 0 ? (c.heel_Mf / mrHeel) : 0;
                    const isOk = c.toe_Mf <= mrToe && c.heel_Mf <= mrHeel;
                    const isGovToe = result.governingToe && result.governingToe.combName === c.combName;
                    const isGovHeel = result.governingHeel && result.governingHeel.combName === c.combName;

                    return (
                      <tr key={c.combName} className={`${isGovToe || isGovHeel ? 'bg-amber-50 font-bold' : ''}`}>
                        <td className="text-slate-500">{idx + 1}</td>
                        <td className="text-slate-900 font-bold min-w-[5.5rem]">
                          {shortComb(c.combName)}
                          {isGovToe && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-sm bg-emerald-200 text-emerald-900 font-bold">
                              Gouvernant : patin
                            </span>
                          )}
                          {isGovHeel && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-sm bg-blue-200 text-blue-900 font-bold">
                              Gouvernant : talon
                            </span>
                          )}
                        </td>
                        <td className="text-right font-bold text-emerald-900 bg-emerald-50">{fmt(c.toe_Mf, 1)}</td>
                        <td className="text-right">{fmt(c.toe_Vf, 1)}</td>
                        <td className="text-right font-bold text-emerald-900 bg-emerald-50">{fmt(c.heel_Mf, 1)}</td>
                        <td className="text-right">{fmt(c.heel_Vf, 1)}</td>
                        <td className="text-center">{fmt(ratioToe * 100, 0)}{NB}%</td>
                        <td className="text-center">{fmt(ratioHeel * 100, 0)}{NB}%</td>
                        <td className="text-center">
                          <span className={`px-1.5 py-0.5 rounded-sm font-bold ${
                            isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isOk ? 'OK' : 'Vérifier'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="note-s text-slate-600 mt-1">Armature fournie — patin : {result.concreteDesign.semelle_orteil.bar_designation} ; talon : {result.concreteDesign.semelle_talon.bar_designation}.</p>
          </div>
        </div>

        {/* 4.10 FLÈCHE DU VOILE (ÉLS) — MUR-05 */}
        {(() => {
          return (
            <div className="space-y-3 pt-2">
              <SubTitle n={S4('fleche')} title="Flèche du voile (ÉLS)" />
              <p className="text-slate-800">
                Combinaisons ÉLS du tableau 4.1.3.4 du CNB {result.cnbEdition} (H = 1,0) ; CSA A23.3 9.8.2.2 à 9.8.2.5 ; Chaallal (2012) §3.4.2, p. 33 à 36, éq. 3.22, 3.25 à 3.27, tableau 3.3 ; fiche MUR-05.
                Mode : {sd.mode === 'cantilever' ? 'mur libre (flèche en tête)' : 'mur de sous-sol (flèche maximale entre les appuis)'}. Limite <V n="h" />/{fr(sd.divisor, 0)} = {fu(sd.limit, 2, 'mm')}.
              </p>
              {!deflOk ? (
                <div className="font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-sm p-3">Flèche du voile NON VÉRIFIABLE : {sd.reason ?? 'données insuffisantes'}.</div>
              ) : (
                <>
                  <DeflectionPropEqs sd={sd} row={sd.rows[gi]} eqNo={eqDefl} />
                  <p className="note-s text-slate-600"><V n="I" s="e" /> ci-dessus : combinaison qui gouverne ({combId(sd.rows[gi].combName)}). Le tableau donne <V n="I" s="e" /> de chaque combinaison.</p>
                  <NoteTable
                    caption={{ no: T.defl, title: 'Flèche du voile à l\'ÉLS par combinaison' }}
                    cols={[
                      { name: 'Comb.', title: 'Combinaison ÉLS du tableau 4.1.3.4' },
                      { name: 'D', align: 'right' }, { name: 'L', align: 'right' }, { name: 'S', align: 'right' }, { name: 'W', align: 'right' }, { name: 'H', align: 'right' },
                      { name: 'Ma', unit: 'kN·m/m', align: 'right', title: 'Moment ÉLS au pied (mur libre) ou maximal (sous-sol)' },
                      { name: 'Ie', unit: '10⁹ mm⁴/m', align: 'right', title: 'Inertie effective, éq. 9.1' },
                      { name: '|Δi|', unit: 'mm', align: 'right', title: 'Flèche immédiate' },
                      { name: '|Δdiff|', unit: 'mm', align: 'right', title: 'Flèche différée (ζs − 1)·Δi,sus' },
                      { name: '|ΔLT|', unit: 'mm', align: 'right', title: 'Flèche totale = |Δi| + |Δdiff|' },
                      { name: 'h/Δ', align: 'right' },
                      { name: 'Limite', unit: 'mm', align: 'right', title: "h/diviseur, critère de l'utilisateur" },
                      { name: 'Statut', align: 'center' }
                    ]}
                    rows={sd.rows.map((r, i) => [
                      <span key="n" className={i === gi ? 'underline' : ''}>{combId(r.combName)}{i === gi ? ' *' : ''}</span>,
                      fr(r.factors.D, 2), fr(r.factors.L, 2), fr(r.factors.S, 2), fr(r.factors.W, 2), fr(r.factors.H, 2),
                      fr(r.Ma, 1), fr(r.Ie / 1e9, 3), fr(r.deltaI, 2), fr(r.deltaLT - r.deltaI, 2), fr(r.deltaLT, 2), fmtInt(r.hOverDelta), fr(r.limit, 1),
                      <span key="s"><StatusPill status={r.status} verifiable={r.status !== "NON VÉRIFIABLE"} /></span>
                    ])}
                    after={
                      <p className="note-s text-slate-600 mt-1">
                        * Combinaison qui gouverne (plus grand |<V n="Δ" s="LT" />|/limite = {fr(sd.rows[gi].utilization, 3)}). Conclusion au critère de l'utilisateur :{' '}
                        <strong>{sd.status === 'OK' ? 'CONFORME' : sd.status === 'NON' ? 'NON CONFORME' : 'NON VÉRIFIABLE'}</strong>.
                      </p>
                    }
                  />
                </>
              )}
              <DeflectionMentions sd={sd} />
            </div>
          );
        })()}

        {/* 5. HYPOTHÈSES ET LIMITES */}
        <SectionTitle n="5" title="Hypothèses et limites" />
        {(() => {
          type Pill = 'applique' | 'confirmer' | 'nonverifie';
          const pill = (k: Pill) => (
            <span className={`px-1.5 py-0.5 rounded-sm font-bold whitespace-nowrap ${k === 'applique' ? 'bg-emerald-100 text-emerald-800' : k === 'confirmer' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
              {k === 'applique' ? 'appliqué' : k === 'confirmer' ? 'À CONFIRMER' : 'NON VÉRIFIÉ'}
            </span>
          );
          const frontB = result.earthPressures.frontWaterScenario !== 'A';
          const groups: { title: string; rows: [string, React.ReactNode, Pill][] }[] = [
            { title: 'Géotechnique', rows: [
              ['Éléments non vérifiés', <>Stabilité d’ensemble (glissement profond), gel et profondeur de la semelle (hors profondeur déduite de la butée), drainage, tassement calculé, pression de compactage (fig. 20.9), liquéfaction.</>, 'nonverifie'],
              ['Poussée passive sur le voile (MUR-07)', <>Choix {result.stemPassive.choice} : {STEM_PASSIVE_LABEL[result.stemPassive.choice]}. {STEM_PASSIVE_EXPLAIN[result.stemPassive.choice]} Facteur : {STEM_PASSIVE_FACTOR_TEXT[result.stemPassive.choice]}. La stabilité (glissement, renversement) garde sa butée <V n="Ψ" />·<V n="φ" s="p" /> ; <V n="M" s="f" /> et <V n="V" s="f" /> du voile seulement (D2).</>, result.stemPassive.choice === 3 ? 'confirmer' : 'applique'],
              ['Poids volumique sous la nappe', <><V n="γ" prime /> = <V n="γ" /> − <V n="γ" s="w" /> : le <V n="γ" /> saisi est pris comme poids volumique saturé.</>, 'applique'],
              ['Limite d’excentricité', <><V n="e" /> ≤ <V n="B" />/6 à l’ÉLU et à l’ÉLS (CFEM 5e éd., p. 348 et 20.7.3.4-20.7.3.5), statut calculé pour chaque combinaison. Une limite plus large (par ex. <V n="B" />/3) n’a aucune source lue : non appliquée.</>, 'applique'],
              ['Frottement et adhérence de la base (MUR-04)', <>tan <V n="δ" s="b" /> du sol d’assise (tableau 20.4(a), CFEM 5e éd., p. 691 : borne inférieure, plafonnée à <V n="φ" prime />), <V n="c" s="a" prime /> = 0 à long terme (p. 351). Assise cohérente (CL) : adhérence <V n="c" s="a" /> du tableau 20.4(b) interpolée linéairement, <V n="B" prime /> = <V n="B" /> − 2<V n="e" />, butée nulle à court terme ; le plus défavorable des deux conditions gouverne.</>, 'confirmer'],
              ['Frottement δ de Coulomb', <>Actif : <V n="δ" /> = <V n="r" />·<V n="φ" /> du remblai (<V n="r" /> = {fmt(result.coulombRatio, 3)}), sans plafond par la base. Butée de Coulomb : <V n="δ" /> = min(<V n="r" /> ; 0,5)·<V n="φ" prime /> (CFEM 5e éd., § 20.2.6).</>, 'confirmer'],
              ['Portance', <><V n="q" s="u" /> saisi par le géotechnicien ; il doit correspondre à la condition la plus défavorable (CFEM 5e éd., p. 344).</>, 'applique'],
            ] },
            { title: 'Eau', rows: [
              ['Sous-pression', <>Uniforme <V n="γ" s="w" />·<V n="h" s="w" />·<V n="B" /> sur la largeur <V n="B" /> (hypothèse conservatrice, drainage non défini) ; une sous-pression trapézoïdale est à traiter avec MUR-02. Facteur 1,5 appliqué à l’eau : classement À CONFIRMER.</>, 'confirmer'],
              [`Eau à l’avant (scénario ${result.earthPressures.frontWaterScenario})`, frontB
                ? <>Eau à l’avant comptée : niveau <V n="h" s="w,av" /> = {fu(result.earthPressures.hw_av, 2, 'm')} déclaré fiable par l’utilisateur ; <V n="P" s="w,a" /> reçoit les mêmes facteurs que la butée (<V n="φ" s="p" /> au glissement, <V n="φ" s="ov" /> au renversement).</>
                : <>Eau à l’avant non comptée (scénario conservateur) ; butée du sol calculée avec <V n="γ" prime /> sous la nappe.</>, frontB ? 'confirmer' : 'applique'],
            ] },
            { title: 'Séisme', rows: [
              ['Coefficients sismiques', <><V n="k" s="h" /> = <V n="a" s="h" /> (D6) ; <V n="k" s="v" /> = ⅔·<V n="k" s="h" /> à défaut d’étude du site (CFEM 5e éd., p. 629), deux signes étudiés ; option « négliger <V n="k" s="v" /> » (<V n="k" s="v" /> = 0) : choix de l’utilisateur.</>, 'applique'],
              ['Facteur de H au cas 5', <>Commentaire 2025 : À CONFIRMER. Augmentations de 4.1.8.16.(3) non appliquées (le mur ne fait pas partie du SRFS, système de résistance aux forces sismiques) : À CONFIRMER.</>, 'confirmer'],
            ] },
            { title: 'Béton (A23.3-19)', rows: [
              ['Cisaillement par frottement (11.5)', <><V n="c" /> = 0,25{NB}MPa et <V n="μ" /> = 0,60 (surface non rendue rugueuse, D14) ; <V n="N" /> = charge permanente non pondérée (11.5.4) ; cumul avec l’armature tendue en flexion : À CONFIRMER.</>, 'confirmer'],
              ['Définitions et correspondance', <>Définition de <V n="d" s="v" />, tableau 12.1 (coefficient 0,45 ou 0,6), 12.5.4 (confinement), 10.5.1.1 (<V n="M" s="r" /> ≥ 1,2<V n="M" s="cr" />, module de rupture 8.6.4) et correspondance avec l’édition :24 : À CONFIRMER.</>, 'confirmer'],
              ['Enrobages', <>Selon la CSA A23.1 (absente) : NON VÉRIFIÉS ; l’enrobage reste saisi par l’utilisateur.</>, 'nonverifie'],
              ['Effort tranchant', <>Vérifié à la face de la semelle (conservateur), non à <V n="d" s="v" />.</>, 'applique'],
            ] },
            { title: 'Charges', rows: [
              ['Charges variables stabilisantes (MUR-06)', countVar
                ? <>Option « Compter les charges variables stabilisantes (L, S, W) » cochée : le poids de la surcharge (amont sur le talon, aval sur le patin), la charge de tête <V n="F" s="y" /> et les charges verticales saisies reçoivent le facteur de la combinaison dans toutes les vérifications ; la poussée garde le même facteur ; le séisme E est inchangé. {countHM ? <>Case « Compter aussi les forces horizontales et les moments variables stabilisants (L, S, W) » cochée (amendement A1) : <V n="F" s="x" /> et <V n="M" s="z" /> stabilisants reçoivent aussi le facteur de la combinaison.</> : <>Case « Compter aussi les forces horizontales et les moments » décochée (amendement A1) : <V n="F" s="x" /> et <V n="M" s="z" /> variables stabilisants pris à 0.</>} {MUR06_MENTION} Hypothèse : la surcharge est présente en même temps que la poussée qu’elle produit ; pour une surcharge qui peut n’occuper qu’une bande derrière le talon (camion, entreposage partiel), décocher l’option.</>
                : <>Option décochée : charges variables verticales stabilisantes prises à 0 en stabilité (option prudente, CNB 4.1.3.2.(3)) ; leur poussée garde le facteur de la combinaison.</>, 'confirmer'],
              ['Charges linéaires derrière le mur', <>CFEM 5e éd., fig. 20.8 (p. 694) : <V n="H" /> = <V n="H" s="p" /> = <V n="h" s="r" /> + <V n="t" s="s" />, distance mesurée depuis la face arrière du voile, origine à la surface du remblai (décision de l’utilisateur du 2026-11-08) ; aucune pression au-dessus du remblai.</>, 'applique'],
              ['Charges ponctuelles et réparties', <>Charges ponctuelles de la fig. 20.8 non implémentées ; charges réparties assimilées à leur résultante : approximation À CONFIRMER.</>, 'confirmer'],
            ] },
            { title: 'Géométrie', rows: [
              ['Remblai et voile', <>Remblai horizontal (<V n="β" /> = 0), voile sans fruit, sans clé de cisaillement. Hauteur de poussée <V n="H" s="p" /> = <V n="h" s="r" /> + <V n="t" s="s" /> (<V n="h" s="r" /> = {fu(result.soilHeight.hr, 2, 'm')}).</>, 'applique'],
            ] },
            { title: 'Juridiction', rows: [
              ['Code de construction du Québec', <>Chapitre I – Bâtiment : édition et modifications non vérifiées.</>, 'confirmer'],
            ] },
          ];
          return (
            <div>
              <Caption no={T.assumptions} title="Hypothèses et limites par sujet" />
              <table className="note-table text-left">
                <thead>
                  <tr>
                    <th className="w-[22%]">Sujet</th>
                    <th>Hypothèse retenue</th>
                    <th className="text-center w-[11%]">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.flatMap(g => [
                    <tr key={g.title} className="bg-slate-100 break-after-avoid"><td colSpan={3} className="font-bold text-slate-800">{g.title}</td></tr>,
                    ...g.rows.map(([subject, text, st], i) => (
                      <tr key={g.title + i} className="align-top">
                        <td className="font-bold text-slate-900">{subject}</td>
                        <td className="text-slate-800 leading-snug">{text}</td>
                        <td className="text-center">{pill(st)}</td>
                      </tr>
                    ))
                  ])}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* 6. ARMATURES (PLAN) : mêmes fonctions que l'onglet « Plans » */}
        {(() => {
          const zoneRows = buildZoneRows(result);
          const schedule = buildBarSchedule(result, geo, conc);
          const pair = zoneRows.find(r => r.pair)?.pair;
          return (
            <>
              <SectionTitle n="6" title="Armatures (plan)" />
              <div className="space-y-3">
                <SubTitle n="6.1" title="Armatures par zone" />
                <DataTable
                  caption={{ no: T.zones, title: 'Armatures par zone' }}
                  head={['Zone', 'Élément', 'As,req (mm²/m)', 'As,min (mm²/m)', 'Barre', 'Esp. (mm)', 'As,fourni (mm²/m)', 'Esp. max (mm)', 'Statut']}
                  rows={zoneRows.map(r => [
                    r.zone.id,
                    r.zone.label,
                    r.As_req === null ? '—' : Number.isFinite(r.As_req) ? fmt(r.As_req, 0) : 'non atteignable',
                    fmt(r.As_min, 0),
                    r.barSize,
                    String(r.spacing),
                    fmt(r.As_provided, 0),
                    fmt(r.spacing_max, 0),
                    !result.verifiable ? 'NON VÉRIFIABLE' : r.ok ? 'OK' : `NON : ${r.reasons.join(' ; ')}`
                  ])}
                />
                <NoteTable
                  caption={{ no: T.asmin, title: 'Règle de As,min par zone' }}
                  cols={[{ name: 'Zone' }, { name: 'Règle d’As,min' }, { name: 'Article' }]}
                  rows={zoneRows.map(r => {
                    const arts = Array.from(new Set(r.As_min_basis.match(/\b\d+\.\d+(?:\.\d+)*(?:\s[a-z]\))?/g) ?? []));
                    return [r.zone.id, <span key="b"><Fm>{r.As_min_basis}</Fm></span>, arts.length ? arts.join(' ; ') : '—'];
                  })}
                />
                <ul className="list-disc pl-5 space-y-0.5 note-s text-slate-600">
                  {pair && <li>Paire A3 + A4 : total requis {fu(pair.required, 0, 'mm²/m')}, somme fournie {fu(pair.provided, 0, 'mm²/m')} ; 14.1.8.6 : aire totale, répartition entre faces non prescrite par la norme. Statut de A3 et A4 : Σ(A3 + A4) ≥ 0,002<V n="A" s="g" /> et espacement par nappe.</li>}
                  <li><V n="A" s="s,req" /> = armature pour <V n="M" s="r" /> = <V n="M" s="f" /> (inverse exact de la formule de <V n="M" s="r" />, bloc rectangulaire 10.1.7) ; « — » : aucun effort de flexion. A7 : 2 lits.</li>
                  <li>Statut : <V n="A" s="s,fourni" /> ≥ max(<V n="A" s="s,req" /> ; <V n="A" s="s,min" />) et espacement ≤ espacement maximal.</li>
                </ul>
                <SubTitle n="6.2" title="Nomenclature des barres (par mètre de mur)" />
                <DataTable
                  caption={{ no: T.bars, title: 'Nomenclature des barres (par mètre de mur)' }}
                  head={['Repère', 'Barre', 'Esp. (mm)', 'Forme', 'Longueur unitaire (m)', 'Nombre par m de mur', 'Masse (kg/m de mur)']}
                  rows={[
                    ...schedule.map(s => [s.id, s.barSize, String(s.spacing), s.shape, fmt(s.length, 2), fmt(s.countPerM, 2), fmt(s.massPerM, 1)]),
                    ['Total', '', '', '', '', '', fmt(totalScheduleMass(schedule), 1)]
                  ]}
                />
                <p className="note-s text-slate-600"><Fm>{`${SCHEDULE_DISCLAIMER} Prolongement des crochets 12db : valeur indicative, À CONFIRMER.`}</Fm></p>
              </div>
            </>
          );
        })()}

        {/* 7. COMMENTAIRE DE L'INGÉNIEUR */}
        <SectionTitle n="7" title="Commentaire de l'ingénieur et approbation" />
        {showToleranceBox && (
          <div className="p-5 border border-sky-300 bg-sky-50 text-sky-950 space-y-2 relative break-inside-avoid print:break-inside-avoid">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-800 flex items-center gap-1.5">
                <Info size={15} className="text-sky-600" />
                Note et justification de conformité structurale (ingénieur-conseil)
              </span>
              <button
                onClick={() => setShowToleranceBox(false)}
                className="text-sky-500 hover:text-sky-800 print:hidden"
              >
                Masquer
              </button>
            </div>

            <textarea
              value={engineerComment}
              onChange={(e) => setEngineerComment(e.target.value)}
              className="w-full bg-transparent border-0 text-sky-950 focus:ring-0 resize-none leading-relaxed p-0 italic"
              rows={2}
            />

            <p className="note-s text-sky-800 pt-1 border-t border-sky-200">
              * Références : CNB {result.cnbEdition}, 4.1.3.2 ; CFEM 5e éd. (tableaux et figures : voir la fiche MUR-02) ; CSA A23.3-19. Éléments NON VÉRIFIÉS : stabilité d'ensemble, gel, drainage, tassement.
            </p>
          </div>
        )}

        {/* Signatures */}
        <div className="pt-8 border-t border-slate-300 grid grid-cols-2 md:grid-cols-3 gap-6 text-slate-700 break-inside-avoid print:break-inside-avoid">
          <div>
            <span className="block note-s font-bold text-slate-500">Conçu et calculé par :</span>
            <div className="h-12 border-b border-slate-300 mt-2"></div>
            <span className="font-bold text-slate-800 mt-1 block">Ingénieur concepteur, ing.</span>
          </div>

          <div>
            <span className="block note-s font-bold text-slate-500">Vérifié par :</span>
            <div className="h-12 border-b border-slate-300 mt-2"></div>
            <span className="font-bold text-slate-800 mt-1 block">Ingénieur vérificateur, ing.</span>
          </div>

          <div className="hidden md:block print:block">
            <span className="block note-s font-bold text-slate-500">Sceau et signature de l'Ordre (OIQ) :</span>
            <div className="h-12 border border-dashed border-slate-300 mt-2 flex items-center justify-center note-s text-slate-400">
              [Emplacement du sceau numérique]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
