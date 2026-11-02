# MUR-01 — Corrections approuvées du module mur de soutènement (GeoWall PRO)

| Champ | Valeur |
|---|---|
| Statut | **APPROUVÉE** (2026-10-30, utilisateur : « tu peux faire les corrections nécessaires selon les normes » ; réponses aux décisions de MUR-00) |
| Éditions de référence | **CNB 2025** (division B, partie 4), **CFEM 5e édition** (au lieu de 2006), **CSA A23.3** (édition :24 pour l'annexe D ; articles du corps de norme lus dans l'édition -19, la seule complète disponible ; à indiquer dans la note) |
| Base | Revue MUR-00 (écarts E01 à E27) ; tableau 4.1.3.2.-A du CNB 2025 lu le 2026-10-30 (PDF p. 452-453) |
| Hors périmètre de cette fiche | Points « À CONFIRMER » de MUR-00 qui dépendent du CFEM (facteurs φ géotechniques, kh, Mononobe-Okabe, limite d'excentricité) et des articles de l'A23.3 non encore lus : traités dans une fiche suivante après lecture |

## 1. Combinaisons de charges — CNB 2025, 4.1.3.2 (texte lu)

Tableau 4.1.3.2.-A (sans pont roulant) :

| Cas | Charges principales | Charges d'accompagnement |
|---|---|---|
| 1 | 1,4D | — |
| 2 | (1,25D ou 0,9D) + 1,5L | 0,7S ou 0,3W |
| 3 | (1,25D ou 0,9D) + 1,0S | 1,0L ou 0,3W |
| 4 | (1,25D ou 0,9D) + 1,0W | 0,5L ou 0,35S |
| 5 | 1,0D + 1,0E | 0,5L + 0,15S |

- 4.1.3.2.(3) : on considère aussi les charges principales avec les charges d'accompagnement **prises égales à zéro**. Une charge variable qui stabilise (surcharge sur le talon, charge verticale Fy) a donc un facteur **0** dans les vérifications où elle est favorable (glissement, renversement, soulèvement). **Corrige E04.**
- 4.1.3.2.(4) : poussée latérale des terres H, facteur **1,5**.
- 4.1.3.2.(5) : la charge permanente qui s'oppose (renversement, soulèvement, glissement) vaut **0,9D dans les cas 2, 3 et 4** et **1,0D dans le cas 5** (séisme).
- 4.1.3.2.(8) : facteur de 1,25 sur D pour le sol porté, porté à 1,5. Si l'épaisseur de sol dépasse 1,2 m, il peut être réduit à 1 + 0,6/hs, sans descendre sous 1,25.
- 4.1.3.2.(9) : poids du sol saturé à 1,5 dans le cas 1.
- 4.1.3.2.(10) : E comprend la poussée horizontale des terres due au séisme selon 4.1.8.16.(7).
- Les facteurs de chaque combinaison sont appliqués de façon cohérente à toutes les grandeurs d'une même combinaison (efforts, excentricité, pressions). **Corrige E06.**

## 2. Corrections de mécanique (sans clause à confirmer)

| Écart | Correction |
|---|---|
| E19 | Kp de Coulomb : formule exacte, Kp = cos²(φ + θ) / [cos²θ · cos(θ − δ) · (1 − √(sin(φ + δ)·sin(φ + β) / (cos(θ − δ)·cos(θ − β))))²]. Test : φ = 32°, θ = β = δ = 0 donne 3,25 (Rankine) ; avec δ = 16°, θ = β = 0, on obtient 5,78 ; la valeur 7,34 de MUR-00 correspond à δ = 21,34° (correction du 2026-10-30, relevée à l'implémentation ; les deux cas sont testés). |
| E01 | Efforts du voile (M, V) pour chaque combinaison, avec **toutes** les charges latérales pondérées : terres, surcharge, eau, séisme, charge en tête et charges ponctuelles Fx. Cas R2 de MUR-00 : M au pied du voile = 48,4 kN·m/m. |
| E02 | Nappe : sous-pression sous la semelle et poids déjaugé du sol sous la nappe (talon et patin). |
| E03 | Cisaillement par frottement au joint voile-semelle : N = poids du voile seul au-dessus du joint à 0,9D ; armature traversant le joint = les deux faces. |
| E05 | Aucun « CONFORME » ni « OK » écrit en dur : chaque statut provient d'une comparaison calculée. Ajouter la comparaison à l'armature minimale. |
| E10 | Mur de sous-sol appuyé en tête et encastré au pied : réaction en tête = 0,2·P pour une poussée triangulaire de résultante P (poutre encastrée-appuyée). |
| E12 | Longueur de développement : k1 = 1,3 pour les barres supérieures (talon), k4 = 0,8 pour les barres 20M et moins, 1,0 pour 25M et plus. Référence : A23.3 12.2.4, page à citer après lecture. |

## 3. Choix de l'utilisateur (nouvelles saisies)

1. **Critère de renversement et de portance (choix de l'utilisateur dans l'interface) :**
   - a) moments : FS = Ms / Mr (moment stabilisant / moment renversant), et pression sous la semelle par distribution linéaire (q = V/B · (1 ± 6e/B)) ;
   - b) excentricité, largeur réduite : B′ = B − 2e, avec une pression uniforme V / B′ comparée à la résistance pondérée. La limite d'excentricité sera prise dans le CFEM 5e, À CONFIRMER.

   La note de calcul indique le critère choisi.
2. **Béton et armature saisissables :** f′c (voile, semelle), fy et enrobage. Ces valeurs ne sont plus figées dans DEFAULT_CONCRETE_PROPS.
3. **Deux sols :** un sol de remblai (poussée) et un sol de fondation (portance, glissement), chacun avec γ, φ′ et c′.

