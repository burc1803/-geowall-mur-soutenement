import React from 'react';
import { AnalysisResult, WallGeometry, SoilProperties, LoadsConfig } from '../lib/types';
import { CheckCircle2, XCircle, ShieldCheck, Scale, ArrowRightLeft, Layers, Printer } from 'lucide-react';

interface CalculationReportProps {
  geo: WallGeometry;
  soil: SoilProperties;
  loads: LoadsConfig;
  result: AnalysisResult;
}

export function CalculationReport({ geo, soil, loads, result }: CalculationReportProps) {
  const conc = result.concreteDesign;
  const baseWidth = geo.ePiedAv + geo.epStem + geo.ePiedAr;
  const totalHeight = geo.hMur + geo.epBase;

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 font-sans text-slate-800 text-sm w-full max-w-6xl mx-auto mb-12 print:p-2 print:border-none print:shadow-none print-no-break">
      {/* Header Document */}
      <div className="border-b-2 border-slate-900 pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 font-black text-xs uppercase tracking-widest mb-1">
            <ShieldCheck size={18} />
            <span>Rapport d'Ingénierie Géotechnique & Structure • CNB {result.cnbEdition} / CFEM / CSA A23.3</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-950">
            Note de Calcul & Stabilité — Mur de Soutènement
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Type : <strong className="text-slate-800">{geo.wallType === 'cantilever' ? 'Mur Poids / Cantilever Autostable' : 'Mur de Sous-sol (Appuyé en tête)'}</strong> • 
            Normes appliquées : <strong className="text-slate-800">CNB {result.cnbEdition} (Partie 4)</strong> • <strong className="text-slate-800">CFEM 5e éd. (Manuel Canadien d'Ingénierie des Fondations)</strong> • <strong className="text-slate-800">CSA A23.3-19</strong>
          </p>
        </div>

        <button 
          onClick={() => window.print()}
          className="print:hidden inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all self-start md:self-center"
        >
          <Printer size={16} />
          <span>Imprimer / Exporter PDF</span>
        </button>
      </div>

      {/* 1. DONNÉES GÉOMÉTRIQUES & DU SOL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Géométrie */}
        <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200">
          <h2 className="text-xs font-black uppercase tracking-widest text-indigo-900 mb-3 border-b border-slate-200 pb-2 flex items-center justify-between">
            <span>1. Données Géométriques du Mur</span>
            <span className="text-[10px] text-slate-400 font-normal">Section Transversale (m)</span>
          </h2>
          <table className="w-full text-xs border-collapse">
            <tbody className="divide-y divide-slate-200">
              <tr><th className="py-1.5 font-semibold text-slate-700">Hauteur hors-sol mur (H)</th><td className="py-1.5 text-right font-mono font-bold text-slate-900">{geo.hMur.toFixed(2)} m</td></tr>
              <tr><th className="py-1.5 font-semibold text-slate-700">Épaisseur du voile (e_stem)</th><td className="py-1.5 text-right font-mono font-bold text-slate-900">{geo.epStem.toFixed(2)} m</td></tr>
              <tr><th className="py-1.5 font-semibold text-slate-700">Largeur patin avant / oriel (L1)</th><td className="py-1.5 text-right font-mono font-bold text-slate-900">{geo.ePiedAv.toFixed(2)} m</td></tr>
              <tr><th className="py-1.5 font-semibold text-slate-700">Largeur talon arrière (L2)</th><td className="py-1.5 text-right font-mono font-bold text-slate-900">{geo.ePiedAr.toFixed(2)} m</td></tr>
              <tr><th className="py-1.5 font-semibold text-slate-700">Épaisseur de la semelle (hs)</th><td className="py-1.5 text-right font-mono font-bold text-slate-900">{geo.epBase.toFixed(2)} m</td></tr>
              <tr className="bg-indigo-50/50"><th className="py-1.5 font-bold text-indigo-950">Largeur totale semelle (B)</th><td className="py-1.5 text-right font-mono font-black text-indigo-950">{baseWidth.toFixed(2)} m</td></tr>
              <tr className="bg-indigo-50/50"><th className="py-1.5 font-bold text-indigo-950">Hauteur totale arrière (Ht)</th><td className="py-1.5 text-right font-mono font-black text-indigo-950">{totalHeight.toFixed(2)} m</td></tr>
            </tbody>
          </table>
        </div>

        {/* Paramètres du Sol & CFEM */}
        <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200">
          <h2 className="text-xs font-black uppercase tracking-widest text-indigo-900 mb-3 border-b border-slate-200 pb-2 flex items-center justify-between">
            <span>2. Paramètres du Sol & Facteurs CFEM</span>
            <span className="text-[10px] text-slate-400 font-normal">CFEM 5e éd., tableau 6.2 (facteurs géotechniques)</span>
          </h2>
          <table className="w-full text-xs border-collapse">
            <tbody className="divide-y divide-slate-200">
              <tr><th className="py-1.5 font-semibold text-slate-700">Poids volumique sol (γ)</th><td className="py-1.5 text-right font-mono font-bold text-slate-900">{soil.gamma.toFixed(1)} kN/m³</td></tr>
              <tr><th className="py-1.5 font-semibold text-slate-700">Angle de frottement interne (φ)</th><td className="py-1.5 text-right font-mono font-bold text-slate-900">{soil.phi.toFixed(1)} °</td></tr>
              <tr><th className="py-1.5 font-semibold text-slate-700">Coeff. frottement base (μ = tan δ)</th><td className="py-1.5 text-right font-mono font-bold text-slate-900">{soil.mu.toFixed(2)}</td></tr>
              <tr><th className="py-1.5 font-semibold text-slate-700">Hauteur de sol à l'avant (hs,av, depuis le dessus de la semelle)</th><td className="py-1.5 text-right font-mono font-bold text-slate-900">{soil.hSolAv.toFixed(2)} m</td></tr>
              <tr><th className="py-1.5 font-semibold text-slate-700">Profondeur de butée (hp, depuis la sous-face)</th><td className="py-1.5 text-right font-mono font-bold text-slate-900">{result.earthPressures.h_pass.toFixed(2)} m</td></tr>
              <tr><th className="py-1.5 font-semibold text-slate-700">Capacité portante admissible ELS (q_adm)</th><td className="py-1.5 text-right font-mono font-bold text-slate-900">{soil.qAllowable_SLS.toFixed(1)} kPa</td></tr>
              <tr><th className="py-1.5 font-semibold text-slate-700">Capacité portante ultime ULS (q_ult)</th><td className="py-1.5 text-right font-mono font-bold text-slate-900">{soil.qUltimate_ULS.toFixed(1)} kPa</td></tr>
              <tr className="bg-indigo-50/50">
                <th className="py-1.5 font-bold text-indigo-950">Facteurs CFEM 5e, tableau 6.2 (Φ_gu / Φ_gs / Φ_ov / Φ_p / Φ_coh) et Ψ</th>
                <td className="py-1.5 text-right font-mono font-black text-indigo-950">
                  {result.geotech.phi_gu} / {result.geotech.phi_gs} / {result.geotech.phi_ov} / {result.geotech.phi_p} / {result.geotech.phi_coh} ; Ψ = {result.geotech.psi}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. INVENTAIRE DES CHARGES APPLIQUÉES */}
      <div className="mb-8">
        <h2 className="text-xs font-black uppercase tracking-widest text-indigo-900 mb-3 border-b border-slate-200 pb-2">
          3. Inventaire & Caractéristiques des Charges Appliquées
        </h2>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-2.5">Désignation</th>
                <th className="p-2.5">Type (CNB)</th>
                <th className="p-2.5">Nature</th>
                <th className="p-2.5 text-right">Valeur Nominale</th>
                <th className="p-2.5 text-right">Position X / Y (m)</th>
                <th className="p-2.5 text-right">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-2.5 font-bold text-slate-900">Surcharge d'exploitation en surface</td>
                <td className="p-2.5"><span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">{loads.surchargeType}</span></td>
                <td className="p-2.5 font-mono">Répartie</td>
                <td className="p-2.5 text-right font-mono font-bold">{loads.surcharge.toFixed(2)} kPa</td>
                <td className="p-2.5 text-right font-mono">Y = {totalHeight.toFixed(2)} m</td>
                <td className="p-2.5 text-slate-500">Surcharge appliquée sur le terre-plein amont</td>
              </tr>
              {result.seismic.kh > 0 && (
                <tr>
                  <td className="p-2.5 font-bold text-amber-700">Séisme Pseudo-Statique Mononobe-Okabe (kh)</td>
                  <td className="p-2.5"><span className="px-2 py-0.5 rounded font-bold bg-rose-50 text-rose-700 border border-rose-200 text-[10px]">E</span></td>
                  <td className="p-2.5 font-mono">Inertie + Poussée</td>
                  <td className="p-2.5 text-right font-mono font-bold text-amber-700">kh = {result.seismic.kh.toFixed(3)}</td>
                  <td className="p-2.5 text-right font-mono">Y = 0.6·Ht</td>
                  <td className="p-2.5 text-slate-500">Inertie de structure et poussée dynamique additionnelle</td>
                </tr>
              )}
              {loads.additionalLoads && loads.additionalLoads.map((al, idx) => (
                <tr key={idx}>
                  <td className="p-2.5 font-bold text-blue-700">{al.name}</td>
                  <td className="p-2.5"><span className="px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">{al.caseType}</span></td>
                  <td className="p-2.5 font-mono">{al.nature} {al.isDistributed ? '(Répartie)' : '(Ponctuelle)'}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-blue-900">{al.magnitude.toFixed(2)} {al.isDistributed ? 'kN/m' : 'kN'}</td>
                  <td className="p-2.5 text-right font-mono">X={al.x.toFixed(2)}, Y={al.y.toFixed(2)}</td>
                  <td className="p-2.5 text-slate-500">Charge additionnelle configurée</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. TABLEAU 1: STABILITÉ AU GLISSEMENT */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
          <ArrowRightLeft size={16} className="text-blue-600" />
          <h2 className="text-xs font-black uppercase tracking-widest text-indigo-900">
            4. Vérification de la Stabilité au Glissement (CNB {result.cnbEdition} & CFEM)
          </h2>
        </div>
        <p className="text-[11px] text-slate-600 mb-2">
          Résistance au glissement : <strong className="font-mono">Fs = C₂·B·Φ₅ + P_p·Φ₄ + (∑V_min)·μ·Φ₂</strong> avec coefficient de frottement sol-béton <strong className="font-mono">μ = {soil.mu}</strong>. Critère de sécurité : <strong className="font-mono">Ratio (Fs / ∑Fh) ≥ 1.00</strong>.
        </p>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-2.5">Combinaison</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5 text-right">∑V min (kN/m)</th>
                <th className="p-2.5 text-right">Butée Pp·Φ₄ (kN/m)</th>
                <th className="p-2.5 text-right">Frottement (kN/m)</th>
                <th className="p-2.5 text-right font-bold text-slate-800">Résistance Fs (kN/m)</th>
                <th className="p-2.5 text-right font-bold text-slate-800">Poussée ∑Fh (kN/m)</th>
                <th className="p-2.5 text-right font-bold">Ratio</th>
                <th className="p-2.5 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.combinations.map((c, i) => {
                // valeurs du moteur (MUR-02 §2.1)
                const frictionPart = c.Rf_friction + c.Rf_cohesion;
                const passivePart = c.Rf_passive;
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 font-bold text-slate-900">{c.combName}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${c.type === 'ULS' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                        {c.type}
                      </span>
                    </td>
                    <td className="p-2 text-right font-mono">{c.sumV_min.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono">{passivePart.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono">{frictionPart.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono font-bold text-indigo-700">{c.Fs.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-700">{c.Fh_destab.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono font-black">
                      <span className={c.FOS_sliding >= 1.0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {c.FOS_sliding === Infinity ? '∞' : c.FOS_sliding.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${c.status_sliding === 'NON VÉRIFIABLE' ? 'bg-amber-50 text-amber-700 border border-amber-300' : !c.stabApplicable ? 'text-slate-400' : c.status_sliding === 'OK' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {c.status_sliding === 'NON VÉRIFIABLE' || c.stabApplicable ? c.status_sliding : '— (sans objet)'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. TABLEAU 2: STABILITÉ AU RENVERSEMENT */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
          <Scale size={16} className="text-amber-600" />
          <h2 className="text-xs font-black uppercase tracking-widest text-indigo-900">
            5. Vérification de la Stabilité au Renversement (CNB {result.cnbEdition} & CFEM)
          </h2>
        </div>
        <p className="text-[11px] text-slate-600 mb-2">
          Calcul par rapport au point d'orteil avant. Moment stabilisant : <strong className="font-mono">Ms = ∑Mv_min + M_hp·Φ₃</strong>. Critère de sécurité : <strong className="font-mono">Ratio (Ms / Mr) ≥ 1.00</strong>.
        </p>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-2.5">Combinaison</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5 text-right">∑Mv (Vert. min) (kNm/m)</th>
                <th className="p-2.5 text-right">Moment Butée M_hp·Φ₃ (kNm/m)</th>
                <th className="p-2.5 text-right font-bold text-slate-800">Moment Stab. Ms (kNm/m)</th>
                <th className="p-2.5 text-right font-bold text-slate-800">Moment Renvers. Mr (kNm/m)</th>
                <th className="p-2.5 text-right font-bold">Ratio</th>
                <th className="p-2.5 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.combinations.map((c, i) => {
                const passiveMomentPart = c.psi * c.phi_ov * c.Ms_passive; // valeurs du moteur
                const vertMomPart = c.Ms - passiveMomentPart;
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 font-bold text-slate-900">{c.combName}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${c.type === 'ULS' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                        {c.type}
                      </span>
                    </td>
                    <td className="p-2 text-right font-mono">{vertMomPart.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono">{passiveMomentPart.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono font-bold text-indigo-700">{c.Ms.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-700">{c.Mr.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono font-black">
                      <span className={c.FOS_overturning >= 1.0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {c.FOS_overturning === Infinity ? '∞' : c.FOS_overturning.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${c.status_overturning === 'NON VÉRIFIABLE' ? 'bg-amber-50 text-amber-700 border border-amber-300' : !c.stabApplicable && c.status_overturning !== 'NON' ? 'text-slate-400' : c.status_overturning === 'OK' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {c.stabApplicable || c.status_overturning === 'NON' || c.status_overturning === 'NON VÉRIFIABLE' ? c.status_overturning : '— (sans objet)'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. TABLEAU 3: CAPACITÉ PORTANTE & EXCENTRICITÉ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
          <Layers size={16} className="text-emerald-600" />
          <h2 className="text-xs font-black uppercase tracking-widest text-indigo-900">
            6. Vérification de la Capacité Portante du Sol (CNB {result.cnbEdition} & CFEM)
          </h2>
        </div>
        <p className="text-[11px] text-slate-600 mb-2">
          Position résultante <strong className="font-mono">x₁ = (Ms - Mr)/Rv</strong> • Excentricité <strong className="font-mono">e = |B/2 - x₁|</strong> • Limite tiers central <strong className="font-mono">B/6 = {(baseWidth / 6).toFixed(3)} m</strong>.
          Capacité ÉLU = <strong className="font-mono">{(result.geotech.psi * result.geotech.phi_gu * soil.qUltimate_ULS).toFixed(1)} kPa</strong> (Ψ·Φ_gu·qu, Ψ={result.geotech.psi}, Φ_gu={result.geotech.phi_gu}) • Capacité ÉLTS = <strong className="font-mono">{soil.qAllowable_SLS.toFixed(1)} kPa</strong>.
        </p>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-2.5">Combinaison</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5 text-right">Réaction Rv (kN/m)</th>
                <th className="p-2.5 text-right">x₁ (m)</th>
                <th className="p-2.5 text-right">Excentr. e (m)</th>
                <th className="p-2.5 text-center">Diagnostic</th>
                <th className="p-2.5 text-right font-bold text-slate-800">q₁ Orteil (kPa)</th>
                <th className="p-2.5 text-right font-bold text-slate-800">q₂ Talon (kPa)</th>
                <th className="p-2.5 text-right">Capacité (kPa)</th>
                <th className="p-2.5 text-right font-bold">Ratio</th>
                <th className="p-2.5 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.combinations.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2 font-bold text-slate-900">{c.combName}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${c.type === 'ULS' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="p-2 text-right font-mono">{c.sumV_max.toFixed(1)}</td>
                  <td className="p-2 text-right font-mono">{c.x1.toFixed(3)}</td>
                  <td className="p-2 text-right font-mono">
                    <span className={c.ecc > c.limitL6 ? 'text-amber-600 font-bold' : ''}>
                      {c.ecc.toFixed(3)}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className="font-mono text-[10px] font-bold text-slate-700">{c.distributionCase}</span>
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-indigo-700">{c.q_toe.toFixed(1)}</td>
                  <td className="p-2 text-right font-mono font-bold text-slate-600">{c.q_heel.toFixed(1)}</td>
                  <td className="p-2 text-right font-mono text-slate-500">{c.q_capacity.toFixed(1)}</td>
                  <td className="p-2 text-right font-mono font-black">
                    <span className={c.FOS_bearing >= 1.0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {c.FOS_bearing === Infinity ? '∞' : c.FOS_bearing.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${c.status_bearing === 'OK' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      {c.status_bearing}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. CONCEPTION BÉTON ARMÉ SELON CSA A23.3-19 & RÉFÉRENCE OMAR CHAALLAL */}
      {conc && (
        <div className="mb-8 print-no-break">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
            <ShieldCheck size={16} className="text-indigo-600" />
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-900">
              7. Dimensionnement & Conception Béton Armé (Norme CSA A23.3 & Réf. Omar Chaallal)
            </h2>
          </div>
          <p className="text-[11px] text-slate-600 mb-3">
            Calculs menés conformément aux chapitres 4 (Flexion), 5 (Effort tranchant & friction), 7 (Ancrage) et 12 (Fondations) du livre de référence 
            <strong className="text-slate-800"> « Structures en béton armé » d'Omar Chaallal (ÉTS)</strong>. 
            Contrôle de fissuration par le facteur Z (<code className="font-bold">Z = fs · ∛(dc · A) ≤ 25 000 N/mm</code>).
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-xl mb-4">
            <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Composant Structurel</th>
                  <th className="p-2.5">Armature Retenue</th>
                  <th className="p-2.5 text-right">As Fournie (mm²/m)</th>
                  <th className="p-2.5 text-right font-bold">Mf (kNm/m)</th>
                  <th className="p-2.5 text-right font-bold text-indigo-700">Mr (kNm/m)</th>
                  <th className="p-2.5 text-right font-bold">Vf (kN/m)</th>
                  <th className="p-2.5 text-right font-bold text-indigo-700">Vc (kN/m)</th>
                  <th className="p-2.5 text-center">Ductilité (c/d &le; {result.concreteDesign.mur_interieur.ductility_limit.toFixed(3)})</th>
                  <th className="p-2.5 text-center">Fissuration Z (N/mm)</th>
                  <th className="p-2.5 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  conc.mur_interieur,
                  conc.mur_exterieur,
                  { ...conc.mur_horizontal_ext, elementName: 'Voile - horizontales ext. (A3)' },
                  { ...conc.mur_horizontal_int, elementName: 'Voile - horizontales int. (A4)' },
                  { ...conc.mur_horizontal, elementName: 'Voile - total horizontal (A3 + A4) / 0,002Ag' },
                  conc.semelle_talon,
                  conc.semelle_orteil,
                  conc.semelle_retrait
                ].map((elem, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-bold text-slate-900">{elem.elementName}</td>
                    <td className="p-2.5 font-mono font-bold text-indigo-800">{elem.bar_designation}</td>
                    <td className="p-2.5 text-right font-mono">{elem.As_provided.toFixed(0)}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{elem.Mf > 0 ? elem.Mf.toFixed(1) : '-'}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-indigo-700">{elem.Mr > 0 ? elem.Mr.toFixed(1) : '-'}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{elem.Vf > 0 ? elem.Vf.toFixed(1) : '-'}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-indigo-700">{elem.Vc > 0 ? elem.Vc.toFixed(1) : '-'}</td>
                    <td className="p-2.5 text-center font-mono">
                      {elem.ductility_c_over_d > 0 ? `${elem.ductility_c_over_d.toFixed(3)} (${elem.ductility_ok ? 'OK' : 'NON'})` : '-'}
                    </td>
                    <td className="p-2.5 text-center font-mono text-[11px]">
                      {elem.Z_factor ? (
                        <span className={elem.Z_ok ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                          {elem.Z_factor.toFixed(0)} / {elem.Z_limit}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${elem.checks_ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {elem.checks_ok ? 'CONFORME' : 'NON CONFORME'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Verification Cisaillement Friction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-1">Cisaillement-Friction à l'Interface Voile / Semelle (CSA A23.3 Art. 11.5)</h3>
              <p className="text-slate-600 mb-2">
                Reprise de bétonnage propre non intentionnellement rugueuse (<code className="font-bold">c = 0.25 MPa, μ = 0.60</code>).
              </p>
              <div className="flex items-center justify-between font-mono">
                <span>Vf = <strong>{conc.cisaillement_friction.Vf.toFixed(1)} kN/m</strong></span>
                <span>Vr = <strong className="text-indigo-700">{conc.cisaillement_friction.Vr.toFixed(1)} kN/m</strong></span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${conc.cisaillement_friction.status_ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {conc.cisaillement_friction.status_ok ? 'VR ≥ VF (OK)' : 'NON'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-1">Longueur de Développement & Crochet Standard (CSA A23.3 Art. 12.2 & 12.5)</h3>
              <p className="text-slate-600 mb-2">
                Ancrage des aciers 15M verticaux du voile dans la semelle avec crochet à 90°.
              </p>
              <div className="flex items-center justify-between font-mono">
                <span>l_hb = <strong>204.5 mm</strong></span>
                <span>Dispo semelle = <strong>{conc.mur_interieur.ldh_available?.toFixed(1)} mm</strong></span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${conc.mur_interieur.anchorage_ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {conc.mur_interieur.anchorage_ok ? 'ANCRAGE OK' : 'NON'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature & Validation Footer */}
      <div className="border-t border-slate-200 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div>
          Calculs selon les états limites du <strong className="text-slate-700">CNB {result.cnbEdition}</strong> ; chaque statut affiché provient d'une comparaison calculée (voir limites et points À CONFIRMER dans la note de calcul officielle).
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Généré le {new Date().toLocaleDateString('fr-CA')} • AI Studio Retaining Wall Suite
        </div>
      </div>
    </div>
  );
}
