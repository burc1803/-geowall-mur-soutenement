import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  BarChart2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Ruler, 
  FileCheck, 
  Mountain, 
  Layers, 
  GripVertical, 
  AlignHorizontalJustifyEnd, 
  ShieldCheck, 
  Scale, 
  BookOpen,
  Sliders,
  Sparkles
} from 'lucide-react';
import { WallGeometry, SoilProperties, LoadsConfig, AnalysisResult, RebarCustomConfig, ConcreteProperties, FoundationSoilProperties, StabilityCriterion } from './lib/types';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG, DEFAULT_SOIL_METHOD_CONFIG } from './lib/analysis';
import { Visualizer } from './components/Visualizer';
import { ForceCharts } from './components/ForceCharts';
import { ChargesManager } from './components/ChargesManager';
import { StabilityTables } from './components/StabilityTables';
import { CalculationStepsTheory } from './components/CalculationStepsTheory';
import { BearingPressureDiagram } from './components/BearingPressureDiagram';
import { RebarManager } from './components/RebarManager';
import { SoilAndSeismicMethodModal } from './components/SoilAndSeismicMethodModal';
import { OfficialNoteDeCalcul } from './components/OfficialNoteDeCalcul';

type TabId = 'geom' | 'charges' | 'pressures' | 'stability' | 'efforts' | 'rebar' | 'theory' | 'report';

const INITIAL_GEO: WallGeometry = {
  wallType: 'cantilever',
  hMur: 3.80,
  epStem: 0.35,
  ePiedAv: 0.80,
  ePiedAr: 1.75,
  epBase: 0.35,
};

const INITIAL_SOIL: SoilProperties = {
  gamma: 19.0,
  gamma_prime: 9.2,
  phi: 29.0,
  cohesion: 0.0,
  mu: 0.55,
  hSolAv: 1.50,
  qAllowable_SLS: 130.0,
  qUltimate_ULS: 392.0,
  presetType: 'compact_sand',
  methodConfig: DEFAULT_SOIL_METHOD_CONFIG,
  hasWaterTable: true,
  waterTableHeight: 2.50,
  gamma_w: 9.81,
  geotechFactors: {
    phi_gu: 0.50,
    phi_gs: 0.80,
    phi_renv: 0.50,
    phi_p: 0.50,
    phi_coh: 0.60
  }
};

const INITIAL_LOADS: LoadsConfig = {
  surcharge: 12.0,
  surchargeType: 'L',
  surchargeAval: 0.0,
  pointLoadTop: {
    enabled: true,
    Fy: 12.0,
    Fx: 0.0,
    name: 'Charge Tête'
  },
  gammaM: 1.0,
  gammaF: 1.0,
  additionalLoads: [],
  kh: 0.075,
  kv: 0.0
};

function StatBox({ label, value, unit, status, nonVerifiable }: { label: string, value: string, unit: string, status?: 'ok' | 'warning' | 'error', nonVerifiable?: boolean }) {
    // Données invalides (alerte) : aucun statut de conformité n'est affiché
    if (nonVerifiable) { value = 'NON VÉRIFIABLE'; unit = ''; status = 'warning'; }
    let colorClass = "text-slate-900";
    let icon = null;
    if (status === 'ok') { colorClass = "text-emerald-600"; icon = <CheckCircle2 size={16} className={colorClass} />; }
    if (status === 'warning') { colorClass = "text-amber-500"; icon = <AlertTriangle size={16} className={colorClass} />; }
    if (status === 'error') { colorClass = "text-rose-600"; icon = <XCircle size={16} className={colorClass} />; }

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            <div className="flex items-center gap-2">
               <span className={`text-2xl font-black ${colorClass}`}>{value}</span>
               <span className="text-xs font-bold text-slate-400">{unit}</span>
               {icon && <span className="ml-auto">{icon}</span>}
            </div>
        </div>
    );
}

