import React, { useState } from 'react';
import { AnalysisResult, WallGeometry, SoilProperties, ConcreteProperties, LoadsConfig } from '../lib/types';
import { BearingPressureDiagram } from './BearingPressureDiagram';
import { FACTEUR_H_SISMIQUE } from '../lib/analysis';
import { buildLoadTables, countStabilizingHM, countStabilizingVariable, sumsByType } from './loadTables';
import { buildBarSchedule, buildZoneRows, SCHEDULE_DISCLAIMER, totalScheduleMass } from '../lib/rebarPlans';
import { Fm } from './Fm';
import { Eq } from './Eq';
import { V } from './Eq';
import { DeflectionPropEqs, DeflectionMentions, combId, fmtInt } from './StemDeflectionSteps';
import { fr as frc } from '../lib/theoryEquations';
import { Printer, FileText, CheckCircle2, AlertTriangle, Info, Scale, Shield, Building } from 'lucide-react';

interface OfficialNoteDeCalculProps {
  projectName?: string; // nom du projet saisi dans l'en-tête
  geo: WallGeometry;
  soil: SoilProperties;
  conc: ConcreteProperties;
  result: AnalysisResult;
  loads?: LoadsConfig; // charges saisies (absentes : « non disponible »)
}

const fmt = (v: number, d: number) => (Number.isFinite(v) ? v.toFixed(d) : v === Infinity ? '∞' : 'non disponible');

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="text-base font-black text-slate-950 border-b border-slate-400 pb-1 pt-2 break-after-avoid print:break-after-avoid">
      {n}. {title}
    </h2>
  );
}

function SubTitle({ n, title }: { n: string; title: string }) {
  return <h3 className="text-sm font-bold text-slate-900 break-after-avoid print:break-after-avoid">{n} {title}</h3>;
}

/** Valeur numérique simple (ex. « 12.00 », « −0,25 ») : alignée à droite en police à chasse fixe, comme le tableau 1. */
const isNumeric = (s: string) => /^[−-]?\d+([.,]\d+)?$/.test(s.trim());

