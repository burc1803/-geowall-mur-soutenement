import { describe, it, expect } from 'vitest';
import { analyzeRetainingWall, DEFAULT_CONCRETE_PROPS, DEFAULT_REBAR_CONFIG, requiredAsForMf, resolveRebarConfig } from './analysis';
import { buildBarSchedule, buildZoneRows, proposeAutoConfig, setZoneSelection, totalScheduleMass, zoneStatus } from './rebarPlans';
import type { LoadsConfig, SoilProperties, WallGeometry, RebarCustomConfig } from './types';

// Cas G1 (MUR-02 §7) : mêmes données que mur02.test.ts
const GEO: WallGeometry = { wallType: 'cantilever', hMur: 3.0, epStem: 0.3, ePiedAv: 0.6, ePiedAr: 1.5, epBase: 0.4 };
const SOIL: SoilProperties = {
  gamma: 19, phi: 32, cohesion: 0, mu: 0.55, hSolAv: 0, qAllowable_SLS: 300, qUltimate_ULS: 300,
  hasWaterTable: false, gamma_w: 9.81, stabilityCriterion: 'eccentricity', geotechLevel: 'typical', psi: 1.0,
  methodConfig: { activeMethod: 'rankine', passiveMethod: 'rankine', seismicMethod: 'none', pga: 0.15, deltaFrictionRatio: 0.667 }
};
const LOADS: LoadsConfig = { surcharge: 0, surchargeType: 'L', additionalLoads: [], gammaM: 1, gammaF: 1, kv: 0 };
const conc = { ...DEFAULT_CONCRETE_PROPS, cover_h: 60, cover_v: 60, cover_base_bottom: 75 };
const REBAR: RebarCustomConfig = { ...DEFAULT_REBAR_CONFIG, mur_interieur: { barSize: '15M', spacing: 120 }, mur_exterieur: { barSize: '10M', spacing: 300 } };
const run = (cfg: RebarCustomConfig = REBAR) => analyzeRetainingWall(GEO, SOIL, LOADS, conc, cfg);

// Mr du moteur (10.1.7), recalculé ici pour une aire d'acier donnée
const MrOf = (As: number, d: number, fc: number, alpha1: number) => {
  const a = (conc.phi_s * As * conc.fy) / (alpha1 * conc.phi_c * fc * 1000);
  return conc.phi_s * As * conc.fy * (d - a / 2) * 1e-6; // kN·m/m
};

const oldFormat = (): RebarCustomConfig => {
  const old: RebarCustomConfig = { ...DEFAULT_REBAR_CONFIG, mur_horizontal: { barSize: '20M', spacing: 300 } };
  delete old.mur_horizontal_ext;
  delete old.mur_horizontal_int;
  delete old.semelle_longitudinale;
  return old;
};

describe('As,req : inverse exact de Mr (10.1.7)', () => {
  const r = run();
  it('G1 voile : Mf = 39,41 kN·m/m ; Mr(As,req) = Mf à 0,1 % près', () => {
    const d = r.concreteDesign.mur_interieur;
    expect(Math.abs(d.Mf - 39.41)).toBeLessThanOrEqual(39.41 * 0.005);
    expect(Number.isFinite(d.As_req)).toBe(true);
    const mr = MrOf(d.As_req!, d.d, conc.fc_mur, d.alpha1);
    expect(Math.abs(mr - d.Mf)).toBeLessThanOrEqual(d.Mf * 0.001);
    console.log('G1 voile : As,req =', d.As_req!.toFixed(1), 'mm2/m ; As,min =', d.As_min.toFixed(1), '; As,fourni =', d.As_provided.toFixed(1), '; d =', d.d.toFixed(1));
  });
  it('semelle (orteil, talon) : Mr(As,req) = Mf à 0,1 % près', () => {
    for (const d of [r.concreteDesign.semelle_orteil, r.concreteDesign.semelle_talon]) {
      expect(d.Mf).toBeGreaterThan(0);
      const mr = MrOf(d.As_req!, d.d, conc.fc_semelle, d.alpha1);
      expect(Math.abs(mr - d.Mf)).toBeLessThanOrEqual(d.Mf * 0.001);
      console.log(d.elementName, ': Mf =', d.Mf.toFixed(2), '; As,req =', d.As_req!.toFixed(1));
    }
  });
  it('Mf nul : As,req = 0 ; section insuffisante : Infinity', () => {
    expect(requiredAsForMf({ Mf: 0, b: 1000, d: 300, fc: 30, fy: 400, phi_s: 0.85, phi_c: 0.65, alpha1: 0.805 })).toBe(0);
    expect(requiredAsForMf({ Mf: 1e6, b: 1000, d: 300, fc: 30, fy: 400, phi_s: 0.85, phi_c: 0.65, alpha1: 0.805 })).toBe(Infinity);
  });
  it('As,req est en lecture seule : flexure_ok reste Mr ≥ Mf', () => {
    const d = r.concreteDesign.mur_interieur;
    expect(d.flexure_ok).toBe(d.Mr >= d.Mf);
    expect(d.As_provided >= (d.As_req as number)).toBe(d.flexure_ok);
  });
});

