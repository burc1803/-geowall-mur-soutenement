// MUR-04 : sol d'assise de la fondation (glissement, portance) et sol avant (butée, poids sur le patin).
import type { SoilProperties, BearingSoilProperties, FrontSoilProperties } from './types';
import { adhesionFromCu, isCohesiveClass, proposedDeltaB, CONTACT_LABEL, USCS_LABEL } from './cfemTable204';

export interface ResolvedBearingSoil {
  uscs: BearingSoilProperties['uscs'];
  classLabel: string;
  phi: number;
  contact: BearingSoilProperties['contact'];
  contactLabel: string;
  deltaB: number | undefined; // ° retenu (undefined = non défini)
  tanDeltaB: number; // 0 si non défini
  deltaBSource: string;
  proposed?: { delta: number; capped: boolean; tableMin: number };
  cohesive: boolean;
  cu: number;
  ca: number; // kPa (0 si non cohérent)
  issues: string[]; // non vide = glissement NON VÉRIFIABLE
  legacy: boolean;
}

/** Sol avant : γ et φ′ ; absent = identique au remblai (projet ancien). */
export function resolveFrontSoil(soil: SoilProperties): FrontSoilProperties {
  return { gamma: soil.foundation?.gamma ?? soil.gamma, phi: soil.foundation?.phi ?? soil.phi };
}

/** Sol d'assise ; migration d'un ancien projet (R5) : φ′ de l'ancien sol de fondation, δb = atan(μ) plafonné à φ′, classe non définie. */
export function resolveBearingSoil(soil: SoilProperties): ResolvedBearingSoil {
  const b = soil.bearingSoil;
  const legacy = !b;
  const phi = b?.phi ?? soil.foundation?.phi ?? soil.phi;
  const contact = b?.contact ?? 'cast';
  const uscs = b?.uscs;
  const issues: string[] = [];
  if (!(phi >= 0 && phi <= 45)) issues.push(`φ′ d'assise = ${phi}° hors de [0 ; 45]°`);
  const proposed = proposedDeltaB(uscs, contact, phi);
  let deltaB: number | undefined;
  let deltaBSource: string;
  if (b?.deltaB !== undefined && Number.isFinite(b.deltaB)) {
    deltaB = b.deltaB;
    deltaBSource = b.deltaBOrigin === 'legacy' ? "valeur reprise d'un ancien projet" : "saisie par l'utilisateur";
  } else if (legacy && soil.mu !== undefined && soil.mu > 0) {
    const d = (Math.atan(soil.mu) * 180) / Math.PI;
    deltaB = Math.min(d, phi);
    deltaBSource = `valeur reprise d'un ancien projet (μ = ${soil.mu} -> δb = atan μ${d > phi ? ', plafonné à φ′' : ''})`;
  } else if (proposed) {
    deltaB = proposed.delta;
    deltaBSource = `CFEM 5e, tableau 20.4(a), p. 691 : ${USCS_LABEL[uscs!]}, ${CONTACT_LABEL[contact]}, borne inférieure${proposed.capped ? ', plafonnée à φ′' : ''}`;
  } else {
    deltaBSource = 'non défini';
    issues.push(uscs
      ? `δb à saisir : le tableau 20.4(a) n'a pas de valeur pour ${USCS_LABEL[uscs]} avec ${CONTACT_LABEL[contact]}`
      : "classe du sol d'assise non définie : choisir la classe ou saisir δb");
  }
  if (deltaB !== undefined && (deltaB < 0 || deltaB > phi + 1e-9)) {
    issues.push(`δb = ${deltaB}° doit satisfaire 0 ≤ δb ≤ φ′ = ${phi}° (CFEM 5e, § 10.6, p. 351)`);
  }
  const cohesive = isCohesiveClass(uscs);
  const cu = cohesive ? (b?.cu ?? 0) : 0;
  if (cohesive && !(cu > 0)) issues.push('sol cohérent (CL) : cu (su) à saisir, cu > 0');
  const ca = cohesive && cu > 0 ? adhesionFromCu(cu) : 0;
  const dOk = deltaB !== undefined && Number.isFinite(deltaB);
  return {
    uscs, classLabel: uscs ? USCS_LABEL[uscs] : 'non définie', phi, contact, contactLabel: CONTACT_LABEL[contact],
    deltaB: dOk ? deltaB : undefined,
    tanDeltaB: dOk ? Math.tan((deltaB! * Math.PI) / 180) : 0,
    deltaBSource, proposed, cohesive, cu, ca, issues, legacy
  };
}
