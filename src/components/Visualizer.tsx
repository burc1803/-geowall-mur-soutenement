import React, { useState, useEffect } from 'react';
import { AnalysisResult, WallGeometry, SoilProperties, LoadsConfig, LoadCaseType, VisualizerDisplayOptions, ConcreteProperties } from '../lib/types';
import { DEFAULT_CONCRETE_PROPS } from '../lib/analysis';
import { Droplet, ArrowDown, Layers, CheckSquare, Square, Eye, Sparkles, SlidersHorizontal, Plus, Info, RotateCw } from 'lucide-react';

export type PressureFilter = 'all' | 'soil' | 'surcharge' | 'seismic' | 'water' | 'passive' | 'bearing';

interface VisualizerProps {
  geo: WallGeometry;
  soil: SoilProperties;
  loads: LoadsConfig;
  result: AnalysisResult;
  mode?: 'geom' | 'pressures' | 'dcl';
  onUpdateSoil?: (soil: SoilProperties) => void;
  onUpdateLoads?: (loads: LoadsConfig) => void;
  onUpdateGeo?: (geo: WallGeometry) => void;
  conc?: ConcreteProperties; // béton saisi (défaut : DEFAULT_CONCRETE_PROPS)
}

export function Visualizer({ 
  geo, 
  soil, 
  loads, 
  result, 
  mode = 'geom',
  onUpdateSoil,
  onUpdateLoads,
  conc = DEFAULT_CONCRETE_PROPS,
}: VisualizerProps) {
  // Display Options matching the user's uploaded images
  const [options, setOptions] = useState<VisualizerDisplayOptions>({
    lateralPressures: mode === 'pressures',
    loadsAndSupports: mode === 'dcl' || true,
    dimensions: true,
    soilParameters: true,
    resultants: true,
    waterTable: !!soil.hasWaterTable
  });

  const [selectedPressure, setSelectedPressure] = useState<PressureFilter>('all');
  const [showQuickSettings, setShowQuickSettings] = useState(false);

  const toggleOption = (key: keyof VisualizerDisplayOptions) => {
    setOptions(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // If toggling waterTable, also sync with soil if updater is available
      if (key === 'waterTable' && onUpdateSoil) {
        onUpdateSoil({
          ...soil,
          hasWaterTable: next.waterTable,
          waterTableHeight: soil.waterTableHeight ?? (geo.hMur * 0.6)
        });
      }
      return next;
    });
  };

  // Quick Preset Actions
  const applyPreset = (preset: 'all' | 'photo1' | 'dimensions' | 'loads' | 'resultants' | 'pressures') => {
    if (preset === 'all') {
      setOptions({
        lateralPressures: true,
        loadsAndSupports: true,
        dimensions: true,
        soilParameters: true,
        resultants: true,
        waterTable: true
      });
      if (onUpdateSoil && !soil.hasWaterTable) {
        onUpdateSoil({ ...soil, hasWaterTable: true, waterTableHeight: soil.waterTableHeight ?? 2.5 });
      }
    } else if (preset === 'photo1') {
      // Exactly matches the user's reference photo 1
      setOptions({
        lateralPressures: false,
        loadsAndSupports: true,
        dimensions: true,
        soilParameters: true,
        resultants: true,
        waterTable: true
      });
      if (onUpdateSoil && !soil.hasWaterTable) {
        onUpdateSoil({ ...soil, hasWaterTable: true, waterTableHeight: soil.waterTableHeight ?? 2.5 });
      }
      if (onUpdateLoads && (!loads.pointLoadTop || !loads.pointLoadTop.enabled)) {
        onUpdateLoads({
          ...loads,
          pointLoadTop: { enabled: true, Fy: 12, name: 'Charge Tête' }
        });
      }
    } else if (preset === 'dimensions') {
      setOptions({
        lateralPressures: false,
        loadsAndSupports: false,
        dimensions: true,
        soilParameters: false,
        resultants: false,
        waterTable: false
      });
    } else if (preset === 'loads') {
      setOptions({
        lateralPressures: false,
        loadsAndSupports: true,
        dimensions: false,
        soilParameters: false,
        resultants: false,
        waterTable: false
      });
    } else if (preset === 'resultants') {
      setOptions({
        lateralPressures: false,
        loadsAndSupports: false,
        dimensions: false,
        soilParameters: false,
        resultants: true,
        waterTable: false
      });
    } else if (preset === 'pressures') {
      setOptions({
        lateralPressures: true,
        loadsAndSupports: false,
        dimensions: false,
        soilParameters: false,
        resultants: true,
        waterTable: false
      });
    }
  };

  // SVG viewBox config
  const scale = 52; // pixels per meter
  const padLeft = 140;
  const padRight = 140;
  const padTop = 90;
  const padBottom = 110;

  const totalH = geo.hMur + geo.epBase;
  const baseW = result.baseWidth;

  const canvasWidthMeters = Math.max(baseW + 4.5, 7.5);
  const canvasHeightMeters = Math.max(totalH + 1.8, 6.5);

  const w = canvasWidthMeters * scale + padLeft + padRight;
  const h = canvasHeightMeters * scale + padTop + padBottom;

  // Origin (x=0, y=0) at bottom-left corner of footing (toe point)
  const tx = (x: number) => padLeft + x * scale;
  const ty = (y: number) => h - padBottom - y * scale;
  // Libellé de la nappe aval : au-dessus de la ligne, sauf s'il chevauche l'encadré des paramètres du sol avant ; alors sous la ligne
  const avalLineY = ty(result.earthPressures.hw_av);
  const avalCardL = tx(-1.9);
  const avalCardR = avalCardL + 130;
  const avalCardT = ty(geo.epBase + soil.hSolAv + 1.2);
  const avalCardB = avalCardT + 70;
  const avalLblR = tx(geo.ePiedAv) - 4;
  const avalLblL = avalLblR - 175;
  const avalOverlapsCard = options.soilParameters && avalLblL < avalCardR && avalLblR > avalCardL && avalLineY - 17 < avalCardB && avalLineY - 6 > avalCardT;
  const avalLabelY = avalOverlapsCard ? avalLineY + 16 : avalLineY - 6;

  // Water table height
  const isWaterActive = options.waterTable && (soil.hasWaterTable || (soil.waterTableHeight ?? 0) > 0);
  const hw = isWaterActive ? Math.min(Math.max(soil.waterTableHeight ?? 2.5, 0), totalH) : 0;

  // Stability status
  const uls = result.governingULS || result.combinations[0];
  const slidingStatus = uls ? uls.status_sliding : 'OK';
  const overturningStatus = uls ? uls.status_overturning : 'OK';
  const bearingStatus = uls ? uls.status_bearing : 'OK';

  const rx = uls ? uls.sumH : result.sumH_active;
  const ry = uls ? uls.sumV_max : result.sumV;
  const mr = uls ? uls.Mr : (rx * (totalH / 3));

  // Seismic dynamic lateral thrust
  const seismicMethod = soil.methodConfig?.seismicMethod || result.soilMethodConfig?.seismicMethod || 'seed_whitman';
  const isSeismicEnabled = seismicMethod !== 'none';
  const seismicMethodName = seismicMethod === 'mononobe_okabe' ? 'Mononobe-Okabe' : 'Seed & Whitman';
  const seismicKh = isSeismicEnabled ? (loads.kh || 0) : 0;
  const deltaPae = isSeismicEnabled ? (result.earthPressures?.delta_Pae_seed ?? 0) : 0;
  const yPae = result.earthPressures?.y_Pae || (0.60 * totalH);
  const isSeismicActive = isSeismicEnabled && deltaPae > 0;

  // Auto-reset selected pressure filter if seismic is disabled
  useEffect(() => {
    if (!isSeismicEnabled && selectedPressure === 'seismic') {
      setSelectedPressure('all');
    }
  }, [isSeismicEnabled, selectedPressure]);

  // Top head load configuration (Fy, Fx, Mz, loadType)
  const isTopPointLoadActive = options.loadsAndSupports && (loads.pointLoadTop?.enabled ?? true);
  const topFy = loads.pointLoadTop?.Fy ?? 12;
  const topFx = loads.pointLoadTop?.Fx ?? 0;
  const topMz = loads.pointLoadTop?.Mz ?? 0;
  const topLoadType = loads.pointLoadTop?.loadType ?? 'L';
  const topPointLoad = topFy;

  return (
    <div className="w-full flex flex-col bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden font-sans">
      
      {/* 1. DISPLAY OPTIONS BAR (Exact replica of Image 2) */}
      <div className="bg-[#0b1329] border-b border-slate-800/80 px-4 py-3 text-white flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs font-bold">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mr-1">
            <Layers size={13} className="text-blue-400" />
            OPTIONS D'AFFICHAGE :
          </span>

          {/* Pressions Latérales */}
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-300 transition-colors">
            <input 
              type="checkbox"
              checked={options.lateralPressures}
              onChange={() => toggleOption('lateralPressures')}
              className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-600 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Pressions Latérales</span>
          </label>

          {/* Charges & Appuis */}
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-300 transition-colors">
            <input 
              type="checkbox"
              checked={options.loadsAndSupports}
              onChange={() => toggleOption('loadsAndSupports')}
              className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-600 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Charges & Appuis</span>
          </label>

          {/* Dimensions */}
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-300 transition-colors">
            <input 
              type="checkbox"
              checked={options.dimensions}
              onChange={() => toggleOption('dimensions')}
              className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-600 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Dimensions</span>
          </label>

          {/* Paramètres Sols */}
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-300 transition-colors">
            <input 
              type="checkbox"
              checked={options.soilParameters}
              onChange={() => toggleOption('soilParameters')}
              className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-600 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Paramètres Sols</span>
          </label>

          {/* Résultantes (Ry, Rx, M) */}
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-emerald-300 transition-colors">
            <input 
              type="checkbox"
              checked={options.resultants}
              onChange={() => toggleOption('resultants')}
              className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-600 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-emerald-400">Résultantes (Ry, Rx, M)</span>
          </label>

          {/* Nappe d'eau amont */}
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-300 transition-colors">
            <input 
              type="checkbox"
              checked={options.waterTable}
              onChange={() => toggleOption('waterTable')}
              className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-cyan-400 flex items-center gap-1">
              <Droplet size={12} />
              Nappe d'eau
            </span>
          </label>
        </div>

        {/* Presets & Settings Toggles */}
        <div className="flex items-center gap-1.5">
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800 text-[10px] font-bold">
            <button 
              onClick={() => applyPreset('photo1')}
              className="px-2 py-0.5 rounded text-amber-300 hover:bg-slate-800 transition-colors"
              title="Style de la photo 1 fournie"
            >
              ★ Photo 1
            </button>
            <button 
              onClick={() => applyPreset('all')}
              className="px-2 py-0.5 rounded text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Tout
            </button>
            <button 
              onClick={() => applyPreset('dimensions')}
              className="px-2 py-0.5 rounded text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Dim.
            </button>
            <button 
              onClick={() => applyPreset('loads')}
              className="px-2 py-0.5 rounded text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Charges
            </button>
            <button 
              onClick={() => applyPreset('resultants')}
              className="px-2 py-0.5 rounded text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Résult.
            </button>
          </div>

          <button
            onClick={() => setShowQuickSettings(!showQuickSettings)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
              showQuickSettings 
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm' 
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Réglages Rapides</span>
          </button>
        </div>
      </div>

      {/* 1.1 SÉLECTION DE LA CHARGE / PRESSION À AFFICHER (si Pressions Latérales est active) */}
      {options.lateralPressures && (
        <div className="bg-[#091124] border-b border-blue-950 px-4 py-2 text-white flex flex-wrap items-center justify-between gap-2.5 select-none">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              SÉLECTIONNER LA PRESSION :
            </span>
            <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 shadow-inner">
              {[
                { id: 'all', label: 'Toutes les pressions', activeBg: 'bg-slate-850 text-white border border-slate-700' },
                { id: 'soil', label: `Sol Actif Pa (${result.earthPressures.P_active_nominal.toFixed(1)} kN/m)`, activeBg: 'bg-blue-600 text-white shadow-sm' },
                { id: 'surcharge', label: `Surcharge P_sur (${result.earthPressures.P_surcharge_nominal.toFixed(1)} kN/m)`, activeBg: 'bg-purple-600 text-white shadow-sm' },
                ...(isSeismicEnabled ? [{ id: 'seismic', label: `Séisme ΔPae (${deltaPae.toFixed(1)} kN/m)`, activeBg: 'bg-rose-600 text-white shadow-sm' }] : []),
                { id: 'water', label: `Eau Pw (${(0.5 * 9.81 * hw * hw).toFixed(1)} kN/m)`, activeBg: 'bg-cyan-600 text-white shadow-sm' },
                { id: 'passive', label: `Butée Aval Pp′ (${result.earthPressures.P_passive_nominal.toFixed(1)} kN/m)`, activeBg: 'bg-amber-600 text-white shadow-sm' },
                { id: 'bearing', label: `Portance Sol (${(uls?.q_toe ?? result.q_toe).toFixed(0)} kPa)`, activeBg: 'bg-emerald-600 text-white shadow-sm' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setSelectedPressure(btn.id as PressureFilter)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all ${
                    selectedPressure === btn.id
                      ? btn.activeBg
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Seismic kh activation button when deltaPae is 0 (only if seismic method is enabled) */}
          {isSeismicEnabled && selectedPressure === 'seismic' && deltaPae === 0 && onUpdateLoads && (
            <button
              onClick={() => onUpdateLoads({ ...loads, kh: 0.12 })}
              className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-700/60 hover:bg-rose-900 text-[10.5px] font-bold transition-colors shadow-sm"
              title="Définir un coefficient sismique kh = 0.12 g"
            >
              + Activer Séisme (kh = 0.12 g)
            </button>
          )}
        </div>
      )}

      {/* 2. OPTIONAL QUICK SETTINGS PANEL (Directly edit water, point load, surcharges) */}
      {showQuickSettings && (
        <div className="bg-[#090e1a] border-b border-slate-800 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Nappe d'eau */}
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-cyan-900/40 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 flex items-center gap-1 text-[11px] uppercase">
                <Droplet size={13} />
                Nappe Phréatique
              </span>
              <input 
                type="checkbox"
                checked={soil.hasWaterTable || options.waterTable}
                onChange={(e) => {
                  const val = e.target.checked;
                  setOptions(prev => ({ ...prev, waterTable: val }));
                  if (onUpdateSoil) {
                    onUpdateSoil({ ...soil, hasWaterTable: val, waterTableHeight: soil.waterTableHeight ?? 2.5 });
                  }
                }}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500"
              />
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-[10px] text-slate-400">Hauteur Hw (m):</span>
              <input 
                type="number"
                step="0.25"
                min="0"
                max={totalH}
                value={soil.waterTableHeight ?? 2.5}
                disabled={!(soil.hasWaterTable || options.waterTable)}
                onChange={(e) => {
                  const hVal = parseFloat(e.target.value) || 0;
                  if (onUpdateSoil) {
                    onUpdateSoil({ ...soil, hasWaterTable: true, waterTableHeight: hVal });
                  }
                }}
                className="w-16 p-1 bg-slate-950 border border-slate-700 rounded text-right font-mono font-bold text-cyan-300 text-xs disabled:opacity-40"
              />
            </div>
          </div>

          {/* Charge en Tête (Milieu) */}
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-rose-900/40 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-400 flex items-center gap-1 text-[11px] uppercase">
                <ArrowDown size={13} />
                Charge Tête
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  value={topLoadType}
                  disabled={!isTopPointLoadActive}
                  onChange={(e) => {
                    const lType = e.target.value as LoadCaseType;
                    if (onUpdateLoads) {
                      onUpdateLoads({
                        ...loads,
                        pointLoadTop: {
                          enabled: true,
                          Fy: topFy,
                          Fx: topFx,
                          Mz: topMz,
                          loadType: lType,
                          name: 'Charge Tête'
                        }
                      });
                    }
                  }}
                  className="bg-slate-950 border border-slate-700 text-rose-300 font-bold text-[10px] rounded px-1 py-0.5"
                >
                  <option value="L">L (Vive)</option>
                  <option value="D">D (Morte)</option>
                  <option value="S">S (Neige)</option>
                  <option value="W">W (Vent)</option>
                  <option value="E">E (Séisme)</option>
                </select>
                <input 
                  type="checkbox"
                  checked={loads.pointLoadTop?.enabled ?? true}
                  onChange={(e) => {
                    const val = e.target.checked;
                    if (onUpdateLoads) {
                      onUpdateLoads({
                        ...loads,
                        pointLoadTop: {
                          enabled: val,
                          Fy: topFy,
                          Fx: topFx,
                          Mz: topMz,
                          loadType: topLoadType,
                          name: 'Charge Tête'
                        }
                      });
                    }
                  }}
                  className="rounded bg-slate-800 border-slate-700 text-rose-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-0.5">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400">Fy (kN):</span>
                <input 
                  type="number"
                  step="1"
                  value={topFy}
                  disabled={!isTopPointLoadActive}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (onUpdateLoads) {
                      onUpdateLoads({
                        ...loads,
                        pointLoadTop: {
                          enabled: true,
                          Fy: val,
                          Fx: topFx,
                          Mz: topMz,
                          loadType: topLoadType,
                          name: 'Charge Tête'
                        }
                      });
                    }
                  }}
                  className="w-full p-1 bg-slate-950 border border-slate-700 rounded text-right font-mono font-bold text-rose-300 text-[11px] disabled:opacity-40"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400">Fx (kN):</span>
                <input 
                  type="number"
                  step="1"
                  value={topFx}
                  disabled={!isTopPointLoadActive}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (onUpdateLoads) {
                      onUpdateLoads({
                        ...loads,
                        pointLoadTop: {
                          enabled: true,
                          Fy: topFy,
                          Fx: val,
                          Mz: topMz,
                          loadType: topLoadType,
                          name: 'Charge Tête'
                        }
                      });
                    }
                  }}
                  className="w-full p-1 bg-slate-950 border border-slate-700 rounded text-right font-mono font-bold text-amber-300 text-[11px] disabled:opacity-40"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400">Mz (kNm):</span>
                <input 
                  type="number"
                  step="1"
                  value={topMz}
                  disabled={!isTopPointLoadActive}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (onUpdateLoads) {
                      onUpdateLoads({
                        ...loads,
                        pointLoadTop: {
                          enabled: true,
                          Fy: topFy,
                          Fx: topFx,
                          Mz: val,
                          loadType: topLoadType,
                          name: 'Charge Tête'
                        }
                      });
                    }
                  }}
                  className="w-full p-1 bg-slate-950 border border-slate-700 rounded text-right font-mono font-bold text-purple-300 text-[11px] disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          {/* Surcharges Amont & Aval */}
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-indigo-900/40 flex flex-col gap-1.5">
            <span className="font-bold text-indigo-300 text-[11px] uppercase">
              Surcharges Réparties
            </span>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] text-slate-400">Amont (kPa):</span>
              <div className="flex items-center gap-1">
                <input 
                  type="number"
                  step="1"
                  min="0"
                  value={loads.surcharge}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (onUpdateLoads) onUpdateLoads({ ...loads, surcharge: val });
                  }}
                  className="w-14 p-1 bg-slate-950 border border-slate-700 rounded text-right font-mono font-bold text-indigo-300 text-xs"
                />
                <select
                  value={loads.surchargeType || 'L'}
                  onChange={(e) => {
                    if (onUpdateLoads) onUpdateLoads({ ...loads, surchargeType: e.target.value as LoadCaseType });
                  }}
                  className="bg-slate-950 border border-slate-700 text-indigo-300 text-[10px] font-bold rounded p-1"
                >
                  <option value="L">L</option>
                  <option value="D">D</option>
                  <option value="S">S</option>
                  <option value="W">W</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] text-slate-400">Aval (kPa):</span>
              <div className="flex items-center gap-1">
                <input 
                  type="number"
                  step="1"
                  min="0"
                  value={loads.surchargeAval ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (onUpdateLoads) onUpdateLoads({ ...loads, surchargeAval: val });
                  }}
                  className="w-14 p-1 bg-slate-950 border border-slate-700 rounded text-right font-mono font-bold text-indigo-300 text-xs"
                />
                <select
                  value={loads.surchargeAvalType || 'L'}
                  onChange={(e) => {
                    if (onUpdateLoads) onUpdateLoads({ ...loads, surchargeAvalType: e.target.value as LoadCaseType });
                  }}
                  className="bg-slate-950 border border-slate-700 text-indigo-300 text-[10px] font-bold rounded p-1"
                >
                  <option value="L">L</option>
                  <option value="D">D</option>
                  <option value="S">S</option>
                  <option value="W">W</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sol Avant (Aval) */}
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-amber-900/40 flex flex-col gap-1.5">
            <span className="font-bold text-amber-400 text-[11px] uppercase">
              Hauteur Sol Aval
            </span>
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-[10px] text-slate-400">Sol Avant (m):</span>
              <input 
                type="number"
                step="0.1"
                min="0"
                value={soil.hSolAv}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  if (onUpdateSoil) onUpdateSoil({ ...soil, hSolAv: val });
                }}
                className="w-16 p-1 bg-slate-950 border border-slate-700 rounded text-right font-mono font-bold text-amber-300 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN SVG VISUALIZER (Dark CAD Blueprint Canvas) */}
      <div className="relative w-full h-[540px] bg-[#070d19] flex items-center justify-center overflow-hidden">
        
        {/* Top Badges (Mirroring Image 1) */}
        <div className="absolute top-4 left-5 flex flex-col gap-2 z-10 select-none">
          <div className="flex items-center gap-2 bg-[#0e172a]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-blue-600/40 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-sm shadow-blue-400"></span>
            <span className="text-[10px] font-black tracking-wider text-blue-300">
              Béton f′c = {conc.fc_mur} MPa (voile) / {conc.fc_semelle} MPa (semelle)
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#0e172a]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-600/40 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-400"></span>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
              SOL TYPE {result.soilMethodConfig.activeMethod.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Floating Stability Summary Card (Top-Right, matching user drawing) */}
        {options.resultants && (
          <div className="absolute top-4 right-5 bg-[#0b1324]/92 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800/90 shadow-2xl z-10 w-56 select-none">
            <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-slate-800/80">
              <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black border border-cyan-500/30">
                ✓
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                RÉSUMÉ STABILITÉ
              </span>
            </div>

            <div className="flex flex-col gap-2 text-[11px]">
              {/* Glissement */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Glissement</span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black uppercase tracking-wider border ${
                  slidingStatus === 'OK' 
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60' 
                    : 'bg-rose-950/80 text-rose-400 border-rose-700/60'
                }`}>
                  {slidingStatus === 'OK' ? 'CONFORME' : 'ÉCHEC'}
                </span>
              </div>

              {/* Renversement */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Renversement</span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black uppercase tracking-wider border ${
                  overturningStatus === 'OK' 
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60' 
                    : 'bg-rose-950/80 text-rose-400 border-rose-700/60'
                }`}>
                  {overturningStatus === 'OK' ? 'CONFORME' : 'ÉCHEC'}
                </span>
              </div>

              {/* Portance */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Portance Sol</span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black uppercase tracking-wider border ${
                  bearingStatus === 'OK' 
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60' 
                    : 'bg-rose-950/80 text-rose-400 border-rose-700/60'
                }`}>
                  {bearingStatus === 'OK' ? 'CONFORME' : 'ÉCHEC'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SVG Drawing Canvas */}
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
          <defs>
            {/* Arrows with crisp, fixed userSpaceOnUse pixel sizing to prevent oversized heads */}
            <marker id="arrow-green" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
              <polygon points="0 1, 6 3.5, 0 6" fill="#10b981" />
            </marker>
            <marker id="arrow-resultant" markerWidth="6.5" markerHeight="6.5" refX="5.5" refY="3.25" orient="auto" markerUnits="userSpaceOnUse">
              <polygon points="0 1, 5.5 3.25, 0 5.5" fill="#10b981" />
            </marker>
            <marker id="arrow-red" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
              <polygon points="0 1, 7 4, 0 7" fill="#f43f5e" />
            </marker>
            <marker id="arrow-blue" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
              <polygon points="0 1, 6 3.5, 0 6" fill="#38bdf8" />
            </marker>
            <marker id="arrow-cyan" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
              <polygon points="0 1, 6 3.5, 0 6" fill="#06b6d4" />
            </marker>
            <marker id="arrow-purple" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
              <polygon points="0 1, 6 3.5, 0 6" fill="#a855f7" />
            </marker>
            <marker id="arrow-orange" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
              <polygon points="0 1, 6 3.5, 0 6" fill="#f59e0b" />
            </marker>

            {/* Subtle Blueprint Dot Grid */}
            <pattern id="blueprint-dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#17233d" opacity="0.6" />
            </pattern>
          </defs>

          {/* Grid background */}
          <rect x="0" y="0" width={w} height={h} fill="url(#blueprint-dots)" />

          {/* --- GROUND HORIZONS --- */}
          {/* Backfill Horizon (Amont) */}
          <line 
            x1={tx(geo.ePiedAv + geo.epStem)} 
            y1={ty(totalH)} 
            x2={tx(canvasWidthMeters + 1)} 
            y2={ty(totalH)} 
            stroke="#334155" 
            strokeWidth="2.5" 
          />
          
          {/* Frontfill Horizon (Aval) */}
          <line 
            x1={tx(-2.5)} 
            y1={ty(geo.epBase + soil.hSolAv)} 
            x2={tx(geo.ePiedAv)} 
            y2={ty(geo.epBase + soil.hSolAv)} 
            stroke="#334155" 
            strokeWidth="2.5" 
          />

          {/* --- SUBMERGED WATER REGION (If Water Table active) --- */}
          {isWaterActive && hw > 0 && (
            <g>
              {/* Backfill water fill */}
              <polygon 
                points={`
                  ${tx(geo.ePiedAv + geo.epStem)},${ty(Math.min(geo.epBase, hw))}
                  ${tx(canvasWidthMeters + 1)},${ty(Math.min(geo.epBase, hw))}
                  ${tx(canvasWidthMeters + 1)},${ty(hw)}
                  ${tx(geo.ePiedAv + geo.epStem)},${ty(hw)}
                `}
                fill="#0284c7"
                fillOpacity="0.12"
              />
              {/* Cyan dashed line: NIVEAU PHRÉATIQUE AMONT */}
              <line 
                x1={tx(geo.ePiedAv + geo.epStem)} 
                y1={ty(hw)} 
                x2={tx(canvasWidthMeters + 1)} 
                y2={ty(hw)} 
                stroke="#38bdf8" 
                strokeWidth="2" 
                strokeDasharray="8 6" 
              />
              <text 
                x={tx(geo.ePiedAv + geo.epStem + 0.3)} 
                y={ty(hw) - 6} 
                fill="#38bdf8" 
                fontSize="11" 
                fontWeight="900" 
                letterSpacing="1"
              >
                NIVEAU PHRÉATIQUE AMONT
              </text>
            </g>
          )}

          {/* --- NAPPE AVAL (eau à l'avant comptée, scénario B ; rien en scénario A) --- */}
          {options.waterTable && result.earthPressures.frontWaterScenario === 'B' && result.earthPressures.hw_av > 0 && (
            <g>
              {result.earthPressures.hw_av > geo.epBase && (
                <polygon
                  points={`
                    ${tx(-0.8)},${ty(geo.epBase)}
                    ${tx(geo.ePiedAv)},${ty(geo.epBase)}
                    ${tx(geo.ePiedAv)},${ty(result.earthPressures.hw_av)}
                    ${tx(-0.8)},${ty(result.earthPressures.hw_av)}
                  `}
                  fill="#0284c7"
                  fillOpacity="0.12"
                />
              )}
              <line
                x1={tx(-0.8)}
                y1={ty(result.earthPressures.hw_av)}
                x2={tx(geo.ePiedAv)}
                y2={ty(result.earthPressures.hw_av)}
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="8 6"
              />
              <text
                x={tx(geo.ePiedAv) - 4}
                y={avalLabelY}
                fill="#38bdf8"
                fontSize="11"
                fontWeight="900"
                letterSpacing="1"
                textAnchor="end"
              >
                NIVEAU PHRÉATIQUE AVAL
              </text>
              {options.lateralPressures && (
                <g>
                  <polygon
                    points={`
                      ${tx(geo.ePiedAv)},${ty(0)}
                      ${tx(geo.ePiedAv - Math.min(1.2, geo.ePiedAv))},${ty(0)}
                      ${tx(geo.ePiedAv)},${ty(result.earthPressures.hw_av)}
                    `}
                    fill="#06b6d4"
                    fillOpacity="0.3"
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                  />
                  <text
                    x={tx(geo.ePiedAv - 0.1)}
                    y={ty(result.earthPressures.y_Pw_front)}
                    fill="#38bdf8"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="end"
                  >
                    Pw,a ({result.earthPressures.P_water_front.toFixed(1)} kN/m)
                  </text>
                </g>
              )}
            </g>
          )}

          {/* --- RETAINING WALL (Light Sleek Concrete Finish as in Image 1) --- */}
          <g fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5">
            {/* Footing Base */}
            <rect 
              x={tx(0)} 
              y={ty(geo.epBase)} 
              width={baseW * scale} 
              height={geo.epBase * scale} 
              rx="1"
            />
            {/* Stem Voile */}
            <rect 
              x={tx(geo.ePiedAv)} 
              y={ty(totalH)} 
              width={geo.epStem * scale} 
              height={geo.hMur * scale} 
              rx="1"
            />
          </g>

          {/* --- SOIL PARAMETERS FLOATING CARDS (Mirroring Image 1) --- */}
          {options.soilParameters && (
            <g>
              {/* Passive Side Card (Aval - Left) */}
              <g transform={`translate(${tx(-1.9)}, ${ty(geo.epBase + soil.hSolAv + 1.2)})`}>
                <rect 
                  x="0" y="0" width="130" height="70" 
                  rx="10" 
                  fill="#0b1324" 
                  fillOpacity="0.85" 
                  stroke="#1e293b" 
                  strokeWidth="1.5" 
                />
                <text x="14" y="24" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="monospace">
                  γ = {soil.gamma.toFixed(1)} kN/m³
                </text>
                <text x="14" y="44" fill="#facc15" fontSize="13" fontWeight="bold" fontFamily="monospace">
                  φ = {soil.phi.toFixed(0)}°
                </text>
                <text x="14" y="60" fill="#64748b" fontSize="10" fontWeight="bold" fontStyle="italic">
                  [PASSIVE]
                </text>
              </g>

              {/* Active Side Card (Amont - Right) */}
              <g transform={`translate(${tx(geo.ePiedAv + geo.epStem + 0.8)}, ${ty(totalH - 0.3)})`}>
                <rect 
                  x="0" y="0" width="130" height="70" 
                  rx="10" 
                  fill="#0b1324" 
                  fillOpacity="0.85" 
                  stroke="#1e293b" 
                  strokeWidth="1.5" 
                />
                <text x="14" y="24" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="monospace">
                  γ = {soil.gamma.toFixed(1)} kN/m³
                </text>
                <text x="14" y="44" fill="#facc15" fontSize="13" fontWeight="bold" fontFamily="monospace">
                  φ = {soil.phi.toFixed(0)}°
                </text>
                <text x="14" y="60" fill="#64748b" fontSize="10" fontWeight="bold" fontStyle="italic">
                  [ACTIVE]
                </text>
              </g>
            </g>
          )}

          {/* --- DIMENSIONS (Mirroring Image 1) --- */}
          {options.dimensions && (
            <g>
              {/* 1. Stem thickness at top (0.3 m) */}
              <line 
                x1={tx(geo.ePiedAv)} 
                y1={ty(totalH + 0.3)} 
                x2={tx(geo.ePiedAv + geo.epStem)} 
                y2={ty(totalH + 0.3)} 
                stroke="#64748b" 
                strokeWidth="1.5" 
              />
              <line x1={tx(geo.ePiedAv)} y1={ty(totalH + 0.2)} x2={tx(geo.ePiedAv)} y2={ty(totalH + 0.4)} stroke="#64748b" strokeWidth="1.5" />
              <line x1={tx(geo.ePiedAv + geo.epStem)} y1={ty(totalH + 0.2)} x2={tx(geo.ePiedAv + geo.epStem)} y2={ty(totalH + 0.4)} stroke="#64748b" strokeWidth="1.5" />
              <text 
                x={tx(geo.ePiedAv + geo.epStem / 2)} 
                y={ty(totalH + 0.55)} 
                fill="#94a3b8" 
                fontSize="12" 
                fontWeight="bold" 
                textAnchor="middle"
              >
                {geo.epStem.toFixed(1)} m
              </text>

              {/* 2. Stem height (4 m) */}
              <line 
                x1={tx(-0.5)} 
                y1={ty(geo.epBase)} 
                x2={tx(-0.5)} 
                y2={ty(totalH)} 
                stroke="#475569" 
                strokeWidth="1.5" 
              />
              <line x1={tx(-0.65)} y1={ty(geo.epBase)} x2={tx(-0.35)} y2={ty(geo.epBase)} stroke="#475569" strokeWidth="1.5" />
              <line x1={tx(-0.65)} y1={ty(totalH)} x2={tx(-0.35)} y2={ty(totalH)} stroke="#475569" strokeWidth="1.5" />
              <text 
                x={tx(-0.7)} 
                y={ty(geo.epBase + geo.hMur / 2)} 
                fill="#64748b" 
                fontSize="12" 
                fontWeight="bold" 
                textAnchor="middle"
                transform={`rotate(-90, ${tx(-0.7)}, ${ty(geo.epBase + geo.hMur / 2)})`}
              >
                {geo.hMur.toFixed(1)} m
              </text>

              {/* 3. Base thickness (0.5 m) */}
              <line 
                x1={tx(-0.65)} 
                y1={ty(0)} 
                x2={tx(-0.65)} 
                y2={ty(geo.epBase)} 
                stroke="#64748b" 
                strokeWidth="1.5" 
              />
              <line x1={tx(-0.8)} y1={ty(0)} x2={tx(-0.5)} y2={ty(0)} stroke="#64748b" strokeWidth="1.5" />
              <line x1={tx(-0.8)} y1={ty(geo.epBase)} x2={tx(-0.5)} y2={ty(geo.epBase)} stroke="#64748b" strokeWidth="1.5" />
              <text 
                x={tx(-0.9)} 
                y={ty(geo.epBase / 2)} 
                fill="#94a3b8" 
                fontSize="11" 
                fontWeight="bold" 
                textAnchor="middle"
                transform={`rotate(-90, ${tx(-0.9)}, ${ty(geo.epBase / 2)})`}
              >
                {geo.epBase.toFixed(1)} m
              </text>

              {/* 4. Base width B (2.5 m) with dimension line under footing */}
              <line 
                x1={tx(0)} 
                y1={ty(-0.6)} 
                x2={tx(baseW)} 
                y2={ty(-0.6)} 
                stroke="#64748b" 
                strokeWidth="1.5" 
              />
              <line x1={tx(0)} y1={ty(-0.45)} x2={tx(0)} y2={ty(-0.75)} stroke="#64748b" strokeWidth="1.5" />
              <line x1={tx(baseW)} y1={ty(-0.45)} x2={tx(baseW)} y2={ty(-0.75)} stroke="#64748b" strokeWidth="1.5" />
              <text 
                x={tx(baseW / 2)} 
                y={ty(-0.85)} 
                fill="#94a3b8" 
                fontSize="13" 
                fontWeight="bold" 
                textAnchor="middle"
              >
                {baseW.toFixed(1)} m
              </text>

              {/* 5. Front soil height (orange dashed line: 2 m) */}
              <line 
                x1={tx(-1.2)} 
                y1={ty(0)} 
                x2={tx(-1.2)} 
                y2={ty(geo.epBase + soil.hSolAv)} 
                stroke="#f59e0b" 
                strokeWidth="1.8" 
                strokeDasharray="6 4" 
              />
              <text 
                x={tx(-1.4)} 
                y={ty((geo.epBase + soil.hSolAv) / 2)} 
                fill="#f59e0b" 
                fontSize="13" 
                fontWeight="900" 
                textAnchor="middle"
                transform={`rotate(-90, ${tx(-1.4)}, ${ty((geo.epBase + soil.hSolAv) / 2)})`}
              >
                {(geo.epBase + soil.hSolAv).toFixed(1)} m
              </text>

              {/* 6. Total height backfill (green dashed line: 4.5 m) */}
              <line 
                x1={tx(baseW + 1.2)} 
                y1={ty(0)} 
                x2={tx(baseW + 1.2)} 
                y2={ty(totalH)} 
                stroke="#10b981" 
                strokeWidth="1.8" 
                strokeDasharray="6 4" 
              />
              <text 
                x={tx(baseW + 1.4)} 
                y={ty(totalH / 2)} 
                fill="#10b981" 
                fontSize="13" 
                fontWeight="900" 
                textAnchor="middle"
                transform={`rotate(-90, ${tx(baseW + 1.4)}, ${ty(totalH / 2)})`}
              >
                {totalH.toFixed(1)} m
              </text>
            </g>
          )}

          {/* --- CHARGES & APPUIS (Mirroring Image 1 & Additional Loads) --- */}
          {options.loadsAndSupports && (
            <g>
              {/* 1. Point Load / Head Loads at the Middle of Wall Head (Stem Top) */}
              {isTopPointLoadActive && (
                <g>
                  {/* Vertical Fy (↓) */}
                  {topFy !== 0 && (
                    <g>
                      <line 
                        x1={tx(geo.ePiedAv + geo.epStem / 2)} 
                        y1={ty(totalH + (topFy >= 0 ? 1.1 : -0.1))} 
                        x2={tx(geo.ePiedAv + geo.epStem / 2)} 
                        y2={ty(totalH + (topFy >= 0 ? 0 : 1.0))} 
                        stroke="#f43f5e" 
                        strokeWidth="3.5" 
                        markerEnd="url(#arrow-red)" 
                      />
                      <rect
                        x={tx(geo.ePiedAv + geo.epStem / 2) + 6}
                        y={ty(totalH + 0.95) - 10}
                        width="88"
                        height="18"
                        rx="4"
                        fill="#881337"
                        opacity="0.85"
                      />
                      <text 
                        x={tx(geo.ePiedAv + geo.epStem / 2) + 10} 
                        y={ty(totalH + 0.95) + 3} 
                        fill="#fda4af" 
                        fontSize="11" 
                        fontWeight="900"
                        fontFamily="monospace"
                      >
                        Fy={topFy > 0 ? topFy.toFixed(0) : `(${topFy.toFixed(0)})`}k [{topLoadType}]
                      </text>
                    </g>
                  )}

                  {/* Horizontal Fx (→ or ←) */}
                  {topFx !== 0 && (
                    <g>
                      <line 
                        x1={tx(geo.ePiedAv + geo.epStem / 2 + (topFx > 0 ? -1.1 : 1.1))} 
                        y1={ty(totalH)} 
                        x2={tx(geo.ePiedAv + geo.epStem / 2)} 
                        y2={ty(totalH)} 
                        stroke="#f59e0b" 
                        strokeWidth="3.5" 
                        markerEnd="url(#arrow-orange)" 
                      />
                      <rect
                        x={tx(geo.ePiedAv + geo.epStem / 2 + (topFx > 0 ? -1.1 : 0.2))}
                        y={ty(totalH) - 22}
                        width="88"
                        height="18"
                        rx="4"
                        fill="#78350f"
                        opacity="0.85"
                      />
                      <text 
                        x={tx(geo.ePiedAv + geo.epStem / 2 + (topFx > 0 ? -1.05 : 0.25))} 
                        y={ty(totalH) - 9} 
                        fill="#fcd34d" 
                        fontSize="11" 
                        fontWeight="900"
                        fontFamily="monospace"
                      >
                        Fx={topFx.toFixed(0)}k [{topLoadType}]
                      </text>
                    </g>
                  )}

                  {/* Moment Mz (↻ or ↺) */}
                  {topMz !== 0 && (
                    <g>
                      {/* Curved circular arc for moment */}
                      <path 
                        d={topMz > 0
                          ? `M ${tx(geo.ePiedAv + geo.epStem / 2) - 14} ${ty(totalH) - 14} A 16 16 0 1 1 ${tx(geo.ePiedAv + geo.epStem / 2) + 14} ${ty(totalH) - 4}`
                          : `M ${tx(geo.ePiedAv + geo.epStem / 2) + 14} ${ty(totalH) - 14} A 16 16 0 1 0 ${tx(geo.ePiedAv + geo.epStem / 2) - 14} ${ty(totalH) - 4}`
                        }
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="2.5"
                        markerEnd="url(#arrow-purple)"
                      />
                      <text 
                        x={tx(geo.ePiedAv + geo.epStem / 2) + 20} 
                        y={ty(totalH) - 18} 
                        fill="#e9d5ff" 
                        fontSize="11" 
                        fontWeight="900"
                        fontFamily="monospace"
                      >
                        Mz={topMz.toFixed(0)}kNm [{topLoadType}]
                      </text>
                    </g>
                  )}

                  {/* Center Node Dot at Wall Head */}
                  <circle 
                    cx={tx(geo.ePiedAv + geo.epStem / 2)} 
                    cy={ty(totalH)} 
                    r="4" 
                    fill="#f43f5e" 
                    stroke="#fff" 
                    strokeWidth="1.5" 
                  />
                </g>
              )}

              {/* 2. Surcharge Amont (Distributed vertical arrows on backfill with load type) */}
              {loads.surcharge > 0 && (
                <g>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const sx = geo.ePiedAv + geo.epStem + 0.3 + idx * 0.45;
                    return (
                      <line 
                        key={idx}
                        x1={tx(sx)} 
                        y1={ty(totalH + 0.6)} 
                        x2={tx(sx)} 
                        y2={ty(totalH)} 
                        stroke="#a855f7" 
                        strokeWidth="2" 
                        markerEnd="url(#arrow-purple)" 
                      />
                    );
                  })}
                  <line 
                    x1={tx(geo.ePiedAv + geo.epStem + 0.3)} 
                    y1={ty(totalH + 0.6)} 
                    x2={tx(geo.ePiedAv + geo.epStem + 0.3 + 5 * 0.45)} 
                    y2={ty(totalH + 0.6)} 
                    stroke="#a855f7" 
                    strokeWidth="2" 
                  />
                  <rect
                    x={tx(geo.ePiedAv + geo.epStem + 1.4) - 75}
                    y={ty(totalH + 0.9) - 12}
                    width="150"
                    height="18"
                    rx="4"
                    fill="#3b0764"
                    opacity="0.85"
                  />
                  <text 
                    x={tx(geo.ePiedAv + geo.epStem + 1.4)} 
                    y={ty(totalH + 0.9) + 1} 
                    fill="#e9d5ff" 
                    fontSize="11" 
                    fontWeight="bold" 
                    textAnchor="middle"
                  >
                    q_amont = {loads.surcharge.toFixed(1)} kPa [{loads.surchargeType || 'L'}]
                  </text>
                </g>
              )}

              {/* 3. Surcharge Aval (Distributed vertical arrows on front fill with load type) */}
              {loads.surchargeAval && loads.surchargeAval > 0 && (
                <g>
                  {Array.from({ length: 4 }).map((_, idx) => {
                    const sx = -1.2 + idx * 0.4;
                    return (
                      <line 
                        key={idx}
                        x1={tx(sx)} 
                        y1={ty(geo.epBase + soil.hSolAv + 0.5)} 
                        x2={tx(sx)} 
                        y2={ty(geo.epBase + soil.hSolAv)} 
                        stroke="#a855f7" 
                        strokeWidth="2" 
                        markerEnd="url(#arrow-purple)" 
                      />
                    );
                  })}
                  <line 
                    x1={tx(-1.2)} 
                    y1={ty(geo.epBase + soil.hSolAv + 0.5)} 
                    x2={tx(-1.2 + 3 * 0.4)} 
                    y2={ty(geo.epBase + soil.hSolAv + 0.5)} 
                    stroke="#a855f7" 
                    strokeWidth="2" 
                  />
                  <rect
                    x={tx(-0.6) - 70}
                    y={ty(geo.epBase + soil.hSolAv + 0.8) - 12}
                    width="140"
                    height="18"
                    rx="4"
                    fill="#3b0764"
                    opacity="0.85"
                  />
                  <text 
                    x={tx(-0.6)} 
                    y={ty(geo.epBase + soil.hSolAv + 0.8) + 1} 
                    fill="#e9d5ff" 
                    fontSize="11" 
                    fontWeight="bold" 
                    textAnchor="middle"
                  >
                    q_aval = {loads.surchargeAval.toFixed(1)} kPa [{loads.surchargeAvalType || 'L'}]
                  </text>
                </g>
              )}

              {/* 4. Charges Supplémentaires Libres (Affichage dans la géométrie) */}
              {loads.additionalLoads && loads.additionalLoads.length > 0 && (
                <g>
                  {loads.additionalLoads.map((al, idx) => {
                    const appX = tx(al.x);
                    const appY = ty(al.y);

                    // A) Distributed additional load
                    if (al.isDistributed && al.length && al.length > 0) {
                      const len = al.length;
                      const numArrows = Math.max(2, Math.min(8, Math.round(len * 3.5)));
                      const isVertical = al.nature === 'Fy';

                      return (
                        <g key={al.id || idx}>
                          {isVertical ? (
                            // Distributed vertical load along X axis
                            <>
                              {Array.from({ length: numArrows }).map((_, i) => {
                                const currX = al.x + (i * len) / (numArrows - 1);
                                const isDown = al.magnitude >= 0;
                                return (
                                  <line 
                                    key={i}
                                    x1={tx(currX)} 
                                    y1={ty(al.y + (isDown ? 0.6 : -0.6))} 
                                    x2={tx(currX)} 
                                    y2={ty(al.y)} 
                                    stroke="#38bdf8" 
                                    strokeWidth="2" 
                                    markerEnd="url(#arrow-blue)" 
                                  />
                                );
                              })}
                              {/* Top connector */}
                              <line 
                                x1={tx(al.x)} 
                                y1={ty(al.y + (al.magnitude >= 0 ? 0.6 : -0.6))} 
                                x2={tx(al.x + len)} 
                                y2={ty(al.y + (al.magnitude >= 0 ? 0.6 : -0.6))} 
                                stroke="#38bdf8" 
                                strokeWidth="2" 
                              />
                              <rect 
                                x={tx(al.x + len / 2) - 60} 
                                y={ty(al.y + (al.magnitude >= 0 ? 0.9 : -0.8)) - 10} 
                                width="120" 
                                height="18" 
                                rx="4" 
                                fill="#082f49" 
                                opacity="0.9" 
                              />
                              <text 
                                x={tx(al.x + len / 2)} 
                                y={ty(al.y + (al.magnitude >= 0 ? 0.9 : -0.8)) + 3} 
                                fill="#7dd3fc" 
                                fontSize="10" 
                                fontWeight="bold" 
                                textAnchor="middle"
                              >
                                {al.name}: {al.magnitude} kN/m [{al.caseType}]
                              </text>
                            </>
                          ) : (
                            // Distributed horizontal load along Y axis
                            <>
                              {Array.from({ length: numArrows }).map((_, i) => {
                                const currY = al.y + (i * len) / (numArrows - 1);
                                const isRight = al.magnitude >= 0;
                                return (
                                  <line 
                                    key={i}
                                    x1={tx(al.x - (isRight ? 0.6 : -0.6))} 
                                    y1={ty(currY)} 
                                    x2={tx(al.x)} 
                                    y2={ty(currY)} 
                                    stroke="#38bdf8" 
                                    strokeWidth="2" 
                                    markerEnd="url(#arrow-blue)" 
                                  />
                                );
                              })}
                              {/* Side connector */}
                              <line 
                                x1={tx(al.x - (al.magnitude >= 0 ? 0.6 : -0.6))} 
                                y1={ty(al.y)} 
                                x2={tx(al.x - (al.magnitude >= 0 ? 0.6 : -0.6))} 
                                y2={ty(al.y + len)} 
                                stroke="#38bdf8" 
                                strokeWidth="2" 
                              />
                              <text 
                                x={tx(al.x - (al.magnitude >= 0 ? 0.7 : -0.7))} 
                                y={ty(al.y + len / 2)} 
                                fill="#7dd3fc" 
                                fontSize="10" 
                                fontWeight="bold" 
                                textAnchor={al.magnitude >= 0 ? "end" : "start"}
                              >
                                {al.name}: {al.magnitude} kN/m [{al.caseType}]
                              </text>
                            </>
                          )}
                        </g>
                      );
                    }

                    // B) Point additional load
                    return (
                      <g key={al.id || idx}>
                        {/* Point Marker */}
                        <circle 
                          cx={appX} 
                          cy={appY} 
                          r="4" 
                          fill="#38bdf8" 
                          stroke="#ffffff" 
                          strokeWidth="1.5" 
                        />

                        {/* Fy load */}
                        {al.nature === 'Fy' && (
                          <>
                            <line 
                              x1={appX} 
                              y1={ty(al.y + (al.magnitude >= 0 ? 0.8 : -0.8))} 
                              x2={appX} 
                              y2={appY} 
                              stroke="#38bdf8" 
                              strokeWidth="2.5" 
                              markerEnd="url(#arrow-blue)" 
                            />
                            <rect 
                              x={appX + 6} 
                              y={ty(al.y + (al.magnitude >= 0 ? 0.7 : -0.7)) - 9} 
                              width="100" 
                              height="17" 
                              rx="3" 
                              fill="#082f49" 
                              opacity="0.85" 
                            />
                            <text 
                              x={appX + 10} 
                              y={ty(al.y + (al.magnitude >= 0 ? 0.7 : -0.7)) + 3} 
                              fill="#7dd3fc" 
                              fontSize="10" 
                              fontWeight="bold"
                            >
                              {al.name || 'Fy'}: {al.magnitude}k [{al.caseType}]
                            </text>
                          </>
                        )}

                        {/* Fx load */}
                        {al.nature === 'Fx' && (
                          <>
                            <line 
                              x1={tx(al.x - (al.magnitude >= 0 ? 0.8 : -0.8))} 
                              y1={appY} 
                              x2={appX} 
                              y2={appY} 
                              stroke="#f59e0b" 
                              strokeWidth="2.5" 
                              markerEnd="url(#arrow-orange)" 
                            />
                            <rect 
                              x={tx(al.x - (al.magnitude >= 0 ? 0.8 : -0.8)) - (al.magnitude >= 0 ? 95 : 0)} 
                              y={appY - 20} 
                              width="95" 
                              height="17" 
                              rx="3" 
                              fill="#451a03" 
                              opacity="0.85" 
                            />
                            <text 
                              x={tx(al.x - (al.magnitude >= 0 ? 0.8 : -0.8)) - (al.magnitude >= 0 ? 90 : -5)} 
                              y={appY - 7} 
                              fill="#fde68a" 
                              fontSize="10" 
                              fontWeight="bold"
                            >
                              {al.name || 'Fx'}: {al.magnitude}k [{al.caseType}]
                            </text>
                          </>
                        )}

                        {/* Mz load */}
                        {al.nature === 'Mz' && (
                          <>
                            <path 
                              d={al.magnitude >= 0
                                ? `M ${appX - 12} ${appY - 12} A 14 14 0 1 1 ${appX + 12} ${appY - 4}`
                                : `M ${appX + 12} ${appY - 12} A 14 14 0 1 0 ${appX - 12} ${appY - 4}`
                              }
                              fill="none"
                              stroke="#c084fc"
                              strokeWidth="2.2"
                              markerEnd="url(#arrow-purple)"
                            />
                            <rect 
                              x={appX + 18} 
                              y={appY - 18} 
                              width="95" 
                              height="17" 
                              rx="3" 
                              fill="#3b0764" 
                              opacity="0.85" 
                            />
                            <text 
                              x={appX + 22} 
                              y={appY - 5} 
                              fill="#f3e8ff" 
                              fontSize="10" 
                              fontWeight="bold"
                            >
                              {al.name || 'Mz'}: {al.magnitude}kNm [{al.caseType}]
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          )}

          {/* --- RÉSULTANTES AU PIED DU MUR (Ry, Rx, M) --- */}
          {options.resultants && (
            <g>
              {(() => {
                // Point d'application de la résultante sous la semelle (x1 ULS ou centre)
                const resX = Math.max(baseW * 0.15, Math.min(baseW * 0.85, (uls && uls.x1 > 0 ? uls.x1 : baseW * 0.45)));
                const posX = tx(resX);
                const posY0 = ty(0); // Ligne d'appui sous la semelle

                const ryStr = `Ry=${ry.toFixed(1)}`;
                const rxStr = `Rx=${rx.toFixed(1)}`;
                const mStr = `M=${mr.toFixed(1)}`;

                const ryBadgeW = Math.max(68, ryStr.length * 6.8 + 14);
                const rxBadgeW = Math.max(64, rxStr.length * 6.8 + 14);
                const mBadgeW = Math.max(62, mStr.length * 6.8 + 14);

                return (
                  <g>
                    {/* Point d'application de la résultante */}
                    <circle 
                      cx={posX} 
                      cy={posY0} 
                      r="3" 
                      fill="#10b981" 
                      stroke="#022c22" 
                      strokeWidth="1.5" 
                    />

                    {/* 1. Flèche Verticale Ry (vers le haut, s'arrêtant sous la semelle) */}
                    <line 
                      x1={posX} 
                      y1={ty(-0.62)} 
                      x2={posX} 
                      y2={posY0 + 5} 
                      stroke="#10b981" 
                      strokeWidth="2.2" 
                      markerEnd="url(#arrow-resultant)" 
                    />
                    {/* Badge texte Ry : décalé à droite de la tige verticale */}
                    <g transform={`translate(${posX + 10}, ${ty(-0.36)})`}>
                      <rect 
                        x="0" 
                        y="-9" 
                        width={ryBadgeW} 
                        height="17" 
                        rx="3" 
                        fill="#022c22" 
                        fillOpacity="0.9" 
                        stroke="#10b981" 
                        strokeWidth="0.8" 
                      />
                      <text 
                        x={ryBadgeW / 2} 
                        y="3" 
                        fill="#34d399" 
                        fontSize="10" 
                        fontWeight="900" 
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {ryStr}
                      </text>
                    </g>

                    {/* 2. Flèche Horizontale Rx (placée sous la semelle à Y = -0.10 m) */}
                    <line 
                      x1={posX} 
                      y1={ty(-0.10)} 
                      x2={tx(resX + 0.55)} 
                      y2={ty(-0.10)} 
                      stroke="#10b981" 
                      strokeWidth="2.2" 
                      markerEnd="url(#arrow-resultant)" 
                    />
                    {/* Badge texte Rx : au-dessus de la flèche horizontale */}
                    <g transform={`translate(${tx(resX + 0.28)}, ${ty(-0.10) - 12})`}>
                      <rect 
                        x={-rxBadgeW / 2} 
                        y="-9" 
                        width={rxBadgeW} 
                        height="17" 
                        rx="3" 
                        fill="#022c22" 
                        fillOpacity="0.9" 
                        stroke="#10b981" 
                        strokeWidth="0.8" 
                      />
                      <text 
                        x="0" 
                        y="3" 
                        fill="#34d399" 
                        fontSize="10" 
                        fontWeight="900" 
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {rxStr}
                      </text>
                    </g>

                    {/* 3. Badge texte Moment M : placé à gauche de la ligne de résultante */}
                    <g transform={`translate(${posX - 10}, ${ty(-0.10)})`}>
                      <rect 
                        x={-mBadgeW} 
                        y="-9" 
                        width={mBadgeW} 
                        height="17" 
                        rx="3" 
                        fill="#022c22" 
                        fillOpacity="0.9" 
                        stroke="#10b981" 
                        strokeWidth="0.8" 
                      />
                      <text 
                        x={-mBadgeW / 2} 
                        y="3" 
                        fill="#34d399" 
                        fontSize="10" 
                        fontWeight="900" 
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {mStr}
                      </text>
                    </g>
                  </g>
                );
              })()}
            </g>
          )}

          {/* --- PRESSIONS LATÉRALES & CHARGES (Filtrables individuellement ou toutes) --- */}
          {options.lateralPressures && (
            <g>
              {/* Badge indicatif du mode de filtre actif sur le canevas */}
              {selectedPressure !== 'all' && (
                <g transform={`translate(${tx(geo.ePiedAv + geo.epStem + 0.5)}, ${ty(totalH + 0.35)})`}>
                  <rect x="-5" y="-12" width="220" height="18" rx="4" fill="#0b1329" fillOpacity="0.9" stroke="#3b82f6" strokeWidth="1" />
                  <text x="6" y="1" fill="#93c5fd" fontSize="9.5" fontWeight="900">
                    VUE ISOLÉE : {
                      selectedPressure === 'soil' ? 'Sol Actif (Pa)' :
                      selectedPressure === 'surcharge' ? 'Surcharge (P_sur)' :
                      selectedPressure === 'seismic' ? `Séisme (ΔPae - ${seismicMethodName})` :
                      selectedPressure === 'water' ? 'Pression Eau (Pw)' :
                      selectedPressure === 'passive' ? 'Butée Sol Aval (Pp)' : 'Portance Semelle (q)'
                    }
                  </text>
                </g>
              )}

              {/* 1. Active Soil Pressure Triangle (Pa) */}
              {(selectedPressure === 'all' || selectedPressure === 'soil') && (
                <g>
                  <polygon 
                    points={`
                      ${tx(geo.ePiedAv + geo.epStem)},${ty(geo.epBase)}
                      ${tx(geo.ePiedAv + geo.epStem + 1.8)},${ty(geo.epBase)}
                      ${tx(geo.ePiedAv + geo.epStem)},${ty(totalH)}
                    `}
                    fill="#3b82f6"
                    fillOpacity="0.22"
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                  />
                  <text 
                    x={tx(geo.ePiedAv + geo.epStem + 0.9)} 
                    y={ty(geo.epBase + totalH / 3)} 
                    fill="#60a5fa" 
                    fontSize="11" 
                    fontWeight="bold"
                  >
                    Pa ({result.earthPressures.P_active_nominal.toFixed(1)} kN/m)
                  </text>
                </g>
              )}

              {/* 2. Surcharge Lateral Pressure Rectangle (Psur = Ka * q * H) */}
              {(selectedPressure === 'all' || selectedPressure === 'surcharge') && loads.surcharge > 0 && (
                <g>
                  {(() => {
                    const surWidth = Math.min(1.2, 0.4 + (loads.surcharge / 40));
                    return (
                      <>
                        <polygon 
                          points={`
                            ${tx(geo.ePiedAv + geo.epStem)},${ty(geo.epBase)}
                            ${tx(geo.ePiedAv + geo.epStem + surWidth)},${ty(geo.epBase)}
                            ${tx(geo.ePiedAv + geo.epStem + surWidth)},${ty(totalH)}
                            ${tx(geo.ePiedAv + geo.epStem)},${ty(totalH)}
                          `}
                          fill="#8b5cf6"
                          fillOpacity="0.2"
                          stroke="#8b5cf6"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                        />
                        <text 
                          x={tx(geo.ePiedAv + geo.epStem + surWidth + 0.1)} 
                          y={ty(geo.epBase + totalH * 0.55)} 
                          fill="#c4b5fd" 
                          fontSize="10" 
                          fontWeight="bold"
                        >
                          P_sur ({result.earthPressures.P_surcharge_nominal.toFixed(1)} kN/m)
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}

              {/* 3. Dynamic Seismic Pressure (ΔPae) - Triangle inversé (Seed & Whitman / Mononobe-Okabe) */}
              {isSeismicEnabled && ((selectedPressure === 'all' && isSeismicActive && deltaPae > 0) || selectedPressure === 'seismic') && (
                <g>
                  {deltaPae > 0 ? (
                    (() => {
                      const seisWidth = Math.min(1.8, Math.max(0.6, (deltaPae / 40) * 1.0));
                      return (
                        <>
                          {/* Triangle inversé : pointe en bas au niveau de la semelle, maximum en tête */}
                          <polygon 
                            points={`
                              ${tx(geo.ePiedAv + geo.epStem)},${ty(geo.epBase)}
                              ${tx(geo.ePiedAv + geo.epStem + seisWidth)},${ty(totalH)}
                              ${tx(geo.ePiedAv + geo.epStem)},${ty(totalH)}
                            `}
                            fill="#f43f5e"
                            fillOpacity="0.22"
                            stroke="#f43f5e"
                            strokeWidth="1.5"
                            strokeDasharray="3 2"
                          />
                          {/* Flèche de la résultante sismique à y = 0.60 H */}
                          <line 
                            x1={tx(geo.ePiedAv + geo.epStem + seisWidth + 0.55)} 
                            y1={ty(yPae)} 
                            x2={tx(geo.ePiedAv + geo.epStem)} 
                            y2={ty(yPae)} 
                            stroke="#f43f5e" 
                            strokeWidth="2" 
                            markerEnd="url(#arrow-red)" 
                          />
                          <text 
                            x={tx(geo.ePiedAv + geo.epStem + seisWidth + 0.65)} 
                            y={ty(yPae) + 3} 
                            fill="#fda4af" 
                            fontSize="10.5" 
                            fontWeight="bold"
                          >
                            ΔPae ({deltaPae.toFixed(1)} kN/m) [{seismicMethodName}]
                          </text>
                        </>
                      );
                    })()
                  ) : (
                    /* Indication si le séisme est sélectionné mais kh = 0 */
                    <g transform={`translate(${tx(geo.ePiedAv + geo.epStem + 0.5)}, ${ty(totalH * 0.5)})`}>
                      <rect x="-5" y="-12" width="280" height="24" rx="4" fill="#4c0519" fillOpacity="0.85" stroke="#f43f5e" strokeWidth="1" />
                      <text x="5" y="4" fill="#fecdd3" fontSize="10" fontWeight="bold">
                        Séisme: kh = 0.00 (inactif) - Cliquez ci-dessus pour activer
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* 4. Hydrostatic Water Pressure Triangle (Pw) */}
              {((selectedPressure === 'all' && isWaterActive && hw > 0) || selectedPressure === 'water') && (
                <g>
                  {hw > 0 ? (
                    <>
                      <polygon 
                        points={`
                          ${tx(geo.ePiedAv + geo.epStem)},${ty(0)}
                          ${tx(geo.ePiedAv + geo.epStem + 1.2)},${ty(0)}
                          ${tx(geo.ePiedAv + geo.epStem)},${ty(hw)}
                        `}
                        fill="#06b6d4"
                        fillOpacity="0.3"
                        stroke="#06b6d4"
                        strokeWidth="1.5"
                      />
                      <text 
                        x={tx(geo.ePiedAv + geo.epStem + 0.6)} 
                        y={ty(hw / 3)} 
                        fill="#38bdf8" 
                        fontSize="10" 
                        fontWeight="bold"
                      >
                        Pw (Eau = {(0.5 * 9.81 * hw * hw).toFixed(1)} kN/m)
                      </text>
                    </>
                  ) : (
                    <g transform={`translate(${tx(geo.ePiedAv + geo.epStem + 0.5)}, ${ty(totalH * 0.4)})`}>
                      <rect x="-5" y="-12" width="230" height="24" rx="4" fill="#083344" fillOpacity="0.85" stroke="#06b6d4" strokeWidth="1" />
                      <text x="5" y="4" fill="#67e8f9" fontSize="10" fontWeight="bold">
                        Nappe d'eau inactive (hw = 0 m)
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* 5. Passive Soil Pressure Triangle (Pp on front toe) */}
              {((selectedPressure === 'all' && soil.hSolAv > 0 && result.earthPressures.P_passive_nominal > 0) || selectedPressure === 'passive') && (
                <g>
                  {soil.hSolAv > 0 ? (
                    <>
                      <polygon 
                        points={`
                          ${tx(geo.ePiedAv)},${ty(0)}
                          ${tx(geo.ePiedAv - Math.min(1.2, geo.ePiedAv))},${ty(0)}
                          ${tx(geo.ePiedAv)},${ty(result.earthPressures.h_pass)}
                        `}
                        fill="#f59e0b"
                        fillOpacity="0.22"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                      />
                      <text 
                        x={tx(geo.ePiedAv - 0.1)} 
                        y={ty(result.earthPressures.y_Pp)} 
                        fill="#fcd34d" 
                        fontSize="10" 
                        fontWeight="bold"
                        textAnchor="end"
                      >
                        Pp′ ({result.earthPressures.P_passive_nominal.toFixed(1)} kN/m){result.earthPressures.P_water_front > 0 ? ` + Pw,a (${result.earthPressures.P_water_front.toFixed(1)} kN/m)` : ''}
                      </text>
                    </>
                  ) : (
                    <g transform={`translate(${tx(0)}, ${ty(geo.epBase + 0.3)})`}>
                      <rect x="-5" y="-12" width="190" height="24" rx="4" fill="#451a03" fillOpacity="0.85" stroke="#f59e0b" strokeWidth="1" />
                      <text x="5" y="4" fill="#fde68a" fontSize="10" fontWeight="bold">
                        Sol aval nul (hSolAv = 0 m)
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* 6. Soil Bearing Pressure Polygon under base */}
              {(selectedPressure === 'all' || selectedPressure === 'bearing') && (
                (() => {
                  const qToe = uls ? uls.q_toe : result.q_toe;
                  const qHeel = uls ? uls.q_heel : result.q_heel;
                  const pScale = 1.0 / Math.max(qToe, 100);
                  const qToeVis = Math.min(qToe * pScale, 1.4);
                  const qHeelVis = Math.min(qHeel * pScale, 1.4);

                  return (
                    <g>
                      <polygon 
                        points={`
                          ${tx(0)},${ty(0)}
                          ${tx(baseW)},${ty(0)}
                          ${tx(baseW)},${ty(-qHeelVis)}
                          ${tx(0)},${ty(-qToeVis)}
                        `}
                        fill="#10b981"
                        fillOpacity="0.25"
                        stroke="#10b981"
                        strokeWidth="1.5"
                      />
                      {/* Label q_orteil avec cartouche protecteur sous la forme */}
                      <g transform={`translate(${tx(0)}, ${ty(-qToeVis) + 12})`}>
                        <rect x="-2" y="-9" width="106" height="16" rx="3" fill="#022c22" fillOpacity="0.9" stroke="#10b981" strokeWidth="0.8" />
                        <text x="5" y="3" fill="#34d399" fontSize="9.5" fontWeight="900" fontFamily="monospace">
                          q_orteil = {qToe.toFixed(1)} kPa
                        </text>
                      </g>

                      {/* Label q_talon avec cartouche protecteur (décalé pour ne jamais chevaucher Rx) */}
                      <g transform={`translate(${tx(baseW)}, ${ty(-qHeelVis) + (qHeel === 0 ? 26 : 12)})`}>
                        <rect x="-104" y="-9" width="106" height="16" rx="3" fill="#022c22" fillOpacity="0.9" stroke="#10b981" strokeWidth="0.8" />
                        <text x="-5" y="3" fill="#34d399" fontSize="9.5" fontWeight="900" fontFamily="monospace" textAnchor="end">
                          q_talon = {qHeel.toFixed(1)} kPa
                        </text>
                      </g>
                    </g>
                  );
                })()
              )}
            </g>
          )}

        </svg>
      </div>

    </div>
  );
}
