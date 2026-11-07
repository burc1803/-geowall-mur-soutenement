import React, { useEffect, useMemo, useState } from 'react';
import { PROVINCES, SITE_CLASSES, NOTE_2025, applySiteSelection, classValues, findSite, formatSiteName, searchSites, type ShdData } from '../lib/siteSeismic';
import type { SiteSeismicValues } from '../lib/types';

interface Props {
  edition: '2020' | '2025';
  saved?: SiteSeismicValues;
  currentAh: number;
  onApply: (r: { site: SiteSeismicValues; ah: number; source: string }) => void;
}

const fr = (x: number, d = 3) => x.toFixed(d).replace('.', ',');

/** MUR-03 : sélection de la localité et de la classe d'emplacement, données CNRC SHD-VAS 2020 (chargées à la demande). */
export function SiteSeismicCard({ edition, saved, currentAh, onApply }: Props) {
  const [data, setData] = useState<ShdData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [prov, setProv] = useState(saved?.province ?? '');
  const [query, setQuery] = useState('');
  const [siteId, setSiteId] = useState(saved?.siteId ?? '');
  const [cls, setCls] = useState(saved?.siteClass && /^X[A-E]$/.test(saved.siteClass) ? saved.siteClass : '');

  useEffect(() => {
    let alive = true;
    import('../data/shd2020.json')
      .then(m => { if (alive) setData((m.default ?? m) as unknown as ShdData); })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, []);

  const list = useMemo(() => (data && prov ? searchSites(data, prov, query) : []), [data, prov, query]);
  const site = data && prov && siteId ? findSite(data, prov, siteId) : undefined;
  const vals = site && cls ? classValues(site, cls) : undefined;
  const canApply = !!site && !!vals;
  const applied = !!saved?.source && currentAh === saved.pga;

  return (
    <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-200 flex flex-col gap-2">
      <span className="text-[10px] font-black uppercase text-sky-900 tracking-wider">Site (données CNRC, CNB 2020)</span>
      {loadError && <p role="alert" className="text-[10px] text-rose-700 font-bold">Chargement des données CNRC impossible.</p>}
      {!data && !loadError && <p className="text-[10px] text-slate-500">Chargement des données CNRC…</p>}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-[9px] text-slate-500 font-bold">Province</span>
          <select className="p-1.5 border rounded bg-white text-xs" value={prov} onChange={e => { setProv(e.target.value); setSiteId(''); setQuery(''); }}>
            <option value="">choisir…</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[9px] text-slate-500 font-bold">Recherche de localité</span>
          <input type="search" className="p-1.5 border rounded bg-white text-xs" value={query} placeholder="nom…" disabled={!prov} onChange={e => setQuery(e.target.value)} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[9px] text-slate-500 font-bold">Localité ({list.length})</span>
        <select className="p-1.5 border rounded bg-white text-xs" value={siteId} disabled={!prov} onChange={e => setSiteId(e.target.value)}>
          <option value="">choisir…</option>
          {list.map(s => <option key={s.name} value={s.name}>{formatSiteName(s.name)}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[9px] text-slate-500 font-bold">Classe d'emplacement : classe du sol sous la semelle, remblai exclu (CFEM 5e éd., p. 629)</span>
        <select className="p-1.5 border rounded bg-white text-xs" value={cls} onChange={e => setCls(e.target.value)}>
          <option value="">choisir la classe</option>
          {SITE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      {!cls && <p className="text-[10px] text-amber-800 font-bold">Classe non choisie : choisir la classe (aucune valeur par défaut).</p>}
      {site && (
        <p className="text-[10px] font-mono text-sky-900">
          {formatSiteName(site.name)}, {site.prov} ; lat. {fr(site.lat, 2)}, long. {fr(site.lon, 2)}
          {vals && <> ; PGA({cls}) = {fr(vals.PGA)} g ; Sa(0,2) = {fr(vals.Sa0_2)} g ; PGV = {fr(vals.PGV)} m/s (informatif)</>}
        </p>
      )}
      <button
        type="button"
        disabled={!canApply}
        className="text-[11px] font-bold text-sky-900 bg-white border border-sky-300 hover:bg-sky-100 rounded-lg px-3 py-1.5 disabled:opacity-40"
        onClick={() => { if (site) { const r = applySiteSelection(site, cls); if (r) onApply(r); } }}
      >
        Appliquer : ah = PGA({cls || 'X'})
      </button>
      {applied && <p className="text-[10px] text-emerald-800">ah appliqué : {fr(currentAh, 4)} g. Source : {saved?.source}</p>}
      {edition === '2025' && <p role="note" className="text-[10px] text-amber-800 font-bold">{NOTE_2025}</p>}
      <p className="text-[10px] text-slate-500 leading-snug">2 % en 50 ans. ah reste modifiable à la main (la source devient « saisie manuelle »). Le moteur utilise kh = ah et kv = ⅔·kh par défaut.</p>
    </div>
  );
}
