// MUR-07 : poussée passive du sol avant sur la face avant du voile. Libellés et explications (tableau §2 de la fiche), partagés par l'interface, la note et l'onglet Étapes.
import type { StemPassiveChoice } from './types';

export const DEFAULT_STEM_PASSIVE: StemPassiveChoice = 3; // MUR-07 D1 : défaut et anciens projets

export const STEM_PASSIVE_CHOICES: StemPassiveChoice[] = [0, 1, 2, 3];

export const STEM_PASSIVE_LABEL: Record<StemPassiveChoice, string> = {
  0: 'Non comptée',
  1: 'Comptée, non amplifiée',
  2: 'Comptée, réduite (résistance CFEM)',
  3: 'Comptée, amplifiée (facteur de H)'
};

/** Facteur appliqué à la poussée passive nominale du voile (texte du tableau §2). */
export const STEM_PASSIVE_FACTOR_TEXT: Record<StemPassiveChoice, string> = {
  0: '0',
  1: '1,0',
  2: 'Ψ·φp (0,9 × 0,5 = 0,45 par défaut)',
  3: 'facteur de H de la combinaison : 1,5 aux cas 1 à 4, 1,0 au cas 5'
};

export const STEM_PASSIVE_EXPLAIN: Record<StemPassiveChoice, string> = {
  0: "Prudent. La butée exige un déplacement important du voile vers le sol avant et le sol avant peut être enlevé (excavation, travaux) ou gelé (CFEM §20.7).",
  1: 'Pression passive nominale.',
  2: "La butée est traitée comme une résistance géotechnique, réduite par φp (CFEM 5e, tableau 6.2) et Ψ (tableau 6.4), comme dans la vérification de stabilité.",
  3: "Comme la note « mur3 3 ». Moins sécuritaire : augmente une résistance par un facteur de charge ; CNB 4.1.3.2.(4) réserve 1,5 aux effets de H qui « nuisent à la sécurité » ; CFEM réduit la butée par φp."
};

/** Choix valide (0 à 3) ; toute autre valeur (absente, illisible) -> choix 3 (D1). */
export function resolveStemPassive(v: unknown): StemPassiveChoice {
  return v === 0 || v === 1 || v === 2 || v === 3 ? v : DEFAULT_STEM_PASSIVE;
}

export const STEM_PASSIVE_LOAD_NOTICE = 'Poussée passive sur le voile : choix 3 appliqué (MUR-07)';