describe('Migration de mur_horizontal', () => {
  it('ancien format (sans clés de face) : les deux faces reprennent mur_horizontal', () => {
    const m = resolveRebarConfig(oldFormat());
    expect(m.mur_horizontal_ext).toEqual({ barSize: '20M', spacing: 300 });
    expect(m.mur_horizontal_int).toEqual({ barSize: '20M', spacing: 300 });
    expect(m.semelle_longitudinale).toEqual({ barSize: '15M', spacing: 250 });
    expect(resolveRebarConfig(m)).toEqual(m); // idempotente
  });
  it('moteur inchangé avec l\'ancien format : horizontal = mur_horizontal ; longitudinale = 15M @ 250 (2 lits)', () => {
    const res = run(oldFormat());
    expect(res.concreteDesign.mur_horizontal.bar_designation).toBe('20M @ 300 mm');
    expect(res.concreteDesign.mur_horizontal.As_provided).toBeCloseTo((300 * 1000) / 300, 9);
    expect(res.concreteDesign.semelle_retrait.bar_designation).toBe('15M @ 250 mm (2 lits)');
    expect(res.concreteDesign.semelle_retrait.As_provided).toBeCloseTo((2 * 200 * 1000) / 250, 9);
  });
  it('valeurs par défaut : faces = mur_horizontal', () => {
    expect(DEFAULT_REBAR_CONFIG.mur_horizontal_ext).toEqual(DEFAULT_REBAR_CONFIG.mur_horizontal);
    expect(DEFAULT_REBAR_CONFIG.mur_horizontal_int).toEqual(DEFAULT_REBAR_CONFIG.mur_horizontal);
  });
  it('A7 pilote le moteur (semelle_longitudinale)', () => {
    const cfg = setZoneSelection(REBAR, 'semelle_longitudinale', { barSize: '10M', spacing: 200 });
    expect(run(cfg).concreteDesign.semelle_retrait.As_provided).toBeCloseTo((2 * 100 * 1000) / 200, 9);
  });
});

