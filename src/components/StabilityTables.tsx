import React, { useState } from 'react';
import { AnalysisResult, SoilProperties, WallGeometry, CombinationResult } from '../lib/types';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Scale, ArrowRightLeft, Layers, Info } from 'lucide-react';

interface StabilityTablesProps {
  result: AnalysisResult;
  soil: SoilProperties;
  geo: WallGeometry;
  onSelectCombination?: (comb: CombinationResult) => void;
}

export function StabilityTables({ result, soil, geo, onSelectCombination }: StabilityTablesProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'ULS' | 'SLS'>('ALL');
  const [onlyFailing, setOnlyFailing] = useState(false);
  const [activeTableTab, setActiveTableTab] = useState<'all' | 'sliding' | 'overturning' | 'bearing'>('all');

  const filteredCombinations = result.combinations.filter(c => {
    if (filterType !== 'ALL' && c.type !== filterType) return false;
    if (onlyFailing) {
      return (c.stabApplicable && c.status_sliding === 'NON') || c.status_overturning === 'NON' || c.status_bearing === 'NON' || c.status_ecc === 'NON';
    }
    return true;
  });

  // Glissement et renversement : ÉLU seulement (MUR-02 §12)
  const stabCombinations = filteredCombinations.filter(c => c.type === 'ULS');
  const totalULS = result.combinations.filter(c => c.type === 'ULS').length;
  const totalSLS = result.combinations.filter(c => c.type === 'SLS').length;

  const minSliding = result.critical_sliding_ULS;
  const minOverturning = result.critical_overturning_ULS;
  // MUR-02 §11 : df non saisie avec le choix « non vérifiable » -> glissement et renversement NON VÉRIFIABLES (ambre)
  const slidingNV = result.combinations.some(c => c.status_sliding === 'NON VÉRIFIABLE');
  const overturningNV = result.combinations.some(c => c.status_overturning === 'NON VÉRIFIABLE');
  const nvBadge = <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 text-[11px]"><AlertTriangle size={12} /> NON VÉRIFIABLE</span>;
  const maxQ_ULS = result.critical_q_toe_ULS;
  const maxQ_SLS = result.critical_q_toe_SLS;
  // Résultante hors base : valeurs fictives non affichées
  const outsideULS = result.combinations.some(c => c.type === 'ULS' && c.outside_base);

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-wider mb-1">
            <ShieldCheck size={16} />
            <span>Vérification Réglementaire Complète • CNB {result.cnbEdition} & CFEM</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Tableaux de Stabilité & Combinaisons</h2>
          <p className="text-xs text-slate-300 mt-1">
            Génération automatique de {result.combinations.length} combinaisons d'états limites ({totalULS} ÉLU + {totalSLS} ÉLTS) avec facteurs géotechniques CFEM 5e éd. (tableau 6.2).
          </p>
        </div>

        {/* Quick summary badges */}
        <div className="flex flex-wrap gap-2">
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 px-3 py-2 rounded-xl text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-400">Glissement Min</span>
            <span className={`text-base font-black ${slidingNV ? 'text-amber-400' : minSliding >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {slidingNV ? <>{minSliding === Infinity ? '∞' : minSliding.toFixed(2)} <span className="text-[10px] font-normal">(non vérifiable : df non saisie)</span></> : minSliding === Infinity ? '∞' : minSliding.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 px-3 py-2 rounded-xl text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-400">Renversement Min</span>
            <span className={`text-base font-black ${overturningNV ? 'text-amber-400' : !outsideULS && minOverturning >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {outsideULS ? 'hors base' : overturningNV ? <>{minOverturning === Infinity ? '∞' : minOverturning.toFixed(2)} <span className="text-[10px] font-normal">(non vérifiable : df non saisie)</span></> : minOverturning === Infinity ? '∞' : minOverturning.toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700 px-3 py-2 rounded-xl text-center">
            <span className="block text-[9px] uppercase font-bold text-slate-400">Portance Max ULS</span>
            <span className={`text-base font-black ${!outsideULS && maxQ_ULS <= result.geotech.psi * result.geotech.phi_gu * soil.qUltimate_ULS ? 'text-emerald-400' : 'text-rose-400'}`}>
              {outsideULS ? <>non vérifiable <span className="text-[10px] text-slate-400 font-normal">(résultante hors base)</span></> : <>{maxQ_ULS.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">kPa</span></>}
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTableTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTableTab === 'all' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Vue d'ensemble (3 Tableaux)
          </button>
          <button 
            onClick={() => setActiveTableTab('sliding')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTableTab === 'sliding' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            1. Glissement
          </button>
          <button 
            onClick={() => setActiveTableTab('overturning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTableTab === 'overturning' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            2. Renversement
          </button>
          <button 
            onClick={() => setActiveTableTab('bearing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTableTab === 'bearing' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            3. Capacité Portante
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setFilterType('ALL')} 
              className={`px-2.5 py-1 text-xs font-bold rounded-md ${filterType === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              Toutes ({result.combinations.length})
            </button>
            <button 
              onClick={() => setFilterType('ULS')} 
              className={`px-2.5 py-1 text-xs font-bold rounded-md ${filterType === 'ULS' ? 'bg-white shadow text-rose-700' : 'text-slate-500'}`}
            >
              ÉLU ({totalULS})
            </button>
            <button 
              onClick={() => setFilterType('SLS')} 
              className={`px-2.5 py-1 text-xs font-bold rounded-md ${filterType === 'SLS' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}
            >
              ÉLTS ({totalSLS})
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
            <input 
              type="checkbox" 
              checked={onlyFailing} 
              onChange={e => setOnlyFailing(e.target.checked)} 
              className="rounded text-rose-600 focus:ring-rose-500" 
            />
            <span>Non-conformes seulement</span>
          </label>
        </div>
      </div>

      {/* Geotechnical Parameters Reminder Banner */}
      <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-blue-600 shrink-0" />
          <span>
            <strong>Facteurs CFEM 5e (tableau 6.2, compréhension {result.geotech.level === 'low' ? 'faible' : result.geotech.level === 'high' ? 'élevée' : 'typique'}) :</strong> Portance <code className="bg-white px-1.5 py-0.5 rounded text-blue-700 font-bold">Φ_gu = {result.geotech.phi_gu}</code> • 
            Glissement friction <code className="bg-white px-1.5 py-0.5 rounded text-blue-700 font-bold">Φ_gs = {result.geotech.phi_gs}</code> • 
            Cohésion <code className="bg-white px-1.5 py-0.5 rounded text-blue-700 font-bold">Φ_coh = {result.geotech.phi_coh}</code> • 
            Renversement <code className="bg-white px-1.5 py-0.5 rounded text-blue-700 font-bold">Φ_ov = {result.geotech.phi_ov}</code> • 
            Butée <code className="bg-white px-1.5 py-0.5 rounded text-blue-700 font-bold">Φ_p = {result.geotech.phi_p}</code> • 
            Conséquence <code className="bg-white px-1.5 py-0.5 rounded text-blue-700 font-bold">Ψ = {result.geotech.psi}</code> • 
            Frottement sol-béton <code className="bg-white px-1.5 py-0.5 rounded text-blue-700 font-bold">μ = {soil.mu} (tan δ)</code>
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-500">
          Largeur semelle B = {result.baseWidth.toFixed(2)} m | Tiers central B/6 = {(result.baseWidth / 6).toFixed(3)} m
        </div>
      </div>

      {/* TABLEAU 1 : GLISSEMENT */}
      {(activeTableTab === 'all' || activeTableTab === 'sliding') && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <ArrowRightLeft size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">
                  Tableau 1 : Vérification de la Stabilité au Glissement
                </h3>
                <p className="text-xs text-slate-500">
                  Formule CFEM : <span className="font-mono font-semibold">Fs = C₂·B·Φ₅ + P_p·Φ₄ + (∑V_min)·μ·Φ₂</span> contre <span className="font-mono font-semibold">∑Fh (déstabilisant)</span>
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400">Critère : Ratio ≥ 1.00</span>
          </div>

          <div className="overflow-x-auto">
            <p className="text-[10px] text-slate-500 px-1 pt-1">Glissement et renversement : ÉLU seulement (MUR-02 §12)</p>
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="p-3">Combinaison (CNB {result.cnbEdition})</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">∑V min (kN/m)</th>
                  <th className="p-3 text-right">Butée Pp·Φ₄ (kN/m)</th>
                  <th className="p-3 text-right">Frottement (kN/m)</th>
                  <th className="p-3 text-right font-bold text-slate-800">Force Stab. Fs (kN/m)</th>
                  <th className="p-3 text-right font-bold text-slate-800">Force Déstab. ∑Fh (kN/m)</th>
                  <th className="p-3 text-right font-bold">Ratio (Fs / ∑Fh)</th>
                  <th className="p-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stabCombinations.map((c, i) => {
                  // valeurs du moteur (MUR-02 §2.1) : Ψ·φ appliqués par le calcul, jamais recalculés ici
                  const frictionPart = c.Rf_friction + c.Rf_cohesion;
                  const passivePart = c.Rf_passive;
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        <div>{c.combName}</div>
                        <div className="text-[10px] font-normal text-slate-400 font-mono">{c.formula}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.type === 'ULS' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                          {c.type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">{c.sumV_min.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-slate-600">{passivePart.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-slate-600">{frictionPart.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-700">{c.Fs.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-700">{c.Fh_destab.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-black text-sm">
                        <span className={c.type === 'SLS' ? 'text-slate-400' : c.status_sliding === 'NON VÉRIFIABLE' ? 'text-amber-600' : c.FOS_sliding >= 1.0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {c.type === 'SLS' ? '—' : c.FOS_sliding === Infinity ? '∞' : c.FOS_sliding.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {c.type === 'SLS' ? (<span className="text-slate-400 text-[11px]">sans objet (ÉLS)</span>) : c.status_sliding === 'NON VÉRIFIABLE' ? nvBadge : !c.stabApplicable ? (<span className="text-slate-400 text-[11px]">— (sans objet)</span>) : c.status_sliding === 'OK' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                            <CheckCircle2 size={12} /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[11px]">
                            <XCircle size={12} /> NON
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLEAU 2 : RENVERSEMENT */}
      {(activeTableTab === 'all' || activeTableTab === 'overturning') && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Scale size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">
                  Tableau 2 : Vérification de la Stabilité au Renversement
                </h3>
                <p className="text-xs text-slate-500">
                  Calcul au point de basculement (pointe avant de l'orteil). Formule : <span className="font-mono font-semibold">Ms = ∑Mv_min + M_hp·Φ₃</span> contre <span className="font-mono font-semibold">Mr = ∑M_h</span>
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400">Critère : Ratio ≥ 1.00</span>
          </div>

          <div className="overflow-x-auto">
            <p className="text-[10px] text-slate-500 px-1 pt-1">Glissement et renversement : ÉLU seulement (MUR-02 §12)</p>
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="p-3">Combinaison (CNB {result.cnbEdition})</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">∑Mv (Vert. min) (kNm/m)</th>
                  <th className="p-3 text-right">Moment Butée M_hp·Φ₃ (kNm/m)</th>
                  <th className="p-3 text-right font-bold text-slate-800">Moment Stab. Ms (kNm/m)</th>
                  <th className="p-3 text-right font-bold text-slate-800">Moment Renvers. Mr (kNm/m)</th>
                  <th className="p-3 text-right font-bold">Ratio (Ms / Mr)</th>
                  <th className="p-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stabCombinations.map((c, i) => {
                  const passiveMomentPart = c.psi * c.phi_ov * c.Ms_passive; // Ψ·φ_ov · moment de la butée (valeurs du moteur)
                  const vertMomPart = c.Ms - passiveMomentPart;
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        <div>{c.combName}</div>
                        <div className="text-[10px] font-normal text-slate-400 font-mono">{c.formula}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.type === 'ULS' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                          {c.type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">{vertMomPart.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-slate-600">{passiveMomentPart.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-700">{c.Ms.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-700">{c.Mr.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-black text-sm">
                        <span className={c.type === 'SLS' ? 'text-slate-400' : c.status_overturning === 'NON VÉRIFIABLE' ? 'text-amber-600' : c.FOS_overturning >= 1.0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {c.type === 'SLS' ? '—' : c.FOS_overturning === Infinity ? '∞' : c.FOS_overturning.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {c.type === 'SLS' ? (<span className="text-slate-400 text-[11px]">sans objet (ÉLS)</span>) : c.status_overturning === 'NON VÉRIFIABLE' ? nvBadge : !c.stabApplicable && c.status_overturning !== 'NON' ? (<span className="text-slate-400 text-[11px]">— (sans objet)</span>) : c.status_overturning === 'OK' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                            <CheckCircle2 size={12} /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[11px]">
                            <XCircle size={12} /> NON
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLEAU 3 : CAPACITÉ PORTANTE & EXCENTRICITÉ */}
      {(activeTableTab === 'all' || activeTableTab === 'bearing') && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">
                  Tableau 3 : Vérification de la Capacité Portante du Sol
                </h3>
                <p className="text-xs text-slate-500">
                  Excentricité <span className="font-mono font-semibold">e = |L/2 - x₁|</span> comparée à <span className="font-mono font-semibold">L/6</span> • Diagnostic des 4 Cas de Répartition
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
              <span>Capacité ÉLU: <strong className="text-slate-800 font-mono">{(result.geotech.psi * result.geotech.phi_gu * soil.qUltimate_ULS).toFixed(1)} kPa</strong></span>
              <span>Capacité ÉLTS: <strong className="text-slate-800 font-mono">{soil.qAllowable_SLS.toFixed(1)} kPa</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="p-3">Combinaison (CNB {result.cnbEdition})</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Réaction Rv (kN/m)</th>
                  <th className="p-3 text-right">x₁ (m)</th>
                  <th className="p-3 text-right">Excentr. e (m)</th>
                  <th className="p-3 text-center">Cas Diagnostic</th>
                  <th className="p-3 text-right font-bold text-slate-800">q₁ Orteil (kPa)</th>
                  <th className="p-3 text-right font-bold text-slate-800">q₂ Talon (kPa)</th>
                  <th className="p-3 text-right">Capacité (kPa)</th>
                  <th className="p-3 text-right font-bold">Ratio (Cap/q₁)</th>
                  <th className="p-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCombinations.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">
                      <div>{c.combName}</div>
                      <div className="text-[10px] font-normal text-slate-400 font-mono">{c.formula}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.type === 'ULS' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                        {c.type}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">{c.sumV_max.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono text-slate-600">{c.x1.toFixed(3)}</td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      <span className={c.ecc > c.limitL6 ? 'text-amber-600 font-bold' : ''}>
                        {c.ecc.toFixed(3)} m
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${c.distributionCase === 'Cas 4' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                        {c.distributionCase}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-indigo-700">{c.q_toe.toFixed(1)}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-600">{c.q_heel.toFixed(1)}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{c.q_capacity.toFixed(1)}</td>
                    <td className="p-3 text-right font-mono font-black text-sm">
                      <span className={c.FOS_bearing >= 1.0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {c.FOS_bearing === Infinity ? '∞' : c.FOS_bearing.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {c.status_bearing === 'OK' && c.status_ecc === 'OK' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                          <CheckCircle2 size={12} /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[11px]">
                          <XCircle size={12} /> NON{c.status_bearing === 'OK' ? ' (e > B/6)' : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
