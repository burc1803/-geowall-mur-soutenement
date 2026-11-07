import React from 'react';
import { sourceAfterManualAh } from '../lib/siteSeismic';
import { 
  SoilProperties, 
  LoadsConfig, 
  SeismicSummary,
  SoilMethodConfig, 
  SoilPresetType, 
  ActivePressureMethod, 
  PassivePressureMethod, 
  SeismicMethod,
  AnalysisResult 
} from '../lib/types';
import { Eq, V, Frac, Sqrt } from './Eq';
import { fr } from '../lib/theoryEquations';
import { SOIL_PRESETS, DEFAULT_SOIL_METHOD_CONFIG } from '../lib/analysis';
import { X, Sparkles, Activity, ShieldAlert, Sliders, CheckCircle2, Info } from 'lucide-react';

interface SoilAndSeismicMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  soil: SoilProperties;
  loads: LoadsConfig;
  onUpdateSoil: (soil: SoilProperties) => void;
  onUpdateLoads: (loads: LoadsConfig) => void;
  seismic: SeismicSummary; // valeurs du moteur (kh, méthode) : jamais recalculées ici
  result?: AnalysisResult; // valeurs actuelles du moteur affichées sous les formules
  edition?: string; // édition du CNB (dynamique)
}

export function SoilAndSeismicMethodModal({
  isOpen,
  onClose,
  soil,
  loads,
  onUpdateSoil,
  onUpdateLoads,
  seismic,
  result,
  edition
}: SoilAndSeismicMethodModalProps) {
  if (!isOpen) return null;

  const currentMethod: SoilMethodConfig = {
    ...DEFAULT_SOIL_METHOD_CONFIG,
    ...(soil.methodConfig || {})
  };

  const handleSelectPreset = (presetKey: SoilPresetType) => {
    const p = SOIL_PRESETS[presetKey];
    onUpdateSoil({
      ...soil,
      presetType: presetKey,
      gamma: p.gamma,
      phi: p.phi,
      cohesion: p.cohesion,
      mu: p.mu,
      qAllowable_SLS: p.qAllowable_SLS,
      qUltimate_ULS: p.qUltimate_ULS
    });
  };

  // MUR-02 D6 : kh = ah par défaut ; le moteur calcule kh (voir `seismic.kh`). Aucun kh n'est recalculé ici.
  const handleUpdateMethod = (updates: Partial<SoilMethodConfig>) => {
    onUpdateSoil({
      ...soil,
      methodConfig: { ...currentMethod, ...updates }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                Manuel Canadien sur les Fondations & CNB {edition ?? loads.cnbEdition ?? '2020'}
              </span>
              <span className="text-xs text-slate-300">Paramétrage Avancé</span>
            </div>
            <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
              <Sliders size={20} className="text-amber-400" />
              Sélection du Type de Sol, Poussée, Butée & Calcul Sismique
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8 text-slate-800">
          {/* Section 1: Presets Sol */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600" />
                1. Sélection du Type de Sol (Banque de Sols CFEM)
              </h4>
              <span className="text-xs text-slate-400 font-medium">Préconfigure les angles φ, γ, cohésion et portance</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(SOIL_PRESETS) as SoilPresetType[]).map((key) => {
                const preset = SOIL_PRESETS[key];
                const isSelected = soil.presetType === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectPreset(key)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-xs font-black text-slate-900">{preset.name}</strong>
                        {isSelected && <CheckCircle2 size={16} className="text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight mb-2">{preset.description}</p>
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 bg-slate-100/70 p-1.5 rounded-lg flex justify-between">
                      <span>φ={preset.phi}° | γ={preset.gamma}</span>
                      <span>qu={preset.qUltimate_ULS} kPa</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Méthodes de Poussée Active (Ka) et Butée Passive (Kp) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Pressure Method */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  Poussée Active des Terres (Ka)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Théorie de calcul du coefficient de poussée</p>
              </div>

              <div className="space-y-2">
                {[
                  {
                    value: 'rankine',
                    label: 'Rankine (Classique)',
                    sub: 'Sans frottement paroi-sol (δ = 0). Hypothèse conservatrice standard.'
                  },
                  {
                    value: 'coulomb',
                    label: 'Coulomb (Avec Frottement δ)',
                    sub: 'Prend en compte le frottement sol-béton δ = min(atan μ ; r·φ), r = rapport δ/φ de la saisie. Réduit la poussée active. μ limite aussi δ (Coulomb actif et butée) ; pas de saisie δ séparée.'
                  },
                  {
                    value: 'at_rest',
                    label: 'Pression Au Repos (K0 de Jaky)',
                    sub: 'K₀ = 1 − sin φ. Requis pour murs de sous-sol bloqués sans rotation.'
                  }
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      currentMethod.activeMethod === opt.value
                        ? 'bg-blue-50/80 border-blue-500 text-blue-950 font-bold'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="activeMethod"
                      value={opt.value}
                      checked={currentMethod.activeMethod === opt.value}
                      onChange={(e) => handleUpdateMethod({ activeMethod: e.target.value as ActivePressureMethod })}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-black">{opt.label}</div>
                      <div className="text-[11px] font-normal text-slate-500 leading-tight mt-0.5">{opt.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Passive Pressure Method */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  Butée Passive à l'Avant (Kp)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Prise en compte de la résistance passive du sol avant</p>
              </div>

              <div className="space-y-2">
                {[
                  {
                    value: 'rankine',
                    label: 'Rankine Pleine Mobilisation',
                    sub: 'Kp = tan²(45° + φ/2), sans réduction ; seul φ_p du tableau 6.2 réduit la butée. Zone gelée : onglet Critères.'
                  },
                  {
                    value: 'coulomb',
                    label: 'Coulomb avec Frottement Paroi',
                    sub: 'Hypothèse avec frottement positif sur l\'écran avant.'
                  },
                  {
                    value: 'neglected',
                    label: 'Négligée (Kp = 0)',
                    sub: 'Ultra conservateur. Conseillé si excavation future ou gel superficiel possible.'
                  }
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      currentMethod.passiveMethod === opt.value
                        ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="passiveMethod"
                      value={opt.value}
                      checked={currentMethod.passiveMethod === opt.value}
                      onChange={(e) => handleUpdateMethod({ passiveMethod: e.target.value as PassivePressureMethod })}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-black">{opt.label}</div>
                      <div className="text-[11px] font-normal text-slate-500 leading-tight mt-0.5">{opt.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Formules et valeurs actuelles du moteur (CFEM 5e éd.) */}
          {result && (
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase text-slate-500 tracking-wider">Formules et valeurs actuelles du moteur</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Eq
                  general={<><V n="K" s="a" /> = tan²(45° − <V n="φ" />/2) (Rankine)</>}
                  substituted={<>tan²(45° − {fr(soil.phi, 1)}°/2)</>}
                  result={<>Valeur actuelle : <V n="K" s="a" /> = {fr(result.earthPressures.Ka_rankine, 4)}</>}
                  note="CFEM 5e éd., § 20.7 (À CONFIRMER)"
                />
                <Eq
                  general={<><V n="K" s="a" /> = <Frac n={<>cos²<V n="φ" /></>} d={<>cos <V n="δ" /> [1 + <Sqrt><Frac n={<>sin(<V n="φ" />+<V n="δ" />) sin <V n="φ" /></>} d={<>cos <V n="δ" /></>} /></Sqrt>]²</>} /> (Coulomb)</>}
                  substituted={<>φ = {fr(soil.phi, 1)}° ; δ = {fr(result.earthPressures.delta_deg, 2)}°</>}
                  result={<>Valeur actuelle : <V n="K" s="a" /> = {fr(result.earthPressures.Ka_coulomb, 4)}</>}
                  note="CFEM 5e éd., § 20.7 (À CONFIRMER)"
                />
                <Eq
                  general={<><V n="K" s="0" /> = 1 − sin <V n="φ" /> (Jaky)</>}
                  substituted={<>1 − sin({fr(soil.phi, 1)}°)</>}
                  result={<>Valeur actuelle : <V n="K" s="0" /> = {fr(result.earthPressures.K0_jaky, 4)}</>}
                  note="CFEM 5e éd., § 20.7 (À CONFIRMER)"
                />
                <Eq
                  general={<><V n="K" s="p" /> = tan²(45° + <V n="φ" />/2) ; <V n="P" s="p" prime /> = ∫ <V n="K" s="p" /> <V n="σ" s="v" prime /> d<V n="z" /> (par couches, de df à h_pass)</>}
                  substituted={<>φ de fondation = {fr(result.foundationSoil.phi, 1)}° ; z₀ = {fr(result.earthPressures.z_passive_top, 2)} m ; h_pass = {fr(result.earthPressures.h_pass, 2)} m</>}
                  result={<>Valeur actuelle : <V n="K" s="p" /> = {fr(result.earthPressures.K_passive_used, 4)} ; <V n="P" s="p" prime /> = {fr(result.earthPressures.P_passive_nominal, 1)} kN/m</>}
                  note="CFEM 5e éd., § 20.7"
                />
                <Eq
                  general={<><V n="k" s="h" /> = <V n="a" s="h" />/<V n="g" /> ; <V n="ψ" /> = atan[<V n="k" s="h" />/(1 − <V n="k" s="v" />)]</>}
                  substituted={<>{fr(seismic.ah, 3)} ; kv = {fr(seismic.kvInput, 3)}</>}
                  result={<>Valeur actuelle : <V n="k" s="h" /> = {fr(seismic.kh, 3)}{seismic.scenarios[0] ? <> ; <V n="ψ" /> = {fr(seismic.scenarios[0].psi_deg, 2)}°</> : null}</>}
                  note="CFEM 5e éd., éq. 18.21-18.22"
                />
                <Eq
                  general={<><V n="K" s="AE" /> = <Frac n={<>cos²(<V n="φ" />−<V n="ψ" />)</>} d={<>cos <V n="ψ" /> cos(<V n="δ" />+<V n="ψ" />) [1 + <Sqrt><Frac n={<>sin(<V n="φ" />+<V n="δ" />) sin(<V n="φ" />−<V n="ψ" />)</>} d={<>cos(<V n="δ" />+<V n="ψ" />)</>} /></Sqrt>]²</>} /> (Mononobe-Okabe)</>}
                  substituted={seismic.scenarios[0] ? <>φ = {fr(soil.phi, 1)}° ; ψ = {fr(seismic.scenarios[0].psi_deg, 2)}°</> : undefined}
                  result={<>Valeur actuelle : {seismic.method === 'mononobe_okabe' && seismic.scenarios[0] ? (seismic.scenarios[0].indeterminate ? 'K_AE indéterminé (NON VÉRIFIABLE)' : <><V n="K" s="AE" /> = {fr(seismic.scenarios[0].Kae, 4)}</>) : 'méthode non retenue'}</>}
                  note="CFEM 5e éd., éq. 18.20-18.21"
                />
                <Eq
                  general={<>Wood : Δ<V n="P" s="0E" /> = <V n="k" s="h" /> <V n="γ" /> <V n="H" />² à 0,58<V n="H" /></>}
                  substituted={seismic.method === 'wood' && seismic.scenarios[0] ? <>{fr(seismic.kh, 3)} · {fr(soil.gamma, 1)} · {fr(result.totalHeight)}²</> : undefined}
                  result={<>Valeur actuelle : {seismic.method === 'wood' && seismic.scenarios[0] ? <>Δ<V n="P" s="0E" /> = {fr(seismic.scenarios[0].dPae, 2)} kN/m</> : 'méthode non retenue'}</>}
                  note="CFEM 5e éd., éq. 18.36 à 18.39 (mur retenu)"
                />
                <Eq
                  general={<>Portance : <V n="q" /> = <V n="R" s="v" />/<V n="B" prime /> (critère B′) ou <V n="q" /> = <V n="R" s="v" />/<V n="B" /> · (1 ± 6<V n="e" />/<V n="B" />) (moments)</>}
                  result={<>Valeur actuelle : {fr(result.governingBearing.q_Beff, 1)} kPa (B′) ; {fr(result.governingBearing.q_linear_max, 1)} kPa (linéaire)</>}
                  note="CFEM 5e éd., éq. 10.12 (Meyerhof) ; Paultre ch. 17"
                />
              </div>
            </div>
          )}

          {/* Section 3: Façon de Calcul du Séisme (CFEM 5e éd., § 18.7) */}
          <div className="p-5 bg-gradient-to-br from-amber-50/40 via-white to-slate-50 rounded-2xl border border-amber-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Activity size={18} className="text-amber-600" />
                  3. Méthode de Calcul Sismique (CFEM & Mononobe-Okabe / Seed & Whitman)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Détermination de l'incrément dynamique ΔPae et des forces d'inertie du mur
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg">
                kh = {seismic.kh.toFixed(3)} g · méthode : {seismic.method === 'wood' ? 'Wood (mur retenu)' : seismic.method === 'mononobe_okabe' ? 'Mononobe-Okabe' : seismic.method === 'seed_whitman' ? 'Seed & Whitman' : 'aucune'}
              </span>
            </div>

            {/* Radio Seismic Methods */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  value: 'seed_whitman',
                  label: 'Seed & Whitman (1970) — hors fiche MUR-02',
                  sub: 'Hors fiche MUR-02 : méthode simplifiée, sans (1 − kv) ni contrôle d\'indétermination. ΔPAE = 0,375·kh·γ·H² à 0,6H. Reprise par le CFEM 5e : À CONFIRMER. Méthode par défaut : Mononobe-Okabe.'
                },
                {
                  value: 'mononobe_okabe',
                  label: 'Mononobe-Okabe (1926)',
                  sub: 'Mur libre : PAE = ½·KAE·γ·H²·(1 − kv), ψ = atan[kh/(1 − kv)] (CFEM 5e éd., éq. 18.20-18.21). Mur retenu (sous-sol) : Wood, ΔP0E = kh·γ·H² à 0,58H (CFEM 5e éd., éq. 18.36 à 18.39).'
                },
                {
                  value: 'none',
                  label: 'Aucun Séisme (Statique)',
                  sub: 'kh = 0. Seules les poussées statiques de terre et surcharges sont calculées.'
                }
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex flex-col justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    currentMethod.seismicMethod === opt.value
                      ? 'bg-amber-100/70 border-amber-500 ring-2 ring-amber-500/20 text-slate-900 font-bold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="seismicMethod"
                      value={opt.value}
                      checked={currentMethod.seismicMethod === opt.value}
                      onChange={(e) => handleUpdateMethod({ seismicMethod: e.target.value as SeismicMethod })}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-black">{opt.label}</span>
                  </div>
                  <p className="text-[11px] font-normal text-slate-500 leading-tight">{opt.sub}</p>
                </label>
              ))}
            </div>

            {/* ah, source et option avancée CSA S6 (MUR-02 D6) */}
            {currentMethod.seismicMethod !== 'none' && (
              <div className="p-4 bg-white rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label htmlFor="ah-input" className="text-xs font-bold text-slate-700 block mb-1">
                    ah : accélération horizontale du site (kh = ah/g, CFEM éq. 18.22) :
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="ah-input"
                      type="number"
                      step="0.01"
                      min="0"
                      max="2"
                      value={currentMethod.pga}
                      onChange={(e) => { const v = Math.max(parseFloat(e.target.value) || 0, 0); handleUpdateMethod({ pga: v, ahSource: sourceAfterManualAh(currentMethod.ahSource, currentMethod.pga, v) }); }}
                      className="w-32 p-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 bg-slate-50"
                    />
                    <span className="text-xs text-slate-500 font-bold">g</span>
                  </div>
                  <label htmlFor="ah-source" className="text-[11px] font-bold text-slate-600 block mt-2 mb-1">Source de ah (RNCan, F(PGA)·PGA, rapport géotechnique…) :</label>
                  <input
                    id="ah-source"
                    type="text"
                    value={currentMethod.ahSource ?? ''}
                    onChange={(e) => handleUpdateMethod({ ahSource: e.target.value })}
                    placeholder="à renseigner (apparaît dans la note)"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-slate-50"
                  />
                </div>

                <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!currentMethod.csaS6Reduction}
                      onChange={(e) => handleUpdateMethod({ csaS6Reduction: e.target.checked })}
                      className="mt-0.5"
                    />
                    <span className="text-xs font-bold text-amber-900">
                      Option avancée (désactivée par défaut) : kh = 0,5·ah et kv = 0
                      <span className="block font-normal text-[11px] text-amber-900/80 mt-0.5">
                        Réservée aux murs de remblais routiers ou autoroutiers pouvant se déplacer de 25 à 50 mm. Règle de la CSA S6 citée par le CFEM 5e (p. 631), non du CNB.
                        Le déplacement admis n'est pas vérifié par le logiciel. Ne s'applique pas aux murs rigides ou retenus.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-100 border-t border-slate-200 flex items-center justify-between sticky bottom-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info size={16} className="text-slate-400" />
            <span>Toutes les combinaisons CNB {edition ?? loads.cnbEdition ?? '2020'} sont recalculées automatiquement.</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-md transition-colors"
          >
            Appliquer & Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