describe('Statut d\'une zone', () => {
  it('OK si As,fourni ≥ max(As,req ; As,min) et espacement ≤ maximal', () => {
    expect(zoneStatus({ As_provided: 800, As_req: 600, As_min: 700, spacing: 250, spacing_max: 500 }).ok).toBe(true);
  });
  it('NON avec raison : As,req, As,min, espacement', () => {
    const a = zoneStatus({ As_provided: 650, As_req: 600, As_min: 700, spacing: 250, spacing_max: 500 });
    expect(a.ok).toBe(false);
    expect(a.reasons.join(' ')).toContain('As,min');
    const b = zoneStatus({ As_provided: 800, As_req: 900, As_min: 700, spacing: 250, spacing_max: 500 });
    expect(b.reasons.join(' ')).toContain('As,req');
    const c = zoneStatus({ As_provided: 800, As_req: null, As_min: 700, spacing: 550, spacing_max: 500 });
    expect(c.reasons.join(' ')).toContain('espacement');
    expect(zoneStatus({ As_provided: 800, As_req: Infinity, As_min: 700, spacing: 250, spacing_max: 500 }).ok).toBe(false);
  });
  it('lignes du tableau : statut calculé depuis le moteur (A1 15M @ 120 OK ; 10M @ 500 NON)', () => {
    const rows = buildZoneRows(run());
    expect(rows).toHaveLength(7);
    const a1 = rows.find(x => x.zone.id === 'A1')!;
    expect(a1.ok).toBe(a1.As_provided >= Math.max(a1.As_req!, a1.As_min) && a1.spacing <= a1.spacing_max);
    expect(a1.ok).toBe(true);
    const weak = buildZoneRows(run(setZoneSelection(REBAR, 'mur_interieur', { barSize: '10M', spacing: 500 })));
    const w1 = weak.find(x => x.zone.id === 'A1')!;
    expect(w1.ok).toBe(false);
    expect(w1.reasons.length).toBeGreaterThan(0);
    expect(rows.filter(x => x.zone.id === 'A3' || x.zone.id === 'A4').every(x => x.As_req === null && !!x.pair)).toBe(true);
    expect(rows.find(x => x.zone.id === 'A7')!.As_req).toBeNull();
  });
  it('A3 / A4 : chaque face ≥ As,min (règle du moteur) ; la somme ne rend pas OK', () => {
    const cfg = setZoneSelection(setZoneSelection(REBAR, 'mur_horizontal_ext', { barSize: '10M', spacing: 300 }), 'mur_horizontal_int', { barSize: '10M', spacing: 300 });
    const res = run(cfg);
    const rows = buildZoneRows(res);
    for (const id of ['A3', 'A4']) {
      const r = rows.find(x => x.zone.id === id)!;
      expect(r.ok).toBe(false);
      expect(r.reasons.join(' ')).toContain('As,min');
      expect(r.pair!.provided).toBeCloseTo(2 * 333.33, 0); // somme informative
    }
    expect(res.concreteDesign.mur_horizontal.As_ok).toBe(false);
    const good = buildZoneRows(run(setZoneSelection(setZoneSelection(REBAR, 'mur_horizontal_ext', { barSize: '15M', spacing: 300 }), 'mur_horizontal_int', { barSize: '15M', spacing: 300 })));
    expect(good.filter(x => x.zone.id === 'A3' || x.zone.id === 'A4').every(x => x.ok)).toBe(true);
  });
  it('moteur : chaque face vérifiée ; ext 10M @ 300 et int 35M @ 600 -> NON (db > t/10 et espacement)', () => {
    const cfg = setZoneSelection(setZoneSelection(REBAR, 'mur_horizontal_ext', { barSize: '10M', spacing: 300 }), 'mur_horizontal_int', { barSize: '35M', spacing: 600 });
    const d = run(cfg).concreteDesign;
    expect(d.mur_horizontal_int.db_ok).toBe(false);
    expect(d.mur_horizontal_int.spacing_ok).toBe(false);
    expect(d.mur_horizontal_ext.As_ok).toBe(false);
    expect(d.mur_horizontal.checks_ok).toBe(false);
    expect(d.mur_horizontal.db_ok).toBe(false);
    expect(d.mur_horizontal.spacing_ok).toBe(false);
    expect(d.mur_horizontal.As_ok).toBe(false);
  });
  it('Auto : propose une configuration dont tous les statuts sont OK, sans modifier l\'entrée', () => {
    const before = JSON.stringify(REBAR);
    const t0 = Date.now();
    const p = proposeAutoConfig(GEO, SOIL, LOADS, conc, REBAR);
    console.log('Auto : durée', Date.now() - t0, 'ms ; non satisfaites :', p.unsatisfied.join(',') || 'aucune');
    expect(JSON.stringify(REBAR)).toBe(before);
    expect(p.unsatisfied).toEqual([]);
    const res = run(p.config);
    const rows = buildZoneRows(res);
    expect(rows.every(x => x.ok)).toBe(true);
    // une zone sans signalement a aussi checks_ok du moteur
    for (const x of rows) if (!p.engineChecksFailing.includes(x.zone.id)) expect(x.checks_ok).toBe(true);
    console.log('checks moteur en échec :', p.engineChecksFailing.join(',') || 'aucun');
    console.log(rows.map(x => `${x.zone.id} ${x.barSize}@${x.spacing}`).join(' | '));
  });
});

describe('Nomenclature', () => {
  it('masse = n × L × masse linéique du catalogue ; total par mètre de mur', () => {
    const rows = buildBarSchedule(run(), GEO, conc);
    expect(rows).toHaveLength(7);
    const a1 = rows.find(x => x.id === 'A1')!;
    expect(a1.shape).toBe('en L');
    expect(a1.countPerM).toBeCloseTo(1000 / 120, 9);
    expect(a1.massPerM).toBeCloseTo(a1.length * a1.countPerM * 1.57, 9);
    expect(totalScheduleMass(rows)).toBeCloseTo(rows.reduce((s, x) => s + x.massPerM, 0), 9);
    expect(totalScheduleMass(rows)).toBeGreaterThan(0);
  });
});
