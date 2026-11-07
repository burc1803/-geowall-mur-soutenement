import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Minus, Plus, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import {
  AnalysisResult,
  CanadianBarSize,
  CANADIAN_REBAR_CATALOG,
  ConcreteProperties,
  LoadsConfig,
  RebarCustomConfig,
  SoilProperties,
  WallGeometry
} from '../lib/types';
import { resolveRebarConfig } from '../lib/analysis';
import {
  AutoProposal,
  BAR_SIZES,
  HOOK_EXTENSION_FACTOR,
  SCHEDULE_DISCLAIMER,
  STANDARD_SPACINGS,
  ZONES,
  ZoneId,
  ZoneRow,
  buildBarSchedule,
  buildZoneRows,
  proposeAutoConfig,
  setZoneSelection,
  totalScheduleMass
} from '../lib/rebarPlans';

interface RebarPlansProps {
  geo: WallGeometry;
  soil: SoilProperties;
  loads: LoadsConfig;
  conc: ConcreteProperties;
  result: AnalysisResult;
  rebarConfig: RebarCustomConfig;
  onChange: (config: RebarCustomConfig) => void;
}

const ZONE_COLOR: Record<ZoneId, string> = {
  A1: '#dc2626',
  A2: '#ea580c',
  A3: '#2563eb',
  A4: '#0891b2',
  A5: '#7c3aed',
  A6: '#16a34a',
  A7: '#a16207'
};

/** Nombre avec virgule décimale (affichage seulement ; aucun arrondi dans les calculs). */
const nf = (v: number, d = 0) => v.toLocaleString('fr-CA', { minimumFractionDigits: d, maximumFractionDigits: d });

