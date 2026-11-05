import React, { useState } from 'react';
import { AnalysisResult, WallGeometry, SoilProperties, ConcreteProperties, LoadsConfig } from '../lib/types';
import { BearingPressureDiagram } from './BearingPressureDiagram';
import { FACTEUR_H_SISMIQUE } from '../lib/analysis';
import { Printer, FileText, CheckCircle2, AlertTriangle, Info, Scale, Shield, Building } from 'lucide-react';

interface OfficialNoteDeCalculProps {
  geo: WallGeometry;
  soil: SoilProperties;
  conc: ConcreteProperties;
  result: AnalysisResult;
  loads?: LoadsConfig; // charges saisies (absentes : « non disponible »)
}

const fmt = (v: number, d: number) => (Number.isFinite(v) ? v.toFixed(d) : 'non disponible');

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
function DataTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="inline-block max-w-full overflow-x-auto rounded-xl border border-slate-200 align-top break-inside-avoid print:break-inside-avoid">
      <table className="w-auto text-left text-[11px] border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white">
            {head.map(h => <th key={h} className="px-2.5 py-1.5 font-bold whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
              {r.map((c, j) => (
                <td
                  key={j}
                  className={`px-2.5 py-1 ${isNumeric(c) ? 'text-right font-mono whitespace-nowrap' : j === 0 && head[0] === 'N°' ? 'text-slate-500' : 'max-w-[22rem]'}`}
                >
                  {c}
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
function WallSketch({ geo, B, totalHeight, hSolAv, hPass }: { geo: WallGeometry; B: number; totalHeight: number; hSolAv: number; hPass: number }) {
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
      <rect x={xs1} y={y(totalHeight)} width={x(B) - xs1} height={geo.hMur * sc} fill="url(#skSoil)" opacity="0.8" />
      <line x1={xs1} y1={y(totalHeight)} x2={x(B) + 8} y2={y(totalHeight)} stroke="#b45309" strokeWidth="1" />
      <text x={(xs1 + x(B)) / 2} y={y(totalHeight) + 12} fontSize="8" fontWeight="bold" fill="#92400e" textAnchor="middle">Remblai</text>

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

export function OfficialNoteDeCalcul({ geo, soil, conc, result, loads }: OfficialNoteDeCalculProps) {
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
  const slsCombs = result.combinations.filter(c => c.type === 'SLS');

  const seismicOn = result.soilMethodConfig.seismicMethod !== 'none';
  const ep = result.earthPressures;
  const wn = result.weights_nominal;
  const xStem = geo.ePiedAv + geo.epStem / 2;
  const xHeel = geo.ePiedAv + geo.epStem + geo.ePiedAr / 2;
  type LoadRow = { desc: string; type: string; value: string; unit: string; pos: string };
  const loadRows: LoadRow[] = [];
  if (loads) {
    if (loads.surcharge > 0) loadRows.push({ desc: 'Surcharge amont', type: loads.surchargeType, value: fmt(loads.surcharge, 2), unit: 'kPa', pos: 'Surface du remblai amont (sur le talon)' });
    if ((loads.surchargeAval ?? 0) > 0) loadRows.push({ desc: 'Surcharge aval', type: loads.surchargeAvalType ?? 'L', value: fmt(loads.surchargeAval ?? 0, 2), unit: 'kPa', pos: 'Surface du sol à l\'avant (sur le patin)' });
    const pt = loads.pointLoadTop;
    if (pt?.enabled) {
      const ty = pt.loadType ?? 'L';
      const pos = `Tête du voile : x = ${fmt(xStem, 2)} m, y = ${fmt(result.totalHeight, 2)} m`;
      if (pt.Fy) loadRows.push({ desc: `Charge en tête Fy${pt.name ? ' (' + pt.name + ')' : ''}`, type: ty, value: fmt(pt.Fy, 2), unit: 'kN/m', pos });
      if (pt.Fx) loadRows.push({ desc: 'Charge en tête Fx', type: ty, value: fmt(pt.Fx, 2), unit: 'kN/m', pos });
      if (pt.Mz) loadRows.push({ desc: 'Moment en tête Mz', type: ty, value: fmt(pt.Mz, 2), unit: 'kN·m/m', pos });
    }
    for (const al of loads.additionalLoads ?? []) {
      const dist = al.isDistributed && al.length;
      loadRows.push({
        desc: `${al.name} (${al.nature})`, type: al.caseType, value: fmt(al.magnitude, 2),
        unit: al.nature === 'Mz' ? 'kN·m/m' : dist ? 'kN/m par m' : 'kN/m',
        pos: `x = ${fmt(al.x, 2)} m, y = ${fmt(al.y, 2)} m${dist ? `, longueur ${fmt(al.length ?? 0, 2)} m` : ''}`
      });
    }
    if (loads.reactionsTop) {
      for (const k of Object.keys(loads.reactionsTop) as (keyof typeof loads.reactionsTop)[]) {
        const r = loads.reactionsTop[k];
        const pos = `Tête du voile : y = ${fmt(result.totalHeight, 2)} m`;
        if (r?.Rx) loadRows.push({ desc: 'Réaction en tête Rx', type: k, value: fmt(r.Rx, 2), unit: 'kN/m', pos });
        if (r?.Ry) loadRows.push({ desc: 'Réaction en tête Ry', type: k, value: fmt(r.Ry, 2), unit: 'kN/m', pos });
        if (r?.M) loadRows.push({ desc: 'Réaction en tête M', type: k, value: fmt(r.M, 2), unit: 'kN·m/m', pos });
      }
    }
  } else {
    loadRows.push({ desc: 'Charges saisies (surcharges, charges de tête, charges supplémentaires)', type: '—', value: 'non disponible', unit: '—', pos: '—' });
  }
  if (result.hydro.hasWater) loadRows.push({ desc: 'Nappe phréatique : niveau', type: 'H', value: fmt(result.hydro.hw, 2), unit: 'm', pos: 'Au-dessus de la sous-face de la semelle' });
  // Composantes horizontales non pondérées réellement utilisées par le moteur (celles qui entrent dans ΣH)
  const latLabel = (n: string): string => {
    if (n === 'Pa_sol') return 'Poussée active des terres (γ)';
    if (n === 'Pa_sol_sec') return 'Poussée active des terres, sol au-dessus de la nappe (γ)';
    if (n === 'Pa_sol_sub_surch') return 'Poussée active sous la nappe due au sol sec sus-jacent';
    if (n === 'Pa_sol_déjaugé') return 'Poussée active des terres sous la nappe (γ′)';
    if (n === 'Pw_eau_hydrostatique') return 'Poussée hydrostatique de l\'eau';
    if (n.startsWith('Pa_surcharge_amont')) return 'Poussée de la surcharge amont';
    if (n.startsWith('P_seismic_soil')) return n.includes('Wood') ? 'Incrément sismique de poussée ΔP0E (Wood)' : 'Incrément sismique de poussée ΔPAE';
    if (n.startsWith('E_stem_inertia')) return 'Inertie sismique du voile (kh·W)';
    if (n.startsWith('E_base_inertia')) return 'Inertie sismique de la semelle (kh·W)';
    if (n.startsWith('E_heelSoil_inertia')) return 'Inertie sismique du sol au-dessus du talon (kh·W)';
    return n;
  };
  for (const c of result.lateral_nominal.filter(c => !c.applied)) {
    loadRows.push({ desc: latLabel(c.name), type: c.type, value: fmt(c.Fx, 2), unit: 'kN/m', pos: `Résultante à y = ${fmt(c.y, 2)} m` });
  }
  if (result.hydro.hasWater) {
    loadRows.push({ desc: 'Sous-pression sous la semelle (uniforme sur B)', type: 'H', value: fmt(result.hydro.uplift_nominal, 2), unit: 'kN/m', pos: `Vers le haut, x = ${fmt(B / 2, 2)} m` });
  }
  if (ep.P_passive_nominal > 0) loadRows.push({ desc: 'Butée du sol Pp′ (résistance ; γ au-dessus de la nappe, γ′ en dessous)', type: '—', value: fmt(ep.P_passive_nominal, 2), unit: 'kN/m', pos: `Résultante à y = ${fmt(ep.y_Pp, 2)} m (profondeur de butée hp = ${fmt(ep.h_pass, 2)} m)` });
  if (ep.frontWaterScenario === 'B') loadRows.push({ desc: 'Eau à l\'avant Pw,a = ½·γw·hw,av² (résistance, composante séparée)', type: 'H', value: fmt(ep.P_water_front, 2), unit: 'kN/m', pos: `Résultante à y = ${fmt(ep.y_Pw_front, 2)} m (hw,av = ${fmt(ep.hw_av, 2)} m)` });
  loadRows.push({ desc: 'Poids propre du voile', type: 'D', value: fmt(wn.stem, 2), unit: 'kN/m', pos: `x = ${fmt(xStem, 2)} m` });
  loadRows.push({ desc: 'Poids propre de la semelle', type: 'D', value: fmt(wn.base, 2), unit: 'kN/m', pos: `x = ${fmt(B / 2, 2)} m` });
  loadRows.push({ desc: 'Poids du sol sur le talon (γ′ sous la nappe)', type: 'D', value: fmt(wn.heelSoil, 2), unit: 'kN/m', pos: `x = ${fmt(xHeel, 2)} m` });
  if (soil.hSolAv > 0) loadRows.push({ desc: 'Poids du sol sur le patin (γ′ sous la nappe)', type: 'D', value: fmt(wn.toeSoil, 2), unit: 'kN/m', pos: `x = ${fmt(geo.ePiedAv / 2, 2)} m` });
  if (wn.waterHeel > 0) loadRows.push({ desc: 'Poids de l\'eau au-dessus du talon', type: 'H', value: fmt(wn.waterHeel, 2), unit: 'kN/m', pos: `x = ${fmt(xHeel, 2)} m` });
  if (wn.waterToe > 0) loadRows.push({ desc: 'Poids de l\'eau au-dessus du patin', type: 'H', value: fmt(wn.waterToe, 2), unit: 'kN/m', pos: `x = ${fmt(geo.ePiedAv / 2, 2)} m` });

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
                  ['Hauteur de sol à l\'avant', 'hs,av', fmt(soil.hSolAv, 2), 'm'],
                  ['Profondeur de butée (depuis la sous-face)', 'hp', soil.hSolAv > 0 ? fmt(result.earthPressures.h_pass, 2) : '0 (sans sol à l\'avant, butée nulle)', 'm'],
                  ['Pente du remblai', 'β', 'non disponible (remblai horizontal seulement)', '°'],
                  ['Clé de cisaillement', '—', 'non disponible (non modélisée)', '—'],
                ]}
              />
            </div>
            <WallSketch geo={geo} B={B} totalHeight={result.totalHeight} hSolAv={soil.hSolAv} hPass={result.earthPressures.h_pass} />
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
              ['Remblai : poids volumique', 'γ', fmt(soil.gamma, 1), 'kN/m³'],
              ['Remblai : angle de frottement interne', 'φ′', fmt(soil.phi, 1), '°'],
              ['Remblai : cohésion (négligée dans la poussée active)', 'c′', fmt(soil.cohesion ?? 0, 1), 'kPa'],
              ['Sol de fondation : poids volumique', 'γ', fmt(result.foundationSoil.gamma, 1), 'kN/m³'],
              ['Sol de fondation : angle de frottement interne', 'φ′', fmt(result.foundationSoil.phi, 1), '°'],
              ['Sol de fondation : cohésion', 'c′', fmt(result.foundationSoil.cohesion, 1), 'kPa'],
              ['Frottement de base sol-béton', 'μ', fmt(soil.mu, 2), '—'],
              ['Eau : poids volumique', 'γw', fmt(result.hydro.gamma_w, 2), 'kN/m³'],
              ['Nappe : hauteur au-dessus de la sous-face de la semelle', 'hw', result.hydro.hasWater ? fmt(result.hydro.hw, 2) : 'nappe inactive', result.hydro.hasWater ? 'm' : '—'],
              ['Poids volumique déjaugé retenu (γ − γw, hypothèse : γ saisi = γ saturé)', 'γ′', result.hydro.hasWater ? fmt(result.hydro.gamma_prime, 2) : 'sans objet', result.hydro.hasWater ? 'kN/m³' : '—'],
              ['Portance admissible saisie (ÉLS)', 'qadm', fmt(soil.qAllowable_SLS, 0), 'kPa'],
              [result.geotech.quFactored ? 'Portance ultime saisie (ÉLU, déclarée déjà pondérée : φgu = 1)' : 'Portance ultime saisie (ÉLU, non pondérée : le programme applique Ψ·φgu)', 'qu', fmt(soil.qUltimate_ULS, 0), 'kPa'],
            ]}
          />
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
          <DataTable
            head={['N°', 'Description', 'Type CNB', 'Valeur', 'Unité', 'Point d\'application ou position']}
            rows={loadRows.map((r, i) => [String(i + 1), r.desc, r.type, r.value, r.unit, r.pos])}
          />
        </div>

        {/* 3. COMBINAISONS DE CHARGES */}
        <SectionTitle n="3" title="Combinaisons de charges" />
        <div className="space-y-3 text-xs text-slate-700">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Édition retenue :</strong> CNB {result.cnbEdition}, 4.1.3.2 et tableau 4.1.3.2.-A (défaut : 2020 ; option : 2025).</li>
            <li><strong>Cas 5 :</strong> {result.cnbEdition === '2020' ? '1,0D + 1,0E + 1,0H + 0,5L + 0,25S' : '1,0D + 1,0E + 1,0H + 0,5L + 0,15S'}.</li>
            <li><strong>Facteur 1,0H au cas 5 :</strong> note A-4.1.3.2.(4) (1,5H pour les cas 2, 3 et 4) et tableau A-3 du Commentaire A du CNB 2020 (1,0 pour D, H, T et P avec E). Commentaire 2025 : À CONFIRMER.</li>
            <li>Charges variables favorables prises à zéro ; 0,9D ou 1,0D (cas 5) pour la charge permanente qui s'oppose ; poids du sol porté selon 4.1.3.2.(8) et (9).</li>
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
              ['Glissement', result.governingSliding.status_sliding === 'OK', `FS = ${result.governingSliding.FOS_sliding.toFixed(2)}`],
              ['Renversement', result.governingOverturning.status_overturning === 'OK', result.governingOverturning.outside_base ? 'hors base' : `FS = ${result.governingOverturning.FOS_overturning.toFixed(2)}`],
              ['Excentricité e ≤ B/6 (ÉLU et ÉLS)', result.eccentricity_ok_ULS && result.eccentricity_ok_SLS, `ÉLU : ${result.eccentricity_ok_ULS ? 'respectée' : 'non respectée'} ; ÉLS : ${result.eccentricity_ok_SLS ? 'respectée' : 'non respectée'}`],
              ['Portance ÉLU', result.governingBearing.status_bearing === 'OK', result.governingBearing.outside_base ? 'non vérifiable (résultante hors base)' : `q = ${result.governingBearing.q_design.toFixed(1)} / ${result.governingBearing.q_capacity.toFixed(1)} kPa`],
              ['Béton du mur et de la semelle', Object.values(result.concreteDesign).every((d: any) => (d.checks_ok ?? d.status_ok) === true), 'flexion, cisaillement, As,min, ductilité, fissuration, ancrage, frottement']
            ].map(([label, ok, detail]) => (
              <span key={label as string} className={`px-2 py-1 rounded font-bold ${!result.verifiable ? 'bg-amber-100 text-amber-800' : ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {label as string} : {!result.verifiable ? 'NON VÉRIFIABLE' : ok ? 'CONFORME' : 'NON CONFORME'} ({detail as string})
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
              ['Coefficient sismique horizontal', 'kh', seismicOn ? fmt(result.seismic.kh, 3) : 'sans objet', 'CFEM 5e, éq. 18.22, p. 629 (kh = ah/g)', result.seismic.csaS6 ? 'Option avancée active : kh = 0,5·ah (CSA S6 citée par le CFEM p. 631, non du CNB) ; déplacement admis de 25 à 50 mm non vérifié par le logiciel' : 'Lu ; kh = ah (défaut)'],
              ['Coefficient sismique vertical', 'kv', seismicOn ? (result.seismic.csaS6 ? '0 (option CSA S6)' : result.seismic.scenarios.length > 1 ? `±${fmt(result.seismic.kvInput, 3)} (deux signes étudiés)` : fmt(result.seismic.kvInput, 3)) : 'sans objet', 'CFEM 5e, p. 629 (kv = 2/3·kh à défaut d\'étude du site)', 'Valeur saisie par l\'utilisateur'],
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
          <SubTitle n="4.3" title="Tableau 1c : glissement Ψ·[φgs·ΣV′·tanδb + φcoh·c′a·B′ + φp·Pp] ≥ ΣHf et renversement Ψ·φ_ov·ΣM_stab ≥ ΣM_renv" />
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  {['Combinaison', 'ΣV′ (kN/m)', 'Friction (kN/m)', 'Cohésion (kN/m)', 'Butée (kN/m)', 'Rf (kN/m)', 'ΣHf (kN/m)', 'Rf/ΣHf', 'Glissement', 'Ψφ_ov·ΣM_stab', 'ΣM_renv', 'Rapport', 'Renversement'].map(h => (
                    <th key={h} className="px-1.5 py-2 font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {result.combinations.filter(c => c.type === 'ULS' && c.stabApplicable).map((c, idx) => (
                  <tr key={c.combName} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-1.5 py-1 font-sans font-bold whitespace-nowrap">{c.combName}</td>
                    <td className="px-1.5 py-1 text-right">{c.sumV_min.toFixed(1)}</td>
                    <td className="px-1.5 py-1 text-right">{c.Rf_friction.toFixed(1)}</td>
                    <td className="px-1.5 py-1 text-right">{c.Rf_cohesion.toFixed(1)}</td>
                    <td className="px-1.5 py-1 text-right">{c.Rf_passive.toFixed(1)}</td>
                    <td className="px-1.5 py-1 text-right font-bold">{c.Fs.toFixed(1)}</td>
                    <td className="px-1.5 py-1 text-right">{c.Fh_destab.toFixed(1)}</td>
                    <td className="px-1.5 py-1 text-right font-bold">{c.FOS_sliding === Infinity ? '∞' : c.FOS_sliding.toFixed(3)}</td>
                    <td className="px-1.5 py-1 font-sans font-bold">{!result.verifiable ? 'NON VÉRIFIABLE' : c.status_sliding === 'OK' ? 'CONFORME' : 'NON CONFORME'}</td>
                    <td className="px-1.5 py-1 text-right">{c.Ms.toFixed(1)}</td>
                    <td className="px-1.5 py-1 text-right">{c.Mr.toFixed(1)}</td>
                    <td className="px-1.5 py-1 text-right font-bold">{c.FOS_overturning === Infinity ? '∞' : c.FOS_overturning.toFixed(3)}</td>
                    <td className="px-1.5 py-1 font-sans font-bold">{!result.verifiable ? 'NON VÉRIFIABLE' : c.status_overturning === 'OK' ? 'CONFORME' : 'NON CONFORME'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">
            ΣV′ : force verticale effective (poids déjaugé, sous-pression déduite). Terme cohésif sur B′ = B − 2e (À CONFIRMER). Facteurs : Ψ = {fmt(result.geotech.psi, 2)}, φgs = {fmt(result.geotech.phi_gs, 2)}, φcoh = {fmt(result.geotech.phi_coh, 2)}, φp = {fmt(result.geotech.phi_p, 2)}, φ_ov = {fmt(result.geotech.phi_ov, 2)}.
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
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[11px]">
                  <th className="px-1.5 py-2 font-bold">No</th>
                  <th className="px-1.5 py-2 font-bold">Combinaison</th>
                  <th className="px-1.5 py-2 font-bold text-center">D</th>
                  <th className="px-1.5 py-2 font-bold text-center">L</th>
                  <th className="px-1.5 py-2 font-bold text-center">S</th>
                  <th className="px-1.5 py-2 font-bold text-center">W</th>
                  <th className="px-1.5 py-2 font-bold text-center">E</th>
                  <th className="px-1.5 py-2 font-bold text-center">H</th>
                  <th className="px-1.5 py-2 font-bold text-right">Rv (kN/m)</th>
                  <th className="px-1.5 py-2 font-bold text-right">e (m)</th>
                  <th className="px-1.5 py-2 font-bold text-right">B/6 (m)</th>
                  <th className="px-1.5 py-2 font-bold text-center">e ≤ B/6</th>
                  <th className="px-1.5 py-2 font-bold text-right">x1 (m)</th>
                  <th className="px-1.5 py-2 font-bold text-right bg-blue-900">q1 (kPa)</th>
                  <th className="px-1.5 py-2 font-bold text-right">q2 (kPa)</th>
                  <th className="px-1.5 py-2 font-bold text-right">Limite (kPa)</th>
                  <th className="px-1.5 py-2 font-bold text-center">Ratio</th>
                  <th className="px-1.5 py-2 font-bold text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
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
                      <td className="px-1.5 py-1 text-slate-500 font-sans">{idx + 1}</td>
                      <td className="px-1.5 py-1 text-slate-800 font-sans font-bold min-w-[10rem]">
                        {/* « Combinaison ELS 1 (1D + 1H + 1L) » → « 1D + 1H + 1L » : l'en-tête dit déjà « Combinaison » */}
                        {c.combName.replace(/^Combinaison\s+\S+\s+\d+\s*\((.*)\)$/, '$1')}
                        {isGoverning && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-amber-200 text-amber-900 font-bold">
                            Gouvernant
                          </span>
                        )}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-center text-slate-600">{c.factors.D}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-center text-slate-600">{c.factors.L}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-center text-slate-600">{c.factors.S}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-center text-slate-600">{c.factors.W}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-center text-slate-600">{c.factors.E || 0}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-center text-slate-600">{c.factors.H}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right">{c.sumV_max.toFixed(1)}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right">{Math.abs(c.ecc).toFixed(3)}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right text-slate-500">{B_over_6.toFixed(3)}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-center font-sans font-bold">{!result.verifiable ? 'n. v.' : c.status_ecc === 'OK' ? 'OK' : 'NON'}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right">{c.x1.toFixed(3)}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right font-black text-blue-900 bg-blue-50/50">{c.outside_base ? 'n. v.' : c.q_toe.toFixed(1)}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right">{c.outside_base ? 'n. v.' : c.q_heel.toFixed(1)}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-right text-slate-600 font-semibold">{qLimit.toFixed(1)}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-center">{c.outside_base ? '—' : `${(ratio * 100).toFixed(0)} %`}</td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-sans ${
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
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  {['Élément', 'Armature', 'As / As,min (mm²/m) — article', 'Espacement / max (mm)', 'Mr / Mf (kN·m/m)', 'c/d ≤ limite (10.5.2)', 'Vf / min(Vc ; Vr,max) (kN/m)', 'z / limite (N/mm) — 10.6.1', 'ld / ldh (mm)', 'Statut'].map(h => (
                    <th key={h} className="px-1.5 py-2 font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {([
                  result.concreteDesign.mur_interieur,
                  result.concreteDesign.mur_exterieur,
                  result.concreteDesign.mur_horizontal,
                  result.concreteDesign.semelle_talon,
                  result.concreteDesign.semelle_orteil,
                  result.concreteDesign.semelle_retrait
                ]).map((d, idx) => (
                  <tr key={d.elementName} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-1.5 py-1 font-sans font-bold whitespace-nowrap">{d.elementName}</td>
                    <td className="px-1.5 py-1 whitespace-nowrap">{d.bar_designation}</td>
                    <td className="px-1.5 py-1 max-w-[16rem]">{d.As_provided.toFixed(0)} {d.As_ok ? '≥' : '<'} {d.As_min.toFixed(0)} <span className="font-sans text-slate-500">({d.As_min_basis})</span></td>
                    <td className="px-1.5 py-1 whitespace-nowrap">{d.spacing.toFixed(0)} / {d.spacing_max.toFixed(0)} {d.spacing_ok ? '' : '(dépassé)'}{d.db_max !== undefined ? ` ; db ${d.db.toFixed(1)} / ${d.db_max.toFixed(0)}` : ''}</td>
                    <td className="px-1.5 py-1 whitespace-nowrap">{d.Mr > 0 ? `${d.Mr.toFixed(1)} / ${d.Mf.toFixed(1)}` : '—'}</td>
                    <td className="px-1.5 py-1 whitespace-nowrap">{d.Mr > 0 ? `${d.ductility_c_over_d.toFixed(3)} ≤ ${d.ductility_limit.toFixed(3)}` : '—'}</td>
                    <td className="px-1.5 py-1 whitespace-nowrap">{d.Vf > 0 ? `${d.Vf.toFixed(1)} / ${Math.min(d.Vc, d.Vr_max).toFixed(1)}` : '—'}</td>
                    <td className="px-1.5 py-1 whitespace-nowrap">{d.Z_factor !== undefined && d.Z_limit !== undefined ? `${d.Z_factor.toFixed(0)} / ${d.Z_limit.toFixed(0)}` : '—'}</td>
                    <td className="px-1.5 py-1 whitespace-nowrap">{d.ld.toFixed(0)} / {d.ldh_required !== undefined ? d.ldh_required.toFixed(0) : '—'}</td>
                    <td className="px-1.5 py-1 font-sans font-bold">{!result.verifiable ? 'NON VÉRIFIABLE' : !d.checks_ok ? 'NON CONFORME' : d.ld_status === 'À CONFIRMER' ? 'CONFORME sauf ld : À CONFIRMER' : 'CONFORME'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-600">
            <li>Voile (face intérieure) : β = {result.concreteDesign.mur_interieur.beta.toFixed(4)} [{result.concreteDesign.mur_interieur.beta_rule}] ; Vr,max = 0,25·φc·f′c·bw·dv (11.3.3) ; Vf à dv = {result.concreteDesign.cisaillement_friction.Vf_dv.toFixed(1)} kN/m (information).</li>
            <li>ld : {[result.concreteDesign.mur_interieur, result.concreteDesign.semelle_talon, result.concreteDesign.semelle_orteil].some(d => d.ld_eq12_1_required) ? 'tableau 12.1 : enrobage ≥ db et espacement ≥ 1,4db non remplis pour au moins un élément : éq. 12.1 requise : statut de ld À CONFIRMER (non vérifié ; valeur à 0,6 indicative). Condition « espacement ≥ 1,4db » comparée en axe en axe ; espacement d’axe en axe ou libre : À CONFIRMER (A23.3 12.2.3).' : 'conditions du tableau 12.1 remplies (enrobage ≥ db, espacement ≥ 1,4db).'}</li>
            <li>Talon : β = {result.concreteDesign.semelle_talon.beta.toFixed(4)} [{result.concreteDesign.semelle_talon.beta_rule}] ; patin : β = {result.concreteDesign.semelle_orteil.beta.toFixed(4)} [{result.concreteDesign.semelle_orteil.beta_rule}].</li>
            <li>Ductilité : {result.concreteDesign.mur_interieur.ductility_rule} (ancienne limite 700/(700 + fy) non sécuritaire, retirée).</li>
            <li>ld : coefficient {result.concreteDesign.mur_interieur.ld_coeff?.toFixed(2)} · k1 · k4 · fy/√f′c · db ≥ 300 mm (12.2). Talon : k1 = {result.concreteDesign.semelle_talon.ld_k1?.toFixed(1)}. ldh (12.5) : {result.concreteDesign.mur_interieur.ldh_factors}.</li>
            <li>Joint voile-semelle (11.5) : Vr = {result.concreteDesign.cisaillement_friction.Vr.toFixed(1)} kN/m {result.concreteDesign.cisaillement_friction.status_ok ? '≥' : '<'} Vf = {result.concreteDesign.cisaillement_friction.Vf.toFixed(1)} kN/m (N non pondéré = {result.concreteDesign.cisaillement_friction.N.toFixed(1)} kN/m ; σ = {result.concreteDesign.cisaillement_friction.sigma.toFixed(3)} MPa ; {result.concreteDesign.cisaillement_friction.surface}{result.concreteDesign.cisaillement_friction.capped ? ' ; limite 0,25·φc·f′c atteinte' : ''}) : {!result.verifiable ? 'NON VÉRIFIABLE' : result.concreteDesign.cisaillement_friction.status_ok ? 'CONFORME' : 'NON CONFORME'}.</li>
          </ul>
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
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[11px]">
                  <th className="p-2.5 font-bold">No</th>
                  <th className="p-2.5 font-bold">Combinaison</th>
                  <th className="p-2.5 font-bold text-right">Poussée Terre (kN)</th>
                  <th className="p-2.5 font-bold text-right">Surcharge (kN)</th>
                  <th className="p-2.5 font-bold text-right">Séisme (kN)</th>
                  <th className="p-2.5 font-bold text-right bg-indigo-900">Mf (kNm/m)</th>
                  <th className="p-2.5 font-bold text-right">Vf (kN/m)</th>
                  <th className="p-2.5 font-bold text-right">As fournie (mm²/m)</th>
                  <th className="p-2.5 font-bold text-center">Ratio Mf/Mr</th>
                  <th className="p-2.5 font-bold text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {ulsCombs.map((c, idx) => {
                  const mr = result.concreteDesign.mur_interieur.Mr;
                  const ratio = mr > 0 ? (c.mur_Mf / mr) : 0;
                  const isOk = c.mur_Mf <= mr;
                  const isGovStem = result.governingStem && result.governingStem.combName === c.combName;

                  return (
                    <tr key={c.combName} className={`${isGovStem ? 'bg-amber-50/80 font-bold' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                      <td className="p-2 text-slate-500 font-sans">{idx + 1}</td>
                      <td className="p-2 text-slate-800 font-sans font-bold whitespace-nowrap">
                        {c.combName}
                        {isGovStem && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-amber-200 text-amber-900 font-bold">
                            Gouvernant Mf
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right">{(result.earthPressures.P_active_nominal * c.factors.H).toFixed(1)}</td>
                      <td className="p-2 text-right">{(result.earthPressures.P_surcharge_nominal * c.factors.L).toFixed(1)}</td>
                      <td className="p-2 text-right">{(result.earthPressures.delta_Pae_seed * (c.factors.E || 0)).toFixed(1)}</td>
                      <td className="p-2 text-right font-black text-indigo-900 bg-indigo-50/50">{c.mur_Mf.toFixed(1)}</td>
                      <td className="p-2 text-right">{c.mur_Vf.toFixed(1)}</td>
                      <td className="p-2 text-right">{result.concreteDesign.mur_interieur.As_provided.toFixed(0)}</td>
                      <td className="p-2 text-center">{(ratio * 100).toFixed(0)} %</td>
                      <td className="p-2 text-center">
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
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[11px]">
                  <th className="p-2.5 font-bold">No</th>
                  <th className="p-2.5 font-bold">Combinaison</th>
                  <th className="p-2.5 font-bold text-right bg-emerald-900">Patin Mf (kNm)</th>
                  <th className="p-2.5 font-bold text-right">Patin Vf (kN)</th>
                  <th className="p-2.5 font-bold text-right bg-emerald-900">Talon Mf (kNm)</th>
                  <th className="p-2.5 font-bold text-right">Talon Vf (kN)</th>
                  <th className="p-2.5 font-bold text-center">Ratio Patin</th>
                  <th className="p-2.5 font-bold text-center">Ratio Talon</th>
                  <th className="p-2.5 font-bold text-center">Statut Semelle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
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
                      <td className="p-2 text-slate-500 font-sans">{idx + 1}</td>
                      <td className="p-2 text-slate-800 font-sans font-bold whitespace-nowrap">
                        {c.combName}
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
                      <td className="p-2 text-right font-black text-emerald-900 bg-emerald-50/40">{c.toe_Mf.toFixed(1)}</td>
                      <td className="p-2 text-right">{c.toe_Vf.toFixed(1)}</td>
                      <td className="p-2 text-right font-black text-emerald-900 bg-emerald-50/40">{c.heel_Mf.toFixed(1)}</td>
                      <td className="p-2 text-right">{c.heel_Vf.toFixed(1)}</td>
                      <td className="p-2 text-center">{(ratioToe * 100).toFixed(0)} %</td>
                      <td className="p-2 text-center">{(ratioHeel * 100).toFixed(0)} %</td>
                      <td className="p-2 text-center">
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

        {/* 5. HYPOTHÈSES ET LIMITES */}
        <SectionTitle n="5" title="Hypothèses et limites" />
        <div className="text-xs text-slate-700 space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Non vérifié :</strong> stabilité d'ensemble (glissement profond), gel et profondeur de la semelle, drainage, tassement calculé, pression de compactage.</li>
            <li>Sous-pression sous la semelle uniforme γw·hw sur la largeur B (hypothèse conservatrice, drainage non défini) ; facteur 1,5 appliqué à l'eau : classement À CONFIRMER.</li>
            <li>γ′ du sol sous la nappe = γ − γw (le γ saisi est pris comme poids volumique saturé ; hypothèse).</li>
            <li>Limite d'excentricité e ≤ B/6 à l'ÉLU et à l'ÉLS (CFEM 5e, p. 348 et 20.7.3.4-20.7.3.5) : statut calculé pour chaque combinaison. Une limite plus large (par ex. B/3) n'a aucune source lue : non appliquée.</li>
            <li>Commentaire 2025 sur le facteur de H au cas 5 : À CONFIRMER. Augmentations de 4.1.8.16.(3) non appliquées (le mur ne fait pas partie du SFRS) : À CONFIRMER.</li>
            <li>Cisaillement par frottement (A23.3-19, 11.5) : c = 0,25 MPa et μ = 0,60 (surface non rendue rugueuse, D14) ; N = charge permanente non pondérée (11.5.4) ; cumul avec l'armature tendue en flexion : À CONFIRMER.</li>
            <li>Béton, A23.3-19 : définition de dv, tableau 12.1 (coefficient 0,45 ou 0,6), 12.5.4 (confinement), 10.5.1.1 (Mr ≥ 1,2·Mcr, module de rupture 8.6.4) et correspondance avec l'édition :24 : À CONFIRMER. Enrobages selon la CSA A23.1 (absente) : NON VÉRIFIÉS ; l'enrobage reste saisi par l'utilisateur. L'effort tranchant est vérifié à la face de la semelle (conservateur), non à dv.</li>
            <li>Charges linéaires derrière le mur : fig. 20.8 du CFEM 5e (p. 694), distance mesurée depuis la face arrière du voile et H = hauteur totale : À CONFIRMER. Charges ponctuelles de la fig. 20.8 et charges réparties assimilées à leur résultante : non implémentées / approximation À CONFIRMER. Compactage (fig. 20.9) : non vérifié.</li>
            <li><strong>Éléments NON VÉRIFIÉS :</strong> stabilité d'ensemble, gel (hors profondeur déduite de la butée), drainage, tassement calculé, liquéfaction, enrobages (A23.1), Code de construction du Québec (édition et modifications : À CONFIRMER).</li>
            <li>
              Eau à l'avant (scénario {result.earthPressures.frontWaterScenario}) :{' '}
              {result.earthPressures.frontWaterScenario === 'A'
                ? 'eau à l\'avant non comptée (scénario conservateur) ; butée du sol calculée avec γ′ sous la nappe.'
                : `eau à l'avant comptée : niveau hw,av = ${result.earthPressures.hw_av.toFixed(2)} m déclaré fiable par l'utilisateur ; Pw,a reçoit les mêmes facteurs que la butée (φp au glissement, φ de renversement : À CONFIRMER).`}
              {' '}La sous-pression est prise uniforme (γw·hw·B) ; une sous-pression trapézoïdale est à traiter avec MUR-02.
            </li>
            <li>Géométrie : remblai horizontal, voile sans fruit, sans clé de cisaillement.</li>
          </ul>
        </div>

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
              * Références : CNB {result.cnbEdition}, 4.1.3.2 ; CFEM 5e éd. (numérotation des tableaux et figures de la 4e éd. à reconfirmer) ; CSA A23.3-19. Éléments NON VÉRIFIÉS : stabilité d'ensemble, gel, drainage, tassement.
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
