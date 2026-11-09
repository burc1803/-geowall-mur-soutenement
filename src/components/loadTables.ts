// Section 2 de la note (tableaux 2a / 2b) : forces caractéristiques (non pondérées), bras de levier et moments autour de l'orteil.
// AFFICHAGE SEULEMENT : toutes les positions et valeurs sont celles que le moteur (src/lib/analysis.ts) utilise dans aggregate() ;
// rien n'est recalculé ici sauf le produit force × bras. Convention du moteur : Fy > 0 vers le bas, Fx > 0 vers l'orteil,
// x depuis l'orteil, y depuis la sous-face de la semelle ; moment en valeur positive dans son tableau (stabilisant ou déstabilisant).
import type { AnalysisResult, LoadsConfig, SoilProperties, WallGeometry } from '../lib/types';
import { stabilizingRole, type StabilizingRole } from '../lib/loadDirection';

export type LoadTableRow = {
  desc: string;
  type: string;
  role: StabilizingRole;
  fh: number | null; // kN/m, valeur absolue
  fv: number | null; // kN/m, valeur absolue
  arm: number | null; // m : x (Fv) ou y (Fh) ; null pour un moment saisi
  moment: number | null; // kN·m/m autour de l'orteil, valeur positive ; null pour une ligne « donnée » (non comptée)
  /** 'passive' : résistance du sol/eau à l'avant, comptée dans Ms_nominal du moteur sous Mpass_c (et non dans Mres). */
  kind: 'force' | 'moment' | 'passive' | 'data';
};

export type LoadTables = {
  stabilizing: LoadTableRow[];
  destabilizing: LoadTableRow[];
  dataNotes: string[]; // données hors force (niveau de nappe, etc.)
};

export const sumRows = (rows: LoadTableRow[]) => ({
  fh: rows.reduce((s, r) => s + (r.fh ?? 0), 0),
  fv: rows.reduce((s, r) => s + (r.fv ?? 0), 0),
  moment: rows.reduce((s, r) => s + (r.moment ?? 0), 0),
});

/** Sommes par type de charge, sans total général : « Σ D + H (permanentes) » (butée et eau à l'avant incluses) en premier, puis L, E, S, W s'ils existent. */
export function sumsByType(rows: LoadTableRow[]): { label: string; shaded: boolean; fh: number; fv: number; moment: number }[] {
  const isPerm = (r: LoadTableRow) => r.type === 'D' || r.type === 'H' || r.kind === 'passive';
  const out = [{ label: 'Σ D + H (permanentes)', shaded: true, ...sumRows(rows.filter(isPerm)) }];
  const others = rows.filter(r => !isPerm(r));
  const known = ['L', 'E', 'S', 'W'];
  const types = [...known.filter(t => others.some(r => r.type === t)), ...Array.from(new Set(others.map(r => r.type))).filter(t => !known.includes(t))];
  for (const t of types) out.push({ label: `Σ ${t}`, shaded: false, ...sumRows(others.filter(r => r.type === t)) });
  return out;
}

/** MUR-06 D5 : option « compter les charges variables stabilisantes (L, S, W) » ; absent = true (comme le moteur). */
export const countStabilizingVariable = (loads?: LoadsConfig) => loads?.countStabilizingVariable !== false;

/** MUR-06 M6-A1 : option « compter aussi Fx et Mz variables stabilisants » ; absent = true ; sans effet si D5 est décochée (comme le moteur). */
export const countStabilizingHM = (loads?: LoadsConfig) => countStabilizingVariable(loads) && loads?.countStabilizingVariableHM !== false;

const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : 'non disponible');

export function latLabel(n: string): string {
  if (n === 'Pa_sol') return 'Poussée active des terres (γ)';
  if (n === 'Pa_sol_sec') return 'Poussée active des terres, sol au-dessus de la nappe (γ)';
  if (n === 'Pa_sol_sub_surch') return 'Poussée active sous la nappe due au sol sec sus-jacent';
  if (n === 'Pa_sol_déjaugé') return 'Poussée active des terres sous la nappe (γ′)';
  if (n === 'Pw_eau_hydrostatique') return 'Poussée hydrostatique de l\'eau';
  if (n.startsWith('Pa_surcharge_amont')) return 'Poussée de la surcharge amont';
  if (n.startsWith('P_seismic_soil')) return n.includes('Wood') ? 'Incrément sismique de poussée ΔP0E (Wood)' : 'Incrément sismique de poussée ΔPAE';
  if (n.startsWith('E_stem_inertia')) return 'Inertie sismique du voile (kh·W)';
  if (n.startsWith('E_base_inertia')) return 'Inertie sismique de la semelle (kh·W)';
  if (n.startsWith('E_heelSoil_inertia_sat')) return 'Inertie sismique du sol au-dessus du talon, sol saturé sous la nappe, masse totale γ (kh·W)';
  if (n.startsWith('E_heelSoil_inertia')) return 'Inertie sismique du sol au-dessus du talon, sol sec au-dessus de la nappe (kh·W)';
  return n;
}