## 4. Critères d'acceptation

- `npm run lint` sans erreur et `npm run build` OK.
- Tests unitaires ajoutés (Vitest, à installer dans ce projet avec l'accord déjà donné pour les corrections) :
  - Kp de Coulomb (E19) ;
  - combinaisons du CNB 2025 avec charge favorable à 0 ;
  - cas R1 et R2 de MUR-00 ;
  - réaction en tête 0,2·P.
- Note de calcul : chaque statut est calculé, et l'édition de chaque norme est indiquée.

## 5. Amendement A1 — édition du CNB et facteur de H au séisme (APPROUVÉ le 2026-11-01)

Décisions de l'utilisateur :
- « utiliser celui de 2020 par défaut, mettre option cocher 2025 » ;
- option A pour H au cas 5 (D16 de MUR-02).

Textes relus le 2026-11-01 :
- CNB 2020 FR : `cnb2020_Francais.pdf`, PDF p. 457 à 459 et note A-4.1.3.2.(4) p. 564 ;
- CNB 2025 FR : `CNB2025_FRANCAIS.pdf`, PDF p. 473 et note p. 581 ;
- Commentaire A du CNB 2020 : `GUP4_2020p1.pdf`, tableau A-3, PDF p. 24.

### 5.1 Édition des combinaisons
- Le **CNB 2020** est l'édition **par défaut**. Une case à cocher « CNB 2025 » permet de choisir l'autre édition.
- L'édition retenue apparaît partout où le texte écrit en dur « CNB 2025 » : en-tête, note, tableaux, rapport.
- Tableau 4.1.3.2.-A des deux éditions :

| Cas | CNB 2020 (défaut) | CNB 2025 (option) |
|---|---|---|
| 1 | 1,4D | 1,4D |
| 2 | (1,25D ou 0,9D) + 1,5L ; 1,0S ou 0,4W | (1,25D ou 0,9D) + 1,5L ; 0,7S ou 0,3W |
| 3 | (1,25D ou 0,9D) + 1,5S ; 1,0L ou 0,4W | (1,25D ou 0,9D) + 1,0S ; 1,0L ou 0,3W |
| 4 | (1,25D ou 0,9D) + 1,4W ; 0,5L ou 0,5S | (1,25D ou 0,9D) + 1,0W ; 0,5L ou 0,35S |
| 5 | 1,0D + 1,0E ; 0,5L + 0,25S | 1,0D + 1,0E ; 0,5L + 0,15S |

- Les paragraphes 4.1.3.2.(3), (4), (5), (8), (9) et (10) sont identiques dans les deux éditions. Le §1 de cette fiche s'applique donc tel quel : charges favorables à 0, 1,5H, D qui s'oppose (0,9D ou 1,0D), Dunfav, sol porté, sol saturé, et E qui inclut la poussée sismique.

### 5.2 Facteur de H au cas 5
- **H = 1,0 au cas 5** dans les deux éditions (`FACTEUR_H_SISMIQUE = 1.0`). Il reste à 1,5 aux cas 2 à 4 (et au cas 1).
- Sources :
  - note A-4.1.3.2.(4), même texte en 2020 et en 2025 : « 1,5H doit être ajouté aux combinaisons de charges 2, 3 et 4 » ; pour les murs en porte-à-faux, elle renvoie au Commentaire A ;
  - tableau A-3 du Commentaire 2020 : 1,0 pour D, H, T et P avec E.
- Commentaire de 2025 : À CONFIRMER. La note de calcul cite ces sources.

### 5.3 Critères d'acceptation de l'amendement
- Tests :
  - les facteurs de chaque cas sont vérifiés pour les deux éditions ;
  - le cas 5 donne H = 1,0 ;
  - l'édition par défaut est 2020.
- `tsc`, les tests et le build sont OK.
- La note affiche l'édition choisie et la source du facteur de H au cas 5.

## 6. Amendement A2 — hauteur de la butée (APPROUVÉ le 2026-11-01)

Décision de l'utilisateur : « finalement c'est correct butée. corriger [l'incohérence de hs,av] ». La butée reste comptée selon la méthode choisie dans « Sol & Séisme » ; seule la hauteur est corrigée.

- **Constat :** `soil.hSolAv` est la hauteur de sol **au-dessus du dessus de la semelle**. C'est ainsi que l'utilisent le poids sur le patin, la nappe (`hSubToe`) et le dessin (`Visualizer`). Or la butée prend h_pass = hSolAv avec y = h/3 **depuis la sous-face**. Elle omet donc l'épaisseur de la semelle.
- **Correction :** h_pass = hSolAv + epBase, mesurée depuis la sous-face de la semelle. Pp = ½·Kp·γ·h_pass² et y_Pp = h_pass/3. Si hSolAv = 0, la butée reste nulle : le sol avant est absent, et la semelle seule n'est pas comptée.
- **Affichage :** les recalculs de Pp et de Mp écrits dans l'interface (`CalculationReport.tsx`, `CalculationStepsTheory.tsx`) doivent lire les valeurs du moteur (`P_passive_nominal`, `y_Pp`) et ne plus recalculer avec hSolAv.
- **Hors périmètre :** butée avec nappe à l'avant (γ′), profondeur de gel, butée au séisme. Ces points relèvent de MUR-02 (D9).
- **Critères d'acceptation :**
  - test : hSolAv = 1,50, epBase = 0,35, Kp = 2,8821, γ = 19 donnent Pp = ½·2,8821·19·1,85² = 93,70 kN/m et y = 0,617 m ;
  - test : hSolAv = 0 donne Pp = 0 ;
  - tsc, tests et build OK.
