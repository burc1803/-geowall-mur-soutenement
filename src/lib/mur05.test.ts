import { describe, it, expect } from 'vitest';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG, getCnbCombinations } from './analysis';
import { wallSectionProps, effectiveInertia, integrateDeflection, sustainedFactors, computeWallDeflection } from './wallDeflection';
import type { LoadsConfig, SoilProperties, WallGeometry } from './types';

// MUR-05 (APPROUVÉE le 2026-11-08) : flèche du voile en service. Cas de référence R1 à R3 de la fiche (calculés à la main).
const close = (a: number, b: number, relTol: number, label = '') => expect(Math.abs(a - b), `${label} obtenu ${a}, attendu ${b}`).toBeLessThanOrEqual(Math.abs(b) * relTol);
const DELTA_B_MU055 = (Math.atan(0.55) * 180) / Math.PI;
const GEO: WallGeometry = { wallType: 'cantilever', hMur: 3.0, epStem: 0.3, ePiedAv: 0.6, ePiedAr: 1.5, epBase: 0.4 };
const SOIL: SoilProperties = {
  gamma: 19, phi: 32, cohesion: 0, bearingSoil: { phi: 32, contact: 'cast', deltaB: DELTA_B_MU055 }, hSolAv: 0, qAllowable_SLS: 300, qUltimate_ULS: 300,
  hasWaterTable: false, gamma_w: 9.81, stabilityCriterion: 'eccentricity', geotechLevel: 'typical', psi: 1.0,
  methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'none', pga: 0.15, deltaFrictionRatio: 0.667 }
};
const LOADS: LoadsConfig = { surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };
const run = (soil: SoilProperties = SOIL, geo: WallGeometry = GEO, loads: LoadsConfig = LOADS) => analyzeRetainingWall(geo, soil, loads, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG);
const s0 = (r: ReturnType<typeof run>) => r.stemDeflection.rows.find(x => x.combName.includes('ELS S0'))!;

describe('MUR-05 R1 : mur libre G1, hr = h, S0 (Ie constant, fr/2, ρ′ = 0)', () => {
  const r = run();
  const p = r.stemDeflection.props!;
  const row = s0(r);
  it('propriétés : Ec = 24 647,5 ; n = 8,1144 ; Ig = 2,250·10⁹ ; Mcr = 24,648 ; c = 66,84 ; Icr = 4,684·10⁸', () => {
    close(p.Ec, 24647.5, 1e-4, 'Ec'); close(p.n, 8.1144, 1e-4, 'n'); close(p.Ig, 2.25e9, 1e-9, 'Ig');
    close(p.fr, 3.2863, 1e-4, 'fr'); close(p.Mcr, 24.648, 1e-3, 'Mcr'); close(p.c, 66.84, 5e-3, 'c'); close(p.Icr, 4.684e8, 0.01, 'Icr');
    expect(p.d).toBeCloseTo(232, 6); close(p.As, 1666.7, 1e-3, 'As');
  });
  it('Ma = 26,27 ; Ie = 1,939·10⁹ ; Δi = 0,989 mm ; ΔLT = 2,968 mm ; h/ΔLT = 1 011 ; limite 10,0 mm ; CONFORME', () => {
    close(row.Ma, 26.274, 1e-3, 'Ma'); expect(row.cracked).toBe(true);
    close(row.Ie, 1.9393e9, 0.01, 'Ie');
    close(row.deltaI, 0.989, 0.005, 'Δi'); close(row.deltaSus, 0.989, 0.005, 'Δi,sus'); close(row.deltaLT, 2.968, 0.005, 'ΔLT');
    close(row.hOverDelta, 1011, 0.006, 'h/Δ'); close(row.limit, 10, 1e-12); close(row.utilization, 0.297, 0.006);
    expect(row.status).toBe('OK'); expect(r.stemDeflection.status).toBe('OK');
    expect(r.stemDeflection.zetaS).toBe(3); expect(r.stemDeflection.footingRotation).toBe('NON VÉRIFIÉE');
  });
  it('sensibilités : (a) fr entier (Mcr = 49,30 > Ma) -> Ie = Ig ; (b) ρ′ = 0,00144 -> ΔLT = 2,835 mm', () => {
    close(effectiveInertia(26.274, { ...p, Mcr: 49.30 }), p.Ig, 1e-12);
    close(0.989 + (2 / (1 + 50 * 0.00144)) * 0.989, 2.835, 0.005);
  });
});

