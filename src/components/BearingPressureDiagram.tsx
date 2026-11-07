import React, { useState } from 'react';
import { AnalysisResult, WallGeometry, SoilProperties, CombinationResult } from '../lib/types';
import { ArrowDown, HelpCircle, AlertTriangle, CheckCircle2, ChevronRight, Gauge, Scale, Layers } from 'lucide-react';

interface BearingPressureDiagramProps {
  geo: WallGeometry;
  soil: SoilProperties;
  result: AnalysisResult;
}

export function BearingPressureDiagram({ geo, soil, result }: BearingPressureDiagramProps) {
  // Selection mode for combination
  const [selectedCombName, setSelectedCombName] = useState<string>(
    result.governingULS ? result.governingULS.combName : result.combinations[0]?.combName || ''
  );

  const selectedComb: CombinationResult = 
    result.combinations.find(c => c.combName === selectedCombName) || 
    result.governingULS || 
    result.combinations[0];

  const B = geo.ePiedAv + geo.epStem + geo.ePiedAr; // Largeur semelle en m
  const B_over_6 = B / 6;
  const Rv = selectedComb.sumV_max; // kN/m
  const ecc = Math.abs(selectedComb.ecc); // m
  const x1 = selectedComb.x1; // Distance du patin avant à la résultante en m
  // Résultante hors base : la pression calculée est fictive (largeur comprimée ~ 0) -> non dessinée, non vérifiable
  const outside = !!selectedComb.outside_base;
  const NV = 'non vérifiable';
  const q1 = outside ? 0 : selectedComb.q_toe; // kPa à l'orteil
  const q2 = outside ? 0 : selectedComb.q_heel; // kPa au talon

  // Factored resistance or allowable bearing
  const q_limit = selectedComb.type === 'ULS' 
    ? selectedComb.q_capacity // Ψ·φgu·qu calculé par le moteur (MUR-02 §1)
    : soil.qAllowable_SLS;

  const isTensionSeparation = ecc > B_over_6;
  const contactRatio = isTensionSeparation ? Math.min((3 * x1) / B, 1.0) : 1.0;
  const bearingRatio = q_limit > 0 ? (q1 / q_limit) : 0;
  const isBearingOk = !outside && bearingRatio <= 1.0;

  // SVG coordinate transformation
  const svgWidth = 720;
  const svgHeight = 360;
  const padLeft = 90;
  const padRight = 70;
  const usableWidth = svgWidth - padLeft - padRight;
  const scaleX = usableWidth / B; // pixels par mètre

  const baseTopY = 90;
  const baseThicknessPx = Math.max(geo.epBase * scaleX, 24);
  const baseBottomY = baseTopY + baseThicknessPx;

  // Geometry X coordinates
  const toeStartX = padLeft;
  const toeEndX = padLeft + geo.ePiedAv * scaleX;
  const stemEndX = toeEndX + geo.epStem * scaleX;
  const heelEndX = padLeft + B * scaleX;
  const centerX = padLeft + (B / 2) * scaleX;
  const resultantX = padLeft + Math.max(Math.min(x1, B), 0) * scaleX;

  // Central kern [-B/6, +B/6]
  const kernStartX = padLeft + (B / 2 - B_over_6) * scaleX;
  const kernEndX = padLeft + (B / 2 + B_over_6) * scaleX;

  // Ground pressure drawing scale
  const maxPressureDisplay = Math.max(q1, q2, q_limit, 50);
  const pressureHeightMaxPx = 110;
  const scaleP = pressureHeightMaxPx / maxPressureDisplay;

  const q1Px = q1 * scaleP;
  const q2Px = q2 * scaleP;
  const qLimitPx = q_limit * scaleP;

  // Pressure polygon points
  let pressurePolygonPoints = '';
  let separationPolygonPoints = '';

  if (!isTensionSeparation) {
    // Cas 2 / Cas 3: Trapèze ou triangle complet
    pressurePolygonPoints = `
      ${toeStartX},${baseBottomY}
      ${toeStartX},${baseBottomY + q1Px}
      ${heelEndX},${baseBottomY + q2Px}
      ${heelEndX},${baseBottomY}
    `;
  } else {
    // Cas 4: Triangle sur largeur comprimée 3*x1, puis décollement (0 kPa)
    const compressedEndX = Math.min(padLeft + (3 * x1) * scaleX, heelEndX);
    pressurePolygonPoints = `
      ${toeStartX},${baseBottomY}
      ${toeStartX},${baseBottomY + q1Px}
      ${compressedEndX},${baseBottomY}
    `;
    // Zone décollée
    separationPolygonPoints = `
      ${compressedEndX},${baseBottomY}
      ${compressedEndX},${baseBottomY + 12}
      ${heelEndX},${baseBottomY + 12}
      ${heelEndX},${baseBottomY}
    `;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Banner & Combination Quick-Pickers */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
              CFEM 5e éd., § 20.7 / CNB {result.cnbEdition}
            </span>
            <span className="text-xs text-slate-300">Analyse de Contact & Excentricité</span>
          </div>
          <h3 className="text-lg font-black text-white mt-1 flex items-center gap-2">
            <Layers className="text-amber-400" size={20} />
            Diagramme des Pressions au Sol & Localisation de la Résultante
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Répartition des contraintes normales sous la semelle, position de l'axe de poussée et vérification du tiers central.
          </p>
        </div>

        {/* Quick select buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {result.governingULS && (
            <button
              onClick={() => setSelectedCombName(result.governingULS.combName)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCombName === result.governingULS.combName
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              <Gauge size={13} />
              Gouv. ÉLU (q1 Max)
            </button>
          )}

          {result.governingSLS && (
            <button
              onClick={() => setSelectedCombName(result.governingSLS.combName)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCombName === result.governingSLS.combName
                  ? 'bg-blue-500 text-white font-black shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              <Scale size={13} />
              Gouv. ÉLTS (Service)
            </button>
          )}

          {result.governingOverturning && (
            <button
              onClick={() => setSelectedCombName(result.governingOverturning.combName)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCombName === result.governingOverturning.combName
                  ? 'bg-rose-500 text-white font-black shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              <AlertTriangle size={13} />
              Pire Renversement
            </button>
          )}
        </div>
      </div>

      {/* Combinaison Dropdown Selector */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Combinaison affichée :</span>
          <select
            value={selectedCombName}
            onChange={(e) => setSelectedCombName(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <optgroup label="Combinaisons ÉLU (États Limites Ultimes)">
              {result.combinations.filter(c => c.type === 'ULS').map(c => (
                <option key={c.combName} value={c.combName}>
                  {c.combName} — q1 = {c.outside_base ? NV : `${c.q_toe.toFixed(1)} kPa`} | e = {Math.abs(c.ecc).toFixed(3)} m
                </option>
              ))}
            </optgroup>
            <optgroup label="Combinaisons ÉLTS (États Limites d'Utilisation / Tassement)">
              {result.combinations.filter(c => c.type === 'SLS').map(c => (
                <option key={c.combName} value={c.combName}>
                  {c.combName} — q1 = {c.outside_base ? NV : `${c.q_toe.toFixed(1)} kPa`} | e = {Math.abs(c.ecc).toFixed(3)} m
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-200 text-slate-700">
            Type : <strong className="text-slate-900">{selectedComb.type}</strong>
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
            isBearingOk ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
          }`}>
            {isBearingOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {outside ? 'q1 / q_cap : non vérifiable (hors base)' : <>q1 / q_cap = {(bearingRatio * 100).toFixed(1)} % {isBearingOk ? '(Conforme)' : '(Surcharge)'}</>}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
            !isTensionSeparation ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}>
            {!isTensionSeparation ? 'Tiers Central Respecté' : 'Décollement Partiel Talon'}
          </span>
        </div>
      </div>

      {outside && (
        <div role="alert" className="mx-4 mt-3 flex items-start gap-2 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold rounded-lg p-3">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>Résultante hors base, pression non vérifiable. {selectedComb.stability_message}</span>
        </div>
      )}

      {/* SVG Interactive Canvas */}
      <div className="p-4 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/60 overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-3xl h-auto drop-shadow-sm select-none"
        >
          <defs>
            {/* Pattern for soil under base */}
            <pattern id="soilPatternDiag" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 0 10 L 10 0 M 0 0 L 10 10" stroke="#cbd5e1" strokeWidth="0.8" />
            </pattern>
            {/* Gradient for pressure trapezoid */}
            <linearGradient id="pressureGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.4" />
            </linearGradient>
            {/* Striped pattern for separation zone */}
            <pattern id="separationHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#f43f5e" strokeWidth="1.5" />
            </pattern>
            {/* Arrow marker for resultant */}
            {/* Têtes dessinées selon +x (orient="auto" les aligne sur la ligne), pointe à l'extrémité, taille fixe en px */}
            <marker id="arrowResultant" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="14" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
            </marker>
            <marker id="arrowResultantBlue" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
            </marker>
            <marker id="dimArrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
            </marker>
          </defs>

          {/* Subsoil Background */}
          <rect x={padLeft - 20} y={baseBottomY} width={usableWidth + 40} height={svgHeight - baseBottomY - 10} fill="#f8fafc" />

          {/* Kern Zone (Tiers Central) background highlight */}
          <rect
            x={kernStartX}
            y={baseTopY}
            width={kernEndX - kernStartX}
            height={baseThicknessPx + pressureHeightMaxPx + 20}
            fill="#f0fdf4"
            opacity="0.8"
          />
          <text
            x={(kernStartX + kernEndX) / 2}
            y={baseBottomY + pressureHeightMaxPx + 38}
            textAnchor="middle"
            fill="#15803d"
            fontSize="10"
            fontWeight="bold"
          >
            Tiers central (B/3) : Contact comprimé total garanti
          </text>

          {/* Kern dashed vertical boundary lines */}
          <line x1={kernStartX} y1={baseTopY - 15} x2={kernStartX} y2={baseBottomY + pressureHeightMaxPx + 25} stroke="#22c55e" strokeWidth="1.2" strokeDasharray="3,3" />
          <line x1={kernEndX} y1={baseTopY - 15} x2={kernEndX} y2={baseBottomY + pressureHeightMaxPx + 25} stroke="#22c55e" strokeWidth="1.2" strokeDasharray="3,3" />

          {/* Footing Concrete Blocks */}
          {/* 1. Footing Base (Semelle) */}
          <rect
            x={toeStartX}
            y={baseTopY}
            width={usableWidth}
            height={baseThicknessPx}
            fill="#cbd5e1"
            stroke="#475569"
            strokeWidth="2"
            rx="2"
          />

          {/* 2. Wall Stem stub (Amorce du Voile) */}
          <rect
            x={toeEndX}
            y={baseTopY - 45}
            width={geo.epStem * scaleX}
            height={45}
            fill="#94a3b8"
            stroke="#475569"
            strokeWidth="2"
          />
          <text
            x={toeEndX + (geo.epStem * scaleX) / 2}
            y={baseTopY - 22}
            textAnchor="middle"
            fill="#1e293b"
            fontSize="11"
            fontWeight="bold"
          >
            Voile
          </text>

          {/* Footing segment labels */}
          <text x={toeStartX + (geo.ePiedAv * scaleX) / 2} y={baseTopY + baseThicknessPx / 2 + 4} textAnchor="middle" fill="#334155" fontSize="10" fontWeight="bold">
            Patin ({geo.ePiedAv.toFixed(2)} m)
          </text>
          <text x={stemEndX + (geo.ePiedAr * scaleX) / 2} y={baseTopY + baseThicknessPx / 2 + 4} textAnchor="middle" fill="#334155" fontSize="10" fontWeight="bold">
            Talon ({geo.ePiedAr.toFixed(2)} m)
          </text>

          {/* Footing Centerline B/2 */}
          <line
            x1={centerX}
            y1={baseTopY - 20}
            x2={centerX}
            y2={baseBottomY + pressureHeightMaxPx + 15}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="6,4"
          />
          <text x={centerX} y={baseTopY - 25} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">
            Axe Semelle (B/2 = {(B / 2).toFixed(2)} m)
          </text>

          {/* Soil Pressure Diagram Under Footing */}
          <polygon
            points={pressurePolygonPoints}
            fill="url(#pressureGradient)"
            stroke="#2563eb"
            strokeWidth="2"
          />

          {/* Hatched area for separation / tension (décollement) */}
          {isTensionSeparation && (
            <g>
              <polygon
                points={separationPolygonPoints}
                fill="url(#separationHatch)"
                stroke="#f43f5e"
                strokeWidth="1.5"
              />
              <text
                x={(padLeft + (3 * x1) * scaleX + heelEndX) / 2}
                y={baseBottomY + 24}
                textAnchor="middle"
                fill="#e11d48"
                fontSize="10"
                fontWeight="black"
              >
                Décollement partiel (q = 0)
              </text>
            </g>
          )}

          {/* Limit Capacity Line (q_cap) */}
          <line
            x1={toeStartX - 15}
            y1={baseBottomY + qLimitPx}
            x2={heelEndX + 15}
            y2={baseBottomY + qLimitPx}
            stroke={isBearingOk ? '#10b981' : '#f43f5e'}
            strokeWidth="1.8"
            strokeDasharray="4,4"
          />
          <text
            x={heelEndX + 20}
            y={baseBottomY + qLimitPx + 3}
            fill={isBearingOk ? '#059669' : '#dc2626'}
            fontSize="10"
            fontWeight="bold"
          >
            {selectedComb.type === 'ULS' ? 'φgu·qu' : 'q_adm'} = {q_limit.toFixed(1)} kPa
          </text>

          {/* Pressure arrows inside the diagram */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const currentDist = frac * B;
            const currentX = padLeft + currentDist * scaleX;
            let currentQ = 0;
            if (!isTensionSeparation) {
              currentQ = q1 - ((q1 - q2) / B) * currentDist;
            } else {
              const effW = 3 * x1;
              if (currentDist <= effW) {
                currentQ = q1 - (q1 / effW) * currentDist;
              }
            }
            if (currentQ <= 0.1) return null;
            const arrowLen = currentQ * scaleP;
            if (arrowLen < 10) return null;
            // Réaction du sol : la flèche part du diagramme et pointe vers le dessous de la semelle
            return (
              <line
                key={idx}
                x1={currentX}
                y1={baseBottomY + arrowLen}
                x2={currentX}
                y2={baseBottomY + 1}
                stroke="#1d4ed8"
                strokeWidth="1.2"
                markerEnd="url(#arrowResultantBlue)"
                opacity="0.75"
              />
            );
          })}

          {/* Values of q1 and q2 */}
          <text
            x={toeStartX}
            y={baseBottomY + q1Px + 16}
            textAnchor="start"
            fill="#1e40af"
            fontSize="12"
            fontWeight="black"
          >
            q1 = {outside ? NV : `${q1.toFixed(1)} kPa`}
          </text>
          {outside ? (
            <text x={heelEndX} y={baseBottomY + 16} textAnchor="end" fill="#e11d48" fontSize="11" fontWeight="bold">
              q2 = {NV}
            </text>
          ) : !isTensionSeparation ? (
            <text
              x={heelEndX}
              y={baseBottomY + q2Px + 16}
              textAnchor="end"
              fill="#1e40af"
              fontSize="12"
              fontWeight="black"
            >
              q2 = {q2.toFixed(1)} kPa
            </text>
          ) : (
            <text
              x={heelEndX}
              y={baseBottomY + 16}
              textAnchor="end"
              fill="#e11d48"
              fontSize="11"
              fontWeight="bold"
            >
              q2 = 0.0 kPa
            </text>
          )}

          {/* RESULTANT FORCE RV ARROW AND LOCALIZATION */}
          {/* Resultant line passing through base */}
          <line
            x1={resultantX}
            y1={baseTopY - 50}
            x2={resultantX}
            y2={baseBottomY}
            stroke="#dc2626"
            strokeWidth="3.5"
            markerEnd="url(#arrowResultant)"
          />

          {/* Resultant badge on top */}
          <g transform={`translate(${resultantX}, ${baseTopY - 55})`}>
            <rect
              x="-60"
              y="-24"
              width="120"
              height="24"
              rx="6"
              fill="#dc2626"
              filter="drop-shadow(0px 2px 3px rgba(0,0,0,0.2))"
            />
            <text
              x="0"
              y="-8"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="black"
            >
              Rv = {Rv.toFixed(1)} kN/m
            </text>
          </g>

          {/* Resultant x1 dimension line from toe (x=0) */}
          <line
            x1={toeStartX}
            y1={baseTopY - 8}
            x2={resultantX}
            y2={baseTopY - 8}
            stroke="#dc2626"
            strokeWidth="1.8"
          />
          <circle cx={toeStartX} cy={baseTopY - 8} r="3" fill="#dc2626" />
          <circle cx={resultantX} cy={baseTopY - 8} r="3" fill="#dc2626" />
          <text
            x={(toeStartX + resultantX) / 2}
            y={baseTopY - 13}
            textAnchor="middle"
            fill="#b91c1c"
            fontSize="10"
            fontWeight="black"
          >
            x1 = {x1.toFixed(3)} m
          </text>

          {/* Eccentricity e dimension line (between Center B/2 and Resultant x1) */}
          {ecc > 0.02 && (
            <g>
              <line
                x1={centerX}
                y1={baseTopY + baseThicknessPx + 15}
                x2={resultantX}
                y2={baseTopY + baseThicknessPx + 15}
                stroke="#6366f1"
                strokeWidth="1.5"
                markerStart="url(#dimArrow)"
                markerEnd="url(#dimArrow)"
              />
              <text
                x={(centerX + resultantX) / 2}
                y={baseTopY + baseThicknessPx + 28}
                textAnchor="middle"
                fill="#4338ca"
                fontSize="10"
                fontWeight="black"
              >
                e = {ecc.toFixed(3)} m {ecc <= B_over_6 ? '≤ B/6' : '> B/6'}
              </text>
            </g>
          )}

          {/* Total base width dimension B at the bottom */}
          <line
            x1={toeStartX}
            y1={svgHeight - 20}
            x2={heelEndX}
            y2={svgHeight - 20}
            stroke="#475569"
            strokeWidth="1.5"
          />
          <line x1={toeStartX} y1={svgHeight - 26} x2={toeStartX} y2={svgHeight - 14} stroke="#475569" strokeWidth="1.5" />
          <line x1={heelEndX} y1={svgHeight - 26} x2={heelEndX} y2={svgHeight - 14} stroke="#475569" strokeWidth="1.5" />
          <text
            x={(toeStartX + heelEndX) / 2}
            y={svgHeight - 25}
            textAnchor="middle"
            fill="#334155"
            fontSize="11"
            fontWeight="bold"
          >
            Largeur Totale de la Semelle B = {B.toFixed(2)} m (B/6 = {B_over_6.toFixed(3)} m)
          </text>
        </svg>
      </div>

      {/* Numerical Analysis Dashboard & Step-by-Step Breakdown */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 border-t border-slate-200">
        {/* Card 1: Resultant Position */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Position Résultante</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700">x1</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {x1.toFixed(3)} <span className="text-xs font-semibold text-slate-500">m</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Mesurée depuis la pointe avant du patin. <br />
              <span className="font-mono text-slate-700 text-[10px]">x1 = (ΣMr - ΣMo) / Rv</span>
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Charge totale Rv :</span>
            <strong className="text-slate-800">{Rv.toFixed(1)} kN/m</strong>
          </div>
        </div>

        {/* Card 2: Eccentricity & Kern */}
        <div className={`p-3.5 rounded-xl border shadow-sm flex flex-col justify-between ${
          !isTensionSeparation ? 'bg-white border-slate-200' : 'bg-amber-50/50 border-amber-200'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Excentricité vs Tiers Central</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                !isTensionSeparation ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {!isTensionSeparation ? 'Cas 2 (e ≤ B/6)' : 'Cas 4 (e > B/6)'}
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {ecc.toFixed(3)} <span className="text-xs font-semibold text-slate-500">m</span>
              <span className="text-xs font-normal text-slate-500 ml-2">/ Limite {B_over_6.toFixed(3)} m</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              {!isTensionSeparation
                ? 'Résultante à l’intérieur du tiers central : toute la semelle reste comprimée.'
                : 'Résultante hors du tiers central : décollement partiel du talon arrière.'}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] flex justify-between">
            <span className="text-slate-500">Zone comprimée :</span>
            <strong className={!isTensionSeparation ? 'text-emerald-700' : 'text-amber-700'}>
              {(contactRatio * 100).toFixed(0)} % ({(!isTensionSeparation ? B : 3 * x1).toFixed(2)} m)
            </strong>
          </div>
        </div>

        {/* Card 3: Max Pressure at Toe */}
        <div className={`p-3.5 rounded-xl border shadow-sm flex flex-col justify-between ${
          isBearingOk ? 'bg-white border-slate-200' : 'bg-rose-50/50 border-rose-200'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Contrainte Pointe Orteil</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                isBearingOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                q1 (max)
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {outside ? NV : <>{q1.toFixed(1)} <span className="text-xs font-semibold text-slate-500">kPa</span></>}
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Capacité : <strong className="text-slate-800">{q_limit.toFixed(1)} kPa</strong> ({selectedComb.type === 'ULS' ? 'φgu·qu' : 'q_adm'}).
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] flex justify-between items-center">
            <span className="text-slate-500">Taux d'utilisation :</span>
            <span className={`font-black ${isBearingOk ? 'text-emerald-600' : 'text-rose-600'}`}>
              {outside ? NV : `${(bearingRatio * 100).toFixed(1)} %`}
            </span>
          </div>
        </div>

        {/* Card 4: Heel Pressure & Status */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Contrainte Talon Arrière</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">q2</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {outside ? NV : <>{q2.toFixed(1)} <span className="text-xs font-semibold text-slate-500">kPa</span></>}
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              {outside ? 'Résultante hors base : contact non vérifiable.' : q2 > 0 ? 'Pression positive continue sous le remblai arrière.' : 'Tension théorique nulle (non transmise au sol).'}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Statut de contact :</span>
            <strong className={outside ? 'text-rose-700 font-bold' : q2 > 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
              {outside ? 'Non vérifiable' : q2 > 0 ? 'Comprimé' : 'Non comprimé'}
            </strong>
          </div>
        </div>
      </div>

      {/* Explanatory Technical Note */}
      <div className="px-5 py-3.5 bg-blue-50/60 border-t border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
        <HelpCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <strong>Règle de dimensionnement géotechnique (CFEM 5e éd., § 20.7 & CNB {result.cnbEdition}) :</strong>
          <p className="text-blue-800 leading-relaxed text-[11px]">
            Le sol ne pouvant pas reprendre d'effort de traction, si l'excentricité <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[10px]">e = |B/2 - x1|</code> dépasse le tiers central (<code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[10px]">B/6 = {B_over_6.toFixed(3)} m</code>), la répartition devient triangulaire sur une largeur réduite effective <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[10px]">B' = 3·x1</code> avec une contrainte de crête <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[10px]">q1 = 2·Rv / (3·x1)</code>. Les normes canadiennes tolèrent un décollement partiel sous conditions d'états limites ultimes tant que la portance ultime pondérée <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[10px]">φgu·qu</code> n'est pas dépassée.
          </p>
        </div>
      </div>
    </div>
  );
}
