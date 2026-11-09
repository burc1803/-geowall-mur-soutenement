import React from 'react';
import type { AnalysisResult } from '../lib/types';
import { fr } from '../lib/theoryEquations';
import { combId, fmtInt, DeflectionMentions } from './StemDeflectionSteps';

/** Carte « Flèche du voile (ÉLS) » : valeurs lues du moteur (result.stemDeflection), une ligne par combinaison du tableau 4.1.3.4. */
export function StemDeflectionCard({ result }: { result: AnalysisResult }) {
  const sd = result.stemDeflection;
  const gi = sd.governingIndex;
  const pill = (s: string) => (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s === 'OK' ? 'bg-emerald-100 text-emerald-800' : s === 'NON' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
      {s === 'OK' ? 'OK' : s === 'NON' ? 'NON' : 'non vérifiable'}
    </span>
  );
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3" aria-label="Flèche du voile (ÉLS)">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Flèche du voile (ÉLS)</h3>
        <span className="text-[10px] font-bold text-slate-500">MUR-05 · CSA A23.3 9.8.2 · limite h/{fr(sd.divisor, 0)} = {fr(sd.limit, 2)} mm (critère de l'utilisateur)</span>
      </div>
      {!sd.valid || !sd.props ? (
        <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-3">NON VÉRIFIABLE : {sd.reason ?? 'données insuffisantes'}.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-700">
            <span>E<sub>c</sub> = {fr(sd.props.Ec, 0)} MPa</span>
            <span>M<sub>cr</sub> = {fr(sd.props.Mcr, 2)} kN·m/m</span>
            <span>I<sub>g</sub> = {fr(sd.props.Ig / 1e9, 3)}·10⁹ mm⁴/m</span>
            <span>I<sub>cr</sub> = {fr(sd.props.Icr / 1e8, 3)}·10⁸ mm⁴/m</span>
            <span>ζ<sub>s</sub> = {fr(sd.zetaS, 2)}</span>
            <span>L<sub>s</sub> = {fr(sd.Ls, 2)} L</span>
            <span>mode : {sd.mode === 'cantilever' ? 'mur libre (tête)' : 'sous-sol (maximum)'}</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  {['Combinaison', 'Ma (kN·m/m)', 'Ie (10⁹ mm⁴/m)', '|Δi| (mm)', '|ΔLT| (mm)', 'h/Δ', 'Limite (mm)', 'Statut'].map(h => <th key={h} className="px-2 py-1.5 font-bold whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {sd.rows.map((r, i) => (
                  <tr key={r.combName} className={i === gi ? 'bg-amber-50' : i % 2 ? 'bg-slate-50/60' : 'bg-white'}>
                    <td className="px-2 py-1 font-sans font-bold whitespace-nowrap" title={r.formula}>{combId(r.combName)} <span className="font-normal text-slate-500">({r.formula}){i === gi ? ' · gouverne' : ''}</span></td>
                    <td className="px-2 py-1">{fr(r.Ma, 1)}</td>
                    <td className="px-2 py-1">{fr(r.Ie / 1e9, 3)}</td>
                    <td className="px-2 py-1">{fr(r.deltaI, 2)}</td>
                    <td className="px-2 py-1 font-bold">{fr(r.deltaLT, 2)}</td>
                    <td className="px-2 py-1">{fmtInt(r.hOverDelta)}</td>
                    <td className="px-2 py-1">{fr(r.limit, 1)}</td>
                    <td className="px-2 py-1">{pill(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <DeflectionMentions sd={sd} />
    </div>
  );
}