function spacingOptions(current: number): number[] {
  return Array.from(new Set([...STANDARD_SPACINGS, current])).sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ */
/* Schéma d'armature en coupe (SVG)                                     */
/* ------------------------------------------------------------------ */
function SectionDiagram({ geo, conc, result, rows }: { geo: WallGeometry; conc: ConcreteProperties; result: AnalysisResult; rows: ZoneRow[] }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const Hs = geo.epBase * 1000;
  const Hw = geo.hMur * 1000;
  const xs0 = geo.ePiedAv * 1000;
  const xs1 = xs0 + geo.epStem * 1000;
  const B = xs1 + geo.ePiedAr * 1000;
  const k = Math.min(380 / B, 400 / (Hs + Hw)); // px par mm (échelle commune x et y)
  const ML = 400;
  const MR = 340;
  const MT = 70;
  const MB = 80;
  const W = ML + B * k + MR;
  const H = MT + (Hs + Hw) * k + MB;
  const X = (x: number) => ML + x * k;
  const Y = (y: number) => MT + (Hs + Hw - y) * k; // y mesuré depuis la sous-face de la semelle

  const row = (id: ZoneId) => rows.find(r => r.zone.id === id)!;
  const dia = (id: ZoneId) => CANADIAN_REBAR_CATALOG[row(id).barSize].diameter;
  const sw = (id: ZoneId) => Math.max(2, dia(id) * k); // épaisseur de trait proportionnelle au diamètre

  const cH = conc.cover_h;
  const cV = conc.cover_v;
  const cB = conc.cover_base_bottom;

  // --- barres ---
  const x1 = xs1 - cH - dia('A1') / 2; // A1 : face intérieure (remblai, côté talon)
  const x2 = xs0 + cH + dia('A2') / 2; // A2 : face extérieure
  const yTop = Hs + Hw - cH;
  const yA5 = cB + dia('A5') / 2;
  const yA6 = Hs - cV - dia('A6') / 2;
  const yA7b = cB + dia('A5') + dia('A7') / 2;
  const yA7t = Hs - cV - dia('A6') - dia('A7') / 2;
  const x3 = xs0 + cH + dia('A2') + dia('A3') / 2; // A3 : horizontales extérieures (à l'intérieur des verticales)
  const x4 = xs1 - cH - dia('A1') - dia('A4') / 2; // A4 : horizontales intérieures

  // Ancrage des barres du voile dans la semelle : ldh du moteur (distance de la section critique à l'extérieur du crochet)
  const anchor = (id: 'A1' | 'A2') => {
    const r = row(id);
    const d = dia(id);
    const yMin = cB + dia('A5') + dia('A7') + d / 2;
    const ldh = r.ldh;
    const yLeg = ldh === null ? yMin : Math.max(Hs - ldh + d / 2, yMin);
    const exceeds = ldh !== null && Hs - ldh + d / 2 < yMin;
    return { yLeg, exceeds, ldh, ext: HOOK_EXTENSION_FACTOR * d };
  };
  const an1 = anchor('A1');
  const an2 = anchor('A2');
  const leg1End = Math.min(x1 + an1.ext, B - cH);
  const leg2End = Math.max(x2 - an2.ext, cH);

  // Points (sections de barres horizontales)
  const horizDots = (xMm: number, id: 'A3' | 'A4') => {
    const s = row(id).spacing;
    const out: number[] = [];
    for (let y = yTop - dia(id) / 2; y > Hs + dia(id); y -= s) out.push(y);
    return out.map(y => ({ x: xMm, y }));
  };
  const dots3 = horizDots(x3, 'A3');
  const dots4 = horizDots(x4, 'A4');
  const longDots = (y: number) => {
    const s = row('A7').spacing;
    const out: { x: number; y: number }[] = [];
    for (let x = cH; x <= B - cH + 1e-6; x += s) out.push({ x, y });
    return out;
  };
  const dots7 = [...longDots(yA7b), ...longDots(yA7t)];

  // --- étiquettes à repère, sans chevauchement ---
  type Lbl = { id: ZoneId; ax: number; ay: number; side: 'L' | 'R'; text: string };
  const text = (id: ZoneId) => `${id} (${row(id).zone.short}) : ${row(id).barSize} @ ${row(id).spacing}`;
  const d3 = dots3.length ? dots3[Math.min(1, dots3.length - 1)] : { x: x3, y: Hs + Hw / 2 };
  const labels: Lbl[] = [
    { id: 'A1', ax: X(x1), ay: Y(Hs + Hw * 0.7), side: 'R', text: text('A1') },
    { id: 'A4', ax: X(x4), ay: Y(Hs + Hw * 0.45), side: 'R', text: text('A4') },
    { id: 'A6', ax: X(xs1 + (B - xs1) * 0.55), ay: Y(yA6), side: 'R', text: text('A6') },
    { id: 'A2', ax: X(x2), ay: Y(Hs + Hw * 0.8), side: 'L', text: text('A2') },
    { id: 'A3', ax: X(d3.x), ay: Y(d3.y), side: 'L', text: text('A3') },
    { id: 'A7', ax: X(cH), ay: Y(yA7b), side: 'L', text: text('A7') + ' (2 lits)' },
    { id: 'A5', ax: X(xs0 * 0.5), ay: Y(yA5), side: 'L', text: text('A5') }
  ];
  const place = (side: 'L' | 'R') => {
    const list = labels.filter(l => l.side === side).sort((a, b) => a.ay - b.ay);
    const GAP = 24;
    const ys: number[] = [];
    list.forEach((l, i) => ys.push(i === 0 ? l.ay : Math.max(l.ay, ys[i - 1] + GAP)));
    // si le dernier dépasse le cadre, on remonte l'ensemble
    const over = ys.length ? ys[ys.length - 1] - (H - 20) : 0;
    return list.map((l, i) => ({ ...l, ly: ys[i] - Math.max(over, 0) }));
  };
  const placed = [...place('L'), ...place('R')];

  const gx = (side: 'L' | 'R') => (side === 'L' ? X(0) - 90 : X(B) + 90);
  const dimColor = '#475569';

  const tx = (1 - zoom) * (W / 2) + pan.x;
  const ty = (1 - zoom) * (H / 2) + pan.y;
  const step = 40;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 print:break-inside-avoid">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-slate-900">Schéma d'armature en coupe (échelle de la géométrie)</h3>
        <div className="flex items-center gap-1 print:hidden" role="group" aria-label="Zoom du schéma">
          <button type="button" onClick={() => setZoom(z => Math.min(z * 1.25, 4))} className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50" aria-label="Zoom avant" title="Zoom avant"><Plus size={14} /></button>
          <button type="button" onClick={() => setZoom(z => Math.max(z / 1.25, 0.5))} className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50" aria-label="Zoom arrière" title="Zoom arrière"><Minus size={14} /></button>
          <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50" aria-label="Réinitialiser le zoom" title="Réinitialiser"><RotateCcw size={14} /></button>
          <span className="mx-1 text-[10px] text-slate-400">|</span>
          <button type="button" onClick={() => setPan(p => ({ ...p, x: p.x + step }))} className="px-2 py-1 text-xs rounded-lg border border-slate-300 hover:bg-slate-50" aria-label="Déplacer vers la droite">←</button>
          <button type="button" onClick={() => setPan(p => ({ ...p, x: p.x - step }))} className="px-2 py-1 text-xs rounded-lg border border-slate-300 hover:bg-slate-50" aria-label="Déplacer vers la gauche">→</button>
          <button type="button" onClick={() => setPan(p => ({ ...p, y: p.y + step }))} className="px-2 py-1 text-xs rounded-lg border border-slate-300 hover:bg-slate-50" aria-label="Déplacer vers le bas">↑</button>
          <button type="button" onClick={() => setPan(p => ({ ...p, y: p.y - step }))} className="px-2 py-1 text-xs rounded-lg border border-slate-300 hover:bg-slate-50" aria-label="Déplacer vers le haut">↓</button>
          <span className="ml-1 text-[10px] font-mono text-slate-500">{Math.round(zoom * 100)} %</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Coupe du mur et de la semelle avec l'armature par zone">
          <g transform={`translate(${tx} ${ty}) scale(${zoom})`}>
            {/* béton (clé de cisaillement non modélisée : non dessinée) */}
            <polygon
              points={[[0, 0], [B, 0], [B, Hs], [xs1, Hs], [xs1, Hs + Hw], [xs0, Hs + Hw], [xs0, Hs], [0, Hs]].map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}
              fill="#e2e8f0" stroke="#334155" strokeWidth={1.5}
            />
            <text x={X(xs1 + (B - xs1) / 2)} y={Y(Hs + Hw * 0.18)} fontSize={10} fill="#64748b" textAnchor="middle">Remblai (côté intérieur)</text>
            <text x={X(xs0 / 2)} y={Y(Hs + Hw * 0.18)} fontSize={10} fill="#64748b" textAnchor="middle">Avant</text>

            {/* A6 / A5 : transversales (lignes) */}
            <line x1={X(cB)} x2={X(B - cV)} y1={Y(yA6)} y2={Y(yA6)} stroke={ZONE_COLOR.A6} strokeWidth={sw('A6')} />
            <line x1={X(cB)} x2={X(B - cV)} y1={Y(yA5)} y2={Y(yA5)} stroke={ZONE_COLOR.A5} strokeWidth={sw('A5')} />

            {/* A1 / A2 : verticales ancrées par un crochet dans la semelle */}
            <polyline points={`${X(x1)},${Y(yTop)} ${X(x1)},${Y(an1.yLeg)} ${X(leg1End)},${Y(an1.yLeg)}`} fill="none" stroke={ZONE_COLOR.A1} strokeWidth={sw('A1')} strokeLinejoin="round" />
            <polyline points={`${X(x2)},${Y(yTop)} ${X(x2)},${Y(an2.yLeg)} ${X(leg2End)},${Y(an2.yLeg)}`} fill="none" stroke={ZONE_COLOR.A2} strokeWidth={sw('A2')} strokeLinejoin="round" />

            {/* A3 / A4 / A7 : sections de barres (points) */}
            {dots3.map((p, i) => <circle key={`a3${i}`} cx={X(p.x)} cy={Y(p.y)} r={Math.max(2.2, dia('A3') * k / 2)} fill={ZONE_COLOR.A3} />)}
            {dots4.map((p, i) => <circle key={`a4${i}`} cx={X(p.x)} cy={Y(p.y)} r={Math.max(2.2, dia('A4') * k / 2)} fill={ZONE_COLOR.A4} />)}
            {dots7.map((p, i) => <circle key={`a7${i}`} cx={X(p.x)} cy={Y(p.y)} r={Math.max(2.2, dia('A7') * k / 2)} fill={ZONE_COLOR.A7} />)}

            {/* étiquettes à repère */}
            {placed.map(l => {
              const gxs = gx(l.side);
              const anchorEdge = l.side === 'L' ? X(0) - 18 : X(B) + 18;
              return (
                <g key={l.id}>
                  <polyline points={`${l.ax},${l.ay} ${anchorEdge},${l.ly} ${gxs + (l.side === 'L' ? 4 : -4)},${l.ly}`} fill="none" stroke={ZONE_COLOR[l.id]} strokeWidth={1} />
                  <circle cx={l.ax} cy={l.ay} r={2.5} fill="#fff" stroke={ZONE_COLOR[l.id]} strokeWidth={1.2} />
                  <text x={gxs + (l.side === 'L' ? 0 : 0)} y={l.ly + 4} fontSize={12} fontWeight={700} fill={ZONE_COLOR[l.id]} textAnchor={l.side === 'L' ? 'end' : 'start'}>{l.text}</text>
                </g>
              );
            })}

            {/* cotes : épaisseurs */}
            <g stroke={dimColor} strokeWidth={0.8} fill={dimColor} fontSize={10}>
              <line x1={X(xs0)} x2={X(xs1)} y1={Y(Hs + Hw) - 22} y2={Y(Hs + Hw) - 22} />
              <line x1={X(xs0)} x2={X(xs0)} y1={Y(Hs + Hw) - 27} y2={Y(Hs + Hw) - 17} />
              <line x1={X(xs1)} x2={X(xs1)} y1={Y(Hs + Hw) - 27} y2={Y(Hs + Hw) - 17} />
              <text x={X((xs0 + xs1) / 2)} y={Y(Hs + Hw) - 28} textAnchor="middle" stroke="none">voile {nf(geo.epStem * 1000)}</text>
              <text x={X(xs0) - 4} y={Y(Hs + Hw) - 6} textAnchor="end" stroke="none">enr. {nf(cH)}</text>
              <text x={X(xs1) + 4} y={Y(Hs + Hw) - 6} textAnchor="start" stroke="none">enr. {nf(cH)}</text>

              {/* sous la semelle : patin, voile, talon */}
              {[[0, xs0, 'patin'], [xs0, xs1, 'voile'], [xs1, B, 'talon']].map(([a, b, n]) => (
                <g key={String(n)}>
                  <line x1={X(a as number)} x2={X(b as number)} y1={Y(0) + 20} y2={Y(0) + 20} />
                  <line x1={X(a as number)} x2={X(a as number)} y1={Y(0) + 15} y2={Y(0) + 25} />
                  <line x1={X(b as number)} x2={X(b as number)} y1={Y(0) + 15} y2={Y(0) + 25} />
                  <text x={X(((a as number) + (b as number)) / 2)} y={Y(0) + 36} textAnchor="middle" stroke="none">{String(n)} {nf((b as number) - (a as number))}</text>
                </g>
              ))}
              <line x1={X(0)} x2={X(B)} y1={Y(0) + 46} y2={Y(0) + 46} />
              <text x={X(B / 2)} y={Y(0) + 60} textAnchor="middle" stroke="none">largeur de la semelle {nf(B)}</text>

              {/* épaisseur de la semelle et hauteur du voile (côté avant) */}
              <line x1={X(0) - 10} x2={X(0) - 10} y1={Y(0)} y2={Y(Hs)} />
              <line x1={X(0) - 15} x2={X(0) - 5} y1={Y(0)} y2={Y(0)} />
              <line x1={X(0) - 15} x2={X(0) - 5} y1={Y(Hs)} y2={Y(Hs)} />
              <text x={X(0) - 14} y={Y(Hs / 2) + 3} textAnchor="end" stroke="none">semelle {nf(Hs)}</text>
              <line x1={X(xs0) - 12} x2={X(xs0) - 12} y1={Y(Hs)} y2={Y(Hs + Hw)} />
              <line x1={X(xs0) - 17} x2={X(xs0) - 7} y1={Y(Hs)} y2={Y(Hs)} />
              <line x1={X(xs0) - 17} x2={X(xs0) - 7} y1={Y(Hs + Hw)} y2={Y(Hs + Hw)} />
              <text x={X(xs0) - 16} y={Y(Hs + Hw * 0.55)} textAnchor="middle" stroke="none" transform={`rotate(-90 ${X(xs0) - 16} ${Y(Hs + Hw * 0.55)})`}>hauteur du voile {nf(Hw)}</text>

              {/* enrobages de la semelle (extrémité du talon) */}
              <line x1={X(B) + 8} x2={X(B) + 8} y1={Y(Hs)} y2={Y(Hs - cV)} />
              <text x={X(B) + 12} y={Y(Hs - cV / 2) + 3} stroke="none">enr. talon (sup.) {nf(cV)}</text>
              <line x1={X(B) + 8} x2={X(B) + 8} y1={Y(0)} y2={Y(cB)} />
              <text x={X(B) + 12} y={Y(cB / 2) + 3} stroke="none">enr. patin (inf.) {nf(cB)}</text>
            </g>
          </g>
        </svg>
      </div>

      <div className="text-[11px] text-slate-600 space-y-1">
        <p>
          Barres verticales et transversales en lignes ; barres horizontales et longitudinales en points (sections). Une couleur par zone.
          Crochets des barres du voile : ldh du moteur ({nf(row('A1').ldh ?? 0)} mm pour A1, {nf(row('A2').ldh ?? 0)} mm pour A2) et prolongement {HOOK_EXTENSION_FACTOR}db (À CONFIRMER) ; sens des crochets schématique.
          Clé de cisaillement non modélisée : non dessinée.
        </p>
        {(an1.exceeds || an2.exceeds) && (
          <p className="text-rose-700 font-bold flex items-center gap-1"><AlertTriangle size={13} /> ldh du moteur supérieur à la profondeur disponible dans la semelle : crochet tracé au niveau minimal ; voir l'ancrage dans « Choix barres & Mr ».</p>
        )}
        <p>
          Ancrages du moteur : ld A1 = {nf(row('A1').ld ?? 0)} mm ; ld A5 = {nf(row('A5').ld ?? 0)} mm ; ld A6 = {nf(row('A6').ld ?? 0)} mm
          {(row('A1').ld === null || row('A5').ld === null || row('A6').ld === null) && ' (longueur : voir nomenclature)'}.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                  */
/* ------------------------------------------------------------------ */
export function RebarPlans({ geo, soil, loads, conc, result, rebarConfig, onChange }: RebarPlansProps) {
  const rows = useMemo(() => buildZoneRows(result), [result]);
  const schedule = useMemo(() => buildBarSchedule(result, geo, conc), [result, geo, conc]);
  const cfg = resolveRebarConfig(rebarConfig);
  const [proposal, setProposal] = useState<AutoProposal | null>(null);

  const select = (key: ZoneRow['zone']['key'], part: { barSize?: CanadianBarSize; spacing?: number }) => {
    setProposal(null);
    onChange(setZoneSelection(rebarConfig, key, { ...cfg[key], ...part }));
  };

  const pair = rows.find(r => r.pair)?.pair;
  const totalMass = totalScheduleMass(schedule);
  const allOk = rows.every(r => r.ok);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl text-white">
        <h2 className="text-lg font-black">Plans d'armatures du voile et de la semelle</h2>
        <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
          Tableau général par zone, schéma en coupe et nomenclature par mètre de mur. Les sélecteurs modifient la même configuration que l'onglet « Choix barres & Mr ».
          Valeurs de calcul : moteur CSA A23.3-19 (MUR-02 §6). Le statut de zone ne couvre pas la ductilité, la fissuration, ld, db ≤ t/10 ni le cisaillement : voir leurs onglets.
        </p>
      </div>

      {/* Tableau général */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-slate-900">Tableau général des armatures par zone</h3>
          <button
            type="button"
            onClick={() => setProposal(proposeAutoConfig(geo, soil, loads, conc, rebarConfig))}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 print:hidden"
          >
            <Sparkles size={13} /> Auto
          </button>
        </div>

        {proposal && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs space-y-2 print:hidden" role="status">
            <div className="font-black text-amber-900">Proposition (aucun changement appliqué) : plus petite barre et plus grand espacement standard qui satisfont le statut de chaque zone.</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-slate-800">
              {ZONES.map(z => {
                const s = resolveRebarConfig(proposal.config)[z.key];
                const miss = proposal.unsatisfied.includes(z.id);
                return <span key={z.id} className={miss ? 'text-rose-700 font-bold' : ''}>{z.id} : {s.barSize} @ {s.spacing}{miss ? ' (aucune combinaison standard ne satisfait le statut ; sélection conservée)' : ''}</span>;
              })}
            </div>
            <div className="text-[11px] text-amber-900">
              A3 puis A4 : la somme A3 + A4 est comparée à 0,002Ag (14.1.8.6) ; A4 est allégée tant que la somme et les vérifications par nappe passent. La proposition exige le statut de zone et les vérifications du moteur (ductilité, fissuration, ld, db ≤ t/10, cisaillement) ; vérifiez-les dans leurs onglets.
              {proposal.engineChecksFailing.length > 0 && <strong className="block text-rose-700">Zones où le statut de zone est satisfait mais pas toutes les vérifications du moteur (meilleure proposition) : {proposal.engineChecksFailing.join(', ')}.</strong>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { onChange(proposal.config); setProposal(null); }} className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-black">Appliquer la proposition</button>
              <button type="button" onClick={() => setProposal(null)} className="px-3 py-1 rounded-lg border border-slate-300 bg-white font-bold">Ignorer</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-2 py-2 font-bold">Élément / zone</th>
                <th className="px-2 py-2 font-bold text-right whitespace-nowrap">As,req (mm²/m)</th>
                <th className="px-2 py-2 font-bold">As,min (mm²/m) et article</th>
                <th className="px-2 py-2 font-bold">Barre</th>
                <th className="px-2 py-2 font-bold">Espacement (mm)</th>
                <th className="px-2 py-2 font-bold text-right whitespace-nowrap">As,fourni (mm²/m)</th>
                <th className="px-2 py-2 font-bold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(r => (
                <tr key={r.zone.id} className={r.ok ? 'bg-white' : 'bg-rose-50/60'}>
                  <td className="px-2 py-2 align-top">
                    <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: ZONE_COLOR[r.zone.id] }} aria-hidden="true" />
                    <span className="font-black">{r.zone.id}</span> — {r.zone.label}
                  </td>
                  <td className="px-2 py-2 text-right font-mono align-top whitespace-nowrap">
                    {r.As_req === null ? '—' : r.As_req_unreachable ? 'non atteignable' : nf(r.As_req, 0)}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <span className="font-mono">{nf(r.As_min, 0)}</span>
                    <span className="block text-[10px] text-slate-500 leading-snug">{r.As_min_basis}</span>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <select
                      aria-label={`Barre, zone ${r.zone.id}`}
                      value={r.barSize}
                      onChange={e => select(r.zone.key, { barSize: e.target.value as CanadianBarSize })}
                      className="border border-slate-300 rounded-md px-1.5 py-1 font-mono bg-white"
                    >
                      {BAR_SIZES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <select
                      aria-label={`Espacement en mm, zone ${r.zone.id}`}
                      value={r.spacing}
                      onChange={e => select(r.zone.key, { spacing: Number(e.target.value) })}
                      className="border border-slate-300 rounded-md px-1.5 py-1 font-mono bg-white"
                    >
                      {spacingOptions(r.spacing).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span className="block text-[10px] text-slate-500">max {nf(r.spacing_max, 0)}</span>
                  </td>
                  <td className="px-2 py-2 text-right font-mono align-top whitespace-nowrap">
                    {nf(r.As_provided, 0)}
                    {r.zone.id === 'A7' && <span className="block text-[10px] text-slate-500 font-sans">2 lits</span>}
                  </td>
                  <td className="px-2 py-2 align-top min-w-[11rem]">
                    {r.ok ? (
                      <span className="inline-flex items-center gap-1 font-black text-emerald-700"><CheckCircle2 size={14} /> OK</span>
                    ) : (
                      <span className="inline-flex items-start gap-1 font-black text-rose-700"><XCircle size={14} className="mt-px shrink-0" /> <span>NON<span className="block font-normal text-[10px] leading-snug">{r.reasons.join(' ; ')}</span></span></span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pair && (
          <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2">
            <strong>Paire A3 + A4 (horizontales du voile) :</strong> Σ As = {nf(pair.provided, 0)} mm²/m {pair.provided >= pair.required ? '≥' : '<'} 0,002Ag = {nf(pair.required, 0)} mm²/m
            {' '}({pair.provided >= pair.required ? 'OK' : 'NON'}). 14.1.8.6 : aire totale ; répartition entre faces non prescrite par la norme. Espacement, db ≤ t/10 et fissuration : vérifiés par nappe.
          </div>
        )}
        <p className="text-[11px] text-slate-500">
          As,req : armature tendue pour Mr = Mf (inverse exact de la formule de Mr du moteur, bloc rectangulaire 10.1.7) ; « — » : aucun effort de flexion (As,min seul).
          A2 : As,min de la face extérieure déduit l'armature verticale de A1 (14.1.8.5, somme des deux faces).
        </p>
        <div className={`text-xs font-bold ${allOk ? 'text-emerald-700' : 'text-rose-700'}`} role="status">
          {allOk ? 'Toutes les zones satisfont As,fourni et l\'espacement maximal.' : 'Au moins une zone ne satisfait pas As,fourni ou l\'espacement maximal : voir les raisons ci-dessus.'}
        </div>
      </div>

      <SectionDiagram geo={geo} conc={conc} result={result} rows={rows} />

      {/* Nomenclature */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-black text-slate-900">Nomenclature des barres (par mètre de mur)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-2 py-1.5 font-bold">Repère</th>
                <th className="px-2 py-1.5 font-bold">Barre</th>
                <th className="px-2 py-1.5 font-bold text-right">Espacement (mm)</th>
                <th className="px-2 py-1.5 font-bold">Forme</th>
                <th className="px-2 py-1.5 font-bold text-right">Longueur unitaire (m)</th>
                <th className="px-2 py-1.5 font-bold text-right">Nombre par m de mur</th>
                <th className="px-2 py-1.5 font-bold text-right">Masse (kg/m de mur)</th>
                <th className="px-2 py-1.5 font-bold">Remarque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {schedule.map(s => (
                <tr key={s.id}>
                  <td className="px-2 py-1 font-black" style={{ color: ZONE_COLOR[s.id] }}>{s.id}</td>
                  <td className="px-2 py-1 font-mono">{s.barSize}</td>
                  <td className="px-2 py-1 text-right font-mono">{s.spacing}</td>
                  <td className="px-2 py-1">{s.shape}</td>
                  <td className="px-2 py-1 text-right font-mono">{nf(s.length, 2)}</td>
                  <td className="px-2 py-1 text-right font-mono">{nf(s.countPerM, 2)}</td>
                  <td className="px-2 py-1 text-right font-mono">{nf(s.massPerM, 1)}</td>
                  <td className="px-2 py-1 text-[10px] text-slate-500">{s.remark}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black">
                <td className="px-2 py-1.5" colSpan={6}>Total</td>
                <td className="px-2 py-1.5 text-right font-mono">{nf(totalMass, 1)}</td>
                <td className="px-2 py-1.5 text-[10px] font-normal">kg par mètre de mur</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-[11px] text-amber-800 font-bold flex items-start gap-1"><AlertTriangle size={13} className="mt-px shrink-0" /> {SCHEDULE_DISCLAIMER}</p>
      </div>
    </div>
  );
}
