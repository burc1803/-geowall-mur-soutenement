# MUR-00 — Revue normative du module « GeoWall PRO — mur de soutènement »

| Champ | Valeur |
|---|---|
| Statut | **PROPOSÉE** (2026-10-30). Seul l'utilisateur peut la passer à APPROUVÉE ou REJETÉE. |
| Juridiction / normes / éditions | Canada. Édition à choisir par l'utilisateur (§1) : CNB 2020 ou 2025, partie 4 ; Manuel canadien d'ingénierie des fondations (CFEM), 5e éd. ; CSA A23.3-19 ou A23.3:24. |
| Objet | Revue de `src/lib/analysis.ts`, `src/lib/fem.ts` et `src/lib/types.ts`, ainsi que des références affichées par `OfficialNoteDeCalcul.tsx` et `CalculationStepsTheory.tsx`. Écarts classés, corrections proposées, décisions à prendre, cas de référence. |
| Code examiné | Dépôt `C:\Users\rodri\Downloads\mur--cnb2020`, état du 2026-10-30. Les numéros de ligne s'appliquent à cet état. |
| Méthode | Lecture ciblée du code, contrôles de mécanique faits à la main (statique, formules classiques de poussée), recherche web limitée (énoncés d'intention du CNRC). |
| **Limite majeure de cette revue** | Version initiale (2026-10-30) rédigée sans lecture des PDF. **Mise à jour du 2026-10-31 : les sources ont été lues (rendu des pages PDF). Les statuts du §2 sont corrigés ; les constats confirmés ou corrigés sont au §8.** Ce qui n'a pas été lu reste « À CONFIRMER ». |

Légende de gravité :
- **CRITIQUE** : résultat non sécuritaire, ou conformité affichée sans vérification ;
- **MAJEUR** : méthode fausse ou vérification exigée absente ;
- **MINEUR** : écart conservateur ou imprécision limitée ;
- **COSMÉTIQUE** : texte ou référence seulement.

---

## 1. Éditions de référence proposées (décision D1 à D4)

| Domaine | Cité par l'application | Proposition | Justification / à vérifier |
|---|---|---|---|
| Charges et combinaisons | « CNB 2020 », tableau 4.1.3.2.-A (`analysis.ts:93`) | **Option A : CNB 2020**, si la province l'a adopté pour le projet. **Option B : CNB 2025**, disponible dans `Livre de béton/CNB2025pdf.pdf`. | La juridiction (province, code provincial en vigueur) détermine l'édition applicable. **À CONFIRMER par l'utilisateur.** Les deux PDF (`cnb2020_Francais.pdf`, `CNB2025pdf.pdf`) sont disponibles, mais ils n'ont pas été lus. |
| Géotechnique (poussées, facteurs φ, portance, séisme M-O) | « CFEM 2006 » (4e éd.), tableau 8.1, chapitre 24, fig. 24.12 (`types.ts:79`, `CalculationStepsTheory.tsx:47, 358`) | **CFEM 5e édition** (anglais et français disponibles) | La 4e édition (2006) est remplacée. Les numéros de chapitre, de tableau et de figure de la 4e édition (tableau 8.1, fig. 24.12, §6.7, §24.9) **ne sont pas transposables** sans relecture. **À CONFIRMER.** |
| Béton armé | « CSA A23.3-19 » (`analysis.ts:967`, `OfficialNoteDeCalcul.tsx:42`) | A23.3-19 avec le CNB 2020, ou A23.3:24 avec le CNB 2025 (correspondance **À CONFIRMER** dans la partie 4 du CNB, liste des normes incorporées par renvoi). Pour cohérence avec le projet d'ancrages, l'utilisateur a choisi :24 le 2026-10-27 (fiche GEO-01). | Les deux PDF sont dans `docs/methodes/`, mais ils n'ont pas été lus ici. |
| Ouvrage d'enseignement | « Omar Chaallal », équations 3.15, 4.11, 5.21, chap. 7 (`CalculationStepsTheory.tsx:520-747`) | Le livre est **calé sur l'A23.3-04** (titre du PDF). Il peut servir d'explication, **jamais de référence normative**. Chaque équation doit renvoyer à l'article A23.3 de l'édition retenue. | Les numéros d'équation de Chaallal ne prouvent pas la conformité à l'édition -19 ou :24 (MINEUR / COSMÉTIQUE, E29). |

---

## 2. Clauses et statut (mis à jour le 2026-10-31)

Sources lues :
- CNB 2025, vol. 1, en anglais (`CNB2025pdf.pdf`) ;
- CFEM 5e édition, 2023 (`Canadian Foundation Engineering Manual 5th Edition.pdf`). La page de titre et le bandeau « CFEM 5th Edition (2023) » ont été vérifiés. Page PDF = page imprimée + 32 ;
- CSA A23.3:19 complète (`CSA A23.19.pdf`). Page PDF = page imprimée + 5 ;
- CNB 2005, Commentaires de la partie 4 (pour l'historique seulement) ;
- Paultre, *Structures en béton armé*. Page PDF = page imprimée + 32.

Notation : « p. » désigne la page imprimée, « PDF » la page du fichier. Les extraits sont courts et cités en anglais quand la source est en anglais.

| Clause | Objet | Statut | Référence lue (page), extrait court |
|---|---|---|---|
| CNB 2025, 4.1.3.2.(3) | Charges d'accompagnement prises égales à zéro | **VÉRIFIÉ** | p. 4-4, PDF 452 : « principal loads acting with the companion loads taken as zero » |
| CNB 2025, 4.1.3.2.(4) | Facteur de H | **VÉRIFIÉ** | p. 4-4, PDF 452 : « load factors of 1.5, 1.0 and 1.25 assigned to H, P and T respectively » |
| CNB 2025, 4.1.3.2.(5) | Charge permanente contraire : 0,9D aux cas 2 à 4, 1,0D au cas 5 | **VÉRIFIÉ** | p. 4-4, PDF 452 : « 0.9D in load combination cases 2, 3 and 4 and 1.0D in load combination case 5 » |
| CNB 2025, 4.1.3.2.(8), (9), (10) | Sol : 1,25 porté à 1,5, réductible à 1 + 0,6/hs ≥ 1,25 si hs > 1,2 m ; sol saturé à 1,5 au cas 1 ; E comprend la poussée sismique selon 4.1.8.16.(7) | **VÉRIFIÉ** | p. 4-5, PDF 453 |
| CNB 2025, tableau 4.1.3.2.-A | Cas 1 à 5 | **VÉRIFIÉ** | p. 4-4, PDF 452 (voir MUR-01) |
| CNB 2025, note A-4.1.3.2.(4) | H dans les combinaisons | **VÉRIFIÉ** | PDF 555 : « For common building structures below ground level […] 1.5H is added to load combinations 2 to 4. For cantilever retaining wall structures, see the Commentary entitled Limit States Design ». Le commentaire 2025 n'est pas disponible : **À CONFIRMER** |
| CNB 2005, Commentaire A, tableau A-3 (historique) | Facteur de H dans les combinaisons rares | VÉRIFIÉ, **édition 2005 seulement** | p. A-6 : H « 1,5 ou 0,0 ou 1,0 », note (3) « Pour les combinaisons de charges rares ». § 19 (p. A-7 et A-8) : D contraire à 0,9 aux cas 2 à 4 et à 1,0 au cas 5. § 21 et 22 : murs en porte-à-faux, renvoi au CFEM |
| CNB 2025, 4.1.8.16.(1) à (5) et (7) | Fondations. L'alinéa (7) exige le calcul des murs de sous-sol pour la poussée sismique en catégorie SC3 ou SC4 | **VÉRIFIÉ** | p. 4-73, PDF 521 : « Where the Seismic Category is SC3 or SC4, basement walls shall be designed to resist earthquake lateral pressures from backfill or natural ground » |
| CNB 2025, note A-4.1.8.16.(7) | Méthode de calcul de la poussée sismique | **VÉRIFIÉ, renvoi seulement** | p. 4-127, PDF 575 : renvoi au commentaire « Design for Seismic Effects », non disponible (**À CONFIRMER**) |
| CNB 2025, 4.1.8.4 (aléa, catégorie d'emplacement) et article définissant la catégorie sismique SC | PGA de calcul, F(PGA) | **À CONFIRMER** (non lu) | — |
| CNB 2025, section 4.2 (4.2.4) | Calcul aux états limites des fondations | **À CONFIRMER** (non relu dans cette session). Le CFEM 5e (p. 198, PDF 230) indique qu'en 2022 le CNB ne prescrit toujours pas de facteurs de résistance géotechnique | — |
| CFEM 5e, tableau 6.2 | Facteurs φ géotechniques (repris du CHBDC 2019) selon le degré de compréhension du site et du modèle | **VÉRIFIÉ** | p. 199, PDF 231 (valeurs au §8) |
| CFEM 5e, tableau 6.4 | Facteur de conséquence Ψ = 0,9 / 1,0 / 1,15 (conséquence élevée, typique, faible) | **VÉRIFIÉ** | p. 200, PDF 232 |
| CFEM 5e, 10.3.6, éq. 10.12 | B′ = B − 2e_B, présentée comme approche « approximate but reasonable » si la résultante reste dans le tiers central (e < B/6) | **VÉRIFIÉ** | p. 348, PDF 380 |
| CFEM 5e, éq. 10.14 | γsub = γsat − γw | **VÉRIFIÉ** | p. 349, PDF 381 |
| CFEM 5e, 18.7.1.1 à 18.7.1.3 | M-O : PAE = ½KAEγH²(1 − kv) ; KAE ; kh = ah/g ; kv = 2/3 kh à défaut d'étude du site ; ΔPAE à 0,6H (Seed-Whitman) ; KPE. Selon le CHBDC : kh = 50 % de ah et kv = 0 si le mur peut se déplacer de 25 à 50 mm | **VÉRIFIÉ** | p. 628-632, PDF 660-664 |
| CFEM 5e, 18.7.2 | Eau : Westergaard (eau devant le mur), Matsuzawa (remblai saturé) | **VÉRIFIÉ** | p. 632-633, PDF 664-665 |
| CFEM 5e, 18.7.3 | Mur rigide : K0 = 1 − sin φ ; ΔP0E = kh·γ·H² appliqué à 0,58H (Wood) | **VÉRIFIÉ** | p. 633, PDF 665 |
| CFEM 5e, 20.4, fig. 20.8 et 20.9 | Surcharge σ = q·K ; charges linéaires et ponctuelles (Boussinesq modifiée par l'expérience) ; pression de compactage | **VÉRIFIÉ** | p. 693-695, PDF 725-727 |
| CFEM 5e, 20.5 | M-O ; incrément sismique appliqué à 0,6H | **VÉRIFIÉ** | p. 693-696, PDF 725-728 |
| CFEM 5e, 20.7.1 à 20.7.3 et fig. 20.10 | Poussée active pour la stabilité des murs libres, au repos pour les murs retenus ; renversement ; glissement (butée seulement sous la profondeur de gel) ; portance selon le ch. 10 (excentricité et inclinaison), tiers central ; poids déjaugé et sous-pression | **VÉRIFIÉ** | p. 697-699, PDF 729-731 |
| CSA A23.3:19, 7.8.1 et 7.8.3 | Dalles et semelles : 0,002Ag dans chaque direction ; espacement ≤ min(5h ; 500 mm) | **VÉRIFIÉ** | p. 47, PDF 52 |
| CSA A23.3:19, 7.9 | Enrobage selon la CSA A23.1 | **VÉRIFIÉ, renvoi seulement**. Valeurs de l'A23.1 : **À CONFIRMER** | p. 47, PDF 52 |
| CSA A23.3:19, 8.4.2 et 8.4.3 | φc = 0,65 ; φs = 0,85 | **VÉRIFIÉ** | p. 50, PDF 55 |
| CSA A23.3:19, 10.1.7 | α1 = 0,85 − 0,0015f′c ≥ 0,67 ; β1 = 0,97 − 0,0025f′c ≥ 0,67 | **VÉRIFIÉ** | p. 61, PDF 66 |
| CSA A23.3:19, 10.5.1 et 10.5.2 | Mr ≥ 1,2Mcr, ou 7.8 pour les dalles et semelles, ou éq. 10.4 pour les autres éléments ; dispense si Mr ≥ 4/3·Mf ; **c/d ≤ 0,8·700/(700 + fy)** | **VÉRIFIÉ** | p. 63, PDF 68 |
| CSA A23.3:19, 10.6.1 | z ≤ 30 000 N/mm (intérieur) ou 25 000 N/mm (extérieur) ; fs = 0,6fy permis ; enrobage pris au plus égal à 50 mm pour calculer dc et A | **VÉRIFIÉ** | p. 64, PDF 69 |
| CSA A23.3:19, 11.3.2 à 11.3.6.3 | Section à dv de la face ; Vr,max = 0,25φc f′c bw dv ; Vc = φcλβ√f′c bw dv, avec β ≥ 0,05 et √f′c ≤ 8 MPa ; β = 0,21 pour les semelles de h ≤ 350 mm et dans le cas b) ; β = 230/(1000 + dv) si le granulat fait au moins 20 mm, sinon sze | **VÉRIFIÉ** | p. 79-80, PDF 84-85 |
| CSA A23.3:19, 11.5.1 à 11.5.4 | vr = λφc(c + μσ) + φsρv fy cos αf ; c et μ ; σ = ρv fy sin αf + N/Ag, où **N est la charge permanente non pondérée** | **VÉRIFIÉ** | p. 89-90, PDF 94-95 |
| CSA A23.3:19, 12.2.1 à 12.2.5 | ld ≥ 300 mm ; éq. 12.1 ; tableau 12.1 (coefficient 0,45 ou 0,6) ; k1 à k4 ; k1k2 ≤ 1,7 | **VÉRIFIÉ** | p. 92-93, PDF 97-98 |
| CSA A23.3:19, 12.5 | Crochets : ldh ≥ max(8db ; 150 mm) ; lhb = 100db/√f′c ; facteurs de 12.5.3 | **VÉRIFIÉ** | p. 94, PDF 99 |
| CSA A23.3:19, 14.1.8.2 à 14.1.8.6 | Murs : db ≤ t/10 ; deux lits si t > 210 mm, **sauf pour les murs de sous-sol extérieurs et les murs de soutènement** ; espacement ≤ min(3t ; 500 mm) ; armature verticale 0,0015Ag ; armature horizontale 0,002Ag | **VÉRIFIÉ** | p. 126, PDF 131 |
| Paultre, ch. 17 | q = P/A ± My/I ; tiers central ; semelle filante : section critique de flexion à la face d'un mur en béton, Mf = ½·qsf·ab² ; Vf à d de la face ; ancrage ld au-delà de la section critique | **VÉRIFIÉ** (ouvrage d'enseignement) | p. 585-589, PDF 617-621. Le livre n'a pas de chapitre sur les murs de soutènement (table des matières, PDF 9 à 12) |
| Code de construction du Québec, chapitre I – Bâtiment | Édition du CNB adoptée et modifications québécoises | **À CONFIRMER** (aucune source disponible) | — |
| CSA A23.1 | Enrobages, classes d'exposition | **À CONFIRMER** (norme absente) | — |

**Bilan au 2026-10-31 : 30 points vérifiés dans une source lue, dont 3 par renvoi seulement. Restent À CONFIRMER : le commentaire du CNB 2025 (murs en porte-à-faux, séisme), 4.1.8.4 et la catégorie sismique, la section 4.2, l'A23.1 et le Code de construction du Québec.**


---

## 3. Revue par bloc de calcul

### 3.1 Coefficients de poussée (actif, repos, passif)

| N° | Code | Constat | Gravité | Correction proposée |
|---|---|---|---|---|
| E18 | `analysis.ts:247-249` | Ka et Kp de Rankine et K0 = 1 − sin φ (Jaky) : formules classiques, correctes pour un parement vertical et un remblai horizontal. Aucun support d'un remblai incliné (β) ni d'un parement incliné. Source CFEM : **À CONFIRMER**. | MINEUR | Documenter ce domaine d'application. Ajouter β si c'est demandé (décision D12). |
| E18b | `analysis.ts:252-259` | Ka de Coulomb : formule correcte pour α = β = 0. Mais δ = min(atan μ ; ratio·φ) **mélange le frottement à la base (μ) et le frottement sol-mur (δ)**. Pour la stabilité, la poussée agit sur le plan vertical fictif qui passe par l'extrémité du talon, donc à travers le sol, ce qui rend l'emploi de δ > 0 discutable. La composante verticale Pa·sin δ est ignorée, ce qui est conservateur. | MINEUR | Décision D11 : δ = 0 sur le plan fictif (Rankine), ou δ choisi explicitement par l'utilisateur. |
| **E19** | `analysis.ts:261-263` | **Kp de Coulomb faux (mécanique).** Le code utilise sin(φ − δ) au lieu de sin(φ + δ). Pour φ = 32° et δ = 21,34°, le code donne Kp = 1,69, ce qui est **inférieur au Kp de Rankine (3,25)**. La formule de Coulomb donne 7,34. Le résultat est conservateur mais physiquement incohérent. | MAJEUR | Corriger le signe. Pour le passif avec δ > 0, la méthode à retenir (spirale logarithmique, Coulomb limité, Rankine) est **À CONFIRMER** dans le CFEM 5e. Décision D10. |
| E20 | `analysis.ts:281-282` | L'option `reduced_cfem` prend Kp × 0,50, avec le commentaire « CFEM Table 8.1 », puis le glissement applique encore φp = 0,50 (`:768`). La butée est donc réduite à 25 %, sans source. | MINEUR (conservateur) | Supprimer la double réduction, ou la justifier par une clause lue. |
| E20b | `analysis.ts:267-268` | En mode `basement`, K0 est imposé. C'est cohérent pour un mur appuyé en tête (le CFEM traite les murs non déplaçables : **À CONFIRMER**). | — | Afficher l'hypothèse dans la note. |
| E20c | `analysis.ts:324-326` | La hauteur de butée vaut `hSolAv`. On ne sait pas si elle est mesurée depuis le dessus ou le dessous de la semelle. La butée est prise sur toute la hauteur, sans déduire la zone de gel ou d'excavation possible. | MINEUR / décision | Décision D9 : profondeur de butée à négliger (souvent la profondeur de gel ; pratique **À CONFIRMER** dans le CFEM). |

### 3.2 Surcharges et charges additionnelles

| N° | Code | Constat | Gravité | Correction proposée |
|---|---|---|---|---|
| **E04** | `analysis.ts:499-510`, boucle `:712-747` | **Charges variables stabilisantes comptées comme favorables.** Le poids de la surcharge au-dessus du talon (`W_surcharge_amont`, de type L ou S) et les charges Fy ajoutées entrent dans `sumV_min` et `M_res_min` avec le facteur **1,5** de la combinaison. Le facteur `minD` ne s'applique qu'à D (`:715`). Le glissement et le renversement sont donc surestimés. Principe usuel : une charge variable favorable vaut 0. CNB : **À CONFIRMER** (4.1.3.2 et notes du tableau 4.1.3.2.-A). | **CRITIQUE** | Pour la stabilité : facteur 0 sur toute charge non permanente qui stabilise, que la combinaison principale soit ou non dans le même cas. La poussée de la surcharge reste avec son facteur. |
| E25 | `analysis.ts:585-609` | Poussée latérale induite par une charge verticale placée sur le remblai : `Ka·Fy·η`, avec un η linéaire ad hoc et une hauteur d'application arbitraire (`0.4·hMur`, plafond `0.85·H`). Ce n'est ni Boussinesq ni une méthode du CFEM. | MAJEUR | Remplacer par une méthode tirée d'une source lue (Boussinesq modifiée, ou méthode du CFEM **À CONFIRMER**), ou signaler la charge comme NON VÉRIFIÉE. |
| E25b | `analysis.ts:497-501` | Poussée de la surcharge Ka·q·H sur toute la hauteur, appliquée à H/2 : correct (Rankine). | — | — |

### 3.3 Nappe phréatique

| N° | Code | Constat | Gravité | Correction proposée |
|---|---|---|---|---|
| **E02** | `analysis.ts:398-407, 423-483` | **Aucune sous-pression sous la semelle.** Le poids du sol sur le talon reste γ·hMur, même sous la nappe, alors qu'il faudrait γ′. L'eau ajoute une poussée (Pw), mais ni le soulèvement ni la réduction du poids effectif ne sont comptés. Le glissement, le renversement et la portance sont **non sécuritaires** dès que la nappe est cochée. | **CRITIQUE** | Ajouter la sous-pression u = γw·hw sous la semelle (diagramme selon les conditions de drainage, décision D8). Prendre γ′ pour le sol immergé du talon et Rv effective pour le glissement. |
| E02b | `analysis.ts:426` | γ′ = max(γ − γw ; 8). Il faut γsat − γw, et non γ humide − γw. Le plancher à 8 kN/m³ est arbitraire. | MINEUR | Ajouter le champ γsat (le type a déjà un `gamma_prime` facultatif, non utilisé). |
| E24 | `analysis.ts:474-482` | Pw est classé H (facteur 1,5). On ne sait pas si le CNB range la pression d'eau souterraine dans H : **À CONFIRMER** (définition de H, 4.1.2.1). | Décision D7 | — |
| E02c | `analysis.ts:821-824`, `:886-891` | La pression d'eau **n'est pas prise dans les efforts du voile** (Mf et Vf du voile ne contiennent que le sol sec et la surcharge). | **CRITIQUE** (inclus dans E01) | Voir E01. |

### 3.4 Séisme (Mononobe-Okabe, Seed-Whitman)

| N° | Code | Constat | Gravité | Correction proposée |
|---|---|---|---|---|
| E13a | `analysis.ts:298-307` | θ = atan(kh/(1 − kv)). La formule M-O (parement vertical, remblai horizontal) est correcte (mécanique, vérifiée au cas 2). Source CFEM 5e : **À CONFIRMER**. | — | — |
| E13b | `analysis.ts:314` | ΔPae(M-O) = (Kae − K_active)·½γH² : **le facteur (1 − kv) est omis**. De plus, K_active peut être le Ka de Rankine (δ = 0) ou K0, alors que Kae est calculé avec δ > 0. L'incrément mélange donc des hypothèses : au cas 2, il vaut 7,98 kN/m au lieu de 11,52 kN/m si les deux coefficients prennent le même δ. | MAJEUR | ΔPae = ½γH²[(1 − kv)Kae − Ka], avec le **même δ** dans Ka et Kae. Pour un mur non déplaçable (`basement`), la méthode est **À CONFIRMER** (CFEM). |
| E13c | `analysis.ts:308-312, 319` | Seed-Whitman : ΔKae = 0,75 kh, ΔPae = 3/8·kh·γ·H², appliqué à 0,6 H. Ce sont les valeurs publiées par Seed et Whitman (1970). Leur reprise par le CFEM 5e : **À CONFIRMER**. | — | — |
| E13d | `analysis.ts:633-686` | **L'inertie du sol au-dessus du talon n'est pas prise en compte** quand la poussée est appliquée sur le plan fictif. Seules l'inertie du voile et celle de la semelle sont comptées. kv n'agit que sur le voile ; son signe (vers le haut ou vers le bas) n'est pas étudié. | MAJEUR | Ajouter kh·W(sol sur talon) et étudier les deux signes de kv. Méthode : **À CONFIRMER** (CFEM). |
| E23 | `SoilAndSeismicMethodModal.tsx:60-62` | kh = 0,5·PGA (mur libre) ou 1,0·PGA (mur rigide). On ne sait pas si l'application prend la PGA de référence ou la PGA de calcul, avec F(PGA) selon la catégorie d'emplacement. CNB 4.1.8 et CFEM : **À CONFIRMER**. | MAJEUR / décision D6 | Saisir la PGA du site (tableau C-3 de la division B du CNB, probabilité 2 % en 50 ans) et la catégorie d'emplacement, puis calculer kh selon la règle retenue après lecture. |
| E13e | `analysis.ts:121-122` | Combinaisons sismiques : 1,0D + 1,0E + 1,0H + 0,5L + 0,25S, et 0,9D + 1,0E + 1,0H. Le facteur de H dans le cas sismique (renvoi à 4.1.8.16.(7), objet vérifié pour le CNB 2015) et l'admissibilité de 0,9D avec E : **À CONFIRMER**. Au cas 2, la combinaison avec 0,9D gouverne le glissement (FS = 0,976, contre 1,085 avec 1,0D). | MAJEUR (gouverne le résultat) | Lire 4.1.3.2, le tableau 4.1.3.2.-A et 4.1.8.16 de l'édition retenue. |

### 3.5 Combinaisons de charges (CNB)

| N° | Code | Constat | Gravité | Correction proposée |
|---|---|---|---|---|
| E09a | `analysis.ts:102` | Le cas 1 « 1,4D + 1,5H » prend `minD = 0,9` : la stabilité de ce cas est vérifiée à 0,9D, mais la portance est calculée à 1,4D (voir E06). | MAJEUR | Une combinaison = un jeu de facteurs. Générer explicitement les variantes à 0,9D. |
| E09b | `analysis.ts:103-104` | Le cas 2 prend « 1,0S » comme charge d'accompagnement. Valeur (0,5S ou 1,0S selon l'édition) : **À CONFIRMER**. | À CONFIRMER | — |
| E09c | `analysis.ts:109-110` | Le cas 3 prend « 1,0L » comme charge d'accompagnement **pour toutes les aires**. Le CNB 2015 (alinéa (7), objet vérifié) réserve un facteur plus élevé aux aires d'entreposage, d'équipement et de service ; ailleurs, 0,5L (valeur **À CONFIRMER**). Écart conservateur. | MINEUR | Option : type d'occupation. |
| E09d | `analysis.ts:102-122` | Facteur 1,5 sur H dans tous les cas non sismiques : **À CONFIRMER** (4.1.3.2.(4) ne vérifie que la présence de H). Il n'existe pas de cas où H est favorable. | À CONFIRMER | — |
| E09e | `analysis.ts:399-407` | Poids du sol sur le talon classé D (1,25 ou 0,9). L'alinéa 4.1.3.2.(8) (objet vérifié, CNB 2015) prévoit un traitement particulier du sol, avec une réduction si l'épaisseur dépasse 1,2 m. Non appliqué. | MINEUR / décision D5 | — |
| E22 | `analysis.ts:125-135` | 11 combinaisons ELS avec W et S. Pour le tassement, le CFEM retient en général les charges soutenues non pondérées (**À CONFIRMER**). | MINEUR | — |

### 3.6 Glissement

| N° | Code | Constat | Gravité | Correction proposée |
|---|---|---|---|---|
| E21a | `analysis.ts:767-772` | Fs = c·B·φcoh + Pp·φp + ΣV·μ·φgs, avec un critère Fs/H ≥ 1. La forme ELU est plausible. Valeurs de φ (0,6 / 0,5 / 0,8, issues de la 4e éd.) : **À CONFIRMER** dans le CFEM 5e ou le CNB. | À CONFIRMER | — |
| E19b | `analysis.ts:362, 767` | La cohésion `soil.cohesion` est celle du **remblai** : il n'y a qu'un sol. Pour le glissement, il faut l'adhérence ou la cohésion du **sol de fondation**, et le court terme n'est pas distingué du long terme. | MAJEUR | Séparer le sol de remblai et le sol de fondation (décision D13). |
| E04 | voir 3.2 | Charges variables stabilisantes dans ΣV. | CRITIQUE | — |
| E02 | voir 3.3 | Sous-pression absente. | CRITIQUE | — |

### 3.7 Renversement

| N° | Code | Constat | Gravité | Correction proposée |
|---|---|---|---|---|
| E08 | `analysis.ts:776-780` | Le critère est Ms/Mr ≥ 1, avec φ_renv = 0,5 sur le moment de la butée. Le facteur « φ_renv » n'existe pas dans les sources connues (**À CONFIRMER**). En calcul aux états limites, le CFEM traite souvent le renversement par une limite d'excentricité ou par le contrôle de la portance (**À CONFIRMER**). | MAJEUR / décision D3 | Lire le CFEM 5e (murs de soutènement) et retenir le critère : e ≤ B/6 à l'ELS, e ≤ B/3 ou B′ = B − 2e à l'ELU, selon la source. |

### 3.8 Portance (ELU et ELS)

| N° | Code | Constat | Gravité | Correction proposée |
|---|---|---|---|---|
| **E06** | `analysis.ts:777, 784-786` | **Excentricité incohérente (mécanique).** x1 = (Ms − Mr)/Rv : Ms vient de `M_res_min` (D à `minD` = 0,9 pour le cas 1), alors que Rv vient de `sumV_max` (D à 1,4). Ms contient aussi la butée **réduite par φ_renv**, c'est-à-dire une résistance. Au cas 1 (1,4D + 1,5H), le code trouve e = 0,601 m > B/6 (« Cas 4 »), q = 202,9 kPa. Avec des facteurs cohérents : e = 0,094 m, q = 93,7 kPa. | MAJEUR | Calculer ΣV, ΣM_stab et ΣM_renv avec **le même jeu de facteurs** pour chaque combinaison. Ne pas mettre de résistance (butée pondérée) dans le calcul de e. |
| E07 | `analysis.ts:790-816` | La pression maximale (trapèze, ou triangle si e > B/6) est comparée à φgu·qu. Le CFEM utilise d'ordinaire la largeur effective de Meyerhof, B′ = B − 2e, avec une pression uniforme (**À CONFIRMER**). L'écart est conservateur pour e ≤ B/6. Il n'y a **aucune limite d'excentricité** : le « Cas 4 » est accepté. | MAJEUR | Décision D3 : ELU par B′ = B − 2e, qf = ΣV/B′ ≤ φgu·qu, avec une limite de e ; ELS : e ≤ B/6 sous charges soutenues et q ≤ q_adm(ELS). |
| E21b | `analysis.ts:814` | Le facteur φgu n'est appliqué qu'à `qUltimate_ULS`, une valeur que l'utilisateur saisit lui-même. Le lien avec le rapport géotechnique (résistance pondérée ou non) doit être explicite. Valeurs par défaut des préréglages (`:48-77`) : sans source. | MINEUR / décision D2 | Indiquer dans la note que qu et q_adm proviennent du rapport géotechnique. Marquer les préréglages comme indicatifs. |

### 3.9 Facteurs de résistance géotechnique

| N° | Code | Constat | Gravité | Correction proposée |
|---|---|---|---|---|
| E21 | `types.ts:79-83`, `analysis.ts:357-361` | φgu = 0,50 ; φgs = 0,80 ; φcoh = 0,60 ; φp = 0,50 ; φ_renv = 0,50, attribués au « CFEM tableau 8.1 / tableau 6.2 » (4e éd.). La 5e édition et le CNB 2020/2025 peuvent prévoir d'autres valeurs (degré de compréhension du site, niveaux de conséquence) : **À CONFIRMER**. L'origine de φ_renv est inconnue. | MAJEUR / décision D2 | Lire le tableau des facteurs φ du CFEM 5e et de la section 4.2 du CNB. Ne garder que les facteurs prévus. |

### 3.10 Efforts dans le voile et la semelle

| N° | Code | Constat | Gravité | Correction proposée |
|---|---|---|---|---|
| **E01** | `analysis.ts:819-824, 883-891, 975-976` | **Les efforts de calcul du voile (Mf, Vf) ignorent** l'incrément sismique et l'inertie (E), la pression d'eau, la charge en tête (`pointLoadTop` : Fx, Mz), les réactions en tête et les charges ponctuelles Fx. Seules les charges Fx réparties sont transmises au calcul MEF. Au cas 2, le moment au pied du voile vaut **48,4 kN·m/m** (combinaison sismique), contre **39,4 kN·m/m** retenu par le code. | **CRITIQUE** | Calculer Mf(y) et Vf(y) du voile pour **chaque** combinaison, avec tous les cas de charge, puis prendre l'enveloppe. |
| E11 | `analysis.ts:826-836` | Talon et patin : la pression du sol est approchée par « moyenne de q_heel et de la pression moyenne ». La distribution réelle à la face du voile n'est pas utilisée, et la zone comprimée partielle (Cas 4) n'est pas traitée correctement. | MAJEUR | Intégrer la distribution réelle q(x) jusqu'à la face du voile (et à dv de la face, pour le cisaillement). |
| E11b | `analysis.ts:922-965` | Les diagrammes du talon et du patin prennent un facteur **1,4 codé en dur** pour D et la pression de la combinaison qui a le plus grand q_toe. Ils ne correspondent pas aux efforts utilisés pour le calcul (`:977-980`). | MAJEUR (incohérence affichée) | Tracer les diagrammes de la combinaison gouvernante. |
| E10 | `analysis.ts:751-758` | Mode `basement` : la réaction en tête vaut Rt = 3/8·Psur + **1/10·Psol**. Pour une charge triangulaire nulle en tête, sur une poutre encastrée à la base et appuyée en tête, R_tête = **W/5 = 0,2·Psol** (mécanique). Le code prend aussi H totale au lieu de hMur. | MAJEUR | Prendre R_tête dans la réaction du calcul MEF (`fem.ts`), qui la calcule déjà, plutôt qu'une formule. |
| E26 | `fem.ts:206` | Le dernier nœud est forcé à V = M = 0. C'est faux pour un mur appuyé en tête, où V(tête) = R. L'enveloppe prend à la fois le facteur maximal de H et celui de la surcharge, ce qui est conservateur. | MINEUR | — |

### 3.11 Béton armé (A23.3) : flexion, cisaillement, armature minimale, retrait, développement

| N° | Code | Constat | Gravité | Correction proposée |
|---|---|---|---|---|
| E27 | `analysis.ts:80-91, 164-174, 971-972` | φc = 0,65, φs = 0,85, α1, β1, a = φs·As·fy/(α1·φc·f′c·b), Mr = φs·As·fy·(d − a/2) : forme conforme à la pratique A23.3. Clauses 8.4 et 10.1.7 : **À CONFIRMER**. Le béton est **figé** (f′c = 30 MPa, fy = 400 MPa, enrobages 60 et 75 mm), sans classe d'exposition (A23.1). | MAJEUR / décision D4 | Rendre f′c, fy, l'enrobage et la classe d'exposition saisissables. Contrôler l'enrobage selon A23.1 (**À CONFIRMER**). |
| **E05** | `analysis.ts:165, 199, 212` ; `CalculationStepsTheory.tsx:561, 632` ; `CalculationReport.tsx:378` | **Conformité affichée sans vérification.** As,min est calculé mais **jamais comparé** à As fourni : le texte « ≥ As,min (CONFORME) » est écrit en dur. De même, « Z ≤ Z_limit (CONFORME) » est écrit en dur (`:632`), alors que `Z_ok` existe, et la ductilité est affichée « (OK) » sans test. | **CRITIQUE** (règle du projet : aucune conformité sans preuve) | Brancher chaque statut affiché sur un test réel. Ajouter `As_ok` et l'intégrer au statut global. |
| E16 | `analysis.ts:165` | As,min = 0,002·b·h pour tous les éléments. Les articles applicables diffèrent : 10.5.1.2 pour la flexion, 7.8.1 pour les dalles et semelles, 14.1.8 pour les murs, avec des pourcentages différents pour l'armature verticale et horizontale (**À CONFIRMER**). L'espacement maximal n'est pas vérifié. | MAJEUR | Lire 7.8, 10.5 et 14.1.8 dans l'édition retenue et appliquer l'article de chaque élément. |
| E16b | `analysis.ts:1078-1109` | Retrait de la semelle : 2 lits de 15M à 250 mm, **codés en dur**, statut toujours vrai. | MAJEUR | Choix utilisateur, puis comparaison à As,min. |
| E14 | `analysis.ts:162-164` | dv = max(0,9d ; 0,72h) ; β = 230/(1000 + dv), sans armature transversale ; sze = dv seulement si le granulat fait 20 mm (`aggregate_size` existe, mais il n'est pas utilisé). Il manque : la valeur β = 0,21 permise pour les semelles et les dalles minces (conservateur), la section critique à dv de la face (conservateur), le plafond Vr ≤ 0,25·φc·f′c·bw·dv et la limite √f′c ≤ 8 MPa. Clauses 11.3 : **À CONFIRMER**. | MINEUR | Compléter après lecture. |
| E15 | `analysis.ts:179-182, 998` | z = fs·(dc·A)^(1/3), avec fs = 0,6·fy et A = 2·dc·s, limite de 25 000 N/mm (exposition extérieure). Le plafond éventuel de dc (enrobage limité à 50 mm) n'est pas appliqué : **À CONFIRMER** (10.6.1). | MINEUR | — |
| E28 | `analysis.ts:175-176` | Le test c/d ≤ 700/(700 + fy) existe (`ductility_ok`), mais il n'est pas branché sur l'affichage (E05). Clause 10.5.2 : **À CONFIRMER**. | MINEUR | — |
| **E12** | `analysis.ts:185` | ld = 0,45·k1·k2·k3·k4·(fy/√f′c)·db avec **k4 = 0,8 pour tous les diamètres**. Ce facteur réduit ne s'applique, en pratique A23.3, qu'aux barres de 20M et moins (**À CONFIRMER**, 12.2.3/12.2.4). Le code prend aussi **k1 = 1,0** pour les barres supérieures du talon (plus de 300 mm de béton frais dessous si epBase > 0,3 m ; 1,3 attendu, **À CONFIRMER**). Les conditions d'enrobage et d'espacement de la formule simplifiée ne sont pas vérifiées. Ces écarts ne sont pas sécuritaires. | MAJEUR | Appliquer les facteurs k selon les barres, leur position et l'enrobage, après lecture de 12.2. |
| E30 | `analysis.ts:186-188, 999` | Crochet : lhb = 100·db/√f′c, puis ldh = 0,7·lhb **sans condition** (enrobages latéral et d'about) ; les minimums (8 db, 150 mm) ne sont pas vérifiés ; le facteur fy/400 n'est pas appliqué. Clause 12.5 : **À CONFIRMER**. | MINEUR | — |

### 3.12 Cisaillement par frottement à la jonction voile-semelle

| N° | Code | Constat | Gravité | Correction proposée |
|---|---|---|---|---|
| **E03** | `analysis.ts:1111-1119` | Plusieurs défauts : (1) **N = max(ΣV_min) de tout le mur**, sol du talon et semelle compris. Il faut seulement l'effort normal **dans le voile** à la jonction (poids du voile et charges en tête), avec le facteur minimal (0,9D) et **sans charge variable**. (2) ρv ne prend que l'armature de la face **extérieure**, ce qui ne correspond à aucune règle lue. (3) c = 0,25 MPa et μ = 0,60 correspondent, selon toute vraisemblance, à une surface non rendue rugueuse (**À CONFIRMER**, 11.5.2) : c'est une décision. (4) Pas de plafond de Vr (**À CONFIRMER**). Le point (1) n'est pas sécuritaire : σ est fortement surestimé. | **CRITIQUE** | N = poids du voile × 0,9 (et charges permanentes en tête × 0,9). ρv = barres qui traversent le joint et qui sont ancrées des deux côtés, en déduisant la part sollicitée en flexion si la clause l'exige (**À CONFIRMER**). Décision D14 sur l'état de surface. |

### 3.13 Références affichées

| N° | Fichier | Constat | Gravité |
|---|---|---|---|
| E29 | `CalculationStepsTheory.tsx:47, 54, 358` ; `OfficialNoteDeCalcul.tsx:42, 70, 401` | Citations de « CFEM 2006 », du « tableau 8.1 », de la « fig. 24.12 », de « §6.7 et 24.9 », de « CNB 2020 » et des équations de Chaallal (A23.3-04) comme si c'étaient les clauses applicables. Aucune n'a été vérifiée. `CalculationStepsTheory.tsx:558` cite « CSA Art. 14.1.8 » pour 0,002·Ag (**À CONFIRMER**). | COSMÉTIQUE à MAJEUR (traçabilité de la note) |
| E33 | — | Non traités : stabilité d'ensemble (glissement profond), gel et profondeur de la semelle, drainage, tassement calculé, pression de compactage. À indiquer dans la note comme **NON VÉRIFIÉ**. | MAJEUR (étendue de la note) |

---

## 4. Décisions de conception à faire valider par l'utilisateur

| N° | Décision | Options |
|---|---|---|
| D1 | Éditions de référence | (a) CNB 2020 + CFEM 5e + A23.3-19 ; (b) CNB 2025 + CFEM 5e + A23.3:24. Préciser la province. |
| D2 | Facteurs de résistance géotechnique | Valeurs du CFEM 5e ou du CNB (après lecture), modifiables. Supprimer φ_renv s'il n'existe pas dans la source. |
| D3 | Critères de renversement et de portance | (a) Ms/Mr ≥ 1 (actuel) ; (b) limite d'excentricité, et portance ELU par B′ = B − 2e. Limite de e à l'ELS. |
| D4 | Béton | Rendre f′c, fy, l'enrobage et la classe d'exposition saisissables (actuellement figés). |
| D5 | Poids du sol sur le talon | Facteur D standard, ou traitement particulier du sol (4.1.3.2.(8), **À CONFIRMER**). |
| D6 | Séisme | kh = f(PGA, F(PGA), mur libre ou rigide) ; signe de kv ; méthode (M-O avec δ cohérent, ou Seed-Whitman) ; 0,9D admis ou non avec E. |
| D7 | Eau | Pression d'eau classée H (1,5) ou autre ; diagramme de sous-pression (drainage). |
| D8 | Drainage | Hypothèse de remblai drainé sans nappe (cas courant), ou nappe avec sous-pression. |
| D9 | Butée | Profondeur à négliger (gel, excavation) ; utilisation de la butée pour le glissement seulement, ou aussi pour le renversement. |
| D10 | Kp avec δ > 0 | Rankine seulement, Coulomb corrigé, ou spirale logarithmique (CFEM). |
| D11 | δ sur le plan fictif | 0 (Rankine), ou valeur saisie. |
| D12 | Domaine géométrique | Parement vertical et remblai horizontal seulement (actuel), ou ajout de β. |
| D13 | Sols | Un seul sol (actuel), ou remblai et fondation séparés (cohésion, μ, γ). |
| D14 | Joint voile-semelle | État de surface (non rugueuse, rendue rugueuse, coulée monolithique) pour c et μ du cisaillement par frottement. |
| D15 | Charges variables favorables | Facteur 0 sur L et S stabilisants (proposé) : à confirmer avec le CNB. |

---

## 5. Cas de référence calculés à la main (pour l'audit)

Hypothèses communes :
- mur cantilever, parement vertical, remblai horizontal, pas de butée (hSolAv = 0), pas de surcharge, pas de nappe ;
- géométrie : hMur = 3,00 m, epStem = 0,30 m, ePiedAv = 0,60 m, ePiedAr = 1,50 m, epBase = 0,40 m, d'où **B = 2,40 m** et **H = 3,40 m** ;
- sol : γ = 19 kN/m³, φ = 32°, c = 0, μ = 0,55 ;
- béton : γc = 24 kN/m³, f′c = 30 MPa, fy = 400 MPa ; voile armé de 15M à 120 mm (face intérieure), enrobage de 60 mm ;
- facteurs : ceux du code (φgs = 0,8 ; 1,5H ; 0,9D, 1,25D ou 1,4D).

Tolérance : ±0,5 % sur les forces et les moments, ±0,002 sur les coefficients. Moments calculés par rapport à l'orteil ; x mesuré depuis l'orteil.

### 5.1 Cas R1 : statique (comportement actuel, puis valeurs « cohérentes » attendues)

| Grandeur | Calcul | Valeur |
|---|---|---|
| Ka (Rankine) | tan²(45° − 16°) = tan²29° | **0,3073** |
| Pa | ½·0,3073·19·3,4² | **33,74 kN/m**, à H/3 = 1,133 m ; M = 38,24 kN·m/m |
| W voile | 3,0·0,3·24 = 21,60, à x = 0,75 | M = 16,20 |
| W semelle | 2,4·0,4·24 = 23,04, à x = 1,20 | M = 27,65 |
| W sol talon | 3,0·1,5·19 = 85,50, à x = 1,65 | M = 141,08 |
| ΣD, ΣM_D | | **130,14 kN/m ; 184,92 kN·m/m** |
| Glissement 0,9D + 1,5H | Fs = 0,9·130,14·0,55·0,8 = 51,54 ; H = 1,5·33,74 = 50,61 | **FS = 1,018** (OK de justesse) |
| Glissement 1,25D + 1,5H | Fs = 162,68·0,44 = 71,58 | FS = 1,414 |
| Renversement 0,9D + 1,5H | Ms = 166,43 ; Mr = 57,36 | Ms/Mr = 2,901 |
| **Portance, cas 1 (1,4D + 1,5H), code actuel (E06)** | Rv = 182,20 ; Mnet = 166,43 − 57,36 = 109,07 ; x1 = 0,599 ; e = 0,601 > B/6 = 0,400 | « Cas 4 », **q_toe = 202,9 kPa** |
| Portance, cas 1, facteurs cohérents (attendu) | ΣM = 1,4·184,92 = 258,89 ; Mnet = 201,53 ; x1 = 1,106 ; e = 0,094 | **q_toe = 93,7 kPa ; q_heel = 58,1 kPa**. Meyerhof : B′ = 2,212 m, **q = 82,4 kPa** |
| Portance 0,9D + 1,5H | Rv = 117,13 ; x1 = 0,931 ; e = 0,269 | q_toe = 81,6 kPa. Meyerhof : B′ = 1,862 m, q = 62,9 kPa |
| Voile : Mf, Vf (1,5H, hMur = 3,0 m) | 1,5·½·0,3073·19·3²·(3/3) | **Mf = 39,41 kN·m/m ; Vf = 39,41 kN/m** |
| d, dv, β | d = 300 − 60 − 8 = 232 ; dv = max(208,8 ; 216) = 216 ; β = 230/1216 | 232 mm ; 216 mm ; 0,1891 |
| Vc | 0,65·0,1891·√30·1000·216 | **145,5 kN/m** |
| As ; α1 ; β1 | 200·1000/120 ; 0,85 − 0,045 ; 0,97 − 0,075 | 1 666,7 mm²/m ; 0,805 ; 0,895 |
| a ; Mr | 0,85·1666,7·400/(0,805·0,65·30·1000) ; 566 667·(232 − 18,05) | **a = 36,10 mm ; Mr = 121,24 kN·m/m** |
| c/d | (36,10/0,895)/232 | 0,174 ≤ 0,636 |
| As,min (code) | 0,002·1000·300 | 600 mm²/m |
| z | dc = 68 ; A = 2·68·120 = 16 320 ; 240·(68·16 320)^(1/3) | **z = 24 850 N/mm** (≤ 25 000) |
| ld (code, k4 = 0,8) | 0,45·0,8·400/√30·16 | 420,7 mm |

### 5.2 Cas R2 : sismique (même mur, kh = 0,15, kv = 0)

| Grandeur | Calcul | Valeur |
|---|---|---|
| ΔPae (Seed-Whitman, défaut du code) | 3/8·0,15·19·3,4² | **12,35 kN/m**, à 0,6H = 2,04 m ; M = 25,20 |
| Inertie du voile | 0,15·21,60 = 3,24, à y = 1,90 m | M = 6,16 |
| Inertie de la semelle | 0,15·23,04 = 3,456, à y = 0,20 m | M = 0,69 |
| Inertie du sol sur le talon (**absente du code**, E13d) | 0,15·85,50 = 12,83, à y = 0,4 + 1,5 = 1,90 m | M = 24,37 (à ajouter dans la version corrigée, selon D6) |
| Combinaison 1,0D + 1,0E + 1,0H (code) | ΣH = 33,74 + 12,35 + 3,24 + 3,456 = 52,79 ; Fs = 130,14·0,44 = 57,26 | **FS glissement = 1,085** |
| Combinaison 0,9D + 1,0E + 1,0H (code) | Fs = 51,54 | **FS = 0,976 → NON** |
| Renversement 1,0D / 0,9D | Mr = 38,24 + 25,20 + 6,16 + 0,69 = 70,29 | 2,631 / 2,368 |
| Portance 1,0D + E | x1 = (184,92 − 70,29)/130,14 = 0,881 ; e = 0,319 | q_toe = 97,5 kPa ; Meyerhof : B′ = 1,762 m, q = 73,9 kPa |
| Portance 0,9D + E | x1 = 0,821 ; e = 0,379 | q_toe = 95,1 kPa ; Meyerhof : B′ = 1,642 m, q = 71,3 kPa |
| Kae (M-O, δ = 21,34° comme dans le code, θ = 8,531°) | cos²(23,469°)/[cos θ·cos(29,875°)·(1 + √(sin 53,344°·sin 23,469°/cos 29,875°))²] = 0,8414/2,2145 | **Kae = 0,3799** |
| Ka de Coulomb (δ = 21,34°) | 0,7192/2,6150 | 0,2750 |
| ΔPae (M-O) : code / cohérent | (0,3799 − 0,3073)·109,82 / (0,3799 − 0,2750)·109,82 | **7,98 / 11,52 kN/m** (E13b) |
| Kp : Coulomb exact / code (E19) | — | **7,34 / 1,69** (Rankine : 3,25) |
| **Voile, combinaison sismique (attendu, E01)** | 1,0H : 26,27 ; ΔPae(voile) = 3/8·0,15·19·3² = 9,62, à 1,8 m → 17,31 ; inertie du voile 3,24, à 1,5 m → 4,86 | **Mf = 48,44 kN·m/m ; Vf = 39,13 kN/m**. Le code retient Mf = 39,41 (statique). L'écart (+23 %) n'est pas sécuritaire. Mr = 121,2 reste suffisant dans cet exemple. |

### 5.3 Contrôle mécanique de E10 (mur de sous-sol)

Poutre encastrée à la base et appuyée en tête, charge triangulaire nulle en tête et maximale w à la base. La réaction en tête vaut w·L/10 = **W/5**, avec W = wL/2. Exemple : W = Pa = 33,74 kN/m donne R = 6,75 kN/m. Le code donne 3,37 kN/m.

---

## 6. Plan de lecture pour fermer les points À CONFIRMER

Lancer le pilote `cdp.mjs` depuis une session qui dispose d'un shell. Capturer d'abord la table des matières, puis :

1. **CNB (édition D1)** : 4.1.2.1 (définition de H) ; 4.1.3.2 (alinéas 1 à 10) et tableau 4.1.3.2.-A avec ses notes ; 4.1.8.4 et 4.1.8.16 ; tableau C-3 (PGA) ; section 4.2 (fondations, facteurs φ ou renvoi). Commentaire K de la partie 4, s'il existe (`CNB 2005 - commentaires partie 4.pdf` pour l'historique seulement).
2. **CFEM 5e (anglais et français)** : chapitres sur les pressions des terres (Rankine, Coulomb, K0, butée, compactage), les murs de soutènement (glissement, renversement, excentricité), les fondations superficielles (B′ = B − 2e, ELU/ELS), le séisme (M-O, Seed-Whitman, kh/PGA, murs rigides) et le tableau des facteurs φ.
3. **A23.3 (édition D1)** : 7.8 ; 8.4 ; 10.1.7 ; 10.5 ; 10.6.1 ; 11.3.2 à 11.3.6 ; 11.5 ; 12.2 ; 12.5 ; 14.1.8 ; chapitre 15 (semelles), s'il s'applique.
4. **Paultre / Chaallal** : exemples de murs de soutènement, utiles comme 3e cas de référence indépendant.

Une fois ces pages lues, les fiches de méthode MUR-01 (charges et combinaisons), MUR-02 (géotechnique : poussées, stabilité, portance), MUR-03 (séisme) et MUR-04 (béton armé du voile et de la semelle) pourront remplacer ce document de revue.

## 7. Contenu exigé dans la note de calcul (après correction)

Données (géométrie, sols séparés, béton saisi, édition des normes), hypothèses (D1 à D15), références **avec leur statut**, équations, substitutions numériques par combinaison, résultats avec unités, statuts calculés (aucun texte « CONFORME » en dur), avertissements (éléments NON VÉRIFIÉS : stabilité d'ensemble, gel, drainage, tassement).

---

## 8. Constats confirmés ou corrigés après lecture des sources (2026-10-31)

La méthode qui découle de ces lectures est dans `MUR-02-geotechnique-seisme.md` (statut PROPOSÉE).

| Écart | Résultat de la lecture | Source (page) | Effet |
|---|---|---|---|
| E21 (facteurs φ) | Tableau 6.2 du CFEM 5e. Valeur pour une compréhension **typique**, puis faible / élevée entre parenthèses. Murs de soutènement : portance 0,50 (0,45 / 0,60) ; **renversement 0,50 (0,45 / 0,55)** ; glissement à la base 0,80 (0,70 / 0,90). Semelles superficielles : glissement cohésif 0,60 (0,55 / 0,65) ; butée 0,50 (0,40 / 0,55). Les valeurs du code sont celles du niveau « typique ». Le facteur de conséquence Ψ (tableau 6.4) vaut 0,9, 1,0 ou 1,15. | CFEM p. 199-200, PDF 231-232 | E21 confirmé. Ajouter Ψ et le degré de compréhension (décision D2). |
| E08 (φ_renv) | **Correction de MUR-00** : un facteur de renversement existe bien (tableau 6.2, 0,50 en compréhension typique). Le défaut réel est qu'il ne s'applique qu'au moment de la butée. Selon le CFEM (20.7.3.4), si la portance tient compte de l'excentricité et de l'inclinaison, une vérification séparée du renversement n'est généralement pas requise. | CFEM p. 199 et 698, PDF 231 et 730 | L'origine du facteur passe à MINEUR. Son application reste MAJEURE. |
| E20 | Le CFEM ne prévoit aucune réduction de 0,50 sur Kp : seul φ = 0,50 s'applique à la butée. La butée au-dessus de la profondeur de gel n'est pas comptée. | CFEM p. 199, 698-699 | Double réduction confirmée sans source. Profondeur de gel : décision D9. |
| E19 / D10 | Kp de Coulomb (éq. 18.31) confirmé. Le CFEM met en garde contre δ > φ′/2 pour la butée. | CFEM p. 631, 696 | Limiter δ ≤ φ′/2 pour la butée. |
| E07 / D3 | B′ = B − 2e est confirmé (éq. 10.12). Le CFEM le présente comme une approche approximative, **valable si e < B/6**. Il recommande aussi le tiers central pour la portance (20.7.3.4) et le tassement (20.7.3.5). | CFEM p. 348, 698-699 | Limite d'excentricité : décision D3 (MUR-02). |
| E02, E02b | Fig. 20.10 : W est le poids déjaugé, réduit par la sous-pression. γsub = γsat − γw. | CFEM p. 349, 699 | Constats confirmés. |
| E13b | Facteur (1 − kv) confirmé (éq. 18.20). | CFEM p. 628 | Confirmé. |
| E13c | Point d'application de ΔPAE à 0,6H (Seed-Whitman) confirmé. ΔKAE = 0,75kh n'apparaît pas dans les pages lues du CFEM 5e. | CFEM p. 630, 696 | Garder M-O comme méthode principale. |
| E23 | kh = ah/g (éq. 18.22), où ah est la PGA du site (ou F(PGA)·PGA). Le CHBDC retient kh = 50 % de ah et kv = 0 pour un mur qui peut se déplacer de 25 à 50 mm. Pour les murs de sous-sol, Taiebat retient 50 à 60 % de ah. | CFEM p. 629, 631 | La règle kh = 0,5·PGA (mur libre) est cohérente avec la source si la PGA est la valeur ah du site. Mur rigide : méthode de Wood, ΔP0E = kh·γ·H² appliqué à 0,58H. |
| E20b | Poussée active pour la stabilité des murs libres, poussée au repos pour les murs retenus. | CFEM p. 697 | Confirmé. |
| E25 | Méthode disponible : fig. 20.8 (charges linéaires et ponctuelles, Boussinesq modifiée par l'expérience). | CFEM p. 694 | Remplacer la formule ad hoc. |
| **E28** | **Correction de MUR-00** : la limite est c/d ≤ **0,8**·700/(700 + fy), soit 0,509 pour fy = 400 MPa, et non 0,636. Le test du code n'est **pas sécuritaire**. | A23.3:19, 10.5.2, p. 63 | Gravité relevée à **MAJEUR**. Cas R1 : c/d = 0,174, conforme. |
| E15 | L'enrobage pris pour dc et A est limité à 50 mm : confirmé. Avec un enrobage de 60 mm, le code prend dc = 68 mm, ce qui est conservateur. Valeur corrigée du cas R1 : dc = 58 mm, z = 22 350 N/mm. | A23.3:19, 10.6.1, p. 64 | MINEUR confirmé. |
| E14 | β = 0,21 est réservé aux semelles de h ≤ 350 mm et au cas b). β = 230/(1000 + dv) exige un granulat d'au moins 20 mm. Vr,max = 0,25φc f′c bw dv ; √f′c ≤ 8 MPa ; la section à dv n'est permise que sous conditions. | A23.3:19, 11.3.2 à 11.3.6.3, p. 79-80 | Confirmé. |
| E16 | Semelles : 0,002Ag dans chaque direction, espacement ≤ min(5h ; 500 mm). Murs : armature verticale **0,0015Ag**, horizontale 0,002Ag, espacement ≤ min(3t ; 500 mm), db ≤ t/10 ; les murs de soutènement sont dispensés des deux lits (14.1.8.3). Flexion : 10.5.1, avec dispense si Mr ≥ 4/3·Mf. La référence de `CalculationStepsTheory.tsx:558` (0,002Ag vertical selon 14.1.8) est fausse pour l'armature verticale. | A23.3:19, 7.8, 10.5.1, 14.1.8, p. 47, 63, 126 | Confirmé ; référence à corriger. |
| E12, E30 | k1 = 1,3 pour l'armature **horizontale** qui a plus de 300 mm de béton frais dessous ; k4 = 0,8 pour les barres de 20M et moins ; k1k2 ≤ 1,7 ; ld ≥ 300 mm. Tableau 12.1 : coefficient 0,45 pour les murs si l'espacement libre est d'au moins 2db, sinon 0,6 ; enrobage ≥ db et espacement ≥ 1,4db. Crochets : ldh ≥ max(8db ; 150 mm) ; facteur 0,7 si l'enrobage latéral est d'au moins 60 mm et l'enrobage du prolongement d'au moins 50 mm ; facteur fy/400. | A23.3:19, 12.2 et 12.5, p. 92-94 | Confirmé. |
| **E03 (et MUR-01 §2)** | **Correction de MUR-01** (APPROUVÉE, non modifiée ici) : dans σ, N est la **charge permanente non pondérée** (11.5.4), et non 0,9D. c et μ : 0,25 et 0,60 (surface non rendue rugueuse) ; 0,50 et 1,00 (surface rendue rugueuse sur 5 mm) ; 1,00 et 1,40 (béton monolithique). Plafond : λφc(c + μσ) ≤ 0,25φc f′c. | A23.3:19, 11.5, p. 89-90 | L'utilisateur doit décider (D19 de MUR-02). |
| E27 | φc, φs, α1 et β1 confirmés. | A23.3:19, 8.4 et 10.1.7 | Confirmé. |
| E09d / E13e | 4.1.3.2.(4) donne 1,5 pour H sans distinguer les cas. La note A-4.1.3.2.(4) ne cite que les cas 2 à 4 et renvoie au commentaire pour les murs en porte-à-faux. Le commentaire de 2005 donnait 1,0H dans les combinaisons rares. Facteur de H au cas 5 : **décision D16** (MUR-02). Avec E, D vaut 1,0 et non 0,9, ce que MUR-01 applique déjà. | CNB 2025 p. 4-4, PDF 555 ; CNB 2005 p. A-6 | À trancher par l'utilisateur. |
| E11 | Paultre : la section critique de flexion est à la face d'un mur en béton, et le cisaillement se vérifie à d de la face (semelle filante). | Paultre p. 589 | Confirme la correction proposée. |
| R2 (cas de référence) | Le cas R2 combinait 0,9D et E, et l'incrément de Seed-Whitman sans l'inertie du sol sur le talon. Avec la méthode de MUR-02 (M-O, inertie du talon, 1,0D), les valeurs changent : voir le cas G2 de MUR-02. | — | Les valeurs R2 de MUR-00 ne servent plus de valeurs attendues pour la version corrigée. |
