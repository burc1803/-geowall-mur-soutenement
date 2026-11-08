import React from 'react';
import type { SoilProperties, AnalysisResult, BearingSoilProperties } from '../lib/types';
import { USCS_CLASSES, USCS_LABEL, CONTACT_LABEL, type UscsClass, type BaseContact } from '../lib/cfemTable204';
import { resolveBearingSoil, resolveFrontSoil } from '../lib/bearingSoil';
import { DEFAULT_SOIL_METHOD_CONFIG } from '../lib/analysis';

interface Props {
  soil: SoilProperties;
  setSoil: React.Dispatch<React.SetStateAction<SoilProperties>>;
  result: AnalysisResult;
}

const fr = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '—');
const inputCls = 'p-1.5 border rounded bg-white font-mono text-xs';
const labelCls = 'text-[9px] text-slate-500 font-bold';

/** MUR-04 : sol avant (butée, poids sur le patin) et sol d'assise de la fondation (glissement, portance). Le sol arrière est dans App.tsx. */
export function FoundationSoilCards({ soil, setSoil, result }: Props) {
  const front = resolveFrontSoil(soil);
  const bs = resolveBearingSoil(soil);
  const stored: BearingSoilProperties = soil.bearingSoil ?? { phi: bs.phi, contact: bs.contact, uscs: bs.uscs, deltaB: bs.legacy && bs.deltaB !== undefined ? bs.deltaB : undefined, deltaBOrigin: bs.legacy && bs.deltaB !== undefined ? 'legacy' : undefined };
  const setBearing = (patch: Partial<BearingSoilProperties>) => setSoil(prev => ({ ...prev, bearingSoil: { ...stored, ...(prev.bearingSoil ?? {}), ...patch } }));
  const num = (v: string) => parseFloat(v) || 0;
  const manual = soil.bearingSoil?.deltaB !== undefined;

  return (
    <>
      {/* Sol avant : butée, poids sur le patin */}
      <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 flex flex-col gap-2 mt-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">Sol avant (butée, poids sur le patin)</span>
          <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
            Butée
            <select
              className="p-1 border rounded bg-white text-[11px] font-semibold"
              value={soil.methodConfig?.passiveMethod ?? DEFAULT_SOIL_METHOD_CONFIG.passiveMethod}
              onChange={e => setSoil(prev => ({ ...prev, methodConfig: { ...DEFAULT_SOIL_METHOD_CONFIG, ...(prev.methodConfig ?? {}), passiveMethod: e.target.value as 'rankine' | 'coulomb' | 'neglected' } }))}
            >
              <option value="rankine">Kp, Rankine</option>
              <option value="coulomb">Kp, Coulomb</option>
              <option value="neglected">Négligée (Kp = 0)</option>
            </select>
            <span className="font-mono text-slate-800">Kp = {result.K_passive.toFixed(2).replace('.', ',')}</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex flex-col">
            <span className={labelCls}>γ sol avant (kN/m³)</span>
            <input type="number" step="0.5" className={inputCls} value={front.gamma} onChange={e => setSoil(prev => ({ ...prev, foundation: { ...resolveFrontSoil(prev), gamma: num(e.target.value) } }))} />
          </label>
          <label className="flex flex-col">
            <span className={labelCls}>φ′ sol avant (°)</span>
            <input type="number" step="1" className={inputCls} value={front.phi} onChange={e => setSoil(prev => ({ ...prev, foundation: { ...resolveFrontSoil(prev), phi: num(e.target.value) } }))} />
          </label>
          <label className="flex flex-col">
            <span className={labelCls}>Hauteur du sol avant hs,av (m)</span>
            <input type="number" step="0.1" className={inputCls} value={soil.hSolAv} onChange={e => setSoil(prev => ({ ...prev, hSolAv: num(e.target.value) }))} />
          </label>
          <div className="flex items-end">
            <button type="button" className="text-[10px] font-bold text-amber-800 underline pb-1.5" onClick={() => setSoil(prev => ({ ...prev, foundation: undefined }))}>Identique au remblai</button>
          </div>
        </div>
        <p className="text-[10px] text-slate-500">Butée (Kp, couches, profondeur de gel) et poids du sol sur le patin (déjaugé sous la nappe).</p>
      </div>

      {/* Sol d'assise : glissement, portance */}
      <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-200 flex flex-col gap-2 mt-1">
        <span className="text-[10px] font-black uppercase text-sky-900 tracking-wider">Sol d'assise de la fondation (glissement, portance)</span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex flex-col">
            <span className={labelCls}>Type de sol (USCS, tableau 20.4)</span>
            <select
              className="p-1.5 border rounded bg-white text-xs"
              value={bs.uscs ?? ''}
              onChange={e => setBearing({ uscs: (e.target.value || undefined) as UscsClass | undefined, deltaB: undefined, deltaBOrigin: undefined })}
            >
              <option value="">non définie : choisir</option>
              {USCS_CLASSES.map(c => <option key={c} value={c}>{USCS_LABEL[c]}</option>)}
            </select>
          </label>
          <label className="flex flex-col">
            <span className={labelCls}>φ′ d'assise (°)</span>
            <input type="number" step="1" className={inputCls} value={bs.phi} onChange={e => setBearing({ phi: num(e.target.value) })} />
          </label>
          <label className="flex flex-col">
            <span className={labelCls}>Contact du béton</span>
            <select
              className="p-1.5 border rounded bg-white text-xs"
              value={bs.contact}
              onChange={e => setBearing({ contact: e.target.value as BaseContact, deltaB: undefined, deltaBOrigin: undefined })}
            >
              {(Object.keys(CONTACT_LABEL) as BaseContact[]).map(k => <option key={k} value={k}>{CONTACT_LABEL[k]}</option>)}
            </select>
          </label>
          <div className="flex flex-col gap-1">
            <label className="flex flex-col">
              <span className={labelCls}>δb (°)</span>
              <input
                type="number" step="0.5" min={0}
                className={`${inputCls} ${bs.issues.length ? 'border-rose-400' : ''}`}
                value={bs.deltaB ?? ''}
                placeholder="à saisir"
                onChange={e => setBearing({ deltaB: e.target.value === '' ? undefined : num(e.target.value), deltaBOrigin: undefined })}
              />
            </label>
            <span className="text-[10px] font-mono text-sky-900">tan δb = {bs.deltaB !== undefined ? fr(bs.tanDeltaB, 4) : '—'}</span>
            <span className="text-[9px] text-slate-600 leading-snug">Source : {bs.deltaBSource}</span>
            {bs.proposed && (
              <button
                type="button"
                disabled={!manual}
                className="text-[10px] font-bold text-sky-900 bg-white border border-sky-300 hover:bg-sky-100 rounded px-2 py-1 disabled:opacity-40"
                onClick={() => setBearing({ deltaB: undefined, deltaBOrigin: undefined })}
              >Reprendre la valeur du tableau ({fr(bs.proposed.delta, 0)}°)</button>
            )}
          </div>
          {bs.cohesive && (
            <>
              <label className="flex flex-col">
                <span className={labelCls}>cu = su (kPa), classe CL</span>
                <input type="number" step="5" min={0} className={`${inputCls} ${bs.cu > 0 ? '' : 'border-rose-400'}`} value={bs.cu || ''} placeholder="à saisir" onChange={e => setBearing({ cu: num(e.target.value) })} />
              </label>
              <div className="flex flex-col">
                <span className={labelCls}>ca court terme (tableau 20.4(b), calculée)</span>
                <span className="p-1.5 font-mono text-xs bg-white border rounded">{fr(bs.ca, 1)} kPa</span>
              </div>
            </>
          )}
          <label className="flex flex-col">
            <span className={labelCls}>Portance admissible ÉLS (kPa)</span>
            <input type="number" step="10" className={inputCls} value={soil.qAllowable_SLS} onChange={e => setSoil(prev => ({ ...prev, qAllowable_SLS: num(e.target.value) }))} />
          </label>
          <label className="flex flex-col">
            <span className={labelCls}>Portance ultime qu, ÉLU (kPa)</span>
            <input type="number" step="10" className={inputCls} value={soil.qUltimate_ULS} onChange={e => setSoil(prev => ({ ...prev, qUltimate_ULS: num(e.target.value) }))} />
          </label>
        </div>
        {bs.issues.map(m => <p key={m} role="alert" className="text-[10px] text-rose-700 font-bold">{m} : glissement NON VÉRIFIABLE.</p>)}
        {bs.legacy && <p className="text-[10px] text-amber-800 font-bold">Projet ancien : δb repris de l'ancien μ ; la classe du sol d'assise est à choisir.</p>}
        <p className="text-[10px] text-slate-500">
          δb proposé = borne inférieure du tableau 20.4(a) (CFEM 5e éd., p. 691), plafonnée à φ′ (p. 351). c′a = 0 à long terme. {bs.cohesive ? 'Assise cohérente : court terme (ca) et long terme (tan δb) vérifiés, le plus défavorable gouverne ; butée nulle à court terme. ' : ''}
          qu reste saisi : il doit correspondre à la condition la plus défavorable (CFEM 5e, p. 344).
        </p>
      </div>
    </>
  );
}
