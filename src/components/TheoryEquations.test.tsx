import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CalculationStepsTheory } from './CalculationStepsTheory';
import { SoilAndSeismicMethodModal } from './SoilAndSeismicMethodModal';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG, DEFAULT_SOIL_METHOD_CONFIG } from '../lib/analysis';
import type { LoadsConfig, SoilProperties, WallGeometry } from '../lib/types';

const GEO: WallGeometry = { wallType: 'cantilever', hMur: 3.8, epStem: 0.35, ePiedAv: 0.8, ePiedAr: 1.75, epBase: 0.35 };
const SOIL: SoilProperties = {
  gamma: 19, gamma_prime: 9.2, phi: 29, cohesion: 0, mu: 0.55, hSolAv: 1.5, qAllowable_SLS: 130, qUltimate_ULS: 392, presetType: 'compact_sand',
  methodConfig: DEFAULT_SOIL_METHOD_CONFIG, hasWaterTable: true, waterTableHeight: 2.5, gamma_w: 9.81, geotechLevel: 'typical', psi: 1.0, quFactored: false,
  frost: { deduct: true, df: 1.2, noDf: 'zero' }
};
const LOADS: LoadsConfig = { surcharge: 12, surchargeType: 'L', surchargeAval: 0, additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };

describe('Étapes & formules et modale : rendu', () => {
  const result = analyzeRetainingWall(GEO, SOIL, LOADS, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
  it('le composant se rend sans NaN ni notation brute (Φ_, ^2) et affiche indices/exposants typographiques', () => {
    const html = renderToString(<CalculationStepsTheory geo={GEO} soil={SOIL} loads={LOADS} result={result} conc={DEFAULT_CONCRETE_PROPS} />);
    expect(html).toContain('<sub');
    expect(html).not.toContain('NaN');
    expect(html).not.toMatch(/Φ_|\^2|ΣV_min/);
  });
  it('modale : édition du CNB dynamique et valeurs actuelles du moteur', () => {
    const html = renderToString(
      <SoilAndSeismicMethodModal isOpen onClose={() => {}} soil={SOIL} loads={{ ...LOADS, cnbEdition: '2025' }} onUpdateSoil={() => {}} onUpdateLoads={() => {}} seismic={result.seismic} result={result} edition="2025" />
    );
    expect(html).toMatch(/CNB (<!-- -->)?2025/);
    expect(html).toContain('Valeur actuelle');
    expect(html).not.toMatch(/CNB (<!-- -->)?2020/);
    expect(html).not.toContain('NaN');
  });

  it('KAE indéterminé (φ = 20°, kh = 0,5) : NON VÉRIFIABLE partout, aucun (OK) ni 0,00 kN/m pour ΔPAE', () => {
    const soilI: SoilProperties = { ...SOIL, phi: 20, methodConfig: { ...DEFAULT_SOIL_METHOD_CONFIG, seismicMethod: 'mononobe_okabe', pga: 0.5 } };
    const r = analyzeRetainingWall(GEO, soilI, LOADS, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
    expect(r.verifiable).toBe(false);
    expect(r.seismic.scenarios.some(sc => sc.indeterminate)).toBe(true);
    const html = (['seisme', 'stabilite', 'conception_omar', 'ancrage'] as const)
      .map(sec => renderToString(<CalculationStepsTheory geo={GEO} soil={soilI} loads={LOADS} result={r} conc={DEFAULT_CONCRETE_PROPS} initialSection={sec} />))
      .join('');
    expect(html).toContain('NON VÉRIFIABLE');
    expect(html).not.toContain('(OK)');
    expect(html).not.toContain('0,00 kN/m');
    expect(html).not.toContain('NaN');
  });
});
