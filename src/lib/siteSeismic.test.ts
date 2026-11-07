import { describe, it, expect } from 'vitest';
import data from '../data/shd2020.json';
import { formatSiteName, searchSites, findSite, classValues, applySiteSelection, sourceAfterManualAh, buildAhSource, type ShdData } from './siteSeismic';

const D = data as unknown as ShdData;
const pick = (prov: string, q: string, cls: string) => {
  const site = searchSites(D, prov, q)[0];
  return { site, v: classValues(site, cls)! };
};

describe('MUR-03 : données CNRC SHD-VAS 2020', () => {
  it('679 localités, 13 provinces', () => {
    expect(D.sites.length).toBe(679);
    expect(new Set(D.sites.map(s => s.prov)).size).toBe(13);
  });
  it('valeurs de contrôle XD', () => {
    expect(pick('QC', 'Trois-Rivières', 'XD').v.PGA).toBeCloseTo(0.333, 3);
    expect(pick('QC', 'Québec', 'XD').v.PGA).toBeCloseTo(0.428, 3);
    expect(pick('QC', 'La Malbaie', 'XD').v.PGA).toBeCloseTo(1.21, 2);
    expect(pick('QC', 'Montréal city hall', 'XD').v.PGA).toBeCloseTo(0.48, 3);
  });
  it('recherche sans accent ni casse', () => {
    expect(searchSites(D, 'QC', 'trois rivieres').map(s => s.name)).toContain('Trois-Rivières');
    expect(searchSites(D, 'QC', 'zzzz')).toEqual([]);
  });
  it('mise en forme des noms', () => {
    expect(formatSiteName('LaMalbaie')).toBe('La Malbaie');
    expect(formatSiteName('Trois-Rivières')).toBe('Trois-Rivières');
    expect(formatSiteName('Montréalcityhall_Hôteldeville')).toBe('Montréal city hall / Hôtel de ville');
  });
  it('Appliquer : ah brut et source attendue', () => {
    const site = findSite(D, 'QC', 'Trois-Rivières')!;
    const r = applySiteSelection(site, 'XD')!;
    expect(r.ah).toBe(site.classes.XD!.PGA);
    expect(r.source).toBe('CNRC SHD-VAS 2020 (CNB 2020, partie 4), Trois-Rivières, QC, XD, 2 %/50 ans, PGA = 0,333 g');
    expect(r.source).toBe(buildAhSource(site, 'XD', r.ah));
    expect(r.site).toMatchObject({ province: 'QC', siteId: 'Trois-Rivières', siteClass: 'XD', pga: r.ah, source: r.source });
  });
  it('sans classe choisie : rien à appliquer (bouton désactivé)', () => {
    const site = findSite(D, 'QC', 'Trois-Rivières')!;
    expect(applySiteSelection(site, '')).toBeUndefined();
    expect(applySiteSelection(site, 'XF')).toBeUndefined();
  });
  it('ah modifié à la main : source « saisie manuelle »', () => {
    const src = 'CNRC SHD-VAS 2020 (CNB 2020, partie 4), X';
    expect(sourceAfterManualAh(src, 0.333, 0.3)).toBe('saisie manuelle');
    expect(sourceAfterManualAh(src, 0.333, 0.333)).toBe(src);
    expect(sourceAfterManualAh('autre', 0.1, 0.2)).toBe('autre');
  });
});
