# MUR-07 — Poussée passive du sol avant sur le voile          Statut : APPROUVÉE (2026-11-12)

| Champ | Valeur |
|---|---|
| Statut | **APPROUVÉE** le 2026-11-12 : à la demande « Réponds « J'approuve MUR-07, anciens projets : choix 3 » ou « choix 0 » », l'utilisateur a répondu « choix 3 ». |
| Demande | Comparaison avec la note « mur3 3 » : M<sub>f</sub> du voile 36,4 kN·m/m (note) contre 70,7 (GeoWall), écart expliqué par la butée du sol avant sur la face avant du voile, amplifiée ×1,5 dans la note. Décision de l'utilisateur (2026-11-12) : « ajouter toutes les choix, onglet déroulant, et ajouter les explications et aussi dans la note de calcul » ; nom demandé : « poussée passive » ; défaut demandé le 2026-11-12 : « cochée par défaut, c'est-à-dire amplifiée ». |
| Base | MUR-02 §5 (efforts du voile), D9 / §11 (gel, butée nulle si df non saisie), A2 / A3 de MUR-01 (h_pass, butée sous la nappe), MUR-05 (flèche). |
| Fichiers visés | `src/lib/analysis.ts` (`stemItems`, efforts du voile, flèche), `src/lib/types.ts`, `src/lib/projectFile.ts`, onglet Critères ou Sol avant, note (sections 2, 4, 5), onglet Étapes. |

## 1. Situation actuelle

La butée du sol avant (`P_passive_nominal`, hauteur h_pass = hSolAv + ts, zone gelée déduite, γ′ sous la nappe) entre seulement dans la **stabilité** (glissement, renversement), avec Ψ·φp. Elle **n'agit pas** sur la face avant du voile : les efforts M<sub>f</sub>, V<sub>f</sub> du voile ne comprennent que les poussées côté remblai (choix 0 ci-dessous).

## 2. Choix offerts (liste déroulante « Poussée passive sur le voile »)