describe('MUR-05 R2 : mur libre, hr = 2,0 m < h = 3,0 m (S0)', () => {
  const r = run({ ...SOIL, hr: 2.0 });
  const row = s0(r);
  it('hr < h : Ma = 7,785 < Mcr -> Ie = Ig ; Δtête = 0,1825 mm ; ΔLT = 0,547 mm', () => {
    expect(r.soilHeight.hr).toBe(2.0);
    close(row.Ma, 7.785, 2e-3, 'Ma'); expect(row.cracked).toBe(false); close(row.Ie, 2.25e9, 1e-12);
    close(row.deltaI, 0.1825, 0.005, 'Δtête'); close(row.deltaLT, 0.547, 0.005, 'ΔLT');
  });
  it('hr = h : efforts ÉLU de MUR-02 inchangés (Mf = 39,41 pour 1,4D... 1,5H)', () => {
    close(run().combinations.find(c => c.caseNo === 1)!.mur_Mf, 39.41, 0.005, 'Mf');
  });
});

describe('MUR-05 R3 : contrôle de l\'intégration (appuyé en tête, EI = Ec·Ig, triangulaire sur h)', () => {
  const EI = 24647.5 * 2.25e9;
  it('Δmax = p0·h⁴/(419,3·EI) = 0,0610 mm à 1,342 m sous la tête ; flèche nulle en tête', () => {
    const p0 = 0.3073 * 19 * 3.0; const h = 3.0;
    const R = p0 * h / 10; // réaction en tête
    // M(d) = p0·d³/(6h) − R·d (d = profondeur sous la tête), y = h − d
    const prof = integrateDeflection(h, y => { const d = h - y; return (p0 * d * d * d) / (6 * h) - R * d; }, EI);
    close(prof.max, 0.0610, 0.005, 'Δmax'); close(h - prof.yMax, 1.342, 0.01, 'position');
    expect(Math.abs(prof.tip)).toBeLessThan(1e-3);
  });
  it('moteur : mur de sous-sol, Δmax entre les appuis (même modèle de poutre que les efforts)', () => {
    const r = run(SOIL, { ...GEO, wallType: 'basement' });
    expect(r.stemDeflection.mode).toBe('basement');
    expect(s0(r).deltaI).toBeGreaterThan(0);
    expect(s0(r).deltaI).toBeLessThan(0.5);
  });
  it('formules fermées (É4), EI constant : console triangulaire Ma·h²/(5EI) ; uniforme w·hr⁴/(8EI) + θ·(h − hr)', () => {
    const h = 3.0; const p0 = 17.516;
    const tri = integrateDeflection(h, y => (p0 * (h - y) ** 3) / (6 * h), EI).tip;
    close(tri, (p0 * h * h / 6 * 1e6 * 3000 ** 2) / (5 * EI), 0.005, 'triangulaire');
    const w = 5.0; const hr = 2.0; // kN/m par m de hauteur = N/mm
    const uni = integrateDeflection(h, y => (y < hr ? (w * (hr - y) ** 2) / 2 : 0), EI).tip;
    // charge w sur la hauteur hr au-dessus du pied (y < hr) ; au-dessus, M = 0 et la flèche se prolonge par la rotation
    const hrMm = hr * 1000;
    close(uni, (w * hrMm ** 4) / (8 * EI) + ((w * hrMm ** 3) / (6 * EI)) * ((h - hr) * 1000), 0.005, 'uniforme');
  });
});

describe('MUR-05 D6 : combinaisons ÉLS du tableau 4.1.3.4 (2020 et 2025)', () => {
  const expected: [string, Record<string, number>][] = [
    ['S0', { D: 1, H: 1 }], ['S1', { D: 1, L: 1, H: 1 }], ['S1a', { D: 1, L: 1, W: 0.3, H: 1 }], ['S1b', { D: 1, L: 1, S: 0.35, H: 1 }],
    ['S2', { D: 1, W: 1, H: 1 }], ['S2a', { D: 1, W: 1, L: 0.35, H: 1 }], ['S2b', { D: 1, W: 1, S: 0.35, H: 1 }],
    ['S3', { D: 1, S: 1, H: 1 }], ['S3a', { D: 1, S: 1, W: 0.3, H: 1 }], ['S3b', { D: 1, S: 1, L: 0.35, H: 1 }]
  ];
  for (const ed of ['2020', '2025'] as const) {
    it(`CNB ${ed} : 10 combinaisons, H = 1,0, E = 0, aucun glissement ni renversement`, () => {
      const sls = getCnbCombinations(ed).filter(c => c.type === 'SLS');
      expect(sls).toHaveLength(10);
      for (const [id, f] of expected) {
        const c = sls.find(x => x.name.includes(`ELS ${id} `))!;
        expect(c, id).toBeDefined();
        for (const k of ['D', 'L', 'S', 'W', 'E', 'H'] as const) expect(c.factors[k], `${id} ${k}`).toBeCloseTo(f[k] ?? 0, 12);
        expect(c.stabApplicable).toBe(false);
      }
    });
  }
  it('le moteur calcule la flèche de chaque combinaison ÉLS, pour chaque édition', () => {
    for (const cnbEdition of ['2020', '2025'] as const) {
      const r = run(SOIL, GEO, { ...LOADS, cnbEdition, surcharge: 10 });
      expect(r.stemDeflection.rows).toHaveLength(10);
      expect(r.combinations.filter(c => c.type === 'SLS')).toHaveLength(10);
    }
  });
});

