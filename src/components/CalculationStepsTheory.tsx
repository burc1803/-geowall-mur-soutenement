import React, { useState } from 'react';
import { WallGeometry, SoilProperties, LoadsConfig, AnalysisResult, ConcreteProperties } from '../lib/types';
import { 
  BookOpen, 
  HelpCircle, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Scale, 
  ArrowRightLeft, 
  FileText, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Maximize2
} from 'lucide-react';

interface CalculationStepsTheoryProps {
  geo: WallGeometry;
  soil: SoilProperties;
  loads: LoadsConfig;
  result: AnalysisResult;
  conc?: ConcreteProperties;
}

type SectionKey = 'poussee' | 'seisme' | 'stabilite' | 'conception_omar' | 'ancrage';

export function CalculationStepsTheory({ geo, soil, loads, result, conc }: CalculationStepsTheoryProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>('poussee');
  const ep = result.earthPressures;
  const cd = result.concreteDesign;
  const baseWidth = geo.ePiedAv + geo.epStem + geo.ePiedAr;
  const totalHeight = geo.hMur + geo.epBase;

  // Find governing ULS & SLS combinations
  const ulsSliding = [...result.combinations].filter(c => c.type === 'ULS').sort((a, b) => a.FOS_sliding - b.FOS_sliding)[0] || result.combinations[0];
  const ulsOverturning = [...result.combinations].filter(c => c.type === 'ULS').sort((a, b) => a.FOS_overturning - b.FOS_overturning)[0] || result.combinations[0];
  const ulsBearing = [...result.combinations].filter(c => c.type === 'ULS').sort((a, b) => a.FOS_bearing - b.FOS_bearing)[0] || result.combinations[0];

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-800">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest mb-2">
          <BookOpen size={18} />
          <span>Guide de Vérification Mathématique & Théorique • CFEM 5e éd. & Omar Chaallal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Étapes de Calculs, Formules & Conception
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
          Cette section détaille l'ensemble des équations analytiques utilisées par le logiciel, leurs justifications normatives selon le 
          <strong> Manuel Canadien d'Ingénierie des Fondations (CFEM 5e éd.)</strong>, le <strong>CNB {result.cnbEdition}</strong> et la méthode de calcul du livre de référence 
          <strong> « Structures en béton armé » d'Omar Chaallal (ÉTS / ACNOR A23.3)</strong>.
        </p>

        {/* Sub-navigation pill menu */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'poussee', label: '1. Poussée & Butée (Ka, Kp, K0, Kae)', icon: Layers },
            { id: 'seisme', label: '2. Séisme (CFEM 5e éd., § 18.7 : M-O, Wood)', icon: Activity },
            { id: 'stabilite', label: '3. Stabilité (Glissement, Renversement, Q)', icon: Scale },
            { id: 'conception_omar', label: '4. Conception Omar Chaallal (Flexion & Cisaillement)', icon: ShieldCheck },
            { id: 'ancrage', label: '5. Ancrage & Crochets (CSA Chap. 7 & 12)', icon: ArrowRightLeft },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as SectionKey)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' 
                    : 'bg-white/10 hover:bg-white/20 text-slate-200'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: POUSSÉE & BUTÉE (Ka, Kp, K0, Kae) */}
      {activeSection === 'poussee' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* Card Ka / K0 / Kp */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Coefficients de Poussée et Butée des Terres
                  </h2>
                  <p className="text-xs text-slate-500">
                    Théories de Rankine, Coulomb et Jaky (CFEM 5e éd., À CONFIRMER)
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded border border-indigo-200">
                CFEM 5e éd., § 20.7 (À CONFIRMER pour Rankine, Coulomb et Jaky)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ka Rankine */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase text-indigo-900">
                    Poussée Active — Rankine ($K_a$)
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-500">Murs Autostables</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center font-mono text-xs mb-3">
                  Ka = tan²(45° - φ / 2) = (1 - sin φ) / (1 + sin φ)
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  Hypothèse de rupture de Rankine sans frottement sol-parement (plan de glissement inclinant à 45° + φ/2).
                </p>
                <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100 text-xs font-mono flex justify-between items-center">
                  <span className="text-slate-600">Calcul projet (φ = {soil.phi}°) :</span>
                  <span className="font-bold text-indigo-900">Ka = {ep.Ka_rankine.toFixed(4)}</span>
                </div>
              </div>

              {/* Ka Coulomb */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase text-indigo-900">
                    Poussée Active — Coulomb (Ka,coulomb)
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-500">Avec Frottement δ</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center font-mono text-xs mb-3">
                  Ka = cos²(φ) / [cos(δ) · (1 + √[sin(φ+δ)·sin(φ) / cos(δ)])²]
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  Tient compte du frottement entre le dos du voile et le remblai granulaire (δ = 2/3·φ ou tan⁻¹(μ)).
                </p>
                <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100 text-xs font-mono flex justify-between items-center">
                  <span className="text-slate-600">Coulomb avec δ={(soil.phi * 2 / 3).toFixed(1)}° :</span>
                  <span className="font-bold text-indigo-900">Ka = {ep.Ka_coulomb.toFixed(4)}</span>
                </div>
              </div>

              {/* K0 Jaky */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase text-amber-900">
                    Poussée au Repos — Jaky ($K_0$)
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Murs de Sous-sol Bloqués
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center font-mono text-xs mb-3">
                  K₀ = 1 - sin(φ)
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  À utiliser obligatoirement lorsque le haut du mur ne peut pas translater (appuyé par la dalle d'étage ou système rigide).
                </p>
                <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-200 text-xs font-mono flex justify-between items-center">
                  <span className="text-slate-600">Calcul projet (φ = {soil.phi}°) :</span>
                  <span className="font-bold text-amber-900">K₀ = {ep.K0_jaky.toFixed(4)}</span>
                </div>
              </div>

              {/* Kp Butée */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase text-emerald-900">
                    Butée Passive — ($K_p$)
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Avant du Mur
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center font-mono text-xs mb-3">
                  Kp = tan²(45° + φ / 2) = (1 + sin φ) / (1 - sin φ)
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  Selon le CFEM 5e (tableau 6.2), la butée est pondérée avec Φ_p = {result.geotech.phi_p}, sans autre réduction de Kp. Zone de butée : de {result.frost.z_top.toFixed(2)} m à {ep.h_pass.toFixed(2)} m sous la surface avant ({result.frost.deduct ? `profondeur de gel df = ${result.frost.df.toFixed(2)} m déduite` : 'profondeur de gel non déduite : sol avant déclaré permanent et non gélif par l\'utilisateur'}).
                </p>
                <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200 text-xs font-mono flex justify-between items-center">
                  <span className="text-slate-600">Kp Rankine = {ep.Kp_rankine.toFixed(4)}</span>
                  <span className="font-bold text-emerald-900">
                    {result.soilMethodConfig.passiveMethod === 'neglected'
                      ? 'Butée négligée (Kp = 0)'
                      : `Kp retenu (${({ rankine: 'Rankine', coulomb: 'Coulomb', neglected: '' } as Record<string, string>)[result.soilMethodConfig.passiveMethod]}) = ${ep.K_passive_used.toFixed(4)} ; Φ_p = ${result.geotech.phi_p}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Application numérique globale */}
            <div className="mt-6 p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                Coeff. actif retenu pour la modélisation : <strong className="text-amber-400">{ep.K_active_used.toFixed(4)}</strong> ({geo.wallType === 'cantilever' ? 'Cantilever = Ka' : 'Mur sous-sol = K0'})
              </div>
              <div>
                Poussée unitaire à la base : <strong>{(ep.K_active_used * soil.gamma * totalHeight).toFixed(2)} kPa</strong>
              </div>
              <div>
                Force totale $P_a$ = <strong>{ep.P_active_nominal.toFixed(1)} kN/m</strong> à $y = {(ep.y_Pa).toFixed(2)} m$
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SÉISME SELON LE CFEM & MONONOBE-OKABE */}
      {activeSection === 'seisme' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-black text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Paramètres Sismiques & Poussée Dynamique selon le CFEM
                  </h2>
                  <p className="text-xs text-slate-500">
                    Méthode de Mononobe-Okabe (CFEM 5e éd., § 18.7) ; Seed & Whitman : méthode simplifiée hors fiche MUR-02
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded border ${
                soil.methodConfig?.seismicMethod === 'none'
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {soil.methodConfig?.seismicMethod === 'none' ? 'Option : Aucun Séisme (Statique)' : 'CFEM 5e éd., § 18.7'}
              </span>
            </div>

            {/* Inactive Seismic Notice */}
            {soil.methodConfig?.seismicMethod === 'none' && (
              <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 mb-6 text-xs text-slate-700 leading-relaxed flex items-center justify-between">
                <div>
                  <strong className="text-slate-900 block font-black">Mode Statique Pur Sélectionné :</strong>
                  <span>Le calcul sismique est désactivé (<code className="font-mono">k_h = 0.000</code>, <code className="font-mono">ΔPae = 0.0 kN/m</code>). Seules les combinaisons de charges statiques CNB {result.cnbEdition} sont évaluées.</span>
                </div>
                <span className="px-2.5 py-1 bg-slate-200 text-slate-800 text-[10.5px] font-bold rounded-lg whitespace-nowrap ml-3">
                  E = 0 (Inactif)
                </span>
              </div>
            )}

            {/* Explanation box */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 mb-6 text-xs text-slate-700 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
                <Info size={16} />
                <span>Recommandations du Manuel Canadien d'Ingénierie des Fondations (CFEM) :</span>
              </div>
              <p>
                En vertu du <strong>CFEM Section 6.7.3</strong> et de l'annexe du <strong>CNB {result.cnbEdition}</strong>, pour un mur de soutènement autostable sur semelle pouvant tolérer 
                un déplacement permanent résiduel modéré (environ 25 à 50 mm sous séisme de calcul), le coefficient d'accélération horizontale de calcul peut être réduit :
                <br />
                <code className="font-mono font-bold text-amber-950">k_h = 0.50 · PGA</code> (ou <code>0.50 · Sa(0.2)</code>).
                Pour un mur rigide non déplaçable (ex: sous-sol), il convient de retenir <code className="font-mono font-bold text-amber-950">k_h = 1.00 · PGA</code>.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formule de Mononobe-Okabe */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="text-xs font-black uppercase text-slate-900 mb-2">
                  1. Théorie de Mononobe-Okabe (Kae)
                </h3>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center font-mono text-[11px] leading-relaxed mb-3">
                  θ_eq = arctan( kh / (1 - kv) )<br />
                  Kae = cos²(φ - θ_eq) / [ cos(θ_eq) · cos(δ + θ_eq) · (1 + √[sin(φ+δ)·sin(φ-θ_eq) / cos(δ+θ_eq)])² ]
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-600">kh appliqué :</span>
                    <span className="font-mono font-bold">{result.seismic.kh.toFixed(3)}{result.seismic.csaS6 ? ' (0,5·ah, option CSA S6)' : ' (= ah)'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-600">Angle d'inertie sismique θ_eq :</span>
                    <span className="font-mono font-bold">{ep.theta_eq_deg.toFixed(2)}° ({ep.theta_eq_rad.toFixed(4)} rad)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Coeff. dynamique Kae (M-O) :</span>
                    <span className="font-mono font-bold text-rose-700">{ep.Kae_mo.toFixed(4)}</span>
                  </div>
                </div>
              </div>

              {/* Formule simplifiée de Seed & Whitman */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="text-xs font-black uppercase text-slate-900 mb-2">
                  2. Méthode Seed & Whitman (1970) — hors fiche MUR-02
                </h3>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center font-mono text-[11px] leading-relaxed mb-3">
                  ΔKae ≈ 0.75 · kh<br />
                  ΔPae = 0.375 · kh · γ · H²<br />
                  Point d'application dynamique : y = 0.60 · Ht
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-600">Incrément dynamique ΔKae :</span>
                    <span className="font-mono font-bold">+{ep.delta_Kae_seed.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-600">Force dynamique du sol ΔPae :</span>
                    <span className="font-mono font-bold text-rose-700">{ep.delta_Pae_seed.toFixed(2)} kN/m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Bras de levier depuis la base (0.6·H) :</span>
                    <span className="font-mono font-bold">{ep.y_Pae.toFixed(2)} m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Forces d'inertie de structure */}
            <div className="mt-6 p-4 bg-rose-50/50 rounded-xl border border-rose-200">
              <h3 className="text-xs font-black uppercase text-rose-950 mb-2">
                3. Forces d'Inertie de la Structure (Béton Armé)
              </h3>
              <p className="text-xs text-slate-600 mb-3">
                Conformément au CNB et au CFEM, sous sollicitation sismique E, les masses propres du voile et de la semelle développent une force d'inertie horizontale déstabilisante :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-white p-3 rounded-lg border border-rose-100 flex justify-between">
                  <span>Inertie Voile (E_stem) = W_stem · kh :</span>
                  <strong className="text-rose-700">{ep.E_stem_nominal.toFixed(2)} kN/m</strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-rose-100 flex justify-between">
                  <span>Inertie Semelle (E_base) = W_base · kh :</span>
                  <strong className="text-rose-700">{ep.E_base_nominal.toFixed(2)} kN/m</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: STABILITÉ GÉOTECHNIQUE (CFEM 5e éd., tableau 6.2 et fig. 20.10) */}
      {activeSection === 'stabilite' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Formules de Vérification de la Stabilité Externe
                  </h2>
                  <p className="text-xs text-slate-500">
                    Glissement, Renversement & Portance selon le CFEM 5e éd. (tableau 6.2 et fig. 20.10)
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-800 px-2.5 py-1 rounded border border-blue-200">
                CFEM 5e éd., tableau 6.2
              </span>
            </div>

            {/* 1. Glissement */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
                  <ArrowRightLeft size={16} />
                  <span>A. Stabilité au Glissement (Sliding Stability)</span>
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ulsSliding.FOS_sliding >= 1.0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  Ratio Min = {ulsSliding.FOS_sliding.toFixed(2)} ({ulsSliding.status_sliding})
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-center font-mono text-xs mb-3">
                Fs = C₂ · B · Φ_coh + P_p · Φ_p + (∑V_min) · μ · Φ_gs
                <br />
                Critère de conformité : Ratio = Fs / (∑Fh_déstabilisant) ≥ 1.00
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Frottement Sol-Béton :</span>
                  <strong className="font-mono">μ = {soil.mu.toFixed(2)}</strong> (Φ_gs = {result.geotech.phi_gs} ; Ψ = {result.geotech.psi})
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Butée Passive Mobilisée :</span>
                  <strong className="font-mono">Ψ · Φ_p · (Pp′ + Pw,a) = {result.geotech.psi} · {result.geotech.phi_p} · ({ep.P_passive_nominal.toFixed(1)} + {ep.P_water_front.toFixed(1)}) = {(result.geotech.psi * result.geotech.phi_p * (ep.P_passive_nominal + ep.P_water_front)).toFixed(1)} kN/m (statique)</strong>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Combinaison critique ÉLU :</span>
                  <strong className="font-mono text-indigo-700 truncate block">{ulsSliding.combName}</strong>
                </div>
              </div>
            </div>

            {/* 2. Renversement */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                  <Scale size={16} />
                  <span>B. Stabilité au Renversement (Overturning Stability)</span>
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ulsOverturning.FOS_overturning >= 1.0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  Ratio Min = {ulsOverturning.FOS_overturning.toFixed(2)} ({ulsOverturning.status_overturning})
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-center font-mono text-xs mb-3">
                Ms = ∑(V_min · x) + M_hp · Φ_renv
                <br />
                Mr = ∑(F_h · y)
                <br />
                Critère de conformité : Ratio = Ms / Mr ≥ 1.00 (calculé par rapport à l'orteil avant)
              </div>
              <p className="text-xs text-slate-600">
                Le pivot de renversement est le point extrême avant de la semelle. Les charges de gravité permanentes sont pondérées avec leur facteur minimal (0.9D) pour maximiser le risque de basculement.
              </p>
            </div>

            {/* 3. Portance & Excentricité (Les 4 cas) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                  <Layers size={16} />
                  <span>C. Capacité Portante & Diagnostic des 4 Cas de Répartition</span>
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ulsBearing.FOS_bearing >= 1.0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  Ratio Min = {ulsBearing.FOS_bearing.toFixed(2)} ({ulsBearing.status_bearing})
                </span>
              </div>

              {/* Calcul détaillé de me et étapes précédentes */}
              <div className="mt-4 p-4 bg-indigo-50/70 rounded-xl border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    Détail du Calcul de me (Moment d'Excentricité) et Étapes Précédentes
                  </h4>
                  <span className="text-[10px] font-mono font-bold bg-white text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                    CFEM 5e éd., § 20.7.3.4 & équation de Navier
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Le calcul de la contrainte sous la semelle découle directement du moment de flexion d'excentricité <strong className="text-indigo-900 font-mono">me = Rv · e</strong> généré par le décalage de la résultante par rapport au centre de gravité de la base.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">1. Charge Normale Rv</span>
                    <span className="font-mono font-black text-indigo-700">Rv = ∑ V = {ulsBearing.sumV_max.toFixed(1)} kN/m</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">2. Bras de Levier x1</span>
                    <span className="font-mono font-black text-indigo-700">x1 = (Ms - Mr) / Rv = {ulsBearing.x1.toFixed(3)} m</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">3. Excentricité e</span>
                    <span className="font-mono font-black text-indigo-700">e = |B/2 - x1| = {Math.abs(ulsBearing.ecc).toFixed(3)} m</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">4. Moment me</span>
                    <span className="font-mono font-black text-indigo-700">me = Rv · e = {(ulsBearing.sumV_max * Math.abs(ulsBearing.ecc)).toFixed(1)} kNm/m</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-indigo-200 font-mono text-[11px] text-slate-800 leading-relaxed">
                  <strong>Formule de Navier appliquée à la semelle (b = 1.0 m, h = B) :</strong><br />
                  W = (1.0 · B²) / 6 = (1.0 · {baseWidth.toFixed(2)}²) / 6 = <strong>{(Math.pow(baseWidth, 2) / 6).toFixed(3)} m³/m</strong><br />
                  q = (Rv / B) ± (me / W) = ({ulsBearing.sumV_max.toFixed(1)} / {baseWidth.toFixed(2)}) ± ({(ulsBearing.sumV_max * Math.abs(ulsBearing.ecc)).toFixed(1)} / {(Math.pow(baseWidth, 2) / 6).toFixed(3)})<br />
                  &rArr; q_orteil = <strong className="text-emerald-700">{ulsBearing.q_toe.toFixed(1)} kPa</strong> | q_talon = <strong className="text-indigo-700">{ulsBearing.q_heel.toFixed(1)} kPa</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-1">Position de la Résultante & Excentricité :</h4>
                  <p className="font-mono text-indigo-700 font-bold mb-1">
                    x₁ = (Ms - Mr) / Rv
                  </p>
                  <p className="font-mono text-slate-600 mb-1">
                    e = | B/2 - x₁ |
                  </p>
                  <p className="font-mono text-slate-500">
                    Limite du tiers central (noyau central) : B/6 = {(baseWidth / 6).toFixed(3)} m
                  </p>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-1">Formules des Pressions de Contact :</h4>
                  <ul className="space-y-1 font-mono text-[11px] text-slate-700">
                    <li>• <strong>Cas 2 (e &le; B/6)</strong> : q₁,₂ = (Rv / B) · [1 ± 6e / B]</li>
                    <li>• <strong>Cas 3 (e = B/6)</strong> : q₁ = 2·Rv / B, q₂ = 0</li>
                    <li>• <strong>Cas 4 (e &gt; B/6)</strong> : q₁ = 2·Rv / (3·x₁), q₂ = 0 (décollement)</li>
                  </ul>
                </div>
              </div>

              <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs flex flex-col sm:flex-row justify-between items-center gap-2">
                <span>Résistance ultime ÉLU : <strong>Ψ · Φ_gu · q_u = {(result.geotech.psi * result.geotech.phi_gu * soil.qUltimate_ULS).toFixed(1)} kPa</strong> (Ψ={result.geotech.psi}, Φ_gu={result.geotech.phi_gu}{result.geotech.quFactored ? ' ; qu déclarée déjà pondérée' : ' ; qu non pondérée'})</span>
                <span>Contrainte admissible ÉLTS : <strong>q_adm = {soil.qAllowable_SLS.toFixed(1)} kPa</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: CONCEPTION BÉTON SELON LE LIVRE D'OMAR CHAALLAL */}
      {activeSection === 'conception_omar' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm">
                  4
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Conception du Béton Armé — Méthodologie Omar Chaallal
                  </h2>
                  <p className="text-xs text-slate-500">
                    Conforme à la norme canadienne CSA A23.3-19 et aux chapitres 4, 5, 7 et 12 du livre d'Omar Chaallal
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded border border-indigo-200">
                Omar Chaallal Ch. 4 & 5
              </span>
            </div>

            {/* Step by step verification card for Mur / Voile */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-slate-800">
                  Procédure Pas-à-Pas de Dimensionnement en Flexion (Voile / Mur)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Tableau 4.5 & 4.6 (Omar Chaallal)</span>
              </div>
              <div className="p-4 sm:p-5 space-y-4 text-xs">
                {/* Étape 1 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Calcul de la Hauteur Utile $d$ :</div>
                    <p className="text-slate-600 font-mono mt-0.5">
                      d = h - enrobage - d_b/2 = {cd.mur_interieur.section_h} - 60 - 8 = <strong className="text-indigo-700">{cd.mur_interieur.d} mm</strong>
                    </p>
                  </div>
                </div>

                {/* Étape 2 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Vérification de l'Armature Minimale As,min :</div>
                    <p className="text-slate-600 font-mono mt-0.5">
                      As,min = <strong className="text-indigo-700">{cd.mur_interieur.As_min.toFixed(0)} mm²/m</strong> [{cd.mur_interieur.As_min_basis}] ; 10.5.1.2 b) : {cd.mur_interieur.As_min_flexure.toFixed(0)} mm²/m{cd.mur_interieur.flexure_min_waived ? ' (dispensée)' : ''} (CSA A23.3-19)
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Armature fournie : {cd.mur_interieur.bar_designation} &rarr; <strong className={`font-mono ${cd.mur_interieur.As_ok ? 'text-emerald-600' : 'text-rose-600'}`}>{cd.mur_interieur.As_provided} mm²/m {cd.mur_interieur.As_ok ? '≥' : '<'} As,min ({cd.mur_interieur.As_ok ? 'CONFORME' : 'NON CONFORME'})</strong>
                    </p>
                  </div>
                </div>

                {/* Étape 3 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Facteurs du Bloc Équivalent Rectangulaire ($\alpha_1, \beta_1$) :</div>
                    <p className="text-slate-600 font-mono mt-0.5">
                      α₁ = 0.85 - 0.0015 · f'c = 0.85 - 0.0015 · 30 = <strong className="text-indigo-700">{cd.mur_interieur.alpha1.toFixed(3)}</strong> (&ge; 0.67) [Éq. 3.9]
                      <br />
                      β₁ = 0.97 - 0.0025 · f'c = 0.97 - 0.0025 · 30 = <strong className="text-indigo-700">{cd.mur_interieur.beta1.toFixed(3)}</strong> (&ge; 0.67) [Éq. 3.10]
                    </p>
                  </div>
                </div>

                {/* Étape 4 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">4</span>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Profondeur du Bloc Comprimé $a$ et de l'Axe Neutre $c$ :</div>
                    <p className="text-slate-600 font-mono mt-0.5">
                      a = (Φs · As · fy) / (α₁ · Φc · f'c · b) = (0.85 · {cd.mur_interieur.As_provided} · 400) / ({cd.mur_interieur.alpha1.toFixed(3)} · 0.65 · 30 · 1000) = <strong className="text-indigo-700">{cd.mur_interieur.a_stress_block.toFixed(1)} mm</strong> [Éq. 4.11]
                      <br />
                      c = a / β₁ = {cd.mur_interieur.a_stress_block.toFixed(1)} / {cd.mur_interieur.beta1.toFixed(3)} = <strong className="text-indigo-700">{cd.mur_interieur.c_depth.toFixed(1)} mm</strong>
                    </p>
                  </div>
                </div>

                {/* Étape 5 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">5</span>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Calcul du Moment Résistant $M_r$ :</div>
                    <p className="text-slate-600 font-mono mt-0.5">
                      Mr = Φs · As · fy · (d - a / 2) · 10⁻⁶ = 0.85 · {cd.mur_interieur.As_provided} · 400 · ({cd.mur_interieur.d} - {cd.mur_interieur.a_stress_block.toFixed(1)} / 2) · 10⁻⁶
                      <br />
                      <strong className="text-indigo-800 text-sm">Mr = {cd.mur_interieur.Mr.toFixed(1)} kNm/m &ge; Mf = {cd.mur_interieur.Mf.toFixed(1)} kNm/m</strong> [Éq. 4.12a]
                    </p>
                    <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                      Facteur de moment kr = Mf / (b·d²) = {cd.mur_interieur.kr.toFixed(2)} MPa (Tableau 4.4)
                    </p>
                  </div>
                </div>

                {/* Étape 6 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">6</span>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Vérification de la Ductilité (Section Sous-Armée) :</div>
                    <p className="text-slate-600 font-mono mt-0.5">
                      (c / d) = {cd.mur_interieur.c_depth.toFixed(1)} / {cd.mur_interieur.d} = <strong className="text-indigo-700">{(cd.mur_interieur.ductility_c_over_d).toFixed(3)}</strong> &le; (c/d)max = 0,8 · 700 / (700 + fy) = <strong className="text-indigo-700">{cd.mur_interieur.ductility_limit.toFixed(3)}</strong> [A23.3-19, 10.5.2]
                    </p>
                    <p className="text-emerald-600 font-bold text-[11px] mt-0.5">
                      &check; Rupture ductile garantie avec écoulement plastique préalable des armatures tendues.
                    </p>
                  </div>
                </div>

                {/* Étape 7 */}
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">7</span>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Contrôle de la Fissuration — Facteur Z (Omar Chaallal p. 31) :</div>
                    <p className="text-slate-600 font-mono mt-0.5">
                      Z = fs · ∛(dc · A) avec fs = 0.6 · fy = {(0.6 * conc.fy).toFixed(0)} MPa [Éq. 3.15]
                      <br />
                      dc = enrobage + db/2 = {cd.mur_interieur.crack_dc} mm, A = 2 · dc · s = {cd.mur_interieur.crack_A} mm²
                      <br />
                      <strong className="text-indigo-800 font-bold">Z = {cd.mur_interieur.Z_factor?.toFixed(0)} N/mm {cd.mur_interieur.Z_ok ? '≤' : '>'} {cd.mur_interieur.Z_limit} N/mm ({cd.mur_interieur.Z_ok ? 'CONFORME' : 'NON CONFORME'})</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification card for Cisaillement & Cisaillement-Friction */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-slate-800">
                  Procédure Pas-à-Pas à l'Effort Tranchant & Cisaillement-Friction (Omar Chaallal Chapitre 5)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Tableau 5.1 & 5.6</span>
              </div>
              <div className="p-4 sm:p-5 space-y-4 text-xs">
                {/* Cisaillement Voile */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">A. Effort Tranchant du Béton Sans Armatures Transversales ($V_c$) :</div>
                  <p className="text-slate-600 font-mono">
                    dv = max(0.9·d, 0.72·h) = max(0.9·{cd.mur_interieur.d}, 0.72·{cd.mur_interieur.section_h}) = <strong className="text-indigo-700">{cd.mur_interieur.dv} mm</strong> [Éq. 5.4]
                    <br />
                    β = <strong className="text-indigo-700">{cd.mur_interieur.beta.toFixed(4)}</strong> [{cd.mur_interieur.beta_rule}] ; Vr,max = 0,25·Φc·f'c·bw·dv = <strong className="text-indigo-700">{cd.mur_interieur.Vr_max.toFixed(0)} kN/m</strong> [11.3.3]
                    <br />
                    Vc = Φc · λ · β · √f'c · bw · dv · 10⁻³ = {conc.phi_c} · 1.0 · {cd.mur_interieur.beta.toFixed(4)} · √{conc.fc_mur} · 1000 · {cd.mur_interieur.dv} · 10⁻³
                    <br />
                    <strong className="text-indigo-800 text-sm">Vc = {cd.mur_interieur.Vc.toFixed(1)} kN/m {cd.mur_interieur.shear_ok ? '≥' : '<'} Vf = {cd.mur_interieur.Vf.toFixed(1)} kN/m ({cd.mur_interieur.shear_ok ? 'CONFORME' : 'NON CONFORME'})</strong>
                  </p>
                </div>

                {/* Cisaillement-Friction */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">B. Cisaillement-Friction à l'Interface Voile / Semelle (CSA A23.3 Art. 11.5 & Chaallal p. 187) :</div>
                  <p className="text-slate-600 font-mono mb-2">
                    Vr = λ · Φc · (c + μ · σ) · Acv + Φs · ρv · fy · cos(αf) · Acv [Éq. 5.21]
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 font-mono text-[11px]">
                    <div>• Reprise de bétonnage : propre non intentionnellement rugueuse (c = 0.25 MPa, μ = 0.60)</div>
                    <div>• Contrainte normale min : σ = {(cd.cisaillement_friction.sigma).toFixed(2)} MPa</div>
                    <div>• Effort tranchant sollicitant Vf : <strong>{cd.cisaillement_friction.Vf.toFixed(1)} kN/m</strong></div>
                    <div>• Résistance Vr = <strong>{cd.cisaillement_friction.Vr.toFixed(1)} kN/m {cd.cisaillement_friction.status_ok ? '≥' : '<'} Vf ({cd.cisaillement_friction.status_ok ? 'OK' : 'NON'})</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: ANCRAGE & CROCHETS */}
      {activeSection === 'ancrage' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm">
                  5
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Longueurs d'Ancrage & Crochets Standard selon le Chapitre 7
                  </h2>
                  <p className="text-xs text-slate-500">
                    Développement des armatures de flexion et goujons de reprise (CSA A23.3-19 Art. 12.2 & 12.5)
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded border border-emerald-200">
                Omar Chaallal Ch. 7
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Longueur de développement droite */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="text-xs font-black uppercase text-slate-900 mb-2">
                  1. Barre Droite en Tension ($l_d$)
                </h3>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center font-mono text-xs mb-3">
                  ld = {cd.mur_interieur.ld_coeff?.toFixed(2)} · k₁ · k₂ · k₃ · k₄ · (fy / √f'c) · db &ge; 300 mm [Éq. 7.6]
                </div>
                <div className="space-y-1 text-xs text-slate-600 font-mono">
                  <div>k₁ = {cd.mur_interieur.ld_k1} (1.3 barres supérieures ; talon : {cd.semelle_talon.ld_k1}), k₂ = 1.0 (non époxy)</div>
                  <div>k₃ = 1.0 (béton normal), k₄ = {cd.mur_interieur.ld_k4} (0.8 si &le; 20M ; 1.0 si &ge; 25M)</div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-indigo-900">
                    <span>Longueur ld requise ({cd.mur_interieur.bar_designation.split(' ')[0]}) :</span>
                    <span>{cd.mur_interieur.ld.toFixed(0)} mm</span>
                  </div>
                </div>
              </div>

              {/* Crochet standard à 90° */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="text-xs font-black uppercase text-slate-900 mb-2">
                  2. Crochet Standard à 90° dans la Semelle (ldh)
                </h3>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center font-mono text-xs mb-3">
                  lhb = (100 · db) / √f'c [Éq. 7.12]<br />
                  ldh = lhb · fy/400 · 0,7 (si enrobage latéral ≥ 60 mm et du prolongement ≥ 50 mm) ≥ max(8db ; 150 mm) [12.5]
                </div>
                <div className="space-y-1 text-xs text-slate-600 font-mono">
                  <div>lhb de base (15M) = {cd.mur_interieur.lhb?.toFixed(1)} mm</div>
                  <div>ldh = <strong className="text-indigo-700">{cd.mur_interieur.ldh_required?.toFixed(1)} mm</strong> ({cd.mur_interieur.ldh_factors})</div>
                  <div>Épaisseur disponible semelle hs = {geo.epBase * 1000} mm</div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-emerald-700">
                    <span>Hauteur disponible semelle ({cd.mur_interieur.ldh_available} mm) :</span>
                    <span>{cd.mur_interieur.anchorage_ok ? 'ANCRAGE VALIDE &check;' : 'NON SUFFISANT'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table of bars from Omar Chaallal Table 1.3 */}
            <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-xs uppercase text-slate-800">
                Tableau 1.3 — Caractéristiques des Barres d'Armature Canadiennes (ACNOR G30.18 / Chaallal p. 10)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2">Désignation</th>
                      <th className="p-2 text-right">Aire (mm²)</th>
                      <th className="p-2 text-right">Diamètre (mm)</th>
                      <th className="p-2 text-right">Périmètre (mm)</th>
                      <th className="p-2 text-right">Masse (kg/m)</th>
                      <th className="p-2 text-center">Usage Courant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {[
                      { name: '10M', area: 100, diam: 11.3, perim: 35.5, mass: 0.785, use: 'Étriers, retrait, épingles' },
                      { name: '15M', area: 200, diam: 16.0, perim: 50.1, mass: 1.570, use: 'Armature principale voile & semelle' },
                      { name: '20M', area: 300, diam: 19.5, perim: 61.3, mass: 2.355, use: 'Voile fort, semelle lourde' },
                      { name: '25M', area: 500, diam: 25.2, perim: 79.2, mass: 3.925, use: 'Fondations massives' },
                      { name: '30M', area: 700, diam: 29.9, perim: 93.9, mass: 5.495, use: 'Génie civil lourd' },
                      { name: '35M', area: 1000, diam: 35.7, perim: 112.2, mass: 7.850, use: 'Poutres & semelles spéciales' },
                    ].map(b => (
                      <tr key={b.name} className={b.name === '15M' ? 'bg-indigo-50/50 font-bold' : ''}>
                        <td className="p-2 text-slate-900">{b.name}</td>
                        <td className="p-2 text-right">{b.area}</td>
                        <td className="p-2 text-right">{b.diam}</td>
                        <td className="p-2 text-right">{b.perim}</td>
                        <td className="p-2 text-right">{b.mass}</td>
                        <td className="p-2 text-center font-sans text-slate-500 text-[11px]">{b.use}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