export default function App() {
  const [geo, setGeo] = useState<WallGeometry>(INITIAL_GEO);
  const [soil, setSoil] = useState<SoilProperties>(INITIAL_SOIL);
  const [loads, setLoads] = useState<LoadsConfig>(INITIAL_LOADS);
  const [rebarConfig, setRebarConfig] = useState<RebarCustomConfig>(DEFAULT_REBAR_CONFIG);
  // Béton et armature saisissables (MUR-01 §3.2) : DEFAULT_CONCRETE_PROPS ne sert plus que de valeurs initiales
  const [conc, setConc] = useState<ConcreteProperties>(DEFAULT_CONCRETE_PROPS);
  const [isSoilModalOpen, setIsSoilModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabId>('geom');

  const result = useMemo<AnalysisResult>(() => 
    analyzeRetainingWall(geo, soil, loads, conc, rebarConfig), 
    [geo, soil, loads, conc, rebarConfig]
  );

  const handleChangeGeo = (key: keyof WallGeometry, value: number) => setGeo(prev => ({ ...prev, [key]: value }));
  const handleChangeSoil = (key: keyof SoilProperties, value: number) => setSoil(prev => ({ ...prev, [key]: value }));
  const handleChangeConc = (key: keyof ConcreteProperties, value: number) => setConc(prev => ({ ...prev, [key]: value }));
  // Sol de fondation : absent = identique au remblai
  const foundationSoil: FoundationSoilProperties = soil.foundation ?? { gamma: soil.gamma, phi: soil.phi, cohesion: soil.cohesion ?? 0 };
  const handleChangeFoundation = (key: keyof FoundationSoilProperties, value: number) =>
    setSoil(prev => ({ ...prev, foundation: { ...(prev.foundation ?? { gamma: prev.gamma, phi: prev.phi, cohesion: prev.cohesion ?? 0 }), [key]: value } }));
  const handleChangeLoads = (key: keyof LoadsConfig, value: number) => setLoads(prev => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Soil & Seismic Configuration Modal */}
      <SoilAndSeismicMethodModal
        isOpen={isSoilModalOpen}
        onClose={() => setIsSoilModalOpen(false)}
        soil={soil}
        loads={loads}
        onUpdateSoil={setSoil}
        onUpdateLoads={setLoads}
      />

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white px-6 py-4 flex items-center justify-between shadow-xl sticky top-0 z-40">
        <div className="flex items-center gap-4">
           {/* logo : retour au portail StructuraHub (adresse à adapter au déploiement) */}
           <a
             href="http://localhost:3000/portail.html"
             title="Retour au portail StructuraHub"
             className="bg-blue-600/20 p-2 rounded-xl text-blue-500 border border-blue-500/30 hover:ring-2 hover:ring-blue-400"
           >
             <Mountain size={22} />
           </a>
           <div>
               <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">GeoWall <span className="text-blue-500">PRO</span></h1>
               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">CNB {result.cnbEdition} • CFEM 5e éd. • CSA A23.3-19</span>
           </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold">
            {/* Édition du CNB pour le tableau 4.1.3.2.-A (amendement A1 de MUR-01) */}
            <label
              className="flex items-center gap-1.5 bg-slate-800 text-blue-300 px-3 py-2 rounded-xl border border-slate-700 shadow-sm"
              title="Édition du CNB pour les combinaisons du tableau 4.1.3.2.-A. H = 1,0 au cas 5 dans les deux éditions."
            >
              <span className="hidden md:inline">Combinaisons :</span>
              <select
                value={loads.cnbEdition ?? '2020'}
                onChange={e => setLoads(prev => ({ ...prev, cnbEdition: e.target.value as '2020' | '2025' }))}
                className="font-mono text-[11px] text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-600 cursor-pointer"
              >
                <option value="2020">CNB 2020 (défaut)</option>
                <option value="2025">CNB 2025</option>
              </select>
            </label>

            {/* Quick Button to configure Soil & Seismic */}
            <button
              onClick={() => setIsSoilModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-2 rounded-xl border border-slate-700 transition-colors shadow-sm"
              title="Configurer les théories de poussée (Ka, Kp) et séisme"
            >
              <Sliders size={14} className="text-amber-400" />
              <span className="hidden md:inline">Sol & Séisme :</span>
              <span className="font-mono text-[11px] text-white bg-slate-900 px-1.5 py-0.5 rounded">
                {result.soilMethodConfig.activeMethod === 'rankine' ? 'Rankine' : (result.soilMethodConfig.activeMethod === 'coulomb' ? 'Coulomb' : 'K0')} | {result.soilMethodConfig.seismicMethod === 'seed_whitman' ? 'Seed' : (result.soilMethodConfig.seismicMethod === 'mononobe_okabe' ? 'M-O' : 'Stat')}
              </span>
            </button>

            {/* Armatures Quick Button */}
            <button
              onClick={() => setActiveTab('rebar')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors border ${
                activeTab === 'rebar' 
                  ? 'bg-indigo-600 text-white border-indigo-500' 
                  : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border-slate-700'
              }`}
            >
              <ShieldCheck size={14} />
              <span className="hidden sm:inline">Choix Barres & Mr</span>
            </button>

            <button 
                onClick={() => {
                   setActiveTab('report');
                   setTimeout(() => window.print(), 150);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
            >
                <FileCheck size={16} />
                <span className="hidden sm:inline">Note de Calcul</span>
            </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-screen-2xl mx-auto w-full overflow-hidden">
         {/* Sidebar Inputs */}
         <aside className="w-full lg:w-[380px] bg-white border-r border-slate-200 flex flex-col shrink-0">
             
            <div className="flex border-b border-slate-200">
                <button 
                  className={`flex-1 text-[10px] font-black uppercase tracking-wider py-3 border-b-2 transition-all ${['geom', 'efforts', 'report', 'rebar'].includes(activeTab) ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                  onClick={() => setActiveTab('geom')}
                >
                  <Ruler size={14} className="mx-auto mb-1" />
                  Géométrie
                </button>
                <button 
                  className={`flex-1 text-[10px] font-black uppercase tracking-wider py-3 border-b-2 transition-all ${activeTab === 'pressures' ? 'border-amber-500 text-amber-500 bg-amber-50/30' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                  onClick={() => setActiveTab('pressures')}
                >
                  <Layers size={14} className="mx-auto mb-1" />
                  Sol & Pressions
                </button>
                <button 
                  className={`flex-1 text-[10px] font-black uppercase tracking-wider py-3 border-b-2 transition-all ${activeTab === 'charges' ? 'border-pink-600 text-pink-600 bg-pink-50/30' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                  onClick={() => setActiveTab('charges')}
                >
                  <BarChart2 size={14} className="mx-auto mb-1" />
                  Charges
                </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                {(activeTab === 'geom' || activeTab === 'efforts' || activeTab === 'report' || activeTab === 'rebar') && (
                    <section className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Ruler size={16} className="text-blue-600" />
                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Géométrie</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <button 
                               className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${geo.wallType === 'cantilever' ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}`}
                               onClick={() => handleChangeGeo('wallType', 'cantilever' as any)}
                            >
                               <div className={`p-2 rounded-full ${geo.wallType === 'cantilever' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                  <GripVertical size={18} />
                               </div>
                               <span className={`text-[10px] font-black uppercase tracking-wider ${geo.wallType === 'cantilever' ? 'text-blue-700' : 'text-slate-500'}`}>Cantilever</span>
                            </button>
                            <button 
                               className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${geo.wallType === 'basement' ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}`}
                               onClick={() => handleChangeGeo('wallType', 'basement' as any)}
                            >
                               <div className={`p-2 rounded-full ${geo.wallType === 'basement' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                  <AlignHorizontalJustifyEnd size={18} />
                               </div>
                               <span className={`text-[10px] font-black uppercase tracking-wider ${geo.wallType === 'basement' ? 'text-blue-700' : 'text-slate-500'}`}>Sous-Sol</span>
                            </button>
                        </div>
        
                        {geo.wallType === 'basement' && (
                            <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-xl flex flex-col gap-3 mb-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Appuis (Planchers)</span>
                                    <button 
                                        onClick={() => {
                                            const current = geo.supports || [];
                                            setGeo({...geo, supports: [...current, { y: geo.hMur / 2, type: 'pinned' }]});
                                        }}
                                        className="text-[10px] font-black uppercase text-white bg-blue-600 px-2 py-1 rounded"
                                    >
                                        + Ajouter
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {(!geo.supports || geo.supports.length === 0) && (
                                        <p className="text-xs text-blue-600/70 italic">Défaut: 1 appui libre en rotation au sommet.</p>
                                    )}
                                    {geo.supports?.map((sup, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <input 
                                                type="number" step="0.1" 
                                                className="w-16 p-1 text-xs border rounded bg-white" 
                                                value={sup.y} 
                                                onChange={e => {
                                                    const newSup = [...geo.supports!];
                                                    newSup[idx].y = parseFloat(e.target.value) || 0;
                                                    setGeo({...geo, supports: newSup});
                                                }}
                                            />
                                            <span className="text-xs text-slate-500">m</span>
                                            <select 
                                                className="flex-1 p-1 text-xs border rounded bg-white"
                                                value={sup.type}
                                                onChange={e => {
                                                    const newSup = [...geo.supports!];
                                                    newSup[idx].type = e.target.value as 'pinned' | 'fixed';
                                                    setGeo({...geo, supports: newSup});
                                                }}
                                            >
                                                <option value="pinned">Rotule (Pinned)</option>
                                                <option value="fixed">Encastré (Fixed)</option>
                                            </select>
                                            <button 
                                                onClick={() => {
                                                    const newSup = geo.supports!.filter((_, i) => i !== idx);
                                                    setGeo({...geo, supports: newSup});
                                                }}
                                                className="text-red-500 hover:text-red-700 font-bold px-1"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
        
                        <div className="grid grid-cols-2 gap-4">
                             <label className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Hauteur Voile (m)</span>
                                <input type="number" step="0.1" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={geo.hMur} onChange={(e) => handleChangeGeo('hMur', parseFloat(e.target.value) || 0)} />
                             </label>
                             <label className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Épais. Voile (m)</span>
                                <input type="number" step="0.05" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={geo.epStem} onChange={(e) => handleChangeGeo('epStem', parseFloat(e.target.value) || 0)} />
                             </label>
                             <label className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Talon Avant (m)</span>
                                <input type="number" step="0.1" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={geo.ePiedAv} onChange={(e) => handleChangeGeo('ePiedAv', parseFloat(e.target.value) || 0)} />
                             </label>
                             <label className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Talon Arrière (m)</span>
                                <input type="number" step="0.1" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={geo.ePiedAr} onChange={(e) => handleChangeGeo('ePiedAr', parseFloat(e.target.value) || 0)} />
                             </label>
                             <label className="flex flex-col gap-1.5 col-span-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Épaisseur Base (m)</span>
                                <input type="number" step="0.05" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={geo.epBase} onChange={(e) => handleChangeGeo('epBase', parseFloat(e.target.value) || 0)} />
                             </label>
                        </div>
                    </section>
                )}
                
                {(activeTab === 'pressures' || activeTab === 'stability') && (
                    <section className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                                <Layers size={16} className="text-amber-600" />
                                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Paramètres du Sol & CFEM</h2>
                            </div>
                            <button
                              onClick={() => setIsSoilModalOpen(true)}
                              className="text-[9px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors"
                            >
                              Théorie & Presets &gt;
                            </button>
                        </div>

                        {/* Presets and Methods Quick Trigger Button */}
                        <div className="p-3 bg-gradient-to-r from-amber-50 to-indigo-50 rounded-xl border border-amber-200/80 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase text-amber-900 block">Méthodes Actives</span>
                            <span className="text-xs font-bold text-slate-700">
                              Ka : <strong className="text-indigo-700">{result.soilMethodConfig.activeMethod}</strong> | Séisme : <strong className="text-amber-700">{result.soilMethodConfig.seismicMethod}</strong>
                            </span>
                          </div>
                          <button
                            onClick={() => setIsSoilModalOpen(true)}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm"
                          >
                            Modifier
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                             <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Poids Vol. γ (kN/m³)</span>
                                <input type="number" step="0.5" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={soil.gamma} onChange={(e) => handleChangeSoil('gamma', parseFloat(e.target.value) || 0)} />
                             </label>
                             <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Frottement φ (°)</span>
                                <input type="number" step="1" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={soil.phi} onChange={(e) => handleChangeSoil('phi', parseFloat(e.target.value) || 0)} />
                             </label>
                             <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Frottement Base μ</span>
                                <input type="number" step="0.05" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={soil.mu} onChange={(e) => handleChangeSoil('mu', parseFloat(e.target.value) || 0)} />
                             </label>
                             <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">H. Sol Avant (m)</span>
                                <input type="number" step="0.1" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={soil.hSolAv} onChange={(e) => handleChangeSoil('hSolAv', parseFloat(e.target.value) || 0)} />
                             </label>
                             <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Cohésion C₂ (kPa)</span>
                                <input type="number" step="1" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={soil.cohesion ?? 0} onChange={(e) => handleChangeSoil('cohesion', parseFloat(e.target.value) || 0)} />
                             </label>
                             <label className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Preset μ (CFEM 24.4)</span>
                                <select 
                                  className="p-2 border rounded-lg text-xs bg-slate-50 font-semibold text-slate-700 truncate"
                                  value={soil.mu}
                                  onChange={(e) => handleChangeSoil('mu', parseFloat(e.target.value))}
                                >
                                  <option value={0.55}>Sable compact (0.55)</option>
                                  <option value={0.60}>Gravier propre (0.60)</option>
                                  <option value={0.45}>Sable silteux (0.45)</option>
                                  <option value={0.70}>Rocher sain (0.70)</option>
                                </select>
                             </label>
                             <label className="flex flex-col gap-1 col-span-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Capacité Portante Adm. SLS (kPa)</span>
                                <input type="number" step="10" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={soil.qAllowable_SLS} onChange={(e) => handleChangeSoil('qAllowable_SLS', parseFloat(e.target.value) || 0)} />
                             </label>
                             <label className="flex flex-col gap-1 col-span-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Capacité Portante Ult. ULS (kPa)</span>
                                <input type="number" step="10" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={soil.qUltimate_ULS} onChange={(e) => handleChangeSoil('qUltimate_ULS', parseFloat(e.target.value) || 0)} />
                             </label>
                        </div>

                        {/* Sol de fondation (portance, glissement) — distinct du remblai (poussée) */}
                        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 flex flex-col gap-2 mt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">Sol de fondation (butée, glissement)</span>
                            <button
                              className="text-[10px] font-bold text-amber-800 underline"
                              onClick={() => setSoil(prev => ({ ...prev, foundation: undefined }))}
                            >Identique au remblai</button>
                          </div>
                          <p className="text-[10px] text-slate-500">Le sol ci-dessus est le remblai (poussée sur le voile, poids sur le talon). Sa cohésion c′ est négligée dans la poussée.</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <label className="flex flex-col">
                              <span className="text-[9px] text-slate-500 font-bold">γ fond. (kN/m³)</span>
                              <input type="number" step="0.5" className="p-1.5 border rounded bg-white font-mono text-xs" value={foundationSoil.gamma} onChange={e => handleChangeFoundation('gamma', parseFloat(e.target.value) || 0)} />
                            </label>
                            <label className="flex flex-col">
                              <span className="text-[9px] text-slate-500 font-bold">φ′ fond. (°)</span>
                              <input type="number" step="1" className="p-1.5 border rounded bg-white font-mono text-xs" value={foundationSoil.phi} onChange={e => handleChangeFoundation('phi', parseFloat(e.target.value) || 0)} />
                            </label>
                            <label className="flex flex-col">
                              <span className="text-[9px] text-slate-500 font-bold">c′ fond. (kPa)</span>
                              <input type="number" step="1" className="p-1.5 border rounded bg-white font-mono text-xs" value={foundationSoil.cohesion} onChange={e => handleChangeFoundation('cohesion', parseFloat(e.target.value) || 0)} />
                            </label>
                          </div>
                        </div>

                        {/* Critère de renversement / portance (choix de l'utilisateur) */}
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col gap-2 mt-1">
                          <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Critère de renversement et de portance</span>
                          <select
                            className="p-2 border rounded-lg text-xs bg-white font-semibold text-slate-700"
                            value={soil.stabilityCriterion ?? 'moments'}
                            onChange={e => setSoil(prev => ({ ...prev, stabilityCriterion: e.target.value as StabilityCriterion }))}
                          >
                            <option value="moments">Moments Ms/Mr et pression linéaire q = V/B·(1 ± 6e/B)</option>
                            <option value="eccentricity">Excentricité : B′ = B − 2e, pression uniforme V/B′</option>
                          </select>
                          <p className="text-[10px] text-slate-500">Limite d'excentricité du CFEM 5e éd. : À CONFIRMER. L'excentricité e et B′ sont affichées sans conclusion sur une limite non sourcée.</p>
                        </div>

                        {/* Béton et armature (CSA A23.3-19) */}
                        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 flex flex-col gap-2 mt-1">
                          <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">Béton et armature (CSA A23.3-19)</span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {([
                              ['fc_mur', 'f′c voile (MPa)', 1],
                              ['fc_semelle', 'f′c semelle (MPa)', 1],
                              ['fy', 'fy (MPa)', 10],
                              ['cover_h', 'Enrobage voile (mm)', 5],
                              ['cover_v', 'Enrobage talon, lit sup. (mm)', 5],
                              ['cover_base_bottom', 'Enrobage orteil, lit inf. (mm)', 5]
                            ] as [keyof ConcreteProperties, string, number][]).map(([key, label, step]) => (
                              <label key={key} className="flex flex-col">
                                <span className="text-[9px] text-slate-500 font-bold">{label}</span>
                                <input type="number" step={step} min={0} className="p-1.5 border rounded bg-white font-mono text-xs" value={conc[key]} onChange={e => handleChangeConc(key, parseFloat(e.target.value) || 0)} />
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Nappe Phréatique Amont (Option à Cocher) */}
                        <div className="bg-cyan-50/70 p-3.5 rounded-xl border border-cyan-200 flex flex-col gap-2 mt-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                              <span className="text-[10px] font-black uppercase text-cyan-900 tracking-wider">Nappe Phréatique Amont</span>
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <span className="text-[10px] font-bold text-cyan-800">Activer</span>
                              <input 
                                type="checkbox"
                                checked={soil.hasWaterTable ?? true}
                                onChange={(e) => setSoil(prev => ({
                                  ...prev,
                                  hasWaterTable: e.target.checked,
                                  waterTableHeight: prev.waterTableHeight ?? 2.50
                                }))}
                                className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                              />
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <label className="flex flex-col gap-1">
                              <span className="text-[9px] text-slate-500 font-bold">Haut. Nappe Hw (m)</span>
                              <input 
                                type="number" step="0.25" min="0" max={geo.hMur + geo.epBase}
                                className="p-1.5 border rounded bg-white font-mono text-xs font-bold text-cyan-800 disabled:opacity-40" 
                                value={soil.waterTableHeight ?? 2.50} 
                                disabled={!(soil.hasWaterTable ?? true)}
                                onChange={e => setSoil(prev => ({
                                  ...prev, 
                                  waterTableHeight: parseFloat(e.target.value) || 0
                                }))}
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-[9px] text-slate-500 font-bold">Poids Eau γw (kN/m³)</span>
                              <input 
                                type="number" step="0.1" 
                                className="p-1.5 border rounded bg-white font-mono text-xs text-slate-600" 
                                value={soil.gamma_w ?? 9.81} 
                                onChange={e => setSoil(prev => ({
                                  ...prev, 
                                  gamma_w: parseFloat(e.target.value) || 9.81
                                }))}
                              />
                            </label>
                          </div>
                          <span className="text-[9px] text-cyan-900 leading-tight">
                            Poussée hydrostatique Pw = ½·γw·Hw² + Déjaugeage du sol sous l'eau (γ' = γ - γw).
                          </span>
                        </div>

                        {/* CFEM Geotechnical Resistance Factors (Table 8.1) */}
                        <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 flex flex-col gap-2 mt-1">
                          <span className="text-[10px] font-black uppercase text-indigo-900 tracking-wider flex items-center justify-between">
                            <span>Facteurs CFEM (Tableau 8.1)</span>
                            <span className="text-[9px] text-indigo-600 font-bold">Φ Géotechniques</span>
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <label className="flex flex-col">
                              <span className="text-[9px] text-slate-500 font-bold">Φ_gu Portance</span>
                              <input 
                                type="number" step="0.05" 
                                className="p-1.5 border rounded bg-white font-mono text-xs" 
                                value={soil.geotechFactors.phi_gu} 
                                onChange={e => setSoil(prev => ({
                                  ...prev, 
                                  geotechFactors: { ...prev.geotechFactors, phi_gu: parseFloat(e.target.value) || 0.5 }
                                }))}
                              />
                            </label>
                            <label className="flex flex-col">
                              <span className="text-[9px] text-slate-500 font-bold">Φ_gs Glissement</span>
                              <input 
                                type="number" step="0.05" 
                                className="p-1.5 border rounded bg-white font-mono text-xs" 
                                value={soil.geotechFactors.phi_gs} 
                                onChange={e => setSoil(prev => ({
                                  ...prev, 
                                  geotechFactors: { ...prev.geotechFactors, phi_gs: parseFloat(e.target.value) || 0.8 }
                                }))}
                              />
                            </label>
                            <label className="flex flex-col">
                              <span className="text-[9px] text-slate-500 font-bold">Φ_renv Renversement</span>
                              <input 
                                type="number" step="0.05" 
                                className="p-1.5 border rounded bg-white font-mono text-xs" 
                                value={soil.geotechFactors.phi_renv} 
                                onChange={e => setSoil(prev => ({
                                  ...prev, 
                                  geotechFactors: { ...prev.geotechFactors, phi_renv: parseFloat(e.target.value) || 0.5 }
                                }))}
                              />
                            </label>
                            <label className="flex flex-col">
                              <span className="text-[9px] text-slate-500 font-bold">Φ_p Butée Passive</span>
                              <input 
                                type="number" step="0.05" 
                                className="p-1.5 border rounded bg-white font-mono text-xs" 
                                value={soil.geotechFactors.phi_p} 
                                onChange={e => setSoil(prev => ({
                                  ...prev, 
                                  geotechFactors: { ...prev.geotechFactors, phi_p: parseFloat(e.target.value) || 0.5 }
                                }))}
                              />
                            </label>
                          </div>
                        </div>
                    </section>
                )}

                {(activeTab === 'charges') && (
                    <section className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <BarChart2 size={16} className="text-pink-600" />
                                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Surcharges</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                 <label className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Surcharge S/C (kPa)</span>
                                    <input type="number" step="1" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={loads.surcharge} onChange={(e) => handleChangeLoads('surcharge', parseFloat(e.target.value) || 0)} />
                                 </label>
                                 <label className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Type Charge</span>
                                    <select className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={loads.surchargeType} onChange={(e) => handleChangeLoads('surchargeType', e.target.value as any)}>
                                        <option value="D">D (Morte)</option>
                                        <option value="L">L (Vive)</option>
                                        <option value="S">S (Neige)</option>
                                    </select>
                                 </label>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle size={16} className="text-amber-500" />
                                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Séisme CFEM 24.9</h2>
                                </div>
                                <button
                                  onClick={() => setIsSoilModalOpen(true)}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${
                                    soil.methodConfig?.seismicMethod === 'none'
                                      ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  }`}
                                >
                                  {soil.methodConfig?.seismicMethod === 'none'
                                    ? 'Désactivé (Statique)'
                                    : soil.methodConfig?.seismicMethod === 'mononobe_okabe'
                                    ? 'Mononobe-Okabe'
                                    : 'Seed & Whitman'}
                                </button>
                            </div>
                            {soil.methodConfig?.seismicMethod === 'none' ? (
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                                <div>
                                  <strong className="block text-slate-800 text-[11px]">Hypothèse Statique</strong>
                                  <span className="text-[10.5px] text-slate-500">Action sismique E = 0 (kh = 0.000)</span>
                                </div>
                                <button
                                  onClick={() => setIsSoilModalOpen(true)}
                                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200"
                                >
                                  Modifier
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-4">
                                   <label className="flex flex-col gap-1.5">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">Coeff. Horizontal (kh)</span>
                                      <input type="number" step="0.01" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={loads.kh} onChange={(e) => handleChangeLoads('kh', parseFloat(e.target.value) || 0)} />
                                   </label>
                                   <label className="flex flex-col gap-1.5">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">Coeff. Vertical (kv)</span>
                                      <input type="number" step="0.01" className="p-2 border rounded-lg text-sm bg-slate-50 font-semibold" value={loads.kv} onChange={(e) => handleChangeLoads('kv', parseFloat(e.target.value) || 0)} />
                                   </label>
                              </div>
                            )}
                        </div>
                    </section>
                )}
            </div>
         </aside>

         {/* Main Content Area */}
         <section className="flex-1 overflow-y-auto bg-slate-50/50 p-6 lg:p-10 flex flex-col gap-6">
            
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                <StatBox label="Crit. Glissement ELU" nonVerifiable={!result.verifiable} value={result.critical_sliding_ULS === Infinity ? '∞' : result.critical_sliding_ULS.toFixed(2)} unit="FS (Req > 1.0)" status={result.critical_sliding_ULS >= 1.0 ? 'ok' : 'error'} />
                <StatBox label="Crit. Renvers. ELU" nonVerifiable={!result.verifiable} value={result.governingOverturning.outside_base ? 'hors base' : result.critical_overturning_ULS === Infinity ? '∞' : result.critical_overturning_ULS.toFixed(2)} unit={result.governingOverturning.outside_base ? '(résultante hors base)' : 'FS (Req > 1.0)'} status={result.critical_overturning_ULS >= 1.0 && result.governingOverturning.status_overturning === 'OK' ? 'ok' : 'error'} />
                <StatBox label={result.stabilityCriterion === 'eccentricity' ? 'Pression Max B′ (ELS)' : 'Pression Max (ELS)'} nonVerifiable={!result.verifiable} value={result.combinations.some(c => c.type === 'SLS' && c.outside_base) ? 'non vérifiable' : result.critical_q_toe_SLS.toFixed(0)} unit={result.combinations.some(c => c.type === 'SLS' && c.outside_base) ? '(résultante hors base)' : 'kPa'} status={result.critical_q_toe_SLS <= soil.qAllowable_SLS ? 'ok' : 'error'} />
                <StatBox label={result.stabilityCriterion === 'eccentricity' ? 'Pression Max B′ (ELU)' : 'Pression Max (ELU)'} nonVerifiable={!result.verifiable} value={result.combinations.some(c => c.type === 'ULS' && c.outside_base) ? 'non vérifiable' : result.critical_q_toe_ULS.toFixed(0)} unit={result.combinations.some(c => c.type === 'ULS' && c.outside_base) ? '(résultante hors base)' : 'kPa'} status={result.governingBearing.status_bearing === 'OK' ? 'ok' : 'error'} />
            </div>

            {result.warnings.length > 0 && (
              <div role="alert" className="bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold rounded-xl p-3">
                {result.warnings.map((w, i) => <div key={i}>{w}</div>)}
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
                <button 
                    className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'geom' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('geom')}
                >
                    Géométrie
                </button>
                <button 
                    className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'charges' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('charges')}
                >
                    Charges (Nouv.)
                </button>
                <button 
                    className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'pressures' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg font-black' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('pressures')}
                >
                    <Layers size={14} className="text-indigo-600" />
                    <span>Diagramme Pressions & Résultante</span>
                </button>
                <button 
                    className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'stability' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
                    onClick={() => setActiveTab('stability')}
                >
                    <ShieldCheck size={14} className="text-indigo-600" />
                    <span>Stabilité CNB/CFEM (3 Tableaux)</span>
                </button>
                <button 
                    className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'efforts' ? 'border-pink-600 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('efforts')}
                >
                    Efforts Internes
                </button>
                <button 
                    className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'rebar' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
                    onClick={() => setActiveTab('rebar')}
                >
                    <ShieldCheck size={14} className="text-indigo-600" />
                    <span>Choix Barres & Mr (Omar Chaallal)</span>
                </button>
                <button 
                    className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'theory' ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-lg font-black' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
                    onClick={() => setActiveTab('theory')}
                >
                    <BookOpen size={14} className="text-amber-600" />
                    <span>Étapes, Formules & me</span>
                </button>
                <button 
                    className={`pb-3 px-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'report' ? 'border-emerald-600 text-emerald-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('report')}
                >
                    <FileCheck size={14} />
                    <span>Note de Calcul Officielle</span>
                </button>
            </div>

            {/* Tab Contents */}
            <div className="mt-2 pb-12 flex-1">
                {activeTab === 'geom' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Visualizer 
                          mode="geom" 
                          geo={geo} 
                          soil={soil} 
                          loads={loads} 
                          result={result} 
                          onUpdateSoil={setSoil}
                          onUpdateLoads={setLoads}
                          onUpdateGeo={setGeo}
                          conc={conc}
                        />
                    </div>
                )}
                
                {activeTab === 'charges' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <ChargesManager loads={loads} onChange={setLoads} geo={geo} />
                    </div>
                )}
                
                {activeTab === 'pressures' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        <BearingPressureDiagram geo={geo} soil={soil} result={result} />
                        <div className="mt-6">
                          <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2">Visualisation 2D en Coupe</h4>
                          <Visualizer 
                            mode="pressures" 
                            geo={geo} 
                            soil={soil} 
                            loads={loads} 
                            result={result} 
                            onUpdateSoil={setSoil}
                            onUpdateLoads={setLoads}
                            onUpdateGeo={setGeo}
                            conc={conc}
                          />
                        </div>
                    </div>
                )}

                {activeTab === 'stability' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <StabilityTables result={result} soil={soil} geo={geo} />
                    </div>
                )}
                
                {activeTab === 'efforts' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col xl:flex-row gap-8">
                        <div className="xl:w-1/3">
                            <Visualizer 
                              mode="dcl" 
                              geo={geo} 
                              soil={soil} 
                              loads={loads} 
                              result={result} 
                              onUpdateSoil={setSoil}
                              onUpdateLoads={setLoads}
                              onUpdateGeo={setGeo}
                              conc={conc}
                            />
                        </div>
                        <div className="xl:w-2/3">
                            <ForceCharts result={result} />
                        </div>
                    </div>
                )}

                {activeTab === 'rebar' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <RebarManager 
                          rebarConfig={rebarConfig} 
                          onChange={setRebarConfig} 
                          conc={conc} 
                          result={result} 
                        />
                    </div>
                )}
                
                {activeTab === 'theory' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CalculationStepsTheory geo={geo} soil={soil} loads={loads} result={result} conc={conc} />
                    </div>
                )}

                {activeTab === 'report' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <OfficialNoteDeCalcul geo={geo} soil={soil} conc={conc} result={result} loads={loads} />
                    </div>
                )}
            </div>

         </section>
      </main>
    </div>
  );
}

