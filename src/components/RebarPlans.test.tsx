import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { RebarPlans } from './RebarPlans';
import { OfficialNoteDeCalcul } from './OfficialNoteDeCalcul';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG } from '../lib/analysis';
import type { LoadsConfig, SoilProperties, WallGeometry } from '../lib/types';

const GEO: WallGeometry = { wallType: 'cantilever', hMur: 3.0, epStem: 0.3, ePiedAv: 0.6, ePiedAr: 1.5, epBase: 0.4 };
const SOIL: SoilProperties = {
  gamma: 19, phi: 32, cohesion: 0, mu: 0.55, hSolAv: 0, qAllowable_SLS: 300, qUltimate_ULS: 300,
  hasWaterTable: false, gamma_w: 9.81, stabilityCriterion: 'eccentricity', geotechLevel: 'typical', psi: 1.0,
  methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'none', pga: 0.15, deltaFrictionRatio: 0.667 }
};
const LOADS: LoadsConfig = { surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };

describe('Rendu de l\'onglet Plans et de la section 6 de la note', () => {
  const result = analyzeRetainingWall(GEO, SOIL, LOADS, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
  it('RebarPlans : 7 zones, schéma SVG, nomenclature, avertissement', () => {
    const html = renderToString(<RebarPlans geo={GEO} soil={SOIL} loads={LOADS} conc={DEFAULT_CONCRETE_PROPS} result={result} rebarConfig={DEFAULT_REBAR_CONFIG} onChange={() => {}} />);
    for (const id of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7']) expect(html).toContain(id);
    expect(html).toContain('<svg');
    expect(html).toContain('Longueurs indicatives');
    expect(html).toContain('répartition entre faces non prescrite par la norme');
    expect(html).not.toContain('NaN');
  });
  it('Note : section 6 présente', () => {
    const html = renderToString(<OfficialNoteDeCalcul geo={GEO} soil={SOIL} conc={DEFAULT_CONCRETE_PROPS} result={result} loads={LOADS} />);
    expect(html).toContain('Armatures (plan)');
    expect(html).toContain('Nomenclature des barres');
  });
});
