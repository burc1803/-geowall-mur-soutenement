import React, { useState } from 'react';
import { 
  RebarCustomConfig, 
  CanadianBarSize, 
  CANADIAN_REBAR_CATALOG, 
  ConcreteProperties, 
  AnalysisResult,
  ConcreteElementDesign
} from '../lib/types';
import { resolveRebarConfig } from '../lib/analysis';
import { ShieldCheck, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Sparkles, BookOpen, Layers, Ruler } from 'lucide-react';

interface RebarManagerProps {
  rebarConfig: RebarCustomConfig;
  onChange: (config: RebarCustomConfig) => void;
  conc: ConcreteProperties;
  result: AnalysisResult;
}

const BAR_SIZES: CanadianBarSize[] = ['10M', '15M', '20M', '25M', '30M', '35M'];
const SPACINGS = [100, 125, 150, 175, 200, 225, 250, 300];

export function RebarManager({ rebarConfig, onChange, conc, result }: RebarManagerProps) {
  const [expandedElement, setExpandedElement] = useState<string>('mur_interieur');

  const updateElement = (
    key: keyof Omit<RebarCustomConfig, 'mode'>,
    updates: { barSize?: CanadianBarSize; spacing?: number }
  ) => {
    const base = resolveRebarConfig(rebarConfig);
    const next = { ...base[key], ...updates } as { barSize: CanadianBarSize; spacing: number };
    onChange({ ...base, [key]: next });
  };

  const handleSetAutoMode = () => {
    onChange({
      ...rebarConfig,
      mode: 'auto',
      mur_interieur: { barSize: '15M', spacing: 125 },
      mur_exterieur: { barSize: '15M', spacing: 250 },
      mur_horizontal: { barSize: '15M', spacing: 250 },
      mur_horizontal_ext: { barSize: '15M', spacing: 250 },
      mur_horizontal_int: { barSize: '15M', spacing: 250 },
      semelle_talon: { barSize: '15M', spacing: 200 },
      semelle_orteil: { barSize: '15M', spacing: 200 }
    });
  };

  const elementsMeta: {
    key: keyof Omit<RebarCustomConfig, 'mode'>;
    title: string;
    description: string;
    design: ConcreteElementDesign;
    role: string;
  }[] = [
    {
      key: 'mur_interieur',
      title: 'Voile - Face Intérieure (Traction)',
      description: 'Armature verticale principale reprenant le moment fléchissant de poussée des terres',
      design: result.concreteDesign.mur_interieur,
      role: 'Flexion Principale Mf Mur'
    },
    {
      key: 'mur_exterieur',
      title: 'Voile - Face Extérieure',
      description: 'Armature verticale pour limitation de la fissuration et cisaillement-friction',
      design: result.concreteDesign.mur_exterieur,
      role: 'Secondaire & Cisaillement-Friction'
    },
    {
      key: 'mur_horizontal_ext',
      title: 'Voile - Horizontales, face extérieure (A3)',
      description: 'Armatures horizontales de la face extérieure : retrait thermique et dessiccation',
      design: result.concreteDesign.mur_horizontal_ext,
      role: 'Retrait et Température CSA A23.3 §14.1'
    },
    {
      key: 'mur_horizontal_int',
      title: 'Voile - Horizontales, face intérieure (A4)',
      description: 'Armatures horizontales de la face intérieure (côté remblai) : retrait thermique et dessiccation',
      design: result.concreteDesign.mur_horizontal_int,
      role: 'Retrait et Température CSA A23.3 §14.1'
    },
    {
      key: 'semelle_talon',
      title: 'Semelle - Talon (Face Supérieure)',
      description: 'Armature tendue en lit supérieur reprenant le poids du remblai sur le talon',
      design: result.concreteDesign.semelle_talon,
      role: 'Flexion Talon Arrière Mf'
    },
    {
      key: 'semelle_orteil',
      title: 'Semelle - Orteil (Face Inférieure)',
      description: 'Armature tendue en lit inférieur reprenant la réaction ascendante du sol sous le patin',
      design: result.concreteDesign.semelle_orteil,
      role: 'Flexion Patin Avant Mf'
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* Header and Mode Toggle */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
              CAN/CSA A23.3-19 & Omar Chaallal
            </span>
            <span className="text-xs text-slate-300">Dimensionnement du Béton Armé</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2">
            <ShieldCheck className="text-indigo-400" size={22} />
            Sélection & Vérification des Armatures Canadiennes (10M - 35M)
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Configurez les diamètres et espacements par élément structural. Le moteur calcule en temps réel le moment résistant <span className="font-mono text-amber-300">Mr</span>, l'axe neutre <span className="font-mono text-amber-300">c</span>, le contrôle de fissuration <span className="font-mono text-amber-300">Z</span> et l'ancrage <span className="font-mono text-amber-300">ldh</span>.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
          <button
            onClick={() => onChange({ ...rebarConfig, mode: 'manual' })}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
              rebarConfig.mode === 'manual'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mode Manuel
          </button>
          <button
            onClick={handleSetAutoMode}
            className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
              rebarConfig.mode === 'auto'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={13} />
            Optimisation Auto
          </button>
        </div>
      </div>

      {/* Elements Accordion and Dropdowns */}
      <div className="space-y-4">
        {elementsMeta.map((elem) => {
          const cfg = resolveRebarConfig(rebarConfig)[elem.key];
          const barInfo = CANADIAN_REBAR_CATALOG[cfg.barSize];
          const isExpanded = expandedElement === elem.key;
          const isOk = elem.design.flexure_ok && elem.design.shear_ok && elem.design.Z_ok && elem.design.ductility_ok;
          const ratio = elem.design.Mf > 0 ? (elem.design.Mf / elem.design.Mr) : 0;

          return (
            <div
              key={elem.key}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                isExpanded ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Header row */}
              <div
                onClick={() => setExpandedElement(isExpanded ? '' : elem.key)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start md:items-center gap-3">
                  <div className={`p-2.5 rounded-xl font-mono text-sm font-black flex items-center justify-center ${
                    isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {cfg.barSize}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-slate-900">{elem.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {elem.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{elem.description}</p>
                  </div>
                </div>

                {/* Quick Indicators & Dropdown Actions */}
                <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                  {/* Dropdowns */}
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm">
                    {/* Bar Size Select */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Barre :</span>
                      <select
                        value={cfg.barSize}
                        onChange={(e) => updateElement(elem.key, { barSize: e.target.value as CanadianBarSize })}
                        className="bg-transparent font-black text-xs text-slate-800 focus:outline-none cursor-pointer py-1"
                      >
                        {BAR_SIZES.map((b) => (
                          <option key={b} value={b}>
                            {b} ({CANADIAN_REBAR_CATALOG[b].area} mm²)
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-slate-300">|</span>

                    {/* Spacing Select */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">@</span>
                      <select
                        value={cfg.spacing}
                        onChange={(e) => updateElement(elem.key, { spacing: parseInt(e.target.value) })}
                        className="bg-transparent font-black text-xs text-indigo-700 focus:outline-none cursor-pointer py-1"
                      >
                        {SPACINGS.map((s) => (
                          <option key={s} value={s}>
                            {s} mm
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Utilization Ratio Badge */}
                  {elem.design.Mf > 0 ? (
                    <div className="text-right min-w-24">
                      <div className="text-xs font-black text-slate-900">
                        Mf = {elem.design.Mf.toFixed(1)} <span className="text-[10px] text-slate-400">kNm</span>
                      </div>
                      <div className={`text-[11px] font-black ${isOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                        Mr = {elem.design.Mr.toFixed(1)} ({(ratio * 100).toFixed(0)}%)
                      </div>
                    </div>
                  ) : (
                    <div className="text-right min-w-24">
                      <span className="text-xs font-bold text-slate-500">As fournie</span>
                      <div className="text-xs font-black text-slate-800">{elem.design.As_provided.toFixed(0)} mm²/m</div>
                    </div>
                  )}

                  {/* Expand Chevron */}
                  <button
                    onClick={() => setExpandedElement(isExpanded ? '' : elem.key)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* Step-by-Step Mathematical Calculation Details (Omar Chaallal) */}
              {isExpanded && (
                <div className="p-6 bg-slate-50 border-t border-slate-200/80 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="text-indigo-600" size={18} />
                      <h5 className="text-sm font-black text-slate-800">
                        Détail des étapes de calcul CSA A23.3-19 & Omar Chaallal
                      </h5>
                    </div>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                      Armature configurée : {cfg.barSize} @ {cfg.spacing} mm (db = {barInfo.diameter} mm, Ab = {barInfo.area} mm²)
                    </span>
                  </div>

                  {/* Step Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Step 1: Geometry & Effective Depth */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-indigo-600 uppercase">Étape 1 : Hauteur Utile (d)</span>
                        <Ruler size={14} className="text-slate-400" />
                      </div>
                      <div className="font-mono text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700">
                        d = h - enrobage - db/2 <br />
                        d = {elem.design.section_h} - {elem.design.section_h - elem.design.d - barInfo.diameter / 2} - {(barInfo.diameter / 2).toFixed(1)} = <strong className="text-slate-900">{elem.design.d.toFixed(1)} mm</strong>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Épaisseur section h = {elem.design.section_h} mm, largeur d'analyse b = 1000 mm.
                      </p>
                    </div>

                    {/* Step 2: Reinforcement Area & Minimum */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-indigo-600 uppercase">Étape 2 : Section d'Acier (As)</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          elem.design.As_ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {elem.key.startsWith('mur_horizontal') ? (elem.design.As_ok ? 'Σ A3 + A4 ≥ 0,002Ag OK' : 'Σ A3 + A4 < 0,002Ag') : (elem.design.As_ok ? 'As ≥ As,min OK' : 'As < As,min')}
                        </span>
                      </div>
                      <div className="font-mono text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700">
                        As = Ab · (1000 / s) <br />
                        As = {barInfo.area} · (1000 / {cfg.spacing}) = <strong className="text-slate-900">{elem.design.As_provided.toFixed(0)} mm²/m</strong>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        As,min (0.002·b·h) = {elem.design.As_min.toFixed(0)} mm²/m. Ratio ρ = {(elem.design.rho * 100).toFixed(2)} %.
                      </p>
                    </div>

                    {/* Step 3: Whitney Stress Block */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-indigo-600 uppercase">Étape 3 : Bloc de Whitney (a, c)</span>
                        <span className="text-[10px] font-mono text-slate-400">Art. 10.1.7</span>
                      </div>
                      <div className="font-mono text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700">
                        a = (φs·As·fy) / (α1·φc·f'c·b) = <strong className="text-slate-900">{elem.design.a_stress_block.toFixed(1)} mm</strong> <br />
                        c = a / β1 = {elem.design.a_stress_block.toFixed(1)} / {elem.design.beta1.toFixed(3)} = <strong className="text-slate-900">{elem.design.c_depth.toFixed(1)} mm</strong>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Paramètres béton : α1 = {elem.design.alpha1.toFixed(3)}, β1 = {elem.design.beta1.toFixed(3)}, f'c = {conc.fc_mur} MPa.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 & 5: Moment Calculation Mr & Verification */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[11px] font-black text-indigo-600 uppercase">Étape 4 : Calcul du Moment Résistant (Mr)</span>
                        <h6 className="text-base font-black text-slate-900 mt-0.5">
                          Équation Fondamentale CSA A23.3-19 §10.1 : Mr = φs · As · fy · (d - a/2)
                        </h6>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 block">MOMENT RÉSISTANT Mr</span>
                          <span className="text-lg font-black text-indigo-600 font-mono">{elem.design.Mr.toFixed(1)} kNm/m</span>
                        </div>
                        {elem.design.Mf > 0 && (
                          <div className="text-right pl-3 border-l border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 block">SOLLICITATION Mf</span>
                            <span className="text-lg font-black text-slate-900 font-mono">{elem.design.Mf.toFixed(1)} kNm/m</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 font-mono text-xs text-indigo-950 leading-relaxed">
                      Mr = 0.85 · {elem.design.As_provided.toFixed(0)} mm² · 400 MPa · ({elem.design.d.toFixed(1)} mm - {elem.design.a_stress_block.toFixed(1)}/2) · 10⁻⁶ <br />
                      Mr = <strong className="text-indigo-900 text-sm">{elem.design.Mr.toFixed(2)} kNm/m</strong> {elem.design.Mf > 0 && (
                        <span>{' '} {elem.design.Mr >= elem.design.Mf ? `≥ Mf (${elem.design.Mf.toFixed(1)} kNm/m) => CONFORME (Ratio ${(ratio * 100).toFixed(1)} %)` : `< Mf (${elem.design.Mf.toFixed(1)} kNm/m) => NON CONFORME`}</span>
                      )}
                    </div>
                  </div>

                  {/* Step 6, 7, 8: Ductility, Crack Control Z, Anchorage */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Ductility Check */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-indigo-600 uppercase">Étape 5 : Ductilité (c/d)</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          elem.design.ductility_ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {elem.design.ductility_ok ? 'Ductile OK' : 'Section Sur-armée'}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        c / d = {elem.design.c_depth.toFixed(1)} / {elem.design.d.toFixed(1)} = <strong className="text-slate-900">{elem.design.ductility_c_over_d.toFixed(3)}</strong> <br />
                        Limite CSA 10.5.2 = 0,8·700/(700 + fy) = <strong>{elem.design.ductility_limit.toFixed(3)}</strong>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Garantit une rupture ductile par plastification préalable des armatures en traction.
                      </p>
                    </div>

                    {/* Crack Control Z factor */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-indigo-600 uppercase">Étape 6 : Fissuration (Z)</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          elem.design.Z_ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {elem.design.Z_ok ? 'Z ≤ 25 000 OK' : 'Z > 25 000'}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        Z = 0.6·fy · ∛(dc · A) = <strong className="text-slate-900">{elem.design.Z_factor ? elem.design.Z_factor.toFixed(0) : '—'} N/mm</strong> <br />
                        Limite extérieure = <strong>25 000 N/mm</strong> (Omar Chaallal p. 31)
                      </div>
                      <p className="text-[11px] text-slate-500">
                        dc = {elem.design.crack_dc ? elem.design.crack_dc.toFixed(1) : '—'} mm, aire de béton tendu A = {elem.design.crack_A ? elem.design.crack_A.toFixed(0) : '—'} mm².
                      </p>
                    </div>

                    {/* Anchorage & Hook */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-indigo-600 uppercase">Étape 7 : Ancrage Crochet</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          elem.design.anchorage_ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {elem.design.anchorage_ok ? 'Ancrage Garanti' : 'Épaisseur Insuffisante'}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        ldh = 0.70 · (100·db / √f'c) = <strong className="text-slate-900">{elem.design.ldh_required ? elem.design.ldh_required.toFixed(0) : '—'} mm</strong> <br />
                        Dispo semelle = <strong>{elem.design.ldh_available ? elem.design.ldh_available.toFixed(0) : '—'} mm</strong>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Crochet standard à 90° ancré dans la semelle selon Chapitre 7 du livre d'Omar Chaallal.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
