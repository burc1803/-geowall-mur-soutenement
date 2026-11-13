import React from 'react';
import { Eq, V } from './Eq';
import { buildStemPassiveEq, fr } from '../lib/theoryEquations';
import { STEM_PASSIVE_EXPLAIN, STEM_PASSIVE_LABEL } from '../lib/stemPassive';
import type { AnalysisResult } from '../lib/types';

/** MUR-07 D5 : étape « Poussée passive sur le voile » (équations sur 3 lignes) + tableau des 4 choix. Toutes les valeurs viennent du moteur. */
export function StemPassiveSteps({ result, hSolAv }: { result: AnalysisResult; hSolAv: number }) {
  const q = buildStemPassiveEq(result, hSolAv);
  const sameKp = Math.abs(q.Kp_eff - q.Kp) < 1e-12;
  return (
    <div className="mt-4 flex flex-col gap-3" data-testid="stem-passive-steps">
      <h3 className="text-sm font-black text-slate-800">Poussée passive sur le voile (MUR-07) — choix {q.choice} : {STEM_PASSIVE_LABEL[q.choice]}</h3>
      <p className="text-xs text-slate-600">Combinaison qui gouverne le voile : <strong>{q.comb}</strong>.</p>
      {!q.active || q.choice === 0 ? (
        <p className={`text-xs ${q.choice === 0 ? 'text-slate-600' : 'text-amber-800 font-bold'}`}>
          {q.choice === 0 ? 'Poussée passive non comptée sur le voile : M_f ne comprend que les poussées côté remblai.' : 'Aucune pression passive sur le voile (h_v = 0 ou Kp = 0) : M_f inchangé.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Eq
            general={<><V n="h" s="v" /> = <V n="h" s="s,av" /> − <V n="t" s="0" />, t₀ = profondeur de gel z_gel (MUR-02 D9) ou, si h<sub>s,av</sub> &gt; h<sub>mur</sub>, h<sub>s,av</sub> − h<sub>mur</sub></>}
            substituted={<>{q.hvSub}</>}
            result={<><V n="h" s="v" /> = {fr(q.hv)} m</>}
          />
          <Eq
            general={<><V n="K" s="p,eff" /> = <V n="K" s="p" />{sameKp ? '' : <> · <V n="P" s="PE" />/<V n="P" s="P" /> (séisme, option « Kpe »)</>}</>}
            substituted={<>{fr(q.Kp, 4)}{sameKp ? '' : <> × {fr(q.Kp_eff / q.Kp, 3)}</>}</>}
            result={<><V n="K" s="p,eff" /> = {fr(q.Kp_eff, 4)}</>}
          />
          <Eq
            general={q.layered
              ? <><V n="P" s="p,v" /> = <V n="P" s="1" /> + <V n="P" s="2" />, <V n="P" s="1" /> = ½ <V n="K" s="p,eff" /> <V n="γ" /> (<V n="t" s="n" />² − <V n="t" s="0" />²), <V n="P" s="2" /> = <V n="K" s="p,eff" /> [ (<V n="γ" /> − <V n="γ" prime />) <V n="t" s="n" /> (<V n="h" s="s,av" /> − <V n="t" s="2" />) + <V n="γ" prime /> (<V n="h" s="s,av" />² − <V n="t" s="2" />²)/2 ] (t<sub>n</sub> = profondeur de la nappe, t₂ = max(t₀ ; t<sub>n</sub>))</>
              : <><V n="P" s="p,v" /> = ½ · <V n="K" s="p,eff" /> · <V n="γ" /> · (<V n="h" s="s,av" />² − <V n="t" s="0" />²)</>}
            substituted={<>{q.PSub}</>}
            result={<>{q.PRes} kN/m (nominale)</>}
          />
          <Eq
            general={q.layered
              ? <><V n="M" s="p,v" /> = <V n="M" s="1" /> + <V n="M" s="2" /> = ∫ <V n="p" />(<V n="t" />) · (<V n="h" s="s,av" /> − <V n="t" />) d<V n="t" /> : <V n="M" s="1" /> = <V n="K" s="p,eff" /> <V n="γ" /> [ <V n="h" s="s,av" /> (<V n="t" s="n" />² − <V n="t" s="0" />²)/2 − (<V n="t" s="n" />³ − <V n="t" s="0" />³)/3 ], <V n="M" s="2" /> = <V n="K" s="p,eff" /> [ (<V n="γ" /> − <V n="γ" prime />) <V n="t" s="n" /> (<V n="h" s="s,av" /> − <V n="t" s="2" />)²/2 + <V n="γ" prime /> ( <V n="h" s="s,av" /> (<V n="h" s="s,av" />² − <V n="t" s="2" />²)/2 − (<V n="h" s="s,av" />³ − <V n="t" s="2" />³)/3 ) ]</>
              : <><V n="M" s="p,v" /> = <V n="K" s="p,eff" /> · <V n="γ" /> · [ <V n="h" s="s,av" /> (<V n="h" s="s,av" />² − <V n="t" s="0" />²)/2 − (<V n="h" s="s,av" />³ − <V n="t" s="0" />³)/3 ] (= K·γ·h<sub>v</sub>³/6 sans gel ni nappe)</>}
            substituted={<>{q.MSub}</>}
            result={<>{q.MRes} kN·m/m (au pied du voile, nominal)</>}
          />
          <Eq
            general={<>Facteur du choix : {STEM_PASSIVE_LABEL[q.choice]}{q.seismicNull ? ' (cas 5)' : ''}</>}
            substituted={<>{q.factorSub}</>}
            result={<><V n="f" s="p" /> = {fr(q.factor, 3)}</>}
          />
          <Eq
            general={<><V n="M" s="f,net" /> = <V n="M" s="f,remblai" /> − <V n="f" s="p" /> · <V n="M" s="p,v" /></>}
            substituted={<>{q.netSub}</>}
            result={<><V n="M" s="f,net" /> = {fr(q.Mnet, 2)} kN·m/m</>}
            note="Moment signé au pied du voile ; le M_f de dimensionnement est le maximum en valeur absolue le long du voile."
          />
        </div>
      )}
      <p className={`text-xs ${q.choice === 3 && !q.seismicNull ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>{STEM_PASSIVE_EXPLAIN[q.choice]}</p>
      <table className="text-xs border border-slate-200 w-full max-w-xl">
        <thead><tr className="bg-slate-50 text-left"><th className="px-2 py-1">Choix</th><th className="px-2 py-1">Libellé</th><th className="px-2 py-1 text-right">M<sub>f</sub> (enveloppe ÉLU, maximum le long du voile, kN·m/m)</th><th className="px-2 py-1">Combinaison qui gouverne</th></tr></thead>
        <tbody>
          {q.table.map(t => (
            <tr key={t.choice} className={t.governs ? 'font-bold bg-amber-50' : ''}>
              <td className="px-2 py-1">{t.choice}</td><td className="px-2 py-1">{t.label}</td><td className="px-2 py-1 text-right">{fr(t.Mf, 2)}</td><td className="px-2 py-1">{t.comb}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