describe('MUR-05 D3, D4, D7 : charges soutenues, Ls, limite saisissable', () => {
  it('Ls multiplie L seulement ; S, W, E transitoires', () => {
    expect(sustainedFactors({ D: 1, L: 1, S: 0.35, W: 0.3, E: 0, H: 1 }, 0.25)).toEqual({ D: 1, L: 0.25, S: 0, W: 0, E: 0, H: 1 });
  });
  it('surcharge L : Δi,sus < Δi avec Ls = 0 ; Δi,sus = Δi avec Ls = 1 ; la limite suit le diviseur', () => {
    const loads = { ...LOADS, surcharge: 10 };
    const a = run(SOIL, GEO, loads).stemDeflection.rows.find(x => x.combName.includes('ELS S1 '))!;
    const b = run(SOIL, GEO, { ...loads, sustainedLiveFraction: 1 }).stemDeflection.rows.find(x => x.combName.includes('ELS S1 '))!;
    expect(a.deltaSus).toBeLessThan(a.deltaI); close(b.deltaSus, b.deltaI, 1e-9);
    const c = run(SOIL, GEO, { ...loads, deflectionLimitDivisor: 1000 }).stemDeflection;
    close(c.limit, 3, 1e-12); expect(c.divisor).toBe(1000);
  });
  it('section invalide : aucune valeur fictive', () => {
    expect(wallSectionProps(300, 0, 1000, 30)).toBeNull();
    const res = computeWallDeflection({ mode: 'cantilever', h: 3, hr: 3, t: 300, d: 0, As: 1000, fc: 30, Ls: 0, divisor: 300, combos: [] });
    expect(res.valid).toBe(false); expect(res.status).toBe('NON VÉRIFIABLE');
  });
});

describe('MUR-05 D6 : changement de résultats ÉLS sur le projet par défaut (ancienne liste -> tableau 4.1.3.4)', () => {
  const geo: WallGeometry = { wallType: 'cantilever', hMur: 3.80, epStem: 0.35, ePiedAv: 0.80, ePiedAr: 1.75, epBase: 0.35 };
  const soil: SoilProperties = {
    gamma: 19, gamma_prime: 9.2, phi: 29, cohesion: 0, hSolAv: 1.5, qAllowable_SLS: 130, qUltimate_ULS: 392, bearingSoil: { uscs: 'SW', phi: 29, contact: 'cast' },
    methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'mononobe_okabe', pga: 0.15, deltaFrictionRatio: 0.667 },
    hasWaterTable: true, waterTableHeight: 2.5, gamma_w: 9.81, geotechLevel: 'typical', psi: 1.0, quFactored: false, frost: { deduct: true, df: 0, noDf: 'zero' }
  };
  const loads: LoadsConfig = { surcharge: 12, surchargeType: 'L', surchargeAval: 0, pointLoadTop: { enabled: true, Fy: 12, Fx: 0, name: 'Charge Tête' }, gammaM: 1, gammaF: 1, additionalLoads: [] };
  const r = run(soil, geo, loads);
  const q = (id: string) => r.combinations.find(c => c.type === 'SLS' && c.combName.includes(`ELS ${id} `))!.q_design;
  it('portance ÉLS : 1D + 1L + 1H inchangée (ancienne ELS 1 = nouvelle S1 = 123,69 kPa) ; qadm = 130 respecté', () => {
    close(q('S1'), 123.69, 0.002); close(r.critical_q_toe_SLS, 123.69, 0.002); expect(r.governingSLS.combName).toContain('ELS S1 ');
    expect(r.combinations.filter(c => c.type === 'SLS').every(c => c.status_bearing === 'OK')).toBe(true);
  });
  it('0,5L (ancienne liste : 106,57 kPa) devient 0,35L (tableau 4.1.3.4 : 101,66 kPa)', () => {
    close(q('S2a'), 101.66, 0.002); close(q('S3b'), 101.66, 0.002);
  });
  it('e ≤ B/6 : l\'écart reste NON à ÉLS S1 (e = 0,726 > 0,483), inchangé ; 1D + 1H : e = 0,459 OK', () => {
    const e = (id: string) => r.combinations.find(c => c.type === 'SLS' && c.combName.includes(`ELS ${id} `))!;
    close(e('S1').ecc, 0.726, 0.005); expect(e('S1').status_ecc).toBe('NON'); expect(e('S0').status_ecc).toBe('OK');
    expect(r.eccentricity_ok_SLS).toBe(false);
  });
  it('flèche : jamais masquée (projet par défaut, As = 15M @ 120, limite h/300 = 12,67 mm) : NON CONFORME au critère de l\'utilisateur', () => {
    expect(r.stemDeflection.valid).toBe(true);
    close(r.stemDeflection.limit, 3800 / 300, 1e-12);
    expect(r.stemDeflection.status).toBe('NON');
  });
});