export function buildLoadTables(geo: WallGeometry, soil: SoilProperties, result: AnalysisResult, loads?: LoadsConfig): LoadTables {
  const B = geo.ePiedAv + geo.epStem + geo.ePiedAr;
  const ep = result.earthPressures;
  const wn = result.weights_nominal;
  const xStem = geo.ePiedAv + geo.epStem / 2; // engine : Wb1_Mur et point d'application des charges de tête
  const xHeel = geo.ePiedAv + geo.epStem + geo.ePiedAr / 2; // engine : sol, eau et surcharge sur le talon
  const xToe = geo.ePiedAv / 2; // engine : sol, eau et surcharge sur le patin
  const yTop = result.totalHeight; // engine : y des charges et réactions de tête
  const rows: LoadTableRow[] = [];
  const dataNotes: string[] = [];

  /** Ajoute une composante du moteur (Fx, Fy, Mz signés selon sa convention) ; rôle déduit de ses signes, comme loadDirection.ts. */
  const add = (desc: string, type: string, c: { Fx?: number; Fy?: number; Mz?: number; x?: number; y?: number; resistance?: boolean; passive?: boolean }) => {
    const Fx = c.Fx ?? 0, Fy = c.Fy ?? 0, Mz = c.Mz ?? 0;
    const role = stabilizingRole({ Fx, Fy, Mz, resistance: c.resistance });
    if (role === 'none') { dataNotes.push(`${desc} = 0`); return; }
    if (Fy) rows.push({ desc, type, role, fh: null, fv: Math.abs(Fy), arm: c.x ?? 0, moment: Math.abs(Fy) * (c.x ?? 0), kind: 'force' });
    else if (Fx) rows.push({ desc, type, role, fh: Math.abs(Fx), fv: null, arm: c.y ?? 0, moment: Math.abs(Fx) * (c.y ?? 0), kind: c.passive ? 'passive' : 'force' });
    else rows.push({ desc, type, role, fh: null, fv: null, arm: null, moment: Math.abs(Mz), kind: 'moment' });
  };

  /** Ligne « donnée » (option MUR-06 décochée seulement) : poids vertical d'une surcharge (kPa) que le moteur ne compte pas dans ΣV (charge variable
   *  stabilisante prise à 0, CNB 4.1.3.2.(3) : ΣV identique en ÉLS S0 et S1, vérifié). Aucune force ni aucun moment ajoutés aux sommes. */
  const addData = (desc: string, type: string) => rows.push({ desc, type, role: 'stabilizing', fh: null, fv: null, arm: null, moment: null, kind: 'data' });

  if (loads) {
    // Surcharges uniformes : poussée horizontale = composante de lateral_nominal ci-dessous.
    // MUR-06 D7 : option cochée -> poids Fv = q × longueur (talon / patin), bras x du moteur, compté dans Σ L ; décochée -> ligne « donnée » non comptée.
    // Fv, bras et type viennent du moteur (result.surchargeWeights_nominal) ; type D : le moteur compte le poids au facteur D dans tous les cas -> force comptée (Σ D + H).
    const surRow = (side: 'amont' | 'aval', d: string, where: string, fallbackType: string) => {
      const w = result.surchargeWeights_nominal.find(x => x.side === side);
      if (w && (w.type === 'D' || countStabilizingVariable(loads))) add(`${d} ${where}`, w.type, { Fy: w.Fy, x: w.x });
      else addData(d, w?.type ?? fallbackType);
    };
    if (loads.surcharge > 0) surRow('amont', `Surcharge amont q = ${f2(loads.surcharge)} kPa`, 'sur le talon (Fv = q·L_talon)', loads.surchargeType);
    if ((loads.surchargeAval ?? 0) > 0) surRow('aval', `Surcharge aval q = ${f2(loads.surchargeAval ?? 0)} kPa`, 'sur le patin (Fv = q·L_patin)', loads.surchargeAvalType ?? 'L');
    const pt = loads.pointLoadTop;
    if (pt?.enabled) {
      const ty = pt.loadType ?? 'L';
      if (pt.Fy) add(`Charge en tête Fy${pt.name ? ' (' + pt.name + ')' : ''}`, ty, { Fy: pt.Fy, x: xStem });
      if (pt.Fx) add('Charge en tête Fx', ty, { Fx: pt.Fx, y: yTop });
      if (pt.Mz) add('Moment en tête Mz', ty, { Mz: pt.Mz });
    }
    for (const al of loads.additionalLoads ?? []) {
      const dist = !!(al.isDistributed && al.length);
      const L = dist ? (al.length ?? 0) : 1;
      const d = `${al.name} (${al.nature}${dist ? `, ${f2(al.magnitude)} par m × ${f2(al.length ?? 0)} m` : ''})`;
      if (al.nature === 'Fx') add(d, al.caseType, { Fx: al.magnitude * L, y: dist ? al.y + L / 2 : al.y });
      else if (al.nature === 'Fy') add(d, al.caseType, { Fy: al.magnitude * L, x: dist ? al.x + L / 2 : al.x });
      else add(d, al.caseType, { Mz: al.magnitude });
    }
    if (loads.reactionsTop) {
      for (const k of Object.keys(loads.reactionsTop) as (keyof typeof loads.reactionsTop)[]) {
        const r = loads.reactionsTop[k];
        if (r?.Rx) add('Réaction en tête Rx', k, { Fx: r.Rx, y: yTop });
        if (r?.Ry) add('Réaction en tête Ry', k, { Fy: r.Ry, x: xStem });
        if (r?.M) add('Réaction en tête M', k, { Mz: r.M });
      }
    }
  } else {
    dataNotes.push('Charges saisies (surcharges, charges de tête, charges supplémentaires) = non disponible');
  }
  if (result.hydro.hasWater) dataNotes.push(`Nappe phréatique : niveau = ${f2(result.hydro.hw)} m (au-dessus de la sous-face de la semelle)`);

  // Poussées horizontales non pondérées du moteur : composantes non appliquées au voile, puis poussées des charges linéaires (fig. 20.8)
  for (const c of result.lateral_nominal.filter(c => !c.applied)) add(latLabel(c.name), c.type, { Fx: c.Fx, y: c.y });
  for (const c of result.lateral_nominal.filter(c => c.applied && c.name.includes('fig. 20.8'))) add(c.name, c.type, { Fx: c.Fx, y: c.y });

  if (result.hydro.hasWater) add('Sous-pression sous la semelle (uniforme sur B)', 'H', { Fy: -result.hydro.uplift_nominal, x: B / 2 });
  if (ep.P_passive_nominal > 0) add('Butée du sol Pp′ (résistance géotechnique : Ψ·φp, sans facteur 1,5)', 'H', { Fx: ep.P_passive_nominal, y: ep.y_Pp, resistance: true, passive: true });
  if (ep.frontWaterScenario === 'B') add('Eau à l\'avant Pw,a = ½·γw·hw,av² (résistance)', 'H', { Fx: ep.P_water_front, y: ep.y_Pw_front, resistance: true, passive: true });
  add('Poids propre du voile', 'D', { Fy: wn.stem, x: xStem });
  add('Poids propre de la semelle', 'D', { Fy: wn.base, x: B / 2 });
  add('Poids du sol sur le talon (γ′ sous la nappe)', 'D', { Fy: wn.heelSoil, x: xHeel });
  if (soil.hSolAv > 0) add('Poids du sol sur le patin (γ′ sous la nappe)', 'D', { Fy: wn.toeSoil, x: xToe });
  if (wn.waterHeel > 0) add('Poids de l\'eau au-dessus du talon', 'H', { Fy: wn.waterHeel, x: xHeel });
  if (wn.waterToe > 0) add('Poids de l\'eau au-dessus du patin', 'H', { Fy: wn.waterToe, x: xToe });

  return {
    stabilizing: rows.filter(r => r.role === 'stabilizing'),
    destabilizing: rows.filter(r => r.role === 'destabilizing'),
    dataNotes,
  };
}