La pression passive agit sur la face avant du voile, de la surface du sol avant (ou du bas de la zone gelée si la déduction du gel s'applique, même règle que la stabilité, MUR-02 D9) jusqu'au dessus de la semelle, soit sur la hauteur h<sub>v</sub> = hSolAv − z<sub>gel</sub> ≥ 0. Pression p(z) = Kp·σ′v(z), avec γ du sol avant au-dessus de la nappe aval et γ′ en dessous (même modèle que la butée de stabilité). Elle réduit M<sub>f</sub> et V<sub>f</sub> au pied du voile.

| N° | Libellé | Facteur sur la poussée passive du voile | Explication affichée |
|---|---|---|---|
| 0 | Non comptée | 0 | Prudent. La butée exige un déplacement important du voile vers le sol avant et le sol avant peut être enlevé (excavation, travaux) ou gelé (CFEM §20.7). |
| 1 | Comptée, non amplifiée | 1,0 | Pression passive nominale. |
| 2 | Comptée, réduite (résistance CFEM) | Ψ·φp (0,9 × 0,5 = 0,45 par défaut) | La butée est traitée comme une résistance géotechnique, réduite par φp (CFEM 5e, tableau 6.2) et Ψ (tableau 6.4), comme dans la vérification de stabilité. |
| 3 | Comptée, amplifiée (facteur de H) | facteur de H de la combinaison : 1,5 aux cas 1 à 4, 1,0 au cas 5 | Comme la note « mur3 3 ». **Moins sécuritaire** : augmente une résistance par un facteur de charge ; CNB 4.1.3.2.(4) réserve 1,5 aux effets de H qui « nuisent à la sécurité » ; CFEM réduit la butée par φp. |

| N° | Décision |
|---|---|
| D1 | **Défaut : choix 3** (décision de l'utilisateur). Anciens projets ouverts (champ absent) : choix 3 aussi, puisque c'est le défaut ; l'ouverture d'un ancien projet change donc M<sub>f</sub> du voile — un avis le signale dans le bandeau. Confirmé par l'utilisateur le 2026-11-12 : anciens projets au **choix 3**. |
| D2 | Portée : efforts du voile seulement (M<sub>f</sub>, V<sub>f</sub>, V<sub>f</sub> à d<sub>v</sub>, diagrammes, armature requise, tableau 2 de la note). La stabilité (glissement, renversement) garde sa butée actuelle (Ψ·φp), sans changement ; les efforts du patin et du talon sont inchangés. |
| D3 | Cas 5 (séisme) : suit l'option « butée au séisme » existante (MUR-02 D9) : 'none' → 0 ; 'kpe' → Kpe au lieu de Kp, avec le facteur du choix (choix 3 : 1,0 au cas 5). |
| D4 | ÉLS (flèche MUR-05) : choix 0 → 0 ; choix 1, 2, 3 → facteur 1,0 (pas d'amplification ni de φ à l'ÉLS). |
| D5 | Note de calcul : tableau 2b/2a inchangés (la butée y est déjà) ; section 4 (efforts du voile) : ligne « Poussée passive sur le voile » avec choix retenu, hauteur h<sub>v</sub>, résultante nominale, facteur, moment retranché au pied ; section 5 : hypothèse avec l'explication du choix (texte du tableau ci-dessus) ; avertissement pour le choix 3. Onglet **Étapes & formules** (demande de l'utilisateur, 2026-11-12 : « aussi dans la note de calcul, c'est-à-dire étape et formules ») : une étape « Poussée passive sur le voile », en équations formatées sur 3 lignes (formule, valeurs substituées, résultat) pour la combinaison qui gouverne le voile : Kp (ou Kpe au cas 5) ; h<sub>v</sub> = hSolAv − z<sub>gel</sub> ; P<sub>p,v</sub> = ½·Kp·γ·h<sub>v</sub>² ; M<sub>p,v</sub> = Kp·γ·h<sub>v</sub>³/6 (sous la nappe : intégration par couches γ / γ′, formule affichée) ; facteur du choix ; M<sub>f,net</sub> = M<sub>f,remblai</sub> − facteur × M<sub>p,v</sub>. L'explication du choix retenu (tableau ci-dessus) est affichée sous l'étape, et le tableau des 4 choix avec leur M<sub>f</sub> respectif est donné pour comparaison. Valeurs lues du moteur (test d'égalité). |
| D6 | La butée sur le voile ne peut pas rendre le moment du voile de signe inverse sans le dire : si M<sub>f</sub> net change de signe, avis « face avant tendue » (lien avec la réserve de MUR-05 sur la face tendue). |

## 3. Cas de référence (projet « mur3 3 », cas 1 : 1,4D + 1,5H, butée complète sans gel, sans nappe)

hSolAv = 1,35 m ; Kp = tan²(45° + 29°/2) = 2,8821 ; γ = 19 ; M nominal de la butée au pied = Kp·γ·h<sub>v</sub>³/6 = 2,8821 × 19 × 1,35³/6 = 22,454 kN·m/m ; résultante = Kp·γ·h<sub>v</sub>²/2 = 49,90 kN/m.
M<sub>f</sub> poussée active seule (hr = 3,50) = 1,5 × 0,34697 × 19 × 3,5³/6 = 70,66 kN·m/m (erratum 2026-11-12 : 70,71 écrit d'abord par erreur).

| Choix | M<sub>f</sub> attendu (kN·m/m) |
|---|---|
| 0 | 70,66 |
| 1 | 70,66 − 22,45 = 48,21 |
| 2 | 70,66 − 0,45 × 22,45 = 60,56 |
| 3 | 70,66 − 1,5 × 22,45 = 36,98 au pied (note mur3 3 : 36,4) ; M<sub>f</sub> de calcul = maximum le long du voile = 38,41, car V change de signe (définition existante de M<sub>f</sub>, conservée) |

Tolérance 0,05 kN·m/m. Choix 0 : tous les résultats actuels inchangés.
