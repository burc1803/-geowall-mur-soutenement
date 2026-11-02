import React from 'react';
import { LoadsConfig, AppliedLoad, LoadCaseType, WallGeometry } from '../lib/types';
import { PlusCircle, Trash2, ArrowDownToLine, MoveRight } from 'lucide-react';

interface ChargesManagerProps {
  loads: LoadsConfig;
  onChange: (loads: LoadsConfig) => void;
  geo: WallGeometry;
}

export function ChargesManager({ loads, onChange, geo }: ChargesManagerProps) {
  const handleAdd = (isDistributed: boolean = false) => {
    const newLoad: AppliedLoad = {
      id: Math.random().toString(36).substring(7),
      name: isDistributed ? 'Charge Répartie' : 'Nouvelle Charge',
      caseType: 'L',
      nature: 'Fy',
      magnitude: 10,
      x: geo.ePiedAv + geo.epStem / 2,
      y: geo.hMur + geo.epBase,
      isDistributed,
      length: isDistributed ? 1.0 : undefined
    };
    onChange({ ...loads, additionalLoads: [...(loads.additionalLoads || []), newLoad] });
  };

  const updateLoad = (id: string, updates: Partial<AppliedLoad>) => {
    const newArray = loads.additionalLoads.map(l => l.id === id ? { ...l, ...updates } : l);
    onChange({ ...loads, additionalLoads: newArray });
  };

  const removeLoad = (id: string) => {
    const newArray = loads.additionalLoads.filter(l => l.id !== id);
    onChange({ ...loads, additionalLoads: newArray });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* 1. Surcharges Réparties Amont & Aval */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <ArrowDownToLine size={18} className="text-blue-600" />
                    <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Surcharges Réparties Normalisées</h4>
                        <p className="text-xs text-slate-500">Surcharges uniformes sur les terre-pleins amont (arrière) et aval (avant)</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Surcharge Amont */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-700 uppercase">Surcharge Amont (Arrière)</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Talon / Remblai</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center">
                        <div className="col-span-2 flex items-center gap-1.5">
                            <input 
                                type="number" 
                                step="1"
                                min="0"
                                value={loads.surcharge}
                                onChange={(e) => onChange({ ...loads, surcharge: parseFloat(e.target.value) || 0 })}
                                className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-xs font-bold text-slate-500 w-8">kPa</span>
                        </div>

                        <div className="col-span-1">
                            <select
                                value={loads.surchargeType || 'L'}
                                onChange={(e) => onChange({ ...loads, surchargeType: e.target.value as LoadCaseType })}
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-blue-700 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="L">L (Vive)</option>
                                <option value="D">D (Morte)</option>
                                <option value="S">S (Neige)</option>
                                <option value="W">W (Vent)</option>
                            </select>
                        </div>
                    </div>

                    <span className="text-[10px] text-slate-500">
                        Poussée active rectangulaire Pa = Ka · q · H et poids stabilisant vertical sur le talon arrière.
                    </span>
                </div>

                {/* Surcharge Aval */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-700 uppercase">Surcharge Aval (Avant)</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Patin / Sol Avant</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center">
                        <div className="col-span-2 flex items-center gap-1.5">
                            <input 
                                type="number" 
                                step="1"
                                min="0"
                                value={loads.surchargeAval ?? 0}
                                onChange={(e) => onChange({ ...loads, surchargeAval: parseFloat(e.target.value) || 0 })}
                                className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-xs font-bold text-slate-500 w-8">kPa</span>
                        </div>

                        <div className="col-span-1">
                            <select
                                value={loads.surchargeAvalType || 'L'}
                                onChange={(e) => onChange({ ...loads, surchargeAvalType: e.target.value as LoadCaseType })}
                                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-black text-amber-700 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="L">L (Vive)</option>
                                <option value="D">D (Morte)</option>
                                <option value="S">S (Neige)</option>
                                <option value="W">W (Vent)</option>
                            </select>
                        </div>
                    </div>

                    <span className="text-[10px] text-slate-500">
                        Poids stabilisant vertical sur le patin avant (orteil) et majoration de la butée passive.
                    </span>
                </div>
            </div>
        </div>

        {/* 2. Charge Ponctuelle Appliquée au Milieu de la Tête du Mur */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-black">
                        ↓
                    </span>
                    <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Charge en Tête de Mur (Milieu du Voile)</h4>
                        <p className="text-xs text-slate-500">Sollicitations directes au sommet : charge verticale Fy, horizontale Fx et moment Mz</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={loads.pointLoadTop?.loadType || 'L'}
                        disabled={!(loads.pointLoadTop?.enabled ?? true)}
                        onChange={(e) => onChange({
                            ...loads,
                            pointLoadTop: {
                                enabled: loads.pointLoadTop?.enabled ?? true,
                                Fy: loads.pointLoadTop?.Fy ?? 12,
                                Fx: loads.pointLoadTop?.Fx ?? 0,
                                Mz: loads.pointLoadTop?.Mz ?? 0,
                                loadType: e.target.value as LoadCaseType,
                                name: loads.pointLoadTop?.name || 'Charge Tête'
                            }
                        })}
                        className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-black text-rose-800 disabled:opacity-40"
                    >
                        <option value="L">L - Charge Vive</option>
                        <option value="D">D - Charge Morte</option>
                        <option value="S">S - Charge Neige</option>
                        <option value="W">W - Charge Vent</option>
                        <option value="E">E - Charge Séisme</option>
                    </select>

                    <label className="flex items-center gap-1.5 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-lg">
                        <input 
                            type="checkbox"
                            checked={loads.pointLoadTop?.enabled ?? true}
                            onChange={(e) => onChange({
                                ...loads,
                                pointLoadTop: {
                                    enabled: e.target.checked,
                                    Fy: loads.pointLoadTop?.Fy ?? 12,
                                    Fx: loads.pointLoadTop?.Fx ?? 0,
                                    Mz: loads.pointLoadTop?.Mz ?? 0,
                                    loadType: loads.pointLoadTop?.loadType || 'L',
                                    name: 'Charge Tête'
                                }
                            })}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-700">Activer</span>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Fy */}
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-600">Verticale Fy (↓)</span>
                    <div className="flex items-center gap-1.5">
                        <input 
                            type="number"
                            step="1"
                            value={loads.pointLoadTop?.Fy ?? 12}
                            disabled={!(loads.pointLoadTop?.enabled ?? true)}
                            onChange={(e) => onChange({
                                ...loads,
                                pointLoadTop: {
                                    enabled: true,
                                    Fy: parseFloat(e.target.value) || 0,
                                    Fx: loads.pointLoadTop?.Fx ?? 0,
                                    Mz: loads.pointLoadTop?.Mz ?? 0,
                                    loadType: loads.pointLoadTop?.loadType || 'L',
                                    name: 'Charge Tête'
                                }
                            })}
                            className="flex-1 p-2 bg-rose-50 border border-rose-200 rounded-lg text-sm font-black text-rose-700 disabled:opacity-40"
                        />
                        <span className="text-xs font-bold text-slate-500">kN</span>
                    </div>
                </div>

                {/* Fx */}
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-600">Horizontale Fx (→)</span>
                    <div className="flex items-center gap-1.5">
                        <input 
                            type="number"
                            step="1"
                            value={loads.pointLoadTop?.Fx ?? 0}
                            disabled={!(loads.pointLoadTop?.enabled ?? true)}
                            onChange={(e) => onChange({
                                ...loads,
                                pointLoadTop: {
                                    enabled: true,
                                    Fy: loads.pointLoadTop?.Fy ?? 12,
                                    Fx: parseFloat(e.target.value) || 0,
                                    Mz: loads.pointLoadTop?.Mz ?? 0,
                                    loadType: loads.pointLoadTop?.loadType || 'L',
                                    name: 'Charge Tête'
                                }
                            })}
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-700 disabled:opacity-40"
                        />
                        <span className="text-xs font-bold text-slate-500">kN</span>
                    </div>
                </div>

                {/* Mz */}
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-600">Moment Mz (↻)</span>
                    <div className="flex items-center gap-1.5">
                        <input 
                            type="number"
                            step="1"
                            value={loads.pointLoadTop?.Mz ?? 0}
                            disabled={!(loads.pointLoadTop?.enabled ?? true)}
                            onChange={(e) => onChange({
                                ...loads,
                                pointLoadTop: {
                                    enabled: true,
                                    Fy: loads.pointLoadTop?.Fy ?? 12,
                                    Fx: loads.pointLoadTop?.Fx ?? 0,
                                    Mz: parseFloat(e.target.value) || 0,
                                    loadType: loads.pointLoadTop?.loadType || 'L',
                                    name: 'Charge Tête'
                                }
                            })}
                            className="flex-1 p-2 bg-purple-50 border border-purple-200 rounded-lg text-sm font-black text-purple-700 disabled:opacity-40"
                        />
                        <span className="text-xs font-bold text-slate-500">kNm</span>
                    </div>
                </div>

                {/* Coords */}
                <div className="flex flex-col justify-center bg-slate-50 p-2 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-800">Point d'application :</span>
                    <span>X = {(geo.ePiedAv + geo.epStem / 2).toFixed(2)} m</span>
                    <span>Y = {(geo.hMur + geo.epBase).toFixed(2)} m</span>
                </div>
            </div>
        </div>

        {/* 3. Surcharges Avancées & Ponctuelles Personnalisées */}
        <div className="flex items-center justify-between mt-2">
            <h3 className="text-lg font-black text-slate-800">Charges Supplémentaires Libres</h3>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => handleAdd(false)}
                    className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                >
                    <PlusCircle size={16} />
                    Charge Ponctuelle
                </button>
                <button 
                    onClick={() => handleAdd(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                >
                    <ArrowDownToLine size={16} />
                    Charge Répartie
                </button>
            </div>
        </div>

        {(!loads.additionalLoads || loads.additionalLoads.length === 0) ? (
            <div className="text-center text-slate-500 py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                Aucune charge supplémentaire ou répartie pour le moment.
            </div>
        ) : (
            <div className="flex flex-col gap-3">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-black uppercase text-slate-400">
                    <div className="col-span-3">Nom & Type</div>
                    <div className="col-span-2">Cas / Direction</div>
                    <div className="col-span-3">Magnitude & Format</div>
                    <div className="col-span-3">Position X/Y (m)</div>
                    <div className="col-span-1 text-center">Act.</div>
                </div>
                {loads.additionalLoads.map(load => (
                    <div key={load.id} className="grid grid-cols-12 gap-3 items-start bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="col-span-3 flex flex-col gap-2">
                            <input 
                                type="text"
                                value={load.name}
                                onChange={(e) => updateLoad(load.id, { name: e.target.value })}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex bg-slate-100 p-1 rounded-md">
                               <button 
                                  className={`flex-1 text-[10px] uppercase font-bold py-1 rounded transition-colors ${!load.isDistributed ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                  onClick={() => updateLoad(load.id, { isDistributed: false, length: undefined })}
                               >Ponctuelle</button>
                               <button 
                                  className={`flex-1 text-[10px] uppercase font-bold py-1 rounded transition-colors ${load.isDistributed ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                                  onClick={() => updateLoad(load.id, { isDistributed: true, length: 1.0, nature: load.nature === 'Mz' ? 'Fy' : load.nature })}
                               >Répartie</button>
                            </div>
                        </div>
                        <div className="col-span-2 flex flex-col gap-2">
                            <select
                                value={load.caseType}
                                onChange={(e) => updateLoad(load.id, { caseType: e.target.value as LoadCaseType })}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold bg-slate-50"
                            >
                                <option value="D">Morte (D)</option>
                                <option value="L">Vive (L)</option>
                                <option value="S">Neige (S)</option>
                                <option value="W">Vent (W)</option>
                                <option value="E">Séisme (E)</option>
                                <option value="H">Poussée (H)</option>
                            </select>
                            <select
                                value={load.nature}
                                onChange={(e) => updateLoad(load.id, { nature: e.target.value as any })}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold bg-slate-50"
                            >
                                <option value="Fy">Verticale (Fy ↓)</option>
                                <option value="Fx">Horizontale (Fx →)</option>
                                {!load.isDistributed && <option value="Mz">Moment (Mz ↻)</option>}
                            </select>
                        </div>
                        <div className="col-span-3 flex flex-col gap-2">
                            <label className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 w-10">VALEUR</span>
                                <input 
                                    type="number" step="1"
                                    value={load.magnitude}
                                    onChange={(e) => updateLoad(load.id, { magnitude: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-2 border border-blue-200 rounded-lg text-sm font-bold text-blue-700 bg-blue-50"
                                />
                                <span className="text-xs font-bold text-slate-500 w-12">{load.isDistributed ? 'kPa' : (load.nature === 'Mz' ? 'kNm' : 'kN')}</span>
                            </label>
                            {load.isDistributed && (
                                <label className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 w-10">ÉTENDUE</span>
                                    <input 
                                        type="number" step="0.1"
                                        value={load.length || 0}
                                        onChange={(e) => updateLoad(load.id, { length: parseFloat(e.target.value) || 0.1 })}
                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold bg-slate-50"
                                    />
                                    <span className="text-xs font-bold text-slate-500 w-12">m</span>
                                </label>
                            )}
                        </div>
                        <div className="col-span-3 flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <span className="text-[10px] font-bold text-slate-400 w-4">X</span>
                                <input 
                                    type="number" step="0.1"
                                    value={load.x}
                                    onChange={(e) => updateLoad(load.id, { x: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold bg-slate-50"
                                />
                            </div>
                            <div className="flex gap-2 items-center">
                                <span className="text-[10px] font-bold text-slate-400 w-4">Y</span>
                                <input 
                                    type="number" step="0.1"
                                    value={load.y}
                                    onChange={(e) => updateLoad(load.id, { y: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold bg-slate-50"
                                />
                            </div>
                        </div>
                        <div className="col-span-1 flex justify-center pt-2">
                            <button 
                                onClick={() => removeLoad(load.id)}
                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 mt-4 leading-relaxed">
            <strong className="text-slate-800">Convention et utilisation :</strong><ul className="list-disc ml-5 mt-2 space-y-1">
            <li><strong>Origine (0,0)</strong> : Coin inférieur gauche de la semelle (pointe du talon avant).</li>
            <li><strong>Charge Ponctuelle</strong> : Magnitude en kN (ou kNm pour Mz). Appliquée au point (X,Y).</li>
            <li><strong>Charge Répartie</strong> : Magnitude en kPa (kN/m / m). L'<strong>étendue (m)</strong> démarre à (X,Y). Si Fy (verticale), s'étend vers la droite (X + étendue). Si Fx (horizontale), s'étend vers le haut (Y + étendue).</li>
            </ul>
        </div>
    </div>
  );
}
