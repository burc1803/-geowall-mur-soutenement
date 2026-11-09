import { describe, it, expect } from 'vitest';
import { analyzeRetainingWall } from './analysis';
import {
  defaultProject, projectToJson, parseProjectText, projectFileName, loadAutosave, saveAutosave, AUTOSAVE_KEY, type ProjectState
} from './projectFile';

const run = (s: ProjectState) => analyzeRetainingWall(s.geo, s.soil, s.loads, s.conc, s.rebarConfig);

function modified(): ProjectState {
  const s = defaultProject();
  s.name = 'Mur A / 12';
  s.geo = { ...s.geo, hMur: 4.2, ePiedAr: 2.1 };
  s.soil = { ...s.soil, phi: 31, siteSeismic: { locality: 'Québec', siteClass: 'C', sa02: 0.5, pga: 0.25, pgv: 0.1 } };
  s.loads = { ...s.loads, surcharge: 15, cnbEdition: '2025' };
  s.conc = { ...s.conc };
  s.rebarConfig = { ...s.rebarConfig, mur_interieur: { barSize: '20M', spacing: 150 } };
  return s;
}

describe('projectFile : aller-retour', () => {
  it('sérialisation -> désérialisation : état identique et mêmes résultats moteur', () => {
    const s = modified();
    const r = parseProjectText(projectToJson(s));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state).toEqual(s);
    expect(JSON.stringify(run(r.state))).toBe(JSON.stringify(run(s)));
  });
  it('contenu : format, version, édition CNB, nom', () => {
    const o = JSON.parse(projectToJson(modified(), new Date('2026-01-02T03:04:05Z')));
    expect(o).toMatchObject({ format: 'geowall-project', version: 1, appEdition: '2025', name: 'Mur A / 12', savedAt: '2026-01-02T03:04:05.000Z' });
    for (const k of ['geo', 'soil', 'loads', 'conc', 'rebarConfig']) expect(o[k]).toBeTruthy();
  });
  it('nom de fichier assaini + date + extension', () => {
    expect(projectFileName('Mur A / 12', new Date(2026, 10, 8))).toBe('Mur-A-12_2026-11-08.geowall.json');
    expect(projectFileName('  ', new Date(2026, 0, 5))).toBe('projet-mur_2026-01-05.geowall.json');
  });
});

describe('projectFile : champs manquants (anciens fichiers)', () => {
  it('fichier minimal -> valeurs par défaut', () => {
    const r = parseProjectText(JSON.stringify({ format: 'geowall-project', version: 1 }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state).toEqual(defaultProject());
  });
  it('champs partiels fusionnés avec les défauts', () => {
    const r = parseProjectText(JSON.stringify({ format: 'geowall-project', version: 1, geo: { hMur: 5 }, soil: { phi: 33, frost: { df: 1.2 } } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const d = defaultProject();
    expect(r.state.geo).toEqual({ ...d.geo, hMur: 5 });
    expect(r.state.soil.phi).toBe(33);
    expect(r.state.soil.frost).toEqual({ ...d.soil.frost, df: 1.2 });
    expect(r.state.loads).toEqual(d.loads);
    expect(Number.isFinite(run(r.state).cnbEdition ? 1 : NaN)).toBe(true);
  });
  it('ancien rebarConfig sans faces ext./int. : hérite de mur_horizontal (resolveRebarConfig)', () => {
    const r = parseProjectText(JSON.stringify({ format: 'geowall-project', version: 1, rebarConfig: { mur_horizontal: { barSize: '20M', spacing: 300 } } }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.rebarConfig.mur_horizontal_ext).toEqual({ barSize: '20M', spacing: 300 });
      expect(r.state.rebarConfig.mur_horizontal_int).toEqual({ barSize: '20M', spacing: 300 });
    }
  });
  it('ancien sol sans sol d’assise : bearingSoil laissé absent (migration du moteur)', () => {
    const r = parseProjectText(JSON.stringify({ format: 'geowall-project', version: 1, soil: { phi: 30 } }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.soil.bearingSoil).toBeUndefined();
  });
  it('appEdition seule -> loads.cnbEdition', () => {
    const r = parseProjectText(JSON.stringify({ format: 'geowall-project', version: 1, appEdition: '2025' }));
    expect(r.ok && r.state.loads.cnbEdition).toBe('2025');
  });
});

describe('projectFile : fichier invalide', () => {
  const bad = [
    ['pas du JSON', 'ceci n’est pas du json'],
    ['tableau', '[]'],
    ['mauvais format', JSON.stringify({ format: 'autre', version: 1 })],
    ['version absente', JSON.stringify({ format: 'geowall-project' })],
    ['version future', JSON.stringify({ format: 'geowall-project', version: 99 })],
    ['section illisible', JSON.stringify({ format: 'geowall-project', version: 1, geo: 'x' })],
    ['nombre invalide', JSON.stringify({ format: 'geowall-project', version: 1, geo: { hMur: 'grand' } })],
    ['édition CNB inconnue', JSON.stringify({ format: 'geowall-project', version: 1, loads: { cnbEdition: '1999' } })],
  ] as const;
  for (const [label, text] of bad) {
    it(`${label} -> erreur`, () => {
      const r = parseProjectText(text);
      expect(r.ok).toBe(false);
      if ('error' in r) expect(r.error.length).toBeGreaterThan(10);
    });
  }
  it('état courant inchangé après un échec (aucune mutation)', () => {
    const current = modified();
    const snapshot = JSON.stringify(current);
    parseProjectText(JSON.stringify({ format: 'geowall-project', version: 1, geo: { hMur: 'x' } }));
    expect(JSON.stringify(current)).toBe(snapshot);
  });
});

describe('projectFile : sauvegarde locale', () => {
  const mem = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
  it('aller-retour via stockage', () => {
    const st = mem();
    const s = modified();
    expect(saveAutosave(s, st)).toBe(true);
    expect(loadAutosave(st)).toEqual(s);
  });
  it('stockage vide, corrompu ou qui lève -> null / false sans exception', () => {
    expect(loadAutosave(mem())).toBeNull();
    const st = mem(); st.m.set(AUTOSAVE_KEY, '{oups');
    expect(loadAutosave(st)).toBeNull();
    const boom = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(loadAutosave(boom)).toBeNull();
    expect(saveAutosave(defaultProject(), boom)).toBe(false);
  });
});