/** Tableau compact, même mise en forme que le tableau 1 (en-tête foncé, lignes alternées, valeurs à chasse fixe). */
type NoteCol = { name: string; unit?: string; align?: 'left' | 'right' | 'center'; title?: string };
/** Tableau de la note, même style que 1a : en-tête foncé, colonne No, lignes alternées, nom puis unité en dessous. */
function NoteTable({ cols, rows, footer }: { cols: NoteCol[]; rows: React.ReactNode[][]; footer?: { cells: React.ReactNode[]; shaded?: boolean }[] }) {
  const al = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 break-inside-avoid print:break-inside-avoid">
      <table className="w-full text-left text-[10px] border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white text-[10px] align-bottom">
            <th className="px-1 py-2 font-bold">No</th>
            {cols.map(c => (
              <th key={c.name} title={c.title ?? c.name} className={`px-1 py-2 font-bold leading-tight ${al(c.align)}`}>
                {c.name}
                {c.unit && <span className="block text-[9px] font-normal text-slate-300">{c.unit}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
              <td className="px-1 py-1 text-slate-500 font-sans">{i + 1}</td>
              {r.map((cell, j) => (
                <td key={j} className={`px-1 py-1 ${al(cols[j]?.align)} ${j === 0 ? 'text-slate-800 font-sans font-bold min-w-[5.5rem]' : 'whitespace-nowrap'}`}>{cell}</td>
              ))}
            </tr>
          ))}
          {footer?.map((f, i) => (
            <tr key={`f${i}`} className={`font-bold text-slate-900 ${f.shaded ? 'bg-sky-100' : 'bg-white'}`}>
              <td className="px-1 py-1 font-sans">Σ</td>
              {f.cells.map((cell, j) => <td key={j} className={`px-1 py-1 whitespace-nowrap ${al(cols[j]?.align)}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const StatusPill = ({ status, verifiable }: { status: string; verifiable: boolean }) => {
  const nv = !verifiable || status === 'NON VÉRIFIABLE';
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-sans ${nv ? 'bg-amber-100 text-amber-800' : status === 'OK' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
      {nv ? 'non vérifiable' : status === 'OK' ? 'OK' : 'NON'}
    </span>
  );
};
const shortComb = (n: string) => n.replace(/^Combinaison\s+\S+\s+\d+\s*\((.*)\)$/, '$1');


const CENTERED_HEADS = ['Valeur', 'Symbole', 'Unité', 'Type CNB', 'Dir.'];
function DataTable({ head, rows }: { head: string[]; rows: string[][] }) {
  const ctr = (j: number) => CENTERED_HEADS.includes(head[j]);
  return (
    <div className="inline-block max-w-full overflow-x-auto rounded-xl border border-slate-200 align-top break-inside-avoid print:break-inside-avoid">
      <table className="w-auto text-left text-[11px] border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white">
            {head.map((h, j) => <th key={h} className={`px-2.5 py-1.5 font-bold whitespace-nowrap ${ctr(j) ? 'text-center' : ''}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
              {r.map((c, j) => (
                <td
                  key={j}
                  className={`px-2.5 py-1 ${ctr(j) ? 'text-center' : ''} ${j === 0 && head[0].startsWith('N') && head[0].length === 2 ? 'text-slate-500 font-sans' : isNumeric(c) ? (ctr(j) ? 'font-mono whitespace-nowrap' : 'text-right font-mono whitespace-nowrap') : j === 0 && head[0] === 'N°' ? 'text-slate-500' : 'max-w-[22rem]'}`}
                >
                  {isNumeric(c) ? c : <Fm>{c}</Fm>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
  const Dim = ({ x1, y1, x2, y2, label, vertical }: { x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean }) => (
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
    <svg viewBox={`0 0 ${ox + W + 70} ${oy + H + 44}`} className="w-full max-w-sm border border-slate-300 rounded-lg bg-white" role="img" aria-label="Croquis coté du mur">
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
      <Dim x1={xs0} y1={y(totalHeight) - 12} x2={xs1} y2={y(totalHeight) - 12} label={`t = ${geo.epStem.toFixed(2)}`} />

      {/* Cotes horizontales sous la semelle : patin, voile, talon, puis B */}
      {[x(0), xs0, xs1, x(B)].map((xx, i) => <line key={i} x1={xx} y1={y(0) + 2} x2={xx} y2={yDimB + 4} {...ext} />)}
      <Dim x1={x(0)} y1={yDimParts} x2={xs0} y2={yDimParts} label={`Lp = ${geo.ePiedAv.toFixed(2)}`} />
      <Dim x1={xs1} y1={yDimParts} x2={x(B)} y2={yDimParts} label={`Lt = ${geo.ePiedAr.toFixed(2)}`} />
      <Dim x1={x(0)} y1={yDimB} x2={x(B)} y2={yDimB} label={`B = ${B.toFixed(2)} m`} />

      {/* Cotes verticales à droite : ts et h ; à gauche : H */}
      {[y(0), y(geo.epBase), y(totalHeight)].map((yy, i) => <line key={i} x1={x(B) + 2} y1={yy} x2={xDimRight + 4} y2={yy} {...ext} />)}
      <Dim vertical x1={xDimRight} y1={y(0)} x2={xDimRight} y2={y(geo.epBase)} label="" />
      <text x={xDimRight + 4} y={y(geo.epBase / 2) + 3} fontSize="8" fill={dimC} stroke="#ffffff" strokeWidth="3" paintOrder="stroke">ts = {geo.epBase.toFixed(2)}</text>
      <Dim vertical x1={xDimRight} y1={y(geo.epBase)} x2={xDimRight} y2={y(totalHeight)} label={`h = ${geo.hMur.toFixed(2)}`} />
      {[y(0), y(totalHeight)].map((yy, i) => <line key={i} x1={(i === 0 ? x(0) : xs0) - 2} y1={yy} x2={xDimH - 4} y2={yy} {...ext} />)}
      <Dim vertical x1={xDimH} y1={y(0)} x2={xDimH} y2={y(totalHeight)} label={`H = ${totalHeight.toFixed(2)}`} />
      {hSolAv > 0 && (
        <g>
          {[y(geo.epBase + hSolAv), y(geo.epBase), y(0)].map((yy, i) => <line key={i} x1={xDimP - 4} y1={yy} x2={x(0) - 2} y2={yy} {...ext} />)}
          <Dim vertical x1={xDimS} y1={y(geo.epBase)} x2={xDimS} y2={y(geo.epBase + hSolAv)} label={`hs,av = ${hSolAv.toFixed(2)}`} />
          <Dim vertical x1={xDimP} y1={y(0)} x2={xDimP} y2={y(hPass)} label={`hp = ${hPass.toFixed(2)}`} />
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
  const showOtherStem = ulsCombs.some(c => Math.abs(c.stem_lateral.autres) > 0.05); // charges de tête, charges linéaires, etc.
  const slsCombs = result.combinations.filter(c => c.type === 'SLS');

  const seismicOn = result.soilMethodConfig.seismicMethod !== 'none';
  const ep = result.earthPressures;
  const loadTables = buildLoadTables(geo, soil, result, loads);
  const countVar = countStabilizingVariable(loads); // MUR-06 D5/D7
  const countHM = countStabilizingHM(loads); // MUR-06 M6-A1
  const MUR06_MENTION = 'Choix de l’utilisateur, moins prudent que le facteur 0. L’article 4.1.3.2 du CNB 2020 ne fixe pas lui-même ce facteur, mais le Commentaire A (Calcul aux états limites, ¶40) indique que, pour les combinaisons 2 à 5, « les charges variables contraires sont donc considérées être égales à zéro » : ce choix s’écarte du Commentaire. Pratique CFEM : À CONFIRMER.';

  return (
    <div id="note-officielle" className="flex flex-col gap-8 w-full max-w-6xl mx-auto p-2 md:p-6 print:p-0 print:max-w-none text-slate-800">
      {/* Action Bar (Print / Export) */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
            <FileText size={22} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Note de Calcul Officielle (CNB {result.cnbEdition} / CSA A23.3-19)</h3>
            <p className="text-xs text-slate-500">
              Format homologué prêt pour révision de l'ingénieur, approbation municipale et impression PDF
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all"
        >
          <Printer size={16} />
          Imprimer / Exporter PDF
        </button>
      </div>

      {/* Sheet Content Container (Styled like a formal calculation document) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 md:p-12 space-y-8 print:border-none print:shadow-none print:p-4">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              RAPPORT D'INGÉNIERIE GÉOTECHNIQUE ET STRUCTURALE
            </span>
            <h1 className="text-2xl font-black text-slate-950 mt-1">
              PROJET : CALCUL MUR DE SOUTÈNEMENT
            </h1>
            <p className="text-xs font-bold text-slate-600">
              Références de calcul : CNB {result.cnbEdition} (partie 4), CFEM 5e éd. (Manuel canadien d'ingénierie des fondations) & CSA A23.3-19 (articles béton du mur)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="col-span-2 font-semibold text-slate-700">Projet au Québec — code applicable : Code de construction du Québec, Chapitre I – Bâtiment (CNB adopté avec modifications) ; référence de calcul : CNB {result.cnbEdition}</div>
            <div className="col-span-2"><strong>Nom du projet :</strong> {projectName?.trim() || 'projet-mur'}</div>
            <div><strong>Date :</strong> {new Date().toLocaleDateString('fr-CA')}</div>
            <div><strong>Logiciel :</strong> GeoWall PRO v2.4</div>
            <div><strong>Type d'Écran :</strong> {geo.wallType === 'cantilever' ? 'Mur Cantilever Autostable' : 'Mur de Sous-sol Bloqué'}</div>
            <div><strong>Méthode Séisme :</strong> {result.seismic.method === 'wood' ? 'Wood (mur retenu)' : result.seismic.method === 'seed_whitman' ? 'Seed & Whitman (1970)' : (result.seismic.method === 'mononobe_okabe' ? 'Mononobe-Okabe' : 'Statique')}</div>
          </div>
        </div>

        {/* 1. DONNÉES DE CALCUL */}
        <SectionTitle n="1" title="Données de calcul" />

        <div className="space-y-2">
          <SubTitle n="1.1" title="Géométrie et dimensions" />
          {/* Tableau et croquis côte à côte, aussi à l'impression */}
          <div className="grid grid-cols-1 lg:grid-cols-3 print:grid-cols-[3fr_2fr] gap-4 items-start">
            <div className="lg:col-span-2 print:col-span-1">
              <DataTable
                head={['Désignation', 'Symbole', 'Valeur', 'Unité']}
                rows={[
                  ['Type d\'écran', '—', geo.wallType === 'cantilever' ? 'Mur en porte-à-faux (cantilever)' : 'Mur de sous-sol appuyé en tête', '—'],
                  ['Hauteur du voile', 'h', fmt(geo.hMur, 2), 'm'],
                  ['Épaisseur du voile (en tête et en pied)', 't', `${fmt(geo.epStem, 3)} (constante ; fruit non modélisé)`, 'm'],
                  ['Longueur du patin (avant)', 'Lp', fmt(geo.ePiedAv, 2), 'm'],
                  ['Longueur du talon (arrière)', 'Lt', fmt(geo.ePiedAr, 2), 'm'],
                  ['Épaisseur de la semelle', 'ts', fmt(geo.epBase, 3), 'm'],
                  ['Largeur totale de la semelle', 'B', fmt(B, 2), 'm'],
                  ['Sixième de la largeur', 'B/6', fmt(B_over_6, 3), 'm'],
                  ['Hauteur totale (sous-face de la semelle au haut du voile)', 'H', fmt(result.totalHeight, 2), 'm'],
                  ['Hauteur du sol arrière hr (depuis le dessus de la semelle ; hauteur de poussée H_p = hr + ts = ' + fmt(result.soilHeight.Hp, 2) + ' m)', 'hr', fmt(result.soilHeight.hr, 2) + (soil.hr === undefined ? ' (défaut : hr = h)' : ''), 'm'],
                  ['Hauteur de sol à l\'avant', 'hs,av', fmt(soil.hSolAv, 2), 'm'],
                  ['Profondeur de butée (depuis la sous-face)', 'hp', soil.hSolAv > 0 ? fmt(result.earthPressures.h_pass, 2) : '0 (sans sol à l\'avant, butée nulle)', 'm'],
                  ['Pente du remblai', 'β', 'non disponible (remblai horizontal seulement)', '°'],
                  ['Clé de cisaillement', '—', 'non disponible (non modélisée)', '—'],
                ]}
              />
            </div>
            <WallSketch geo={geo} B={B} totalHeight={result.totalHeight} hSolAv={soil.hSolAv} hPass={result.earthPressures.h_pass} hr={result.soilHeight.hr} />
          </div>
        </div>

        <div className="space-y-2">
          <SubTitle n="1.2" title="Matériaux et masses volumiques" />
          <DataTable
            head={['Désignation', 'Symbole', 'Valeur', 'Unité']}
            rows={[
              ['Béton : poids volumique utilisé par le calcul', 'γc', fmt(conc.gamma_c, 1), 'kN/m³'],
              ['Béton du voile : résistance en compression', 'f′c voile', fmt(conc.fc_mur, 0), 'MPa'],
              ['Béton de la semelle : résistance en compression', 'f′c semelle', fmt(conc.fc_semelle, 0), 'MPa'],
              ['Acier d\'armature : limite élastique', 'fy', fmt(conc.fy, 0), 'MPa'],
              ['Enrobage du voile', 'c voile', fmt(conc.cover_h, 0), 'mm'],
              ['Enrobage du talon (lit supérieur)', 'c talon', fmt(conc.cover_v, 0), 'mm'],
              ['Enrobage de l\'orteil (lit inférieur)', 'c orteil', fmt(conc.cover_base_bottom, 0), 'mm'],
              ['Eau : poids volumique', 'γw', fmt(result.hydro.gamma_w, 2), 'kN/m³'],
              ['Nappe : hauteur au-dessus de la sous-face de la semelle', 'hw', result.hydro.hasWater ? fmt(result.hydro.hw, 2) : 'nappe inactive', result.hydro.hasWater ? 'm' : '—'],
              ['Poids volumique déjaugé retenu (γ − γw, hypothèse : γ saisi = γ saturé)', 'γ′', result.hydro.hasWater ? fmt(result.hydro.gamma_prime, 2) : 'sans objet', result.hydro.hasWater ? 'kN/m³' : '—'],
            ]}
          />
        </div>

        <div className="space-y-2">
          <SubTitle n="1.2a" title="Sol arrière (remblai) : poussée sur le voile, poids sur le talon" />
          <DataTable
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
          <SubTitle n="1.2b" title="Sol avant : butée, poids sur le patin" />
          <DataTable
            head={['Désignation', 'Symbole', 'Valeur', 'Unité']}
            rows={[
              ['Poids volumique (déjaugé sous la nappe)', 'γ', fmt(result.foundationSoil.gamma, 1), 'kN/m³'],
              ['Angle de frottement interne (coefficient de butée Kp)', 'φ′', fmt(result.foundationSoil.phi, 1), '°'],
              ['Hauteur du sol avant', 'hs,av', fmt(soil.hSolAv, 2), 'm'],
            ]}
          />
        </div>

        <div className="space-y-2">
          <SubTitle n="1.2c" title="Sol d'assise de la fondation : glissement (c′a = 0 au long terme), portance" />
          <DataTable
            head={['Désignation', 'Symbole', 'Valeur', 'Unité']}
            rows={[
              ['Type de sol (USCS, CFEM 5e, tableau 20.4)', '—', result.bearingSoil.classLabel, '—'],
              ['Angle de frottement interne d’assise (borne de δb)', 'φ′', fmt(result.bearingSoil.phi, 1), '°'],
              ['Contact de la base', '—', result.bearingSoil.contactLabel, '—'],
              ['Angle de frottement de base, avec sa source : ' + result.bearingSoil.deltaBSource, 'δb', result.bearingSoil.deltaB !== undefined ? fmt(result.bearingSoil.deltaB, 2) : 'non défini', '°'],
              ['Coefficient de frottement de base', 'tan δb', result.bearingSoil.deltaB !== undefined ? fmt(result.bearingSoil.tanDeltaB, 4) : 'non défini', '—'],
              ['Adhérence à long terme (CFEM 5e, § 10.6, p. 351 : « if any at all »)', 'c′a', '0', 'kPa'],
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
            cols={result.bearingSoil.cohesive
              ? [{ name: 'Combinaison ÉLU' }, { name: 'FS long terme', unit: '(drainé)', align: 'right' }, { name: 'FS court terme', unit: '(non drainé)', align: 'right' }, { name: 'Condition', align: 'center' }]
              : [{ name: 'Combinaison ÉLU' }, { name: 'FS long terme', unit: '(drainé)', align: 'right' }, { name: 'Condition', align: 'center' }]}
            rows={result.combinations.filter(c => c.type === 'ULS' && c.stabApplicable).map(c => result.bearingSoil.cohesive
              ? [shortComb(c.combName), fmt(c.FOS_drained, 2), c.FOS_undrained !== undefined ? fmt(c.FOS_undrained, 2) : '—', c.sliding_condition === 'undrained' ? 'CT gouverne' : 'LT gouverne']
              : [shortComb(c.combName), fmt(c.FOS_drained, 2), 'LT'])}
          />
          <p className="text-[10px] text-slate-600">Sources : CFEM 5e éd., tableau 20.4, p. 691 (PDF 723) ; § 10.6, p. 351. δb proposé = borne inférieure du tableau, plafonnée à φ′. Butée nulle à court terme (MUR-04, R3, À CONFIRMER). qu saisi : il doit correspondre à la condition la plus défavorable (p. 344).</p>
        </div>

        <div className="space-y-2">
          <SubTitle n="1.3" title="Coefficients de poussée" />
          <DataTable
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
          <p className="text-xs text-slate-600">
            Valeurs caractéristiques, non pondérées. Les facteurs de la section 3 s'appliquent ensuite. Positions mesurées depuis l'orteil (x) et la sous-face de la semelle (y).
          </p>
          {([['2a', 'Charges stabilisantes', loadTables.stabilizing], ['2b', 'Charges déstabilisantes', loadTables.destabilizing]] as const).map(([n, title, rowsR]) => {
            const sums = sumsByType(rowsR);
            const num = (v: number | null) => (v === null ? '—' : fmt(v, 2));
            return (
              <div key={n} className="space-y-1">
                <SubTitle n={n} title={title} />
                <NoteTable
                  cols={[
                    { name: 'Charges' },
                    { name: 'Type CNB', align: 'center' },
                    { name: 'Fh', unit: '(kN/m)', align: 'center' },
                    { name: 'Fv', unit: '(kN/m)', align: 'center' },
                    { name: 'Bras de levier', unit: '(m)', align: 'center' },
                    { name: 'Moment / orteil', unit: '(kN·m/m)', align: 'center' },
                  ]}
                  rows={rowsR.map(r => [r.desc, r.type + (n === '2a' && (r.type === 'L' || r.type === 'S' || r.type === 'W') && (!countVar || (!countHM && (r.kind === 'moment' || (r.kind === 'force' && r.fh !== null)))) ? ' *' : ''), num(r.fh), r.kind === 'data' ? 'non comptée' : num(r.fv), num(r.arm), r.moment === null ? '—' : fmt(r.moment, 2)])}
                  footer={sums.map(t => ({ shaded: t.shaded, cells: [t.label, '', fmt(t.fh, 2), fmt(t.fv, 2), '', fmt(t.moment, 2)] }))}
                />
              </div>
            );
          })}
          {loadTables.dataNotes.length > 0 && (
            <p className="text-[10px] text-slate-600">Données hors force : {loadTables.dataNotes.join(' ; ')}.</p>
          )}
          <p className="text-[10px] text-slate-500">Classement par rapport au glissement et au renversement autour de l’orteil. {countVar
            ? `Les charges variables verticales stabilisantes (L, S, W) sont comptées avec le facteur de la combinaison (MUR-06). ${countHM ? 'Les forces horizontales et les moments variables stabilisants (L, S, W) le sont aussi (MUR-06, amendement A1).' : '* Les forces horizontales et les moments variables stabilisants (L, S, W) sont pris à 0 : case « Compter aussi les forces horizontales et les moments » décochée (amendement A1).'} ${MUR06_MENTION}`
            : '* Une charge variable stabilisante (L, S) est prise à 0 dans les vérifications de stabilité (CNB 4.1.3.2.(3)) : option « Compter les charges variables stabilisantes » décochée.'}</p>
          <p className="text-[10px] text-slate-500">Fh : force horizontale, Fv : force verticale (valeurs absolues). Bras de levier : x depuis l’orteil pour Fv, y depuis la sous-face de la semelle pour Fh ; « — » pour un moment saisi (moment direct). Moment = force × bras, positif dans son tableau. Les moments saisis, la butée et l’eau à l’avant sont inclus ; le type CNB H désigne ici les terres et l’eau. {countVar
            ? 'Surcharges uniformes (kPa) : leur poids vertical Fv = q × longueur (talon ou patin) est compté dans Σ L, avec son bras et son moment ; leur poussée horizontale figure au tableau 2b.'
            : 'Surcharges uniformes (kPa) : leur poids vertical n’est pas compté dans ΣV par le moteur (charge variable stabilisante prise à 0, CNB 4.1.3.2.(3)) ; il n’entre donc pas dans les sommes, et leur poussée horizontale figure au tableau 2b.'}</p>
        </div>

        {/* 3. COMBINAISONS DE CHARGES */}
        <SectionTitle n="3" title="Combinaisons de charges" />
        <div className="space-y-3 text-xs text-slate-700">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Édition retenue :</strong> CNB {result.cnbEdition}, 4.1.3.2 et tableau 4.1.3.2.-A (défaut : 2020 ; option : 2025).</li>
            <li><strong>Cas 5 :</strong> {result.cnbEdition === '2020' ? '1,0D + 1,0E + 1,0H + 0,5L + 0,25S' : '1,0D + 1,0E + 1,0H + 0,5L + 0,15S'}.</li>
            <li><strong>Facteur 1,0H au cas 5 :</strong> note A-4.1.3.2.(4) (1,5H pour les cas 2, 3 et 4) et tableau A-3 du Commentaire A du CNB 2020 (1,0 pour D, H, T et P avec E). Commentaire 2025 : À CONFIRMER.</li>
            <li>{countVar
              ? <>Charges variables verticales (L, S, W) stabilisantes comptées avec le facteur de la combinaison (poids de la surcharge, charge de tête, charges verticales saisies) ; le séisme E garde son traitement. {MUR06_MENTION} </>
              : <>Charges variables favorables prises à zéro (option « Compter les charges variables stabilisantes » décochée) ; </>}0,9D ou 1,0D (cas 5) pour la charge permanente qui s'oppose ; poids du sol porté selon 4.1.3.2.(8) et (9).</li>
            <li><strong>ÉLS (portance, e ≤ B/6, flèche) :</strong> tableau 4.1.3.4 du CNB (identique en 2020 et 2025), H = 1,0 (4.1.3.4. 4)) : S0 = 1,0D + 1,0H ; charges principales seules S1, S2, S3 ; accompagnements 0,35L, 0,35S, 0,3W (MUR-05 D6). Le séisme n'en fait pas partie. 0,5L (stockage, équipement, locaux techniques) : usage non connu du moteur, 0,35L retenu, À CONFIRMER.</li>
          </ul>
          <DataTable
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
          />
          <p className="text-[11px] text-slate-500">La poussée des terres H est affectée du facteur 1,5 aux cas 1 à 4 et 1,0 au cas 5 (voir ci-dessus). Chaque cas est aussi évalué avec les charges d'accompagnement prises égales à zéro (4.1.3.2.(3)).</p>
        </div>

        {/* 4. VÉRIFICATIONS */}
        <SectionTitle n="4" title="Vérifications" />

        {/* Explications des choix de calcul (texte seulement : aucune valeur n'est recalculée ici) */}
        {(() => {
          const fr = result.frost;
          const hPass = result.earthPressures.h_pass;
          const gb = result.governingBearing;
          const moments = result.stabilityCriterion === 'moments';
          const dfApplies = fr.df_missing;
          const treat = (k: typeof fr.no_df_treatment) => (!dfApplies ? 'sans objet' : fr.no_df_treatment === k ? 'APPLIQUÉ ACTUELLEMENT' : 'non');
          let example: string;
          if (hPass <= 0) example = "Aucun sol à l'avant : la butée est nulle.";
          else if (!fr.deduct) example = `La butée agit sur h_pass = ${fmt(hPass, 2)} m. Case « profondeur de gel » décochée : butée comptée sur toute la hauteur (sol avant déclaré permanent et non gélif).`;
          else if (fr.df_entered) example = `La butée agit sur h_pass = ${fmt(hPass, 2)} m. Avec df = ${fmt(fr.df, 2)} m, il reste h_pass − df = ${fmt(Math.max(hPass - fr.df, 0), 2)} m de butée.`;
          else example = `La butée agit sur h_pass = ${fmt(hPass, 2)} m. Sans df, la butée est comptée sur toute la hauteur.`;
          const seisPassive = result.soilMethodConfig.seismicPassive === 'kpe' ? 'butée réduite KPE (CFEM 5e, éq. 18.27 à 18.31)' : 'butée nulle (aucune butée sismique)';
          return (
            <div className="text-xs bg-slate-50 p-4 rounded-2xl border border-slate-300 space-y-3 break-inside-avoid print:break-inside-avoid">
              <SubTitle n="4.0" title="Explications des choix de calcul" />
              <div className="space-y-2">
                <div className="font-bold text-slate-900">A. Butée et profondeur de gel</div>
                <p className="text-slate-700">
                  Le sol avant qui gèle ou qui peut être excavé ne retient pas le mur. Le CFEM 5e (fig. 20.10) ne compte la butée que sous la profondeur de gel df.
                  Au Québec, df vaut souvent environ 1,2 à 1,8 m selon la région ; c'est une valeur indicative, à prendre dans le rapport géotechnique.
                </p>
                <p className="text-slate-900 font-semibold">{example}</p>
                <p className="text-slate-700">Traitement possible lorsque la case gel est cochée et que df n'est pas saisie :</p>
                <DataTable
                  head={['Traitement', 'Effet', 'Appliqué']}
                  rows={[
                    ['Butée nulle', 'Prudent ; le résultat reste vérifiable', treat('zero')],
                    ['Non vérifiable', "Bloque le résultat tant que df n'est pas saisie", treat('not_verifiable')],
                    ['Butée pleine avec avis', 'Pas prudent ; un avis est affiché', treat('full_with_notice')]
                  ]}
                />
                <p className="text-slate-700">Choix courant lorsque df n'est pas saisie : <strong>{fr.no_df_treatment === 'zero' ? 'butée nulle (défaut)' : fr.no_df_treatment === 'not_verifiable' ? 'non vérifiable' : 'butée pleine avec avis'}</strong> (MUR-02 §11){dfApplies ? '' : " ; sans effet ici : df saisie, case décochée ou aucune butée"}.</p>
                <p className="text-slate-700">Butée au séisme : choix courant = <strong>{seisPassive}</strong> (choix possibles : butée nulle ou réduite KPE).</p>
              </div>
              <div className="space-y-2">
                <div className="font-bold text-slate-900">B. Critère de portance et de renversement</div>
                <DataTable
                  head={['Option', 'Pression', 'Cohérente avec', 'Vérifications', 'Retenu']}
                  rows={[
                    ['Largeur réduite B′', 'B′ = B − 2e, pression uniforme V/B′ (CFEM 5e, éq. 10.12, Meyerhof)', 'qu du rapport géotechnique calculée pour une charge excentrée', 'Renversement et e ≤ B/6 vérifiés aussi', moments ? 'non' : 'OUI'],
                    ['Moments, pression linéaire', 'q = V/B·(1 ± 6e/B), ou triangulaire si e > B/6 (Paultre ch. 17)', 'Pression admissible au bord', `Ms/Mr avec φ_ov = ${fmt(result.geotech.phi_ov, 2)}`, moments ? 'OUI' : 'non']
                  ]}
                />
                <p className="text-slate-900 font-semibold">
                  {gb.outside_base
                    ? `Combinaison de portance gouvernante (${gb.combName}) : résultante hors de la base, les deux pressions sont sans objet.`
                    : `Exemple, combinaison de portance gouvernante (${gb.combName}) : q selon B′ = V/B′ = ${fmt(gb.q_Beff, 1)} kPa (B′ = ${fmt(gb.B_eff, 2)} m) ; q max selon la pression linéaire = ${fmt(gb.q_linear_max, 1)} kPa.`}
                </p>
                <p className="text-slate-700">Les efforts du talon et du patin (armature) utilisent toujours la pression linéaire, quel que soit le critère.</p>
                <p className="text-slate-700">Critère retenu pour ce projet (choix de l'utilisateur, onglet Critères) : <strong>{moments ? 'moments, pression linéaire' : 'largeur réduite B′'}</strong>.</p>
              </div>
            </div>
          );
        })()}
        <div className="text-xs bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
          <div>
            <strong>Critère de renversement et de portance :</strong>{' '}
            {result.stabilityCriterion === 'moments'
              ? 'moments (FS = Ms/Mr) et pression linéaire q = V/B·(1 ± 6e/B)'
              : "excentricité, largeur réduite B′ = B − 2e, pression uniforme V/B′ (CFEM 5e éq. 10.12, p. 348 ; valable si e < B/6)"}
            {' '}— combinaison de portance gouvernante : e = {result.governingBearing.ecc.toFixed(3)} m, B′ = B − 2e = {result.governingBearing.B_eff.toFixed(3)} m.
          </div>
          {result.notices.map((n, i) => (
            <div key={i} className="text-amber-800 font-bold">{n}</div>
          ))}
          {result.warnings.map((w, i) => (
            <div key={i} className="text-rose-700 font-bold">{w}</div>
          ))}
          {result.combinations.filter(c => c.stability_message).map(c => (
            <div key={c.combName} className="text-rose-700 font-bold">{c.combName} : {c.stability_message}</div>
          ))}
          <div className="flex flex-wrap gap-2">
            {[
              ['Glissement', result.governingSliding.status_sliding === 'NON VÉRIFIABLE' ? 'nv' : result.governingSliding.status_sliding === 'OK', `FS = ${result.governingSliding.FOS_sliding.toFixed(2)}`],
              ['Renversement', result.governingOverturning.status_overturning === 'NON VÉRIFIABLE' ? 'nv' : result.governingOverturning.status_overturning === 'OK', result.governingOverturning.outside_base ? 'hors base' : `FS = ${result.governingOverturning.FOS_overturning.toFixed(2)}`],
              ['Excentricité e ≤ B/6 (ÉLU et ÉLS)', result.eccentricity_ok_ULS && result.eccentricity_ok_SLS, `ÉLU : ${result.eccentricity_ok_ULS ? 'respectée' : 'non respectée'} ; ÉLS : ${result.eccentricity_ok_SLS ? 'respectée' : 'non respectée'}`],
              ['Portance ÉLU', result.governingBearing.status_bearing === 'OK', result.governingBearing.outside_base ? 'non vérifiable (résultante hors base)' : `q = ${result.governingBearing.q_design.toFixed(1)} / ${result.governingBearing.q_capacity.toFixed(1)} kPa`],
              ['Béton du mur et de la semelle', Object.values(result.concreteDesign).every((d: any) => (d.checks_ok ?? d.status_ok) === true), 'flexion, cisaillement, As,min, ductilité, fissuration, ancrage, frottement']
            ].map(([label, ok, detail]) => (
              <span key={label as string} className={`px-2 py-1 rounded font-bold ${!result.verifiable || ok === 'nv' ? 'bg-amber-100 text-amber-800' : ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {label as string} : {!result.verifiable || ok === 'nv' ? 'NON VÉRIFIABLE' : ok ? 'CONFORME' : 'NON CONFORME'} ({detail as string})
              </span>
            ))}
          </div>
        </div>


        {/* 4.1 FACTEURS GÉOTECHNIQUES, SÉISME ET BUTÉE : VALEURS, SOURCES, STATUTS (MUR-02 §9) */}
        <div className="space-y-2">
          <SubTitle n="4.1" title="Facteurs géotechniques, séisme et butée : valeurs, sources et statut" />
          <DataTable
            head={['Désignation', 'Symbole', 'Valeur', 'Source', 'Statut']}
            rows={[
              ['Degré de compréhension du site', '—', result.geotech.level === 'low' ? 'faible' : result.geotech.level === 'high' ? 'élevé' : 'typique', 'CFEM 5e, tableau 6.2, p. 199 (PDF 231)', 'Choix de l\'utilisateur'],
              ['Facteur de conséquence', 'Ψ', fmt(result.geotech.psi, 2), 'CFEM 5e, tableau 6.4, p. 200 (PDF 232) ; éq. 6.1, p. 191', 'Choix de l\'utilisateur ; lu'],
              ['Portance de la semelle du mur', 'φgu', fmt(result.geotech.phi_gu, 2), 'CFEM 5e, tableau 6.2 (Retaining systems, Bearing)', result.geotech.quFactored ? 'Lu ; qu déclarée déjà pondérée (φgu = 1)' : 'Lu ; qu non pondérée'],
              ['Renversement', 'φ_ov', fmt(result.geotech.phi_ov, 2), 'CFEM 5e, tableau 6.2 (Retaining systems, Overturning)', 'Lu ; application à ΣM_stab : À CONFIRMER'],
              ['Glissement à la base (frottement)', 'φgs', fmt(result.geotech.phi_gs, 2), 'CFEM 5e, tableau 6.2 (Retaining systems, Base sliding)', 'Lu'],
              ['Glissement, sol cohésif (terme c′a·B′)', 'φcoh', fmt(result.geotech.phi_coh, 2), 'CFEM 5e, tableau 6.2 (Shallow foundations, Sliding cohesive)', 'Lu ; application sur B′ : À CONFIRMER (D13)'],
              ['Butée', 'φp', fmt(result.geotech.phi_p, 2), 'CFEM 5e, tableau 6.2 (Shallow foundations, Passive resistance)', 'Lu ; aucune autre réduction de Kp'],
              ['Tassement, déplacement (ÉLS)', 'φ', fmt(result.geotech.phi_settle, 1), 'CFEM 5e, tableau 6.2 (Retaining systems, Settlement)', 'Non appliqué : q_adm,ÉLS vient du rapport géotechnique — À CONFIRMER'],
              ['Facteur de H au cas 5', 'αH', fmt(FACTEUR_H_SISMIQUE, 1), 'CNB, note A-4.1.3.2.(4) ; tableau A-3, Commentaire A du CNB 2020', 'Lu (2020) ; Commentaire 2025 : À CONFIRMER'],
              ['Accélération horizontale du site', 'ah', seismicOn ? fmt(result.seismic.ah, 3) + ' g' : 'sans objet', seismicOn ? (result.seismic.ahSource.trim() || 'source non renseignée') : '—', seismicOn ? (result.seismic.ahSource.trim() ? 'Saisi par l\'utilisateur' : 'À CONFIRMER : source de ah non renseignée') : '—'],
              ...(soil.siteSeismic?.source
                ? [[
                    'Site (données CNRC SHD-VAS 2020)', 'PGA(X)',
                    `${soil.siteSeismic.locality} ; ${soil.siteSeismic.province ?? 'province non renseignée'} ; classe ${soil.siteSeismic.siteClass || 'non renseignée'} ; PGA(${soil.siteSeismic.siteClass}) = ${fmt(soil.siteSeismic.pga, 3)} g ; ah = ${fmt(result.seismic.ah, 3)} g ; kh = ${fmt(result.seismic.kh, 3)} ; kv = ${result.seismic.csaS6 ? '0' : fmt(result.seismic.kvInput, 3)}`,
                    `${soil.siteSeismic.source} ; CNB 2020, 4.1.8.4 ; CFEM 5e, p. 629 (classe du sol sous la semelle, remblai exclu)`,
                    result.seismic.ahSource.startsWith('CNRC SHD-VAS') ? 'Lu dans les tables du CNRC ; aucun F(PGA)' : `ah modifié : source de ah « ${result.seismic.ahSource || 'non renseignée'} »`
                  ]]
                : []),
              ...(result.cnbEdition === '2025' ? [['Données sismiques, édition CNB 2025', '—', 'Données CNRC du CNB 2020 ; données CNB 2025 : À CONFIRMER', 'CNB 2025, annexe C, p. C-48', 'À CONFIRMER']] : []),
              ...(soil.siteSeismic && (soil.siteSeismic.locality.trim() || soil.siteSeismic.pga > 0 || soil.siteSeismic.sa02 > 0)
                ? [[
                    'Valeurs du site (calculateur d\'aléa de RNCan)', '—',
                    `${soil.siteSeismic.locality.trim() || 'localité non renseignée'} ; classe ${soil.siteSeismic.siteClass.trim() || 'non renseignée'} ; Sa(0,2) = ${soil.siteSeismic.sa02 > 0 ? fmt(soil.siteSeismic.sa02, 3) + ' g' : 'non saisi'} ; PGA = ${soil.siteSeismic.pga > 0 ? fmt(soil.siteSeismic.pga, 3) + ' g' : 'non saisi'} ; PGV = ${soil.siteSeismic.pgv > 0 ? fmt(soil.siteSeismic.pgv, 3) + ' m/s' : 'non saisi'}`,
                    'RNCan, calculateur d\'aléa sismique (CNB) ; CFEM 5e, p. 629 (PGA de la classe d\'emplacement sous la semelle)',
                    'Enregistrées seulement : le moteur utilise ah (kh = ah) ; conversion F(PGA) non programmée : À CONFIRMER'
                  ]]
                : []),
              ['Coefficient sismique horizontal', 'kh', seismicOn ? fmt(result.seismic.kh, 3) : 'sans objet', 'CFEM 5e, éq. 18.22, p. 629 (kh = ah/g)', result.seismic.csaS6 ? 'Option avancée active : kh = 0,5·ah (CSA S6 citée par le CFEM p. 631, non du CNB) ; déplacement admis de 25 à 50 mm non vérifié par le logiciel' : 'Lu ; kh = ah (défaut)'],
              ['Coefficient sismique vertical', 'kv', seismicOn ? (result.seismic.csaS6 ? '0 (option CSA S6)' : result.seismic.kvNeglected ? '0 (kv négligé)' : result.seismic.scenarios.length > 1 ? `±${fmt(result.seismic.kvInput, 3)} (deux signes étudiés)` : fmt(result.seismic.kvInput, 3)) : 'sans objet', 'CFEM 5e, p. 629 (kv = 2/3·kh à défaut d\'étude du site)', result.seismic.kvNeglected ? 'kv négligé (kv = 0) : choix de l’utilisateur ; le CFEM 5e (p. 629) propose kv = ⅔·kh à défaut d’étude du site' : 'Valeur saisie par l\'utilisateur'],
              ['Butée statique : profondeur de gel', 'df', result.frost.deduct ? fmt(result.frost.df, 2) + ' m (déduite)' : 'non déduite', 'CFEM 5e, 20.7.3.3, p. 698 ; fig. 20.10', result.frost.deduct ? (result.frost.df_entered ? 'Choix de l\'utilisateur ; zone de butée de df à hp' : 'À CONFIRMER : df non saisie') : 'Sol avant déclaré permanent et non gélif par l\'utilisateur'],
              ['Butée au séisme', '—', result.seismic.passiveMode === 'kpe' ? 'réduite (KPE)' : 'nulle', 'CFEM 5e, éq. 18.27-18.31, p. 630-631', 'Choix de l\'utilisateur'],
              ['Frottement sur le plan fictif (séisme)', 'δ', result.soilMethodConfig.activeMethod === 'coulomb' ? 'δ de Coulomb (même valeur pour Ka et KAE)' : '0 (remblai horizontal)', 'MUR-02 D11', 'Approuvé'],
              ['Inertie du sol au-dessus du talon', '—', 'incluse', 'CFEM 5e, fig. 18.34 (khW du coin mobilisé)', 'À CONFIRMER : source de la règle pour un mur en porte-à-faux'],
              ['Westergaard (eau à l\'avant) / Matsuzawa (remblai saturé)', '—', result.seismic.westergaard ? 'Westergaard appliqué (réduit Pw,a)' : 'sans objet', 'CFEM 5e, éq. 18.33-18.35, p. 632-633', 'Matsuzawa NON APPLIQUÉ (Gs et e absents) — À CONFIRMER ; sens de Westergaard retenu : défavorable, À CONFIRMER'],
              ['Code de construction du Québec', '—', 'édition et modifications non vérifiées', 'Chapitre I – Bâtiment', 'À CONFIRMER (D17)'],
              ['Mur isolé hors bâtiment : application de la partie 4 du CNB', '—', 'partie 4 appliquée', 'MUR-02 D18', 'À CONFIRMER'],
            ]}
          />
        </div>

        {/* 4.2 SÉISME : résultats par signe de kv */}
        {seismicOn && result.seismic.scenarios.length > 0 && (
          <div className="space-y-2">
            <SubTitle n="4.2" title="Séisme : coefficients et incréments de poussée (valeurs du moteur)" />
            <DataTable
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
            />
            <p className="text-[11px] text-slate-500">
              Inertie (kN/m) : voile {fmt(ep.E_stem_nominal, 2)}, semelle {fmt(ep.E_base_nominal, 2)}, sol du talon {fmt(ep.E_heelSoil_nominal, 2)} (poids {fmt(ep.W_heelSoil_inertia, 2)} kN/m à y = {fmt(ep.y_heelSoil, 2)} m).
              Matsuzawa (CFEM 18.7.2.2) : NON APPLIQUÉ, À CONFIRMER ; liquéfaction et déplacements permanents : NON VÉRIFIÉS. Westergaard : action E ajoutée à ΣHf. Hypothèse conservatrice : la force kv·W dirigée vers le bas est prise égale à zéro au glissement et au renversement (hypothèse conservatrice, À CONFIRMER) ; elle est comptée à la portance. {result.seismic.method === 'seed_whitman' ? 'Seed & Whitman : hors fiche MUR-02 (méthode simplifiée, sans (1 − kv) ni contrôle d\'indétermination).' : ''}
            </p>
          </div>
        )}

        {/* 4.3 GLISSEMENT ET RENVERSEMENT : tableau 1c */}
        <div className="space-y-2">
          <SubTitle n="4.3" title="Tableau 1c : glissement et renversement (ÉLU)" />
          <Eq
            general={<>
              <div>Glissement, long terme (drainé) : <V n="Ψ" />·[ <V n="φ" s="gs" />·Σ<V n="V" prime />·tan <V n="δ" s="b" /> + <V n="φ" s="p" />·(<V n="P" s="p" prime /> + <V n="P" s="w,a" />) ] ≥ Σ<V n="H" s="f" /> ; <V n="c" s="a" prime /> = 0</div>
              <div>Glissement, court terme (assise CL) : <V n="Ψ" />·<V n="φ" s="coh" />·<V n="c" s="a" />·<V n="B" prime /> ≥ Σ<V n="H" s="f" /> (butée nulle) ; le plus défavorable gouverne</div>
              <div>Renversement : <V n="Ψ" />·<V n="φ" s="ov" />·Σ<V n="M" s="stab" /> ≥ Σ<V n="M" s="renv" /></div>
            </>}
          />
          <p className="text-[10px] text-slate-600">Glissement et renversement : combinaisons ÉLU avec la charge permanente stabilisante (0,9D aux cas 2 à 4, 1,0D au cas 5 ; CNB 4.1.3.2.(5)) ; ÉLS sans objet (MUR-02 §12).</p>
          <NoteTable
            cols={[
              { name: 'Combinaison' },
              { name: 'ΣV′', unit: '(kN/m)', align: 'right' },
              { name: 'Frottement', unit: '(kN/m)', align: 'right' },
              { name: 'Cohésion', unit: '(kN/m)', align: 'right' },
              { name: 'Butée', unit: '(kN/m)', align: 'right' },
              { name: 'Rf', unit: '(kN/m)', align: 'right' },
              { name: 'ΣHf', unit: '(kN/m)', align: 'right' },
              { name: 'Rf/ΣHf', align: 'right' },
              { name: 'Gliss.', title: 'Glissement', align: 'center' },
              { name: 'Ψ·φov·ΣMstab', unit: '(kN·m/m)', align: 'right' },
              { name: 'ΣMrenv', unit: '(kN·m/m)', align: 'right' },
              { name: 'Ms/Mr', align: 'right' },
              { name: 'Renv.', title: 'Renversement', align: 'center' },
            ]}
            rows={result.combinations.filter(c => c.type === 'ULS' && c.stabApplicable).map(c => [
              shortComb(c.combName),
              c.sumV_min.toFixed(1), c.Rf_friction.toFixed(1), c.Rf_cohesion.toFixed(1), c.Rf_passive.toFixed(1), c.Fs.toFixed(1), c.Fh_destab.toFixed(1),
              <strong key="r1">{c.FOS_sliding === Infinity ? '∞' : c.FOS_sliding.toFixed(3)}</strong>,
              <React.Fragment key="s1"><StatusPill status={c.status_sliding} verifiable={result.verifiable} /></React.Fragment>,
              c.Ms.toFixed(1), c.Mr.toFixed(1),
              <strong key="r2">{c.FOS_overturning === Infinity ? '∞' : c.FOS_overturning.toFixed(3)}</strong>,
              <React.Fragment key="s2"><StatusPill status={c.status_overturning} verifiable={result.verifiable} /></React.Fragment>,
            ])}
          />
          <p className="text-[11px] text-slate-500">
            Σ<V n="V" prime /> : force verticale effective (poids déjaugé, sous-pression déduite). Terme d’adhérence à court terme sur <V n="B" prime /> = <V n="B" /> − 2<V n="e" /> (À CONFIRMER). Facteurs : <V n="Ψ" /> = {fmt(result.geotech.psi, 2)}, <V n="φ" s="gs" /> = {fmt(result.geotech.phi_gs, 2)}, <V n="φ" s="coh" /> = {fmt(result.geotech.phi_coh, 2)}, <V n="φ" s="p" /> = {fmt(result.geotech.phi_p, 2)}, <V n="φ" s="ov" /> = {fmt(result.geotech.phi_ov, 2)}.
            {result.stabilityCriterion === 'eccentricity' && ' Critère B′ = B − 2e : le renversement est en principe couvert par la portance et la limite de e (CFEM 20.7.3.4) ; la vérification Ψ·φ_ov·ΣM_stab est tout de même conservée et affichée.'}
          </p>
        </div>

        {/* TABLEAUX 1a (ÉLU) et 1b (ÉLS) : PRESSION DE CONTACT, EXCENTRICITÉ & PORTANCE */}
        {([
          { key: 'ULS', combs: ulsCombs, dot: 'bg-purple-600', title: `Tableau 1a : Combinaisons ÉLU — portance pondérée (CNB ${result.cnbEdition}, ${ulsCombs.length} combinaisons)`, limit: `q_res (ÉLU) = Ψ·φgu·qu = ${(result.geotech.psi * result.geotech.phi_gu * soil.qUltimate_ULS).toFixed(1)} kPa` },
          { key: 'SLS', combs: slsCombs, dot: 'bg-blue-600', title: `Tableau 1b : Combinaisons ÉLS — pression de contact et tiers central (${slsCombs.length} combinaisons)`, limit: `q_adm (ÉLS) = ${soil.qAllowable_SLS.toFixed(1)} kPa` },
        ] as const).map(({ key, combs, dot, title, limit }) => (
        <div key={key} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${dot}`}></span>
              {title}
            </h3>
            <span className="text-[11px] font-bold text-slate-500">{limit}</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[10px]">
                  <th className="px-1 py-2 font-bold">No</th>
                  <th className="px-1 py-2 font-bold">Combinaison</th>
                  <th className="px-1 py-2 font-bold text-center">D</th>
                  <th className="px-1 py-2 font-bold text-center">L</th>
                  <th className="px-1 py-2 font-bold text-center">S</th>
                  <th className="px-1 py-2 font-bold text-center">W</th>
                  <th className="px-1 py-2 font-bold text-center">E</th>
                  <th className="px-1 py-2 font-bold text-center">H</th>
                  <th className="px-1 py-2 font-bold text-right">Rv (kN/m)</th>
                  <th className="px-1 py-2 font-bold text-right">e (m)</th>
                  <th className="px-1 py-2 font-bold text-right">B/6 (m)</th>
                  <th className="px-1 py-2 font-bold text-center">e ≤ B/6</th>
                  <th className="px-1 py-2 font-bold text-right">x1 (m)</th>
                  <th className="px-1 py-2 font-bold text-right bg-blue-900">q1 (kPa)</th>
                  <th className="px-1 py-2 font-bold text-right">q2 (kPa)</th>
                  <th className="px-1 py-2 font-bold text-right">Limite (kPa)</th>
                  <th className="px-1 py-2 font-bold text-center">Ratio</th>
                  <th className="px-1 py-2 font-bold text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
                {combs.map((c, idx) => {
                  const qLimit = c.q_capacity; // Psi.phi_gu.qu (ELU) ou q_adm (ELS), calcule par le moteur
                  const isExceeded = c.status_bearing === 'NON';
                  const isGoverning = c.type === 'SLS' 
                    ? (result.governingSLS && result.governingSLS.combName === c.combName)
                    : (result.governingBearing && result.governingBearing.combName === c.combName);
                  const ratio = qLimit > 0 ? (c.q_design / qLimit) : 0;

                  return (
                    <tr
                      key={c.combName}
                      className={`${isGoverning ? 'bg-amber-50/80 font-bold' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                    >
                      <td className="px-1 py-1 text-slate-500 font-sans">{idx + 1}</td>
                      <td className="px-1 py-1 text-slate-800 font-sans font-bold min-w-[5.5rem]">
                        {/* « Combinaison ELS 1 (1D + 1H + 1L) » → « 1D + 1H + 1L » : l'en-tête dit déjà « Combinaison » */}
                        {c.combName.replace(/^Combinaison\s+\S+\s+\d+\s*\((.*)\)$/, '$1')}
                        {isGoverning && (
                          <span className="ml-1.5 px-1 py-0.5 rounded text-[9px] bg-amber-200 text-amber-900 font-bold">
                            Gouvernant
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-1 whitespace-nowrap text-center text-slate-600">{c.factors.D}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-center text-slate-600">{c.factors.L}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-center text-slate-600">{c.factors.S}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-center text-slate-600">{c.factors.W}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-center text-slate-600">{c.factors.E || 0}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-center text-slate-600">{c.factors.H}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-right">{c.sumV_max.toFixed(1)}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-right">{Math.abs(c.ecc).toFixed(3)}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-right text-slate-500">{B_over_6.toFixed(3)}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-center font-sans font-bold">{!result.verifiable ? 'n. v.' : c.status_ecc === 'OK' ? 'OK' : 'NON'}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-right">{c.x1.toFixed(3)}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-right font-black text-blue-900 bg-blue-50/50">{c.outside_base ? 'n. v.' : c.q_toe.toFixed(1)}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-right">{c.outside_base ? 'n. v.' : c.q_heel.toFixed(1)}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-right text-slate-600 font-semibold">{qLimit.toFixed(1)}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-center">{c.outside_base ? '—' : `${(ratio * 100).toFixed(0)} %`}</td>
                      <td className="px-1 py-1 whitespace-nowrap text-center">
                        <span className={`px-1 py-0.5 rounded text-[10px] font-bold font-sans ${
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
          {combs.some(c => c.outside_base) && (
            <p className="text-[10px] text-slate-500">n. v. : non vérifiable, la résultante sort de la base.</p>
          )}
        </div>
        ))}

        {/* 4.4 BÉTON ARMÉ : CSA A23.3-19 (MUR-02 §6) — statuts calculés */}
        <div className="space-y-2">
          <SubTitle n="4.4" title="Béton armé : vérifications CSA A23.3-19 (valeurs du moteur)" />
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-1 py-1.5 font-bold align-bottom leading-tight">Élément</th>
                  <th className="px-1 py-1.5 font-bold align-bottom leading-tight">Armature</th>
                  <th className="px-1 py-1.5 font-bold align-bottom leading-tight">As / As,min<span className="block text-[9px] font-normal text-slate-300">(mm²/m) — article</span></th>
                  <th className="px-1 py-1.5 font-bold align-bottom leading-tight">Espacement / max<span className="block text-[9px] font-normal text-slate-300">(mm)</span></th>
                  <th className="px-1 py-1.5 font-bold align-bottom leading-tight">Mr / Mf<span className="block text-[9px] font-normal text-slate-300">(kN·m/m)</span></th>
                  <th className="px-1 py-1.5 font-bold align-bottom leading-tight">c/d ≤ limite<span className="block text-[9px] font-normal text-slate-300">(10.5.2)</span></th>
                  <th className="px-1 py-1.5 font-bold align-bottom leading-tight">Vf / min(Vc ; Vr,max)<span className="block text-[9px] font-normal text-slate-300">(kN/m)</span></th>
                  <th className="px-1 py-1.5 font-bold align-bottom leading-tight">z / limite<span className="block text-[9px] font-normal text-slate-300">(N/mm) — 10.6.1</span></th>
                  <th className="px-1 py-1.5 font-bold align-bottom leading-tight">ld / ldh<span className="block text-[9px] font-normal text-slate-300">(mm)</span></th>
                  <th className="px-1 py-1.5 font-bold align-bottom leading-tight">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {([
                  result.concreteDesign.mur_interieur,
                  result.concreteDesign.mur_exterieur,
                  { ...result.concreteDesign.mur_horizontal_ext, elementName: 'Voile - horizontales ext. (A3)' },
                  { ...result.concreteDesign.mur_horizontal_int, elementName: 'Voile - horizontales int. (A4)' },
                  { ...result.concreteDesign.mur_horizontal, elementName: 'Voile - total horizontal (A3 + A4) / 0,002Ag' },
                  result.concreteDesign.semelle_talon,
                  result.concreteDesign.semelle_orteil,
                  result.concreteDesign.semelle_retrait
                ]).map((d, idx) => (
                  <tr key={d.elementName} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-1 py-1 font-sans font-bold min-w-[6rem]">{d.elementName}</td>
                    <td className="px-1 py-1">{d.bar_designation}</td>
                    <td className="px-1 py-1 max-w-[11rem] whitespace-normal">{/horizontales (ext|int)\./.test(d.elementName)
                      ? <>{d.As_provided.toFixed(0)} (face) ; Σ A3 + A4 = {result.concreteDesign.mur_horizontal.As_provided.toFixed(0)} {d.As_ok ? '≥' : '<'} {d.As_min.toFixed(0)} <span className="block font-sans text-[9px] text-slate-500">(14.1.8.6)</span></>
                      : <>{d.As_provided.toFixed(0)} {d.As_ok ? '≥' : '<'} {d.As_min.toFixed(0)} <span className="block font-serif text-[9px] leading-tight text-slate-500"><Fm>{`(${d.As_min_basis})`}</Fm></span></>}</td>
                    <td className="px-1 py-1 whitespace-normal">{d.spacing.toFixed(0)} / {d.spacing_max.toFixed(0)} {d.spacing_ok ? '' : '(dépassé)'}{d.db_max !== undefined ? <Fm>{` ; db ${d.db.toFixed(1)} / ${d.db_max.toFixed(0)}`}</Fm> : ''}</td>
                    <td className="px-1 py-1 whitespace-nowrap">{d.Mr > 0 ? `${d.Mr.toFixed(1)} / ${d.Mf.toFixed(1)}` : '—'}</td>
                    <td className="px-1 py-1 whitespace-nowrap">{d.Mr > 0 ? `${d.ductility_c_over_d.toFixed(3)} ≤ ${d.ductility_limit.toFixed(3)}` : '—'}</td>
                    <td className="px-1 py-1 whitespace-nowrap">{d.Vf > 0 ? `${d.Vf.toFixed(1)} / ${Math.min(d.Vc, d.Vr_max).toFixed(1)}` : '—'}</td>
                    <td className="px-1 py-1 whitespace-nowrap">{d.Z_factor !== undefined && d.Z_limit !== undefined ? `${d.Z_factor.toFixed(0)} / ${d.Z_limit.toFixed(0)}` : '—'}</td>
                    <td className="px-1 py-1 whitespace-nowrap">{d.ld.toFixed(0)} / {d.ldh_required !== undefined ? d.ldh_required.toFixed(0) : '—'}</td>
                    <td className="px-1 py-1 font-sans max-w-[6rem] whitespace-normal leading-tight">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${!result.verifiable ? 'bg-amber-100 text-amber-800' : !d.checks_ok ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {!result.verifiable ? 'non vérifiable' : !d.checks_ok ? 'NON' : 'OK'}
                      </span>
                      {result.verifiable && d.checks_ok && d.ld_status === 'À CONFIRMER' && <span className="block text-[9px] text-amber-800 font-bold mt-0.5"><Fm>ld : À CONFIRMER</Fm></span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(() => {
            const cdz = result.concreteDesign;
            const fr_ = cdz.cisaillement_friction;
            const eq121 = [cdz.mur_interieur, cdz.semelle_talon, cdz.semelle_orteil].some(d => d.ld_eq12_1_required);
            const rows: [string, React.ReactNode, React.ReactNode][] = [
              ['Voile (face intérieure)', <>Facteur <V n="β" /> (11.3.6) [{cdz.mur_interieur.beta_rule}]</>, <><V n="β" /> = {cdz.mur_interieur.beta.toFixed(4)}</>],
              ['Voile (face intérieure)', <><V n="V" s="r,max" /> = 0,25·<V n="φ" s="c" />·<i>f</i>′<sub className="text-[0.75em]">c</sub>·<V n="b" s="w" />·<V n="d" s="v" /> (11.3.3) ; <V n="V" s="f" /> à <V n="d" s="v" /> (information)</>, <><V n="V" s="f" /> = {fr_.Vf_dv.toFixed(1)} kN/m</>],
              ['Talon', <>Facteur <V n="β" /> [{cdz.semelle_talon.beta_rule}]</>, <><V n="β" /> = {cdz.semelle_talon.beta.toFixed(4)}</>],
              ['Patin', <>Facteur <V n="β" /> [{cdz.semelle_orteil.beta_rule}]</>, <><V n="β" /> = {cdz.semelle_orteil.beta.toFixed(4)}</>],
              ['Ductilité (10.5.2)', <>{<Fm>{cdz.mur_interieur.ductility_rule}</Fm>} ; l’ancienne limite 700/(700 + <V n="f" s="y" />) non sécuritaire est retirée</>, <>c/d ≤ limite (colonne du tableau)</>],
              ['Longueur d’ancrage (12.2)', <><V n="l" s="d" /> = {cdz.mur_interieur.ld_coeff?.toFixed(2)}·<V n="k" s="1" />·<V n="k" s="4" />·<V n="f" s="y" />/√<i>f</i>′<sub className="text-[0.75em]">c</sub>·<V n="d" s="b" /> ≥ 300 mm</>, <>talon : <V n="k" s="1" /> = {cdz.semelle_talon.ld_k1?.toFixed(1)}</>],
              ['Tableau 12.1', eq121 ? <>Enrobage ≥ <V n="d" s="b" /> et espacement ≥ 1,4<V n="d" s="b" /> non remplis pour au moins un élément : éq. 12.1 requise. Statut de <V n="l" s="d" /> À CONFIRMER (non vérifié ; valeur à 0,6 indicative). Espacement comparé d’axe en axe ; axe en axe ou libre : À CONFIRMER (A23.3 12.2.3).</> : <>Conditions remplies (enrobage ≥ <V n="d" s="b" />, espacement ≥ 1,4<V n="d" s="b" />).</>, eq121 ? 'À CONFIRMER' : 'remplies'],
              ['Crochet (12.5)', <><V n="l" s="dh" /> : <Fm>{cdz.mur_interieur.ldh_factors}</Fm></>, '—'],
              ['Joint voile-semelle (11.5)', <><V n="V" s="r" /> {fr_.status_ok ? '≥' : '<'} <V n="V" s="f" /> ; <V n="N" /> non pondéré ; <V n="σ" /> ; <V n="c" /> et <V n="μ" /> : {fr_.surface}{fr_.capped ? ' ; limite 0,25·φc·f′c atteinte' : ''}</>, <><V n="V" s="r" /> = {fr_.Vr.toFixed(1)} kN/m ; <V n="V" s="f" /> = {fr_.Vf.toFixed(1)} kN/m ; <V n="N" /> = {fr_.N.toFixed(1)} kN/m ; <V n="σ" /> = {fr_.sigma.toFixed(3)} MPa — {!result.verifiable ? 'NON VÉRIFIABLE' : fr_.status_ok ? 'OK' : 'NON'}</>],
            ];
            return (
              <NoteTable
                cols={[{ name: 'Élément' }, { name: 'Vérification' }, { name: 'Valeur' }]}
                rows={rows.map(([e, v, val]) => [e, <span key="v" className="font-serif whitespace-normal">{v}</span>, <span key="x" className="font-serif whitespace-normal">{val}</span>])}
              />
            );
          })()}
        </div>

        {/* TABLE 2: ELU - MUR */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              Tableau 2 : ÉLU — Sollicitations du Voile (Flexion Mf & Cisaillement Vf) ({ulsCombs.length} Combinaisons ÉLU)
            </h3>
            <span className="text-[11px] font-bold text-slate-500">
              Armature fournie : {result.concreteDesign.mur_interieur.bar_designation} (Mr = {result.concreteDesign.mur_interieur.Mr.toFixed(1)} kNm/m)
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[10px]">
                  <th className="px-1 py-1.5 font-bold">No</th>
                  <th className="px-1 py-1.5 font-bold">Combinaison</th>
                  <th className="px-1 py-1.5 font-bold text-right">Terres<span className="block text-[9px] font-normal text-slate-300">(kN/m)</span></th>
                  <th className="px-1 py-1.5 font-bold text-right">Eau<span className="block text-[9px] font-normal text-slate-300">(kN/m)</span></th>
                  <th className="px-1 py-1.5 font-bold text-right">Surcharge<span className="block text-[9px] font-normal text-slate-300">(kN/m)</span></th>
                  <th className="px-1 py-1.5 font-bold text-right">Séisme<span className="block text-[9px] font-normal text-slate-300">(kN/m)</span></th>
                  {showOtherStem && <th className="px-1 py-1.5 font-bold text-right">Autres<span className="block text-[9px] font-normal text-slate-300">(kN/m)</span></th>}
                  <th className="px-1 py-1.5 font-bold text-right bg-indigo-900">Mf<span className="block text-[9px] font-normal text-slate-300">(kN·m/m)</span></th>
                  <th className="px-1 py-1.5 font-bold text-right">Vf<span className="block text-[9px] font-normal text-slate-300">(kN/m)</span></th>
                  <th className="px-1 py-1.5 font-bold text-right">As fournie<span className="block text-[9px] font-normal text-slate-300">(mm²/m)</span></th>
                  <th className="px-1 py-1.5 font-bold text-center">Ratio<span className="block text-[9px] font-normal text-slate-300">Mf/Mr</span></th>
                  <th className="px-1 py-1.5 font-bold text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
                {ulsCombs.map((c, idx) => {
                  const mr = result.concreteDesign.mur_interieur.Mr;
                  const ratio = mr > 0 ? (c.mur_Mf / mr) : 0;
                  const isOk = c.mur_Mf <= mr;
                  const isGovStem = result.governingStem && result.governingStem.combName === c.combName;

                  return (
                    <tr key={c.combName} className={`${isGovStem ? 'bg-amber-50/80 font-bold' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                      <td className="px-1 py-1 text-slate-500 font-sans">{idx + 1}</td>
                      <td className="px-1 py-1 text-slate-800 font-sans font-bold min-w-[5.5rem]">
                        {shortComb(c.combName)}
                        {isGovStem && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-amber-200 text-amber-900 font-bold">
                            Gouvernant Mf
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-1 text-right">{c.stem_lateral.terre.toFixed(1)}</td>
                      <td className="px-1 py-1 text-right">{c.stem_lateral.eau.toFixed(1)}</td>
                      <td className="px-1 py-1 text-right">{c.stem_lateral.surcharge.toFixed(1)}</td>
                      <td className="px-1 py-1 text-right">{c.stem_lateral.seisme.toFixed(1)}</td>
                      {showOtherStem && <td className="px-1 py-1 text-right">{c.stem_lateral.autres.toFixed(1)}</td>}
                      <td className="px-1 py-1 text-right font-black text-indigo-900 bg-indigo-50/50">{c.mur_Mf.toFixed(1)}</td>
                      <td className="px-1 py-1 text-right">{c.mur_Vf.toFixed(1)}</td>
                      <td className="px-1 py-1 text-right">{result.concreteDesign.mur_interieur.As_provided.toFixed(0)}</td>
                      <td className="px-1 py-1 text-center">{(ratio * 100).toFixed(0)} %</td>
                      <td className="px-1 py-1 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-sans ${
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
          <p className="text-[10px] text-slate-500">Forces latérales pondérées réellement appliquées au voile par le calcul (sol sec et déjaugé, hauteur remblayée h<sub>r</sub>, nappe, surcharge, séisme). Mur en porte-à-faux : leur somme égale V<sub>f</sub> à la base du voile.</p>
        </div>

        {/* TABLE 3: ELU - SEMELLE */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              Tableau 3 : ÉLU — Sollicitations de la Semelle (Patin Avant & Talon Arrière) ({ulsCombs.length} Combinaisons ÉLU)
            </h3>
            <span className="text-[11px] font-bold text-slate-500">
              Patin : {result.concreteDesign.semelle_orteil.bar_designation} | Talon : {result.concreteDesign.semelle_talon.bar_designation}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[10px]">
                  <th className="px-1 py-1.5 font-bold">No</th>
                  <th className="px-1 py-1.5 font-bold">Combinaison</th>
                  <th className="px-1 py-1.5 font-bold text-right bg-emerald-900">Patin Mf<span className="block text-[9px] font-normal text-slate-300">(kN·m/m)</span></th>
                  <th className="px-1 py-1.5 font-bold text-right">Patin Vf<span className="block text-[9px] font-normal text-slate-300">(kN/m)</span></th>
                  <th className="px-1 py-1.5 font-bold text-right bg-emerald-900">Talon Mf<span className="block text-[9px] font-normal text-slate-300">(kN·m/m)</span></th>
                  <th className="px-1 py-1.5 font-bold text-right">Talon Vf<span className="block text-[9px] font-normal text-slate-300">(kN/m)</span></th>
                  <th className="px-1 py-1.5 font-bold text-center">Ratio<span className="block text-[9px] font-normal text-slate-300">Patin</span></th>
                  <th className="px-1 py-1.5 font-bold text-center">Ratio<span className="block text-[9px] font-normal text-slate-300">Talon</span></th>
                  <th className="px-1 py-1.5 font-bold text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
                {ulsCombs.map((c, idx) => {
                  const mrToe = result.concreteDesign.semelle_orteil.Mr;
                  const mrHeel = result.concreteDesign.semelle_talon.Mr;
                  const ratioToe = mrToe > 0 ? (c.toe_Mf / mrToe) : 0;
                  const ratioHeel = mrHeel > 0 ? (c.heel_Mf / mrHeel) : 0;
                  const isOk = c.toe_Mf <= mrToe && c.heel_Mf <= mrHeel;
                  const isGovToe = result.governingToe && result.governingToe.combName === c.combName;
                  const isGovHeel = result.governingHeel && result.governingHeel.combName === c.combName;

                  return (
                    <tr key={c.combName} className={`${isGovToe || isGovHeel ? 'bg-amber-50/80 font-bold' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                      <td className="px-1 py-1 text-slate-500 font-sans">{idx + 1}</td>
                      <td className="px-1 py-1 text-slate-800 font-sans font-bold min-w-[5.5rem]">
                        {shortComb(c.combName)}
                        {isGovToe && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-emerald-200 text-emerald-900 font-bold">
                            Gov. Patin
                          </span>
                        )}
                        {isGovHeel && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-blue-200 text-blue-900 font-bold">
                            Gov. Talon
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-1 text-right font-black text-emerald-900 bg-emerald-50/40">{c.toe_Mf.toFixed(1)}</td>
                      <td className="px-1 py-1 text-right">{c.toe_Vf.toFixed(1)}</td>
                      <td className="px-1 py-1 text-right font-black text-emerald-900 bg-emerald-50/40">{c.heel_Mf.toFixed(1)}</td>
                      <td className="px-1 py-1 text-right">{c.heel_Vf.toFixed(1)}</td>
                      <td className="px-1 py-1 text-center">{(ratioToe * 100).toFixed(0)} %</td>
                      <td className="px-1 py-1 text-center">{(ratioHeel * 100).toFixed(0)} %</td>
                      <td className="px-1 py-1 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-sans ${
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
        </div>

        {/* EMBEDDED PRESSURE AND RESULTANT DIAGRAM */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
            Diagramme des Pressions au Sol & Vecteur Résultante Rv
          </h3>
          <BearingPressureDiagram geo={geo} soil={soil} result={result} />
        </div>

        {/* 4.5 FLÈCHE DU VOILE (ÉLS) — MUR-05 */}
        {(() => {
          const sd = result.stemDeflection;
          const gi = sd.governingIndex;
          return (
            <div className="space-y-3 pt-2">
              <SubTitle n="4.5" title="Flèche du voile (ÉLS)" />
              <p className="text-xs text-slate-700">
                Combinaisons ÉLS du tableau 4.1.3.4 du CNB {result.cnbEdition} (H = 1,0) ; CSA A23.3 9.8.2.2 à 9.8.2.5 ; Chaallal (2012) §3.4.2, p. 33 à 36, éq. 3.22, 3.25 à 3.27, tableau 3.3 ; fiche MUR-05.
                Mode : {sd.mode === 'cantilever' ? 'mur libre (flèche en tête)' : 'mur de sous-sol (flèche maximale entre les appuis)'}. Limite h/{frc(sd.divisor, 0)} = {frc(sd.limit, 2)} mm.
              </p>
              {!sd.valid || !sd.props || gi < 0 ? (
                <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-3">Flèche du voile NON VÉRIFIABLE : {sd.reason ?? 'données insuffisantes'}.</div>
              ) : (
                <>
                  <DeflectionPropEqs sd={sd} row={sd.rows[gi]} />
                  <p className="text-[11px] text-slate-500">I<sub>e</sub> ci-dessus : combinaison qui gouverne ({combId(sd.rows[gi].combName)}). Le tableau donne I<sub>e</sub> de chaque combinaison.</p>
                  <NoteTable
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
                      frc(r.factors.D, 2), frc(r.factors.L, 2), frc(r.factors.S, 2), frc(r.factors.W, 2), frc(r.factors.H, 2),
                      frc(r.Ma, 1), frc(r.Ie / 1e9, 3), frc(r.deltaI, 2), frc(r.deltaLT - r.deltaI, 2), frc(r.deltaLT, 2), fmtInt(r.hOverDelta), frc(r.limit, 1),
                      <span key="s"><StatusPill status={r.status} verifiable={r.status !== "NON VÉRIFIABLE"} /></span>
                    ])}
                  />
                  <p className="text-[11px] text-slate-600">
                    * Combinaison qui gouverne (plus grand |Δ<sub>LT</sub>|/limite = {frc(sd.rows[gi].utilization, 3)}). Conclusion au critère de l'utilisateur :{' '}
                    <strong>{sd.status === 'OK' ? 'CONFORME' : sd.status === 'NON' ? 'NON CONFORME' : 'NON VÉRIFIABLE'}</strong>.
                  </p>
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
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-sans whitespace-nowrap ${k === 'applique' ? 'bg-emerald-100 text-emerald-800' : k === 'confirmer' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
              {k === 'applique' ? 'appliqué' : k === 'confirmer' ? 'À CONFIRMER' : 'NON VÉRIFIÉ'}
            </span>
          );
          const frontB = result.earthPressures.frontWaterScenario !== 'A';
          const groups: { title: string; rows: [string, React.ReactNode, Pill][] }[] = [
            { title: 'Géotechnique', rows: [
              ['Éléments non vérifiés', <>Stabilité d’ensemble (glissement profond), gel et profondeur de la semelle (hors profondeur déduite de la butée), drainage, tassement calculé, pression de compactage (fig. 20.9), liquéfaction.</>, 'nonverifie'],
              ['Poids volumique sous la nappe', <><V n="γ" prime /> = <V n="γ" /> − <V n="γ" s="w" /> : le <V n="γ" /> saisi est pris comme poids volumique saturé.</>, 'applique'],
              ['Limite d’excentricité', <><V n="e" /> ≤ <V n="B" />/6 à l’ÉLU et à l’ÉLS (CFEM 5e, p. 348 et 20.7.3.4-20.7.3.5), statut calculé pour chaque combinaison. Une limite plus large (par ex. <V n="B" />/3) n’a aucune source lue : non appliquée.</>, 'applique'],
              ['Frottement et adhérence de la base (MUR-04)', <>tan <V n="δ" s="b" /> du sol d’assise (tableau 20.4(a), CFEM 5e, p. 691 : borne inférieure, plafonnée à <V n="φ" prime />), <V n="c" s="a" prime /> = 0 à long terme (p. 351). Assise cohérente (CL) : adhérence <V n="c" s="a" /> du tableau 20.4(b) interpolée linéairement, <V n="B" prime /> = <V n="B" /> − 2<V n="e" />, butée nulle à court terme ; le plus défavorable des deux conditions gouverne.</>, 'confirmer'],
              ['Frottement δ de Coulomb', <>Actif : δ = <V n="r" />·<V n="φ" /> du remblai (<V n="r" /> = {fmt(result.coulombRatio, 3)}), sans plafond par la base. Butée de Coulomb : δ = min(<V n="r" /> ; 0,5)·<V n="φ" prime /> (CFEM 5e, § 20.2.6).</>, 'confirmer'],
              ['Portance', <><V n="q" s="u" /> saisi par le géotechnicien ; il doit correspondre à la condition la plus défavorable (CFEM 5e, p. 344).</>, 'applique'],
            ] },
            { title: 'Eau', rows: [
              ['Sous-pression', <>Uniforme <V n="γ" s="w" />·<V n="h" s="w" />·<V n="B" /> sur la largeur <V n="B" /> (hypothèse conservatrice, drainage non défini) ; une sous-pression trapézoïdale est à traiter avec MUR-02. Facteur 1,5 appliqué à l’eau : classement À CONFIRMER.</>, 'confirmer'],
              [`Eau à l’avant (scénario ${result.earthPressures.frontWaterScenario})`, frontB
                ? <>Eau à l’avant comptée : niveau <V n="h" s="w,av" /> = {result.earthPressures.hw_av.toFixed(2)} m déclaré fiable par l’utilisateur ; <V n="P" s="w,a" /> reçoit les mêmes facteurs que la butée (<V n="φ" s="p" /> au glissement, <V n="φ" s="ov" /> au renversement).</>
                : <>Eau à l’avant non comptée (scénario conservateur) ; butée du sol calculée avec <V n="γ" prime /> sous la nappe.</>, frontB ? 'confirmer' : 'applique'],
            ] },
            { title: 'Séisme', rows: [
              ['Coefficients sismiques', <><V n="k" s="h" /> = <V n="a" s="h" /> (D6) ; <V n="k" s="v" /> = ⅔·<V n="k" s="h" /> à défaut d’étude du site (CFEM 5e, p. 629), deux signes étudiés ; option « négliger <V n="k" s="v" /> » (<V n="k" s="v" /> = 0) : choix de l’utilisateur.</>, 'applique'],
              ['Facteur de H au cas 5', <>Commentaire 2025 : À CONFIRMER. Augmentations de 4.1.8.16.(3) non appliquées (le mur ne fait pas partie du SFRS) : À CONFIRMER.</>, 'confirmer'],
            ] },
            { title: 'Béton (A23.3-19)', rows: [
              ['Cisaillement par frottement (11.5)', <><V n="c" /> = 0,25 MPa et <V n="μ" /> = 0,60 (surface non rendue rugueuse, D14) ; <V n="N" /> = charge permanente non pondérée (11.5.4) ; cumul avec l’armature tendue en flexion : À CONFIRMER.</>, 'confirmer'],
              ['Définitions et correspondance', <>Définition de <V n="d" s="v" />, tableau 12.1 (coefficient 0,45 ou 0,6), 12.5.4 (confinement), 10.5.1.1 (<V n="M" s="r" /> ≥ 1,2<V n="M" s="cr" />, module de rupture 8.6.4) et correspondance avec l’édition :24 : À CONFIRMER.</>, 'confirmer'],
              ['Enrobages', <>Selon la CSA A23.1 (absente) : NON VÉRIFIÉS ; l’enrobage reste saisi par l’utilisateur.</>, 'nonverifie'],
              ['Effort tranchant', <>Vérifié à la face de la semelle (conservateur), non à <V n="d" s="v" />.</>, 'applique'],
            ] },
            { title: 'Charges', rows: [
              ['Charges variables stabilisantes (MUR-06)', countVar
                ? <>Option « Compter les charges variables stabilisantes (L, S, W) » cochée : le poids de la surcharge (amont sur le talon, aval sur le patin), la charge de tête Fy et les charges verticales saisies reçoivent le facteur de la combinaison dans toutes les vérifications ; la poussée garde le même facteur ; le séisme E est inchangé. {countHM ? 'Case « Compter aussi les forces horizontales et les moments variables stabilisants (L, S, W) » cochée (amendement A1) : Fx et Mz stabilisants reçoivent aussi le facteur de la combinaison.' : 'Case « Compter aussi les forces horizontales et les moments » décochée (amendement A1) : Fx et Mz variables stabilisants pris à 0.'} {MUR06_MENTION} Hypothèse : la surcharge est présente en même temps que la poussée qu’elle produit ; pour une surcharge qui peut n’occuper qu’une bande derrière le talon (camion, entreposage partiel), décocher l’option.</>
                : <>Option décochée : charges variables verticales stabilisantes prises à 0 en stabilité (option prudente, CNB 4.1.3.2.(3)) ; leur poussée garde le facteur de la combinaison.</>, 'confirmer'],
              ['Charges linéaires derrière le mur', <>CFEM 5e, fig. 20.8 (p. 694) : <V n="H" /> = <V n="H" s="p" /> = <V n="h" s="r" /> + <V n="t" s="s" />, distance mesurée depuis la face arrière du voile, origine à la surface du remblai (décision de l’utilisateur du 2026-11-08) ; aucune pression au-dessus du remblai.</>, 'applique'],
              ['Charges ponctuelles et réparties', <>Charges ponctuelles de la fig. 20.8 non implémentées ; charges réparties assimilées à leur résultante : approximation À CONFIRMER.</>, 'confirmer'],
            ] },
            { title: 'Géométrie', rows: [
              ['Remblai et voile', <>Remblai horizontal (<V n="β" /> = 0), voile sans fruit, sans clé de cisaillement. Hauteur de poussée <V n="H" s="p" /> = <V n="h" s="r" /> + <V n="t" s="s" /> (<V n="h" s="r" /> = {fmt(result.soilHeight.hr, 2)} m).</>, 'applique'],
            ] },
            { title: 'Juridiction', rows: [
              ['Code de construction du Québec', <>Chapitre I – Bâtiment : édition et modifications non vérifiées.</>, 'confirmer'],
            ] },
          ];
          return (
            <div className="overflow-x-auto rounded-xl border border-slate-200 break-inside-avoid print:break-inside-avoid">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="px-1.5 py-1.5 font-bold w-[22%]">Sujet</th>
                    <th className="px-1.5 py-1.5 font-bold">Hypothèse retenue</th>
                    <th className="px-1.5 py-1.5 font-bold text-center w-[11%]">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-serif">
                  {groups.flatMap(g => [
                    <tr key={g.title} className="bg-slate-100"><td colSpan={3} className="px-1.5 py-1 font-sans font-black uppercase tracking-wide text-slate-700">{g.title}</td></tr>,
                    ...g.rows.map(([subject, text, st], i) => (
                      <tr key={g.title + i} className="align-top">
                        <td className="px-1.5 py-1 font-sans font-bold text-slate-800">{subject}</td>
                        <td className="px-1.5 py-1 text-slate-700 leading-snug">{text}</td>
                        <td className="px-1.5 py-1 text-center">{pill(st)}</td>
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
                <SubTitle n="6.1" title="Tableau général des armatures par zone" />
                <DataTable
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
                  cols={[{ name: 'Zone' }, { name: 'Règle d’As,min' }, { name: 'Article' }]}
                  rows={zoneRows.map(r => {
                    const arts = Array.from(new Set(r.As_min_basis.match(/\b\d+\.\d+(?:\.\d+)*(?:\s[a-z]\))?/g) ?? []));
                    return [r.zone.id, <span key="b" className="font-serif"><Fm>{r.As_min_basis}</Fm></span>, arts.length ? arts.join(' ; ') : '—'];
                  })}
                />
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-600">
                  {pair && <li>Paire A3 + A4 : total requis {fmt(pair.required, 0)} mm²/m, somme fournie {fmt(pair.provided, 0)} mm²/m ; 14.1.8.6 : aire totale, répartition entre faces non prescrite par la norme. Statut de A3 et A4 : Σ(A3 + A4) ≥ 0,002<V n="A" s="g" /> et espacement par nappe.</li>}
                  <li><V n="A" s="s,req" /> = armature pour <V n="M" s="r" /> = <V n="M" s="f" /> (inverse exact de la formule de <V n="M" s="r" />, bloc rectangulaire 10.1.7) ; « — » : aucun effort de flexion. A7 : 2 lits.</li>
                  <li>Statut : <V n="A" s="s,fourni" /> ≥ max(<V n="A" s="s,req" /> ; <V n="A" s="s,min" />) et espacement ≤ espacement maximal.</li>
                </ul>
                <SubTitle n="6.2" title="Nomenclature des barres (par mètre de mur)" />
                <DataTable
                  head={['Repère', 'Barre', 'Esp. (mm)', 'Forme', 'Longueur unitaire (m)', 'Nombre par m de mur', 'Masse (kg/m de mur)']}
                  rows={[
                    ...schedule.map(s => [s.id, s.barSize, String(s.spacing), s.shape, fmt(s.length, 2), fmt(s.countPerM, 2), fmt(s.massPerM, 1)]),
                    ['Total', '', '', '', '', '', fmt(totalScheduleMass(schedule), 1)]
                  ]}
                />
                <p className="text-[11px] text-slate-600">{SCHEDULE_DISCLAIMER} Prolongement des crochets 12db : valeur indicative, À CONFIRMER.</p>
              </div>
            </>
          );
        })()}

        {/* HIGHLIGHTED BLUE CALLOUT BOX (AS SEEN IN USER NOTE) */}
        {showToleranceBox && (
          <div className="p-5 rounded-2xl bg-sky-50 border-2 border-sky-300 text-sky-950 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
                <Info size={15} className="text-sky-600" />
                NOTE ET JUSTIFICATION DE CONFORMITÉ STRUCTURALE (INGÉNIEUR CONSEIL)
              </span>
              <button
                onClick={() => setShowToleranceBox(false)}
                className="text-sky-400 hover:text-sky-700 text-xs print:hidden"
              >
                Masquer
              </button>
            </div>

            <textarea
              value={engineerComment}
              onChange={(e) => setEngineerComment(e.target.value)}
              className="w-full bg-transparent border-0 font-medium text-xs text-sky-950 focus:ring-0 resize-none leading-relaxed p-0 italic"
              rows={2}
            />
            
            <p className="text-[10px] text-sky-700 pt-1 border-t border-sky-200">
              * Références : CNB {result.cnbEdition}, 4.1.3.2 ; CFEM 5e éd. (tableaux et figures : voir la fiche MUR-02) ; CSA A23.3-19. Éléments NON VÉRIFIÉS : stabilité d'ensemble, gel, drainage, tassement.
            </p>
          </div>
        )}

        {/* Signatures Strip */}
        <div className="pt-8 border-t border-slate-300 grid grid-cols-2 md:grid-cols-3 gap-6 text-xs text-slate-600">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Conçu et Calculé par :</span>
            <div className="h-12 border-b border-slate-300 mt-2"></div>
            <span className="text-[11px] font-bold text-slate-700 mt-1 block">Ingénieur Concepteur, ing.</span>
          </div>

          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Vérifié par :</span>
            <div className="h-12 border-b border-slate-300 mt-2"></div>
            <span className="text-[11px] font-bold text-slate-700 mt-1 block">Ingénieur Vérificateur, ing.</span>
          </div>

          <div className="hidden md:block">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Sceau & Signature de l'Ordre (OIQ) :</span>
            <div className="h-12 border border-dashed border-slate-300 rounded-lg mt-2 flex items-center justify-center text-[10px] text-slate-400 font-mono">
              [Emplacement Sceau Numérique]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
