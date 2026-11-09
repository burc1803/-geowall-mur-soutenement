import React, { useState } from 'react';
import { Eq, V, Frac, Sqrt, Tx } from './Eq';
import { DeflectionGoverningSteps, DeflectionMentions } from './StemDeflectionSteps';
import { buildSlidingEq, buildOverturningEq, buildBearingEq, buildDeltaPaeEq, inertiaStrings, fr } from '../lib/theoryEquations';
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
  initialSection?: SectionKey; // section ouverte au départ (utile aux tests de rendu)
}

export type SectionKey = 'poussee' | 'seisme' | 'stabilite' | 'conception_omar' | 'ancrage' | 'fleche';

export function CalculationStepsTheory({ geo, soil, loads, result, conc, initialSection }: CalculationStepsTheoryProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>(initialSection ?? 'poussee');
  const ep = result.earthPressures;
  const cd = result.concreteDesign;
  const baseWidth = geo.ePiedAv + geo.epStem + geo.ePiedAr;
  const totalHeight = geo.hMur + geo.epBase;

  // Combinaisons gouvernantes choisies par le moteur (aucun tri local)
  const ulsSliding = result.governingSliding;
  const ulsOverturning = result.governingOverturning;
  const ulsBearing = result.governingBearing;
  const nv = !result.verifiable; // KAE indéterminé, γ ≤ γw, etc. : aucun statut CONFORME / OK n'est affiché
  const st = (ok: boolean, okTxt = 'CONFORME', koTxt = 'NON CONFORME') => (nv ? 'NON VÉRIFIABLE' : ok ? okTxt : koTxt);
  const slidingEq = buildSlidingEq(ulsSliding, result);
  const overturningEq = buildOverturningEq(ulsOverturning, result.verifiable);
  const bearingEq = buildBearingEq(ulsBearing, baseWidth, result.stabilityCriterion);
  const inertia = conc ? inertiaStrings(result, geo, conc) : { stem: ' = ', base: ' = ' };

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
            { id: 'fleche', label: '6. Flèche du voile (ÉLS)', icon: Activity },
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

      {/* SECTION 1: POUSSÉE & BUTÉE (Ka, Kp, K0) */}
      {activeSection === 'poussee' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm">1</div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Coefficients de poussée et de butée des terres</h2>
                  <p className="text-xs text-slate-500">Rankine, Coulomb et Jaky (CFEM 5e éd., À CONFIRMER) ; butée intégrée par couches (amendement A3 ; CFEM 5e éd., 20.7.3.3)</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded border border-indigo-200">
                CFEM 5e éd., § 20.7 (À CONFIRMER pour Rankine, Coulomb et Jaky)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ka Rankine */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h3 className="text-xs font-black uppercase text-indigo-900">Poussée active — Rankine</h3>
                <Eq
                  general={<><V n="K" s="a" /> = tan²(45° − <V n="φ" />/2) = <Frac n={<>1 − sin <V n="φ" /></>} d={<>1 + sin <V n="φ" /></>} /></>}
                  substituted={<>tan²(45° − {fr(soil.phi, 1)}°/2)</>}
                  result={<><V n="K" s="a" /> = {fr(ep.Ka_rankine, 4)}</>}
                />
                <p className="text-[11px] text-slate-600">Sans frottement sol-parement (δ = 0). Valeur du moteur ; φ du remblai.</p>
              </div>

              {/* Ka Coulomb */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h3 className="text-xs font-black uppercase text-indigo-900">Poussée active — Coulomb</h3>
                <Eq
                  general={<><V n="K" s="a" /> = <Frac n={<>cos²<V n="φ" /></>} d={<>cos <V n="δ" /> · [1 + <Sqrt><Frac n={<>sin(<V n="φ" />+<V n="δ" />) · sin <V n="φ" /></>} d={<>cos <V n="δ" /></>} /></Sqrt>]²</>} /></>}
                  substituted={<>cos²({fr(soil.phi, 1)}°) / (cos({fr(ep.delta_deg, 2)}°) · [1 + √(sin({fr(soil.phi, 1)}° + {fr(ep.delta_deg, 2)}°) · sin({fr(soil.phi, 1)}°) / cos({fr(ep.delta_deg, 2)}°))]²)</>}
                  result={<><V n="K" s="a" /> = {fr(ep.Ka_coulomb, 4)}</>}
                  note={<>δ = r·φ du remblai, avec r = {fr(result.coulombRatio, 3)}, sans plafond par le frottement de base (MUR-04, D10) : δ = {fr(result.coulombRatio, 3)} × {fr(soil.phi, 1)}° = {fr(ep.delta_deg, 2)}°.</>}
                />
              </div>

              {/* K0 Jaky */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h3 className="text-xs font-black uppercase text-amber-900">Poussée au repos — Jaky</h3>
                <Eq
                  general={<><V n="K" s="0" /> = 1 − sin <V n="φ" /></>}
                  substituted={<>1 − sin({fr(soil.phi, 1)}°)</>}
                  result={<><V n="K" s="0" /> = {fr(ep.K0_jaky, 4)}</>}
                />
                <p className="text-[11px] text-slate-600">Mur de sous-sol (haut retenu) ou méthode « au repos » choisie.</p>
              </div>

              {/* Kp */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h3 className="text-xs font-black uppercase text-emerald-900">Butée passive — Rankine (sol de fondation)</h3>
                <Eq
                  general={<><V n="K" s="p" /> = tan²(45° + <V n="φ" />/2) = <Frac n={<>1 + sin <V n="φ" /></>} d={<>1 − sin <V n="φ" /></>} /></>}
                  substituted={<>tan²(45° + {fr(result.foundationSoil.phi, 1)}°/2)</>}
                  result={<><V n="K" s="p" /> = {fr(ep.Kp_rankine, 4)} (Rankine) ; {fr(ep.Kp_coulomb, 4)} (Coulomb, δ = {fr(ep.delta_p_deg, 2)}°)</>}
                  note={<>Kp utilise le φ du sol de fondation ({fr(result.foundationSoil.phi, 1)}°). Aucune réduction de Kp : seul φ<sub>p</sub> = {fr(result.geotech.phi_p, 2)} (tableau 6.2) réduit la butée.</>}
                />
              </div>
            </div>

            {/* Coefficients retenus */}
            <div className="mt-6">
              <Eq
                general={<>Coefficient actif retenu : <V n="K" s="a,ret" /> ; coefficient passif retenu : <V n="K" s="p,ret" /></>}
                substituted={<>{geo.wallType === 'basement' || result.soilMethodConfig.activeMethod === 'at_rest' ? 'mur de sous-sol ou méthode « au repos » : K₀' : result.soilMethodConfig.activeMethod === 'coulomb' ? 'méthode Coulomb : Ka (Coulomb)' : 'méthode Rankine : Ka (Rankine)'} ; passif : {result.soilMethodConfig.passiveMethod === 'neglected' ? 'butée négligée (Kp = 0)' : result.soilMethodConfig.passiveMethod === 'coulomb' ? 'Kp (Coulomb)' : 'Kp (Rankine)'}</>}
                result={<><V n="K" s="a,ret" /> = {fr(ep.K_active_used, 4)} ; <V n="K" s="p,ret" /> = {fr(ep.K_passive_used, 4)}</>}
              />
            </div>

            {/* Résultantes */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Eq
                general={<><V n="P" s="a" /> = ½ · <V n="K" s="a,ret" /> · <V n="γ" /> · <V n="H" s="p" />² (nominale, sol seul ; H_p = hr + ts)</>}
                substituted={<>0,5 · {fr(ep.K_active_used, 4)} · {fr(soil.gamma, 1)} · {fr(result.soilHeight.Hp)}²</>}
                result={<><V n="P" s="a" /> = {fr(ep.P_active_nominal, 1)} kN/m, à {fr(ep.y_Pa, 2)} m de la sous-face (H_p/3)</>}
                note="La surcharge, l'eau et le séisme sont des composantes séparées (voir la note de calcul). Avec nappe, l'eau et le déjaugeage sont traités par le moteur à part."
              />
              <Eq
                general={<><V n="P" s="p" prime /> = ∫<sub>z₀</sub><sup>h_pass</sup> <V n="K" s="p" /> · <V n="σ" s="v" prime /> d<V n="z" /> avec <V n="σ" s="v" prime /> = <V n="γ" /> <V n="z" /> (sec) puis <V n="γ" prime /> au-dessous de la nappe</>}
                substituted={result.hydro.hasWater
                  ? <>intégration par couches : K<sub>p</sub> = {fr(ep.K_passive_used, 4)} ; γ = {fr(result.foundationSoil.gamma, 1)} kN/m³ ; z₀ = {fr(ep.z_passive_top, 2)} m ; h_pass = {fr(ep.h_pass, 2)} m</>
                  : <>0,5 · {fr(ep.K_passive_used, 4)} · {fr(result.foundationSoil.gamma, 1)} · ({fr(ep.h_pass, 2)}² − {fr(ep.z_passive_top, 2)}²)</>}
                result={<><V n="P" s="p" prime /> = {fr(ep.P_passive_nominal, 1)} kN/m, à {fr(ep.y_Pp, 3)} m de la sous-face</>}
                note={<>z₀ = df ({fr(result.frost.df, 2)} m) si la case gel est cochée{result.frost.df_missing ? ` ; df non saisie : traitement « ${result.frost.no_df_treatment === 'zero' ? 'butée nulle' : result.frost.no_df_treatment === 'not_verifiable' ? 'non vérifiable' : 'butée pleine avec avis'} » (MUR-02 §11)` : ''}. La zone gelée reste comptée comme surcharge sur la zone de butée.</>}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SÉISME (CFEM 5e éd., § 18.7) */}
      {activeSection === 'seisme' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-black text-sm">2</div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Paramètres sismiques et poussée dynamique</h2>
                  <p className="text-xs text-slate-500">
                    Méthode retenue par le moteur : <strong>{result.seismic.method === 'wood' ? 'Wood (mur retenu)' : result.seismic.method === 'mononobe_okabe' ? 'Mononobe-Okabe (mur libre)' : result.seismic.method === 'seed_whitman' ? 'Seed & Whitman (hors fiche MUR-02)' : 'aucune (statique)'}</strong>
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded border ${
                soil.methodConfig?.seismicMethod === 'none' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {soil.methodConfig?.seismicMethod === 'none' ? 'Option : aucun séisme (statique)' : 'CFEM 5e éd., § 18.7'}
              </span>
            </div>

            {soil.methodConfig?.seismicMethod === 'none' && (
              <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 mb-6 text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900 block font-black">Mode statique pur sélectionné.</strong>
                Le calcul sismique est désactivé (kh = 0, ΔPAE = 0). Seules les combinaisons de charges statiques CNB {result.cnbEdition} sont évaluées.
              </div>
            )}

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 mb-6 text-xs text-slate-700 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-amber-900 mb-1"><Info size={16} /><span>Accélération de calcul (MUR-02 §4.1, décision D6)</span></div>
              <Eq
                general={<><V n="k" s="h" /> = <V n="a" s="h" />/<V n="g" /> (CFEM 5e éd., éq. 18.22) ; <V n="k" s="v" /> = ⅔ · <V n="k" s="h" /> à défaut d'étude du site (CFEM 5e éd., p. 629), deux signes étudiés</>}
                substituted={<><V n="k" s="h" /> = {fr(result.seismic.ah, 3)}{result.seismic.csaS6 ? ' × 0,5 (option CSA S6, remblais routiers : kv = 0)' : ''} ; |<V n="k" s="v" />| = {fr(result.seismic.kvInput, 3)}{result.seismic.kvNeglected ? ' (négligé par choix de l’utilisateur : kv = 0, un seul scénario)' : result.seismic.kvIsDefault ? ' (= ⅔ · kh, défaut)' : ' (saisi)'}</>}
                result={<><V n="k" s="h" /> = {fr(result.seismic.kh, 3)} ; |<V n="k" s="v" />| = {fr(result.seismic.kvInput, 3)}</>}
                note={result.seismic.rigid ? 'Mur rigide ou retenu : kh = ah ; l\'option CSA S6 ne s\'y applique pas.' : 'L\'option kh = 0,5·ah (CSA S6) est désactivée par défaut ; elle vise les murs de remblais routiers pouvant se déplacer de 25 à 50 mm.'}
              />
            </div>

            {result.seismic.scenarios.length > 0 && (
              <div className="space-y-4">
                {result.seismic.scenarios.map((sc, i) => {
                  const dp = buildDeltaPaeEq(result, soil, geo, i);
                  return (
                    <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <h3 className="text-xs font-black uppercase text-slate-900">
                        Scénario {result.seismic.scenarios.length > 1 ? (sc.sign > 0 ? 'kv vers le haut (↑)' : 'kv vers le bas (↓)') : 'sans séisme vertical'}
                      </h3>
                      {result.seismic.method === 'mononobe_okabe' && (
                        <>
                          <Eq
                            general={<><V n="ψ" /> = atan[ <Frac n={<V n="k" s="h" />} d={<>1 − <V n="k" s="v" /></>} /> ]</>}
                            substituted={<>atan[ {fr(result.seismic.kh, 3)} / (1 − {fr(sc.kv, 3)}) ]</>}
                            result={<><V n="ψ" /> = {fr(sc.psi_deg, 2)}° ({fr(sc.psi_rad, 4)} rad)</>}
                          />
                          <Eq
                            general={<><V n="K" s="AE" /> = <Frac n={<>cos²(<V n="φ" /> − <V n="ψ" />)</>} d={<>cos <V n="ψ" /> · cos(<V n="δ" /> + <V n="ψ" />) · [1 + <Sqrt><Frac n={<>sin(<V n="φ" />+<V n="δ" />) · sin(<V n="φ" /> − <V n="ψ" />)</>} d={<>cos(<V n="δ" />+<V n="ψ" />)</>} /></Sqrt>]²</>} /></>}
                            substituted={<>φ = {fr(soil.phi, 1)}° ; δ = {fr(soil.methodConfig?.activeMethod === 'coulomb' ? ep.delta_deg : 0, 2)}° ; ψ = {fr(sc.psi_deg, 2)}°</>}
                            result={sc.indeterminate ? <>K<sub>AE</sub> indéterminé (φ − β &lt; ψ) : calcul sismique arrêté, NON VÉRIFIABLE</> : <><V n="K" s="AE" /> = {fr(sc.Kae, 4)}</>}
                            note="δ = 0 sur le plan fictif (remblai horizontal, D11) sauf méthode Coulomb ; même δ pour K_A et K_AE."
                          />
                        </>
                      )}
                      {sc.indeterminate && result.seismic.method === 'mononobe_okabe' && (
                        <div role="alert" className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                          Non vérifiable : K<sub>AE</sub> indéterminé (φ − β &lt; ψ). La poussée dynamique ΔP<sub>AE</sub> n'est pas calculée ; équilibre limite requis (CFEM 5e éd., 18.7.4).
                        </div>
                      )}
                      {dp && !sc.indeterminate && (
                        <Eq
                          general={result.seismic.method === 'mononobe_okabe'
                            ? <>Δ<V n="P" s="AE" /> = ½ · <V n="γ" /> · <V n="H" />² · [(1 − <V n="k" s="v" />) · <V n="K" s="AE" /> − <V n="K" s="A" />] ≥ 0 (<V n="P" s="AE" /> = <V n="P" s="A" /> + Δ<V n="P" s="AE" />, éq. 18.20-18.23), appliquée à 0,6<V n="H" /></>
                            : result.seismic.method === 'wood'
                            ? <>Δ<V n="P" s="0E" /> = <V n="k" s="h" /> · <V n="γ" /> · <V n="H" />² (Wood, CFEM 5e éd., éq. 18.39), appliquée à 0,58<V n="H" /></>
                            : <>Δ<V n="P" s="AE" /> = 0,375 · <V n="k" s="h" /> · <V n="γ" /> · <V n="H" />² (Seed &amp; Whitman, hors fiche MUR-02), appliquée à 0,6<V n="H" /></>}
                          substituted={<Tx>{dp.substituted}</Tx>}
                          result={<Tx>{dp.result}</Tx>}
                          note={result.seismic.method === 'seed_whitman' ? 'Hors fiche MUR-02 : méthode simplifiée, sans (1 − kv) ni contrôle d\'indétermination.' : undefined}
                        />
                      )}
                      {result.seismic.westergaard && (
                        <Eq
                          general={<><V n="P" s="w,dyn" /> = <Frac n="7" d="12" /> · <V n="k" s="h" /> · <V n="γ" s="w" /> · <V n="h" s="w,av" />² (Westergaard, éq. 18.33)</>}
                          substituted={<>(7/12) · {fr(result.seismic.kh, 3)} · {fr(soil.gamma_w ?? 9.81, 2)} · {fr(ep.hw_av, 2)}²</>}
                          result={<><V n="P" s="w,dyn" /> = {fr(sc.Pw_dyn, 2)} kN/m</>}
                        />
                      )}
                      {result.seismic.passiveMode === 'kpe' && (
                        <Eq
                          general={<><V n="P" s="PE" /> = <V n="P" s="P" /> × min[ <V n="K" s="PE" /> · (1 − <V n="k" s="v" />) / <V n="K" s="p" /> ; 1 ] (butée sismique réduite, éq. 18.27-18.31)</>}
                          substituted={<>{fr(sc.Kpe, 4)} · (1 − {fr(sc.kv, 3)}) / {fr(ep.K_passive_used, 4)}</>}
                          result={<><V n="P" s="PE" />/<V n="P" s="P" /> = {fr(sc.Pp_factor, 3)}</>}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Forces d'inertie de structure */}
            {result.seismic.method !== 'none' && (
              <div className="mt-6 p-4 bg-rose-50/50 rounded-xl border border-rose-200 space-y-2">
                <h3 className="text-xs font-black uppercase text-rose-950">Forces d'inertie de la structure (béton armé)</h3>
                <p className="text-xs text-slate-600">Sous l'action E, les masses du voile et de la semelle développent une force horizontale <V n="k" s="h" /> · <V n="W" /> appliquée à leur centre de gravité (poids W multiplié par 1 ∓ kv pour la composante verticale).</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Eq general={<><V n="E" s="voile" /> = <V n="γ" s="c" /> · <V n="h" s="mur" /> · <V n="t" s="v" /> · <V n="k" s="h" /></>} substituted={inertia.stem.split(' = ')[0]} result={inertia.stem.split(' = ')[1]} />
                  <Eq general={<><V n="E" s="semelle" /> = <V n="γ" s="c" /> · <V n="B" /> · <V n="h" s="s" /> · <V n="k" s="h" /></>} substituted={inertia.base.split(' = ')[0]} result={inertia.base.split(' = ')[1]} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: STABILITÉ GÉOTECHNIQUE (MUR-02 §1 à §2 ; CFEM 5e éd., tableau 6.2) */}
      {activeSection === 'stabilite' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm">3</div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Formules de vérification de la stabilité externe</h2>
                  <p className="text-xs text-slate-500">Glissement, renversement et portance (MUR-02 §1 à §2 ; CFEM 5e éd., tableau 6.2 et fig. 20.10). Combinaison gouvernante du moteur pour chaque vérification.</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-800 px-2.5 py-1 rounded border border-blue-200">CFEM 5e éd., tableau 6.2</span>
            </div>

            {/* A. Glissement */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5"><ArrowRightLeft size={16} /><span>A. Glissement à la base</span></h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${nv || ulsSliding.status_sliding === 'NON VÉRIFIABLE' ? 'bg-amber-100 text-amber-800' : ulsSliding.FOS_sliding >= 1.0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {nv ? 'Rapport min : non vérifiable (résultats NON VÉRIFIABLES)' : ulsSliding.status_sliding === 'NON VÉRIFIABLE' ? 'Rapport min : non vérifiable (df non saisie)' : <>Rapport min = {fr(ulsSliding.FOS_sliding)} ({ulsSliding.status_sliding})</>}
                </span>
              </div>
              <Eq
                general={<><V n="Ψ" /> · [ <V n="φ" s="gs" /> · Σ<V n="V" prime /> · tan <V n="δ" s="b" /> + <V n="φ" s="p" /> · (<V n="P" s="p" prime /> + <V n="P" s="w,a" />) ] ≥ Σ<V n="H" s="f" /> (long terme, c′<sub>a</sub> = 0) ; court terme (assise CL) : <V n="Ψ" /> · <V n="φ" s="coh" /> · <V n="c" s="a" /> · <V n="B" prime /> ≥ Σ<V n="H" s="f" /></>}
                substituted={<>{slidingEq.substituted} ≥ {fr(slidingEq.sumHf, 1)}</>}
                result={<Tx>{slidingEq.result}</Tx>}
                note={<>Σ<i>V</i>′ : force verticale effective (sous-pression déduite), {loads.countStabilizingVariable === false ? 'variables stabilisantes à 0 (option MUR-06 décochée ; Commentaire A du CNB 2020, ¶40 : « Pour les combinaisons de charges 2 à 5 dans le tableau 4.1.3.2.-A du CNB […], les charges variables contraires sont donc considérées être égales à zéro »)' : 'poids des charges variables L, S, W compté avec le facteur de la combinaison (MUR-06 ; choix de l’utilisateur, séisme E inchangé ; s’écarte du Commentaire A du CNB 2020, ¶40 : « Pour les combinaisons de charges 2 à 5 dans le tableau 4.1.3.2.-A du CNB […], les charges variables contraires sont donc considérées être égales à zéro »)'}. <i>B</i>′ = <i>B</i> − 2<i>e</i> (largeur comprimée) pour le terme d'adhérence à court terme : À CONFIRMER (D13). Σ<i>H</i><sub>f</sub> inclut l'inertie, la poussée dynamique et, au séisme, Westergaard. tan δ<sub>b</sub> = {fr(result.bearingSoil.tanDeltaB, 4)} (δ<sub>b</sub> = {result.bearingSoil.deltaB !== undefined ? fr(result.bearingSoil.deltaB, 2) : 'non défini'}° ; {result.bearingSoil.deltaBSource}). Condition retenue : {slidingEq.condition === 'undrained' ? 'court terme (non drainée)' : 'long terme (drainée)'}. Combinaison : {ulsSliding.combName} ({ulsSliding.formula}).</>}
              />
            </div>

            {/* B. Renversement */}
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5"><Scale size={16} /><span>B. Renversement autour de l'orteil</span></h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${nv || ulsOverturning.outside_base || ulsOverturning.status_overturning === 'NON VÉRIFIABLE' ? 'bg-amber-100 text-amber-800' : ulsOverturning.FOS_overturning >= 1.0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {nv ? 'Rapport min : non vérifiable (résultats NON VÉRIFIABLES)' : ulsOverturning.outside_base ? 'Rapport min : non vérifiable (hors base)' : ulsOverturning.status_overturning === 'NON VÉRIFIABLE' ? 'Rapport min : non vérifiable (df non saisie)' : <>Rapport min = {fr(ulsOverturning.FOS_overturning)} ({ulsOverturning.status_overturning})</>}
                </span>
              </div>
              <Eq
                general={<><V n="Ψ" /> · <V n="φ" s="ov" /> · Σ<V n="M" s="stab" /> ≥ Σ<V n="M" s="renv" />, Σ<V n="M" s="stab" /> = Σ<V n="M" s="rés" /> (poids et charges stabilisantes) + <V n="M" s="butée" /> (butée et eau à l'avant)</>}
                substituted={<Tx>{overturningEq.substituted}</Tx>}
                result={ulsOverturning.outside_base ? <>Non vérifiable : résultante hors base</> : <Tx>{overturningEq.result}</Tx>}
                note={<>Facteurs de D : 0,9D aux cas 2 à 4 (stabilisant), 1,0D au cas 5, et D<sub>unfav</sub> pour les actions D défavorables (CNB 4.1.3.2.(5)) ; {loads.countStabilizingVariable === false ? 'variables stabilisantes à 0 (option MUR-06 décochée ; Commentaire A du CNB 2020, ¶40 : « Pour les combinaisons de charges 2 à 5 dans le tableau 4.1.3.2.-A du CNB […], les charges variables contraires sont donc considérées être égales à zéro »)' : 'poids des charges variables L, S, W compté avec le facteur de la combinaison (MUR-06, choix de l’utilisateur ; s’écarte du Commentaire A du CNB 2020, ¶40 : « Pour les combinaisons de charges 2 à 5 dans le tableau 4.1.3.2.-A du CNB […], les charges variables contraires sont donc considérées être égales à zéro »)'}. La butée fait partie de Σ<i>M</i><sub>stab</sub> (MUR-02 §2.3, E08 ; forme d'application À CONFIRMER). Combinaison : {ulsOverturning.combName} ({ulsOverturning.formula}).</>}
              />
            </div>

            {/* C. Portance */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5"><Layers size={16} /><span>C. Capacité portante et répartition des pressions</span></h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${nv || ulsBearing.outside_base ? 'bg-amber-100 text-amber-800' : ulsBearing.status_bearing === 'OK' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {nv ? <><i>q</i>/<i>q</i><sub>cap</sub> : non vérifiable (résultats NON VÉRIFIABLES)</> : ulsBearing.outside_base ? <><i>q</i>/<i>q</i><sub>cap</sub> : non vérifiable (hors base)</> : <><i>q</i>/<i>q</i><sub>cap</sub> = {fr(ulsBearing.q_capacity > 0 ? ulsBearing.q_design / ulsBearing.q_capacity : Infinity)} ({ulsBearing.status_bearing})</>}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Critère retenu : <strong>{result.stabilityCriterion === 'eccentricity' ? 'largeur réduite B′ (Meyerhof, CFEM 5e éd., éq. 10.12)' : 'moments, pression linéaire (Paultre ch. 17)'}</strong>. Combinaison gouvernante : {ulsBearing.combName}.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Eq general={<><V n="R" s="v" /> = Σ<V n="V" /></>} result={<><V n="R" s="v" /> = {fr(bearingEq.Rv, 1)} kN/m</>} />
                <Eq general={<><V n="x" s="1" /> = <Frac n={<>Σ<V n="M" s="stab" /> − Σ<V n="M" s="renv" /></>} d={<V n="R" s="v" />} /> (butée exclue)</>} result={<><V n="x" s="1" /> = {fr(bearingEq.x1, 3)} m</>} />
                <Eq general={<><V n="e" /> = |<V n="B" />/2 − <V n="x" s="1" />| ; <V n="B" />/6</>} substituted={<>|{fr(baseWidth / 2, 3)} − {fr(bearingEq.x1, 3)}|</>} result={<><V n="e" /> = {fr(bearingEq.e, 3)} m ; <V n="B" />/6 = {fr(baseWidth / 6, 3)} m {bearingEq.e <= baseWidth / 6 + 1e-9 ? '(e ≤ B/6)' : '(e > B/6)'}</>} />
              </div>
              <Eq
                general={
                  bearingEq.kind === 'outside' ? <>Résultante hors de la base : aucune pression n'est définie</>
                  : bearingEq.kind === 'uniform_Beff' ? <><V n="q" /> = <Frac n={<V n="R" s="v" />} d={<V n="B" prime />} />, <V n="B" prime /> = <V n="B" /> − 2<V n="e" /></>
                  : bearingEq.kind === 'cas1' ? <><V n="q" /> = <V n="R" s="v" />/<V n="B" /> (e ≈ 0)</>
                  : bearingEq.kind === 'cas2' ? <><V n="q" s="1,2" /> = <Frac n={<V n="R" s="v" />} d={<V n="B" />} /> · (1 ± <Frac n={<>6<V n="e" /></>} d={<V n="B" />} />) (e ≤ B/6 : trapèze)</>
                  : bearingEq.kind === 'cas3' ? <><V n="q" s="1" /> = 2<V n="R" s="v" />/<V n="B" />, <V n="q" s="2" /> = 0 (e = B/6)</>
                  : <><V n="q" s="1" /> = <Frac n={<>2<V n="R" s="v" /></>} d={<>3<V n="x" s="1" /></>} />, <V n="q" s="2" /> = 0 (e &gt; B/6 : triangle, décollement)</>
                }
                substituted={ulsBearing.outside_base ? undefined : <Tx>{bearingEq.substituted}</Tx>}
                result={ulsBearing.outside_base ? <>Non vérifiable : résultante hors base</> : <Tx>{bearingEq.result}</Tx>}
                note={<>Les efforts du talon et du patin (armature) utilisent toujours la pression linéaire (MUR-02 §5), quel que soit le critère.{ulsBearing.outside_base ? '' : <> Valeurs : {fr(ulsBearing.q_linear_max, 1)} kPa (pression linéaire, maximum) et {fr(ulsBearing.q_Beff, 1)} kPa (<i>R</i><sub>v</sub>/<i>B</i>′).</>}</>}
              />
              <Eq
                general={<><V n="q" /> ≤ <V n="Ψ" /> · <V n="φ" s="gu" /> · <V n="q" s="u" /> (ÉLU) ; <V n="q" /> ≤ <V n="q" s="adm,ÉLS" /> (ÉLS)</>}
                substituted={ulsBearing.outside_base ? undefined : <>{fr(ulsBearing.q_design, 1)} ≤ {fr(result.geotech.psi)} · {fr(result.geotech.phi_gu)} · {fr(soil.qUltimate_ULS, 1)}</>}
                result={ulsBearing.outside_base
                  ? <>Non vérifiable : résultante hors base</>
                  : <>{fr(ulsBearing.q_design, 1)} kPa {ulsBearing.q_design <= ulsBearing.q_capacity ? '≤' : '>'} {fr(ulsBearing.q_capacity, 1)} kPa (ÉLU) ; <V n="q" s="adm,ÉLS" /> = {fr(soil.qAllowable_SLS, 1)} kPa</>}
                note={result.geotech.quFactored ? 'qu saisie déjà pondérée (φgu = 1,0).' : 'qu non pondérée : φgu du tableau 6.2.'}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: CONCEPTION BÉTON (CSA A23.3-19 ; méthode d'Omar Chaallal) — valeurs du moteur, face intérieure du voile */}
      {activeSection === 'conception_omar' && conc && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm">4</div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Conception du béton armé — méthode d'Omar Chaallal</h2>
                  <p className="text-xs text-slate-500">CSA A23.3-19 et chapitres 4, 5, 7 et 12 du livre d'Omar Chaallal ; exemple détaillé : {cd.mur_interieur.elementName}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded border border-indigo-200">Omar Chaallal Ch. 4 &amp; 5</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-slate-800">Procédure pas à pas : flexion du voile</span>
                <span className="text-[10px] font-mono text-slate-500">Tableaux 4.5 et 4.6 (Omar Chaallal)</span>
              </div>
              <div className="p-4 sm:p-5 space-y-4 text-xs">
                <div>
                  <div className="font-bold text-slate-900 mb-1">1. Hauteur utile <i>d</i></div>
                  <Eq
                    general={<><V n="d" /> = <V n="h" /> − enrobage − <V n="d" s="b" />/2</>}
                    substituted={<>{fr(cd.mur_interieur.section_h, 0)} − {fr(conc.cover_h, 0)} − {fr(cd.mur_interieur.db, 1)}/2</>}
                    result={<><V n="d" /> = {fr(cd.mur_interieur.d, 1)} mm</>}
                  />
                </div>

                <div>
                  <div className="font-bold text-slate-900 mb-1">2. Armature minimale <i>A</i><sub>s,min</sub></div>
                  <Eq
                    general={<><V n="A" s="s,min" /> = max(0,0015 <V n="A" s="g" /> ; 0,2 √<V n="f" prime s="c" /> / <V n="f" s="y" /> · <V n="b" /> · <V n="h" />) (14.1.8.5 ; 10.5.1.2 b), sauf dispense 10.5.1.3)</>}
                    substituted={<>0,0015 · {fr(1000 * cd.mur_interieur.section_h, 0)} = {fr(0.0015 * 1000 * cd.mur_interieur.section_h, 0)} ; 10.5.1.2 b) : {fr(cd.mur_interieur.As_min_flexure, 0)}{cd.mur_interieur.flexure_min_waived ? ' (dispensée)' : ''}</>}
                    result={<><V n="A" s="s,min" /> = {fr(cd.mur_interieur.As_min, 0)} mm²/m ; fourni : {cd.mur_interieur.bar_designation} → {fr(cd.mur_interieur.As_provided, 0)} {cd.mur_interieur.As_ok ? '≥' : '<'} {fr(cd.mur_interieur.As_min, 0)} ({st(cd.mur_interieur.As_ok)})</>}
                    note={cd.mur_interieur.As_min_basis}
                  />
                </div>

                <div>
                  <div className="font-bold text-slate-900 mb-1">3. Facteurs du bloc rectangulaire <i>α</i><sub>1</sub> et <i>β</i><sub>1</sub> (10.1.7)</div>
                  <Eq
                    general={<><V n="α" s="1" /> = max(0,85 − 0,0015 <V n="f" prime s="c" /> ; 0,67) ; <V n="β" s="1" /> = max(0,97 − 0,0025 <V n="f" prime s="c" /> ; 0,67)</>}
                    substituted={<>0,85 − 0,0015 · {fr(conc.fc_mur, 0)} ; 0,97 − 0,0025 · {fr(conc.fc_mur, 0)}</>}
                    result={<><V n="α" s="1" /> = {fr(cd.mur_interieur.alpha1, 3)} ; <V n="β" s="1" /> = {fr(cd.mur_interieur.beta1, 3)}</>}
                  />
                </div>

                <div>
                  <div className="font-bold text-slate-900 mb-1">4. Bloc comprimé <i>a</i> et axe neutre <i>c</i></div>
                  <Eq
                    general={<><V n="a" /> = <Frac n={<><V n="φ" s="s" /> <V n="A" s="s" /> <V n="f" s="y" /></>} d={<><V n="α" s="1" /> <V n="φ" s="c" /> <V n="f" prime s="c" /> <V n="b" /></>} /> ; <V n="c" /> = <V n="a" />/<V n="β" s="1" /></>}
                    substituted={<>({fr(conc.phi_s)} · {fr(cd.mur_interieur.As_provided, 0)} · {fr(conc.fy, 0)}) / ({fr(cd.mur_interieur.alpha1, 3)} · {fr(conc.phi_c)} · {fr(conc.fc_mur, 0)} · 1000) ; {fr(cd.mur_interieur.a_stress_block, 1)} / {fr(cd.mur_interieur.beta1, 3)}</>}
                    result={<><V n="a" /> = {fr(cd.mur_interieur.a_stress_block, 1)} mm ; <V n="c" /> = {fr(cd.mur_interieur.c_depth, 1)} mm</>}
                  />
                </div>

                <div>
                  <div className="font-bold text-slate-900 mb-1">5. Moment résistant <i>M</i><sub>r</sub></div>
                  <Eq
                    general={<><V n="M" s="r" /> = <V n="φ" s="s" /> <V n="A" s="s" /> <V n="f" s="y" /> (<V n="d" /> − <V n="a" />/2) · 10⁻⁶ ≥ <V n="M" s="f" /></>}
                    substituted={<>{fr(conc.phi_s)} · {fr(cd.mur_interieur.As_provided, 0)} · {fr(conc.fy, 0)} · ({fr(cd.mur_interieur.d, 1)} − {fr(cd.mur_interieur.a_stress_block, 1)}/2) · 10⁻⁶</>}
                    result={<><V n="M" s="r" /> = {fr(cd.mur_interieur.Mr, 1)} kN·m/m {cd.mur_interieur.Mr >= cd.mur_interieur.Mf ? '≥' : '<'} <V n="M" s="f" /> = {fr(cd.mur_interieur.Mf, 1)} kN·m/m</>}
                    note={<>kr = <i>M</i><sub>f</sub>/(<i>b</i>·<i>d</i>²) = {fr(cd.mur_interieur.kr, 2)} MPa.</>}
                  />
                </div>

                <div>
                  <div className="font-bold text-slate-900 mb-1">6. Ductilité (10.5.2)</div>
                  <Eq
                    general={<><V n="c" />/<V n="d" /> ≤ 0,8 · <Frac n="700" d={<>700 + <V n="f" s="y" /></>} /></>}
                    substituted={<>{fr(cd.mur_interieur.c_depth, 1)} / {fr(cd.mur_interieur.d, 1)} ≤ 0,8 · 700 / (700 + {fr(conc.fy, 0)})</>}
                    result={<>{fr(cd.mur_interieur.ductility_c_over_d, 3)} {cd.mur_interieur.ductility_ok ? '≤' : '>'} {fr(cd.mur_interieur.ductility_limit, 3)} ({st(cd.mur_interieur.ductility_ok)})</>}
                  />
                </div>

                <div>
                  <div className="font-bold text-slate-900 mb-1">7. Contrôle de la fissuration (10.6.1)</div>
                  <Eq
                    general={<><V n="z" /> = <V n="f" s="s" /> · ∛(<V n="d" s="c" /> · <V n="A" />) ≤ <V n="z" s="lim" />, <V n="f" s="s" /> = 0,6 <V n="f" s="y" />, <V n="A" /> = 2 <V n="d" s="c" /> <V n="s" /></>}
                    substituted={<>{fr(0.6 * conc.fy, 0)} · ∛({fr(cd.mur_interieur.crack_dc ?? 0, 1)} · {fr(cd.mur_interieur.crack_A ?? 0, 0)})</>}
                    result={<><V n="z" /> = {fr(cd.mur_interieur.Z_factor ?? NaN, 0)} N/mm {cd.mur_interieur.Z_ok ? '≤' : '>'} {fr(cd.mur_interieur.Z_limit ?? NaN, 0)} N/mm ({st(cd.mur_interieur.Z_ok)})</>}
                    note="Enrobage pris au plus 50 mm pour d_c et A."
                  />
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-slate-800">Procédure pas à pas : effort tranchant et cisaillement-friction</span>
                <span className="text-[10px] font-mono text-slate-500">CSA A23.3-19, 11.3 et 11.5</span>
              </div>
              <div className="p-4 sm:p-5 space-y-4 text-xs">
                <div>
                  <div className="font-bold text-slate-900 mb-1">A. Résistance du béton sans armature d'effort tranchant (11.3)</div>
                  <Eq
                    general={<><V n="d" s="v" /> = max(0,9 <V n="d" /> ; 0,72 <V n="h" />) ; <V n="V" s="c" /> = <V n="φ" s="c" /> <V n="λ" /> <V n="β" /> √<V n="f" prime s="c" /> <V n="b" s="w" /> <V n="d" s="v" /> · 10⁻³ ≥ <V n="V" s="f" /></>}
                    substituted={<>{fr(cd.mur_interieur.dv, 1)} ; {fr(conc.phi_c)} · 1,0 · {fr(cd.mur_interieur.beta, 4)} · √{fr(Math.min(conc.fc_mur, 64), 0)} (≤ 8 MPa) · 1000 · {fr(cd.mur_interieur.dv, 1)} · 10⁻³</>}
                    result={<><V n="V" s="c" /> = {fr(cd.mur_interieur.Vc, 1)} kN/m {cd.mur_interieur.shear_ok ? '≥' : '<'} <V n="V" s="f" /> = {fr(cd.mur_interieur.Vf, 1)} kN/m ({st(cd.mur_interieur.shear_ok)})</>}
                    note={<>β : {cd.mur_interieur.beta_rule}. <i>V</i><sub>r,max</sub> = 0,25 <i>φ</i><sub>c</sub> <i>f</i>′<sub>c</sub> <i>b</i><sub>w</sub> <i>d</i><sub>v</sub> = {fr(cd.mur_interieur.Vr_max, 0)} kN/m (11.3.3). Définition de <i>d</i><sub>v</sub> : À CONFIRMER.</>}
                  />
                </div>

                <div>
                  <div className="font-bold text-slate-900 mb-1">B. Cisaillement-friction à l'interface voile / semelle (11.5)</div>
                  <Eq
                    general={<><V n="v" s="r" /> = min[ <V n="λ" /> <V n="φ" s="c" /> (<V n="c" /> + <V n="μ" /> <V n="σ" />) ; 0,25 <V n="φ" s="c" /> <V n="f" prime s="c" /> ] + <V n="φ" s="s" /> <V n="ρ" s="v" /> <V n="f" s="y" /> cos <V n="α" s="f" /> ; <V n="V" s="r" /> = <V n="v" s="r" /> <V n="A" s="cv" /></>}
                    substituted={<>c = {fr(cd.cisaillement_friction.c)} MPa ; μ = {fr(cd.cisaillement_friction.mu)} ; σ = {fr(cd.cisaillement_friction.sigma, 3)} MPa ; limite 0,25 φc f′c = {fr(cd.cisaillement_friction.vr_cap, 2)} MPa{cd.cisaillement_friction.capped ? ' (atteinte)' : ''} ; ρv = {fr(cd.cisaillement_friction.rho_v, 5)} ; αf = 90° (cos αf = 0)</>}
                    result={<><V n="V" s="r" /> = {fr(cd.cisaillement_friction.Vr, 1)} kN/m {cd.cisaillement_friction.status_ok ? '≥' : '<'} <V n="V" s="f" /> = {fr(cd.cisaillement_friction.Vf, 1)} kN/m ({st(cd.cisaillement_friction.status_ok, 'OK', 'NON')})</>}
                    note={<>{cd.cisaillement_friction.surface}. σ = ρ<sub>v</sub> <i>f</i><sub>y</sub> sin α<sub>f</sub> + N/A<sub>g</sub>, N = {fr(cd.cisaillement_friction.N, 1)} kN/m non pondéré (11.5.4). Cumul avec l'armature de flexion : À CONFIRMER.</>}
                  />
                </div>

                <div>
                  <div className="font-bold text-slate-900 mb-1">C. Armature horizontale du voile (14.1.8.4 à 14.1.8.6 ; MUR-02 M2-A1)</div>
                  <Eq
                    general={<>Σ<V n="A" s="s,hor" /> (A3 + A4) ≥ 0,002 <V n="A" s="g" /> ; espacement ≤ min(3<V n="t" /> ; 500) et <V n="d" s="b" /> ≤ <V n="t" />/10 par nappe</>}
                    substituted={<>{fr(cd.mur_horizontal_ext.As_provided, 0)} + {fr(cd.mur_horizontal_int.As_provided, 0)} ≥ 0,002 · {fr(1000 * cd.mur_interieur.section_h, 0)}</>}
                    result={<>Σ = {fr(cd.mur_horizontal.As_provided, 0)} {cd.mur_horizontal.As_ok ? '≥' : '<'} {fr(cd.mur_horizontal.As_min, 0)} mm²/m ({st(cd.mur_horizontal.As_ok)})</>}
                    note="14.1.8.6 : aire totale ; répartition entre faces non prescrite par la norme."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: ANCRAGE & CROCHETS */}
      {activeSection === 'ancrage' && conc && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm">5</div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Longueurs d'ancrage et crochets standard</h2>
                  <p className="text-xs text-slate-500">Développement des armatures de flexion et goujons de reprise (CSA A23.3-19, 12.2 et 12.5)</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded border border-emerald-200">Omar Chaallal Ch. 7</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900">1. Barre droite en traction (<i>l</i><sub>d</sub>)</h3>
                <Eq
                  general={<><V n="l" s="d" /> = max[ coef. · <V n="k" s="1" /> <V n="k" s="2" /> <V n="k" s="3" /> <V n="k" s="4" /> · <Frac n={<V n="f" s="y" />} d={<>√<V n="f" prime s="c" /></>} /> · <V n="d" s="b" /> ; 300 mm ] (12.2)</>}
                  substituted={<>{fr(cd.mur_interieur.ld_coeff ?? NaN, 2)} · {fr(cd.mur_interieur.ld_k1 ?? NaN, 1)} · 1,0 · 1,0 · {fr(cd.mur_interieur.ld_k4 ?? NaN, 1)} · ({fr(conc.fy, 0)} / √{fr(conc.fc_mur, 0)}) · {fr(cd.mur_interieur.db, 1)}</>}
                  result={<><V n="l" s="d" /> = {fr(cd.mur_interieur.ld, 0)} mm ({cd.mur_interieur.bar_designation})</>}
                  note={<>k₁ = 1,3 pour les barres supérieures avec plus de 300 mm de béton frais dessous (talon : {cd.semelle_talon.ld_k1}) ; k₄ = 0,8 jusqu'à 20M, 1,0 dès 25M. Tableau 12.1 : {cd.mur_interieur.ld_eq12_1_required ? 'conditions non remplies, éq. 12.1 requise, À CONFIRMER' : 'conditions remplies'}.</>}
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900">2. Crochet standard à 90° dans la semelle (<i>l</i><sub>dh</sub>)</h3>
                <Eq
                  general={<><V n="l" s="hb" /> = 100 <V n="d" s="b" /> / √<V n="f" prime s="c" /> ; <V n="l" s="dh" /> = max[ <V n="l" s="hb" /> · <V n="f" s="y" />/400 · (0,7 si 12.5.3) ; 8<V n="d" s="b" /> ; 150 mm ]</>}
                  substituted={<>100 · {fr(cd.mur_interieur.db, 1)} / √{fr(conc.fc_mur, 0)} = {fr(cd.mur_interieur.lhb ?? NaN, 1)} ; {fr(cd.mur_interieur.lhb ?? NaN, 1)} · {fr(conc.fy, 0)}/400</>}
                  result={<><V n="l" s="dh" /> = {fr(cd.mur_interieur.ldh_required ?? NaN, 1)} mm {cd.mur_interieur.anchorage_ok ? '≤' : '>'} {fr(cd.mur_interieur.ldh_available ?? NaN, 0)} mm disponibles ({st(cd.mur_interieur.anchorage_ok, 'ANCRAGE VALIDE', 'NON SUFFISANT')})</>}
                  note={<>{cd.mur_interieur.ldh_factors}. Épaisseur de la semelle <i>h</i><sub>s</sub> = {fr(geo.epBase * 1000, 0)} mm.</>}
                />
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

      {/* SECTION 6: FLÈCHE DU VOILE (ÉLS), combinaison qui gouverne — MUR-05 */}
      {activeSection === 'fleche' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-700 flex items-center justify-center font-black text-sm">6</div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Flèche du voile (ÉLS)</h2>
                  <p className="text-xs text-slate-500">CSA A23.3 9.8.2.2 à 9.8.2.5 ; Chaallal (2012) §3.4.2, p. 33 à 36 ; détail de la combinaison qui gouverne</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-pink-50 text-pink-800 px-2.5 py-1 rounded border border-pink-200">MUR-05</span>
            </div>
            <DeflectionGoverningSteps sd={result.stemDeflection} />
            <div className="mt-4"><DeflectionMentions sd={result.stemDeflection} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
