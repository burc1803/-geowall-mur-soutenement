# MUR-03 — Données sismiques du site : ah, kh, kv (CNB 4.1.8.4 et annexe C)

| | |
|---|---|
| Statut | **APPROUVÉE** le 2026-11-07, selon la proposition d'implémentation de la section « Complément du 2026-11-07 ». L'utilisateur a répondu « Tout Canada » à la question « Approuves-tu MUR-03 ainsi ? Données de tout le Canada ou du Québec seulement ? ». Données retenues : les 679 localités. Proposée le même jour. |
| Juridiction / norme / édition | Québec. CNB 2020 (vol. 1, div. B) par défaut ; CNB 2025 en option. CFEM 5e (2023), § 18.7.1. |
| Fichier de données | `src/data/shd2020.json` (données CNRC SHD-VAS 2020, 679 localités ; voir le complément du 2026-11-07). L'extraction du tableau C-3 (`MUR-03-tableau-C3-quebec.csv`), non vérifiée et inutilisée, a été retirée du dépôt le 2026-11-08. |
| Fiches liées | MUR-02 §4.1 (décision D6 : kh = ah/g par défaut ; option CSA S6 kh = 0,5·ah/g, kv = 0) |

**Méthode de lecture.** Les pages ont été lues dans les extractions `pdftotext -layout` des PDF du projet. La page PDF est obtenue en comptant les sauts de page de l'extraction. Il faut la confirmer à l'ouverture du PDF. Les citations sont courtes ; le reste est paraphrasé.

---

## 1. Constat principal (à lire en premier)

1. **Le tableau C-3 du CNB 2020 ne donne ni la PGA ni la PGV.** Il ne donne qu'**une seule grandeur par localité : Sa(0,2)**, « aux fins de la partie 9 ». Le texte précise que ces valeurs sont « identiques à celles du tableau C-3 du CNB 2015 » (annexe C, p. C-38, PDF 715). Ce sont donc des valeurs du modèle 2015, pour la catégorie de référence C. Le C-3 ne mentionne pas lui-même la catégorie C : c'est une déduction tirée du même paragraphe, **À CONFIRMER**.
2. Pour la **partie 4**, les aléas (Sa(T), PGA et PGV) se tirent de l'**Outil de calcul des aléas sismiques du CNB 2020** de RNCan, avec la latitude, la longitude et la désignation d'emplacement (p. C-38, PDF 715). Le CNB 2020 calcule ces valeurs **directement pour chaque désignation d'emplacement**. Il n'y a plus de coefficient d'emplacement appliqué à une catégorie de référence C, contrairement au CNB 2015 (p. C-38, PDF 715).
3. Conséquence : **ah ne peut pas être tiré du tableau C-3.** Une liste déroulante des localités tirée du C-3 ne fournit que la valeur Sa(0,2) de la partie 9 (2015). Elle ne fournit pas ah.
4. Le CNB 2020 signale un jeu de données d'archives : les valeurs de l'outil 2020 pour 679 points (latitude et longitude), publiées sur le site des APCNRC (https://doi.org/10.4224/nqzr-dz38, p. C-38, PDF 715). Le contenu de ce jeu n'a pas été consulté : désignations disponibles, présence de la PGA, format. Statut **À CONFIRMER**. Ce serait la seule source tabulée de PGA(X) pour le CNB 2020.

## 2. Clauses et références

| Réf. | Objet | Statut |
|---|---|---|
| CNB 2020, 4.1.8.4.(1) | PGA(X), PGV(X) et Sa(T, X) pour T = 0,2 à 10 s, selon la sous-section 1.1.3, pour une probabilité de dépassement de 2 % en 50 ans | **VÉRIFIÉ**, p. 4-61, PDF 514 |
| CNB 2020, 4.1.8.4.(2) et tableau 4.1.8.4.-A | Désignation XV fondée sur un Vs30 mesuré sur place. Exceptions : Vs30 > 760 avec plus de 3 m de matériaux meubles → X760 ; sol mou → XE ; sols liquéfiables ou sensibles, etc. → XF | **VÉRIFIÉ**, p. 4-61 et 4-62, PDF 514-515 |
| CNB 2020, 4.1.8.4.(3) et tableau 4.1.8.4.-B | Sans Vs30 mesuré : désignation XS. La catégorie S (A à F) se déduit de N̄60 ou de s̄u (A > 1500 ; B 760-1500 ; C 360-760 ; D 180-360 ; E < 180 m/s, ou sol mou de plus de 3 m ; F : étude exigée) | **VÉRIFIÉ**, p. 4-62 et 4-63, PDF 515-516. Les bornes de N̄60 et de s̄u sont lisibles, mais leur alignement avec les lignes C et D est **À CONFIRMER** sur le PDF |
| CNB 2020, tableau 4.1.8.4.-B, note (2) | XA et XB interdites s'il y a plus de 3 m de matériaux meubles sous la semelle : utiliser X760 | **VÉRIFIÉ**, p. 4-63, PDF 516 |
| CNB 2020, 4.1.8.4.(4) | XF : étude géotechnique propre à l'emplacement exigée pour PGA(XF) | **VÉRIFIÉ**, p. 4-62, PDF 515 |
| CNB 2020, 4.1.8.4.(7) | Pour une norme incorporée par renvoi : Fa = S(0,2)/Sa(0,2, X450) et Fv = S(1,0)/Sa(1,0, X450). **Il n'y a pas de F(PGA).** | **VÉRIFIÉ**, p. 4-62, PDF 515 |
| CNB 2020, 4.1.8.2 | X450 = désignation XV avec Vs30 = 450 m/s | **VÉRIFIÉ**, p. 4-60, PDF 513 |
| CNB 2020, note A-4.1.8.4.(2) et (3) | XV, fondée sur un Vs30 mesuré, est préférable ; elle donne habituellement une demande plus faible que XS | **VÉRIFIÉ**, p. 4-128, PDF 581 |
| CNB 2020, note A-4.1.8.4.(3) | Les plages de Vs30 du tableau 4.1.8.4.-B sont celles du CNB 2015 | **VÉRIFIÉ**, p. 4-128, PDF 581 |
| CNB 2020, annexe C, « Aléas sismiques à la partie 4 » | Outil RNCan 2020 ; archives APCNRC ; valeurs pour 2 % en 50 ans ; méthode 2015 (catégorie C × coefficient) remplacée en 2020 par un calcul direct par désignation | **VÉRIFIÉ**, p. C-38, PDF 715 |
| CNB 2020, tableau C-3 | Sa(0,2) seulement, pour la partie 9, identique au CNB 2015 | **VÉRIFIÉ**, p. C-39 à C-46, PDF 716-723 ; Québec : p. C-44 et C-45, PDF 721-722 |
| CNB 2025, 4.1.8.4.(1) à (7) | Même structure que 2020. Changement relevé au (5) : le calcul se fait avec les caractéristiques des sols **avant liquéfaction** | **VÉRIFIÉ**, p. 4-61 à 4-63, PDF 529-531 (extraction du fichier 2025) |
| CNB 2025, annexe C | Outil 2025. Aléa révisé seulement pour l'Alaska et la mer de Beaufort (baisse dans le nord-ouest), « inchangé dans toutes les autres régions ». Archives : https://doi.org/10.4224/4x2v-sj58 | **VÉRIFIÉ**, p. C-48, PDF 746 |
| CNB 2025, tableau C-3 | Paramètre **Smax** de la partie 9 par catégorie A à E et pour une catégorie inconnue. Ni PGA ni PGV | **VÉRIFIÉ**, p. C-49 et suivantes, PDF 747 et suivantes ; Trois-Rivières : p. C-64, PDF 762 |
| CFEM 5e, § 18.7.1.1, éq. 18.22 | kh = ah/g ; kv = 2/3·kh à défaut d'étude du site (« may be assumed ») ; trois façons d'obtenir ah ; la catégorie se détermine avec le sol **sous la base du mur**, sans le remblai | **VÉRIFIÉ**, p. 629, PDF 661 |
| CFEM 5e, § 18.5.2 | En 2015 : spectre de référence pour la catégorie C, multiplié par des coefficients. En 2020 : spectre donné directement pour le Vs30 ou la catégorie du site | **VÉRIFIÉ** (texte) ; page **À CONFIRMER** |
| CNB 2015, 4.1.8.4 : F(PGA), PGAref, tableaux des coefficients | Méthode F(PGA)·PGA | **À CONFIRMER** : texte 2015 non disponible localement |
| CSA S6-19, section 4 : F(PGA) | Méthode F(PGA)·PGA citée par le CFEM | **À CONFIRMER** : texte non disponible |

Bilan : 15 références VÉRIFIÉES, 3 À CONFIRMER, plus le point d'alignement du tableau 4.1.8.4.-B.

## 3. Tableau C-3 : contenu et extraction (question 1)

- **Grandeurs, CNB 2020** : Sa(0,2) seulement. Les valeurs Sa(0,05), Sa(0,1), Sa(0,5), Sa(1,0), Sa(2,0), Sa(5,0), Sa(10,0), ainsi que PGA et PGV, sont **absentes** du C-3.
- **Référence** : Sa(0,2) du CNB 2015 (catégorie C, déduite, **À CONFIRMER**). La probabilité de 2 % en 50 ans est celle de 4.1.8.4.(1) ; le C-3 lui-même ne la répète pas.
- **CNB 2025** : le C-3 donne Smax = max[(2/3)·S(0,2, XS) ; S(0,5, XS)] (p. C-48, PDF 746), pour les catégories A à E et pour une catégorie inconnue. Ce n'est pas non plus une PGA.
- **Extraction du Québec (retirée le 2026-11-08, non vérifiée et remplacée par les données CNRC)** : `MUR-03-tableau-C3-quebec.csv`, 125 localités. Colonnes :
  - `Sa_0_2_partie9_g`, en g ;
  - `PGA_g` et `PGV_m_s` laissées **vides**, faute de données dans le C-3 ;
  - page imprimée et page PDF ;
  - statut d'extraction.
- **Avertissement d'extraction (`REALIGNE_A_CONFIRMER`).** Dans l'extraction texte, les valeurs sont décalées d'une ligne vers le bas par rapport aux noms. Elles ont été réattribuées dans l'ordre, colonne par colonne, sans valeur pour les en-têtes de groupe (« Montréal et région », « Québec et région »). Le nombre de valeurs égale le nombre de localités dans chaque colonne (40, 43 et 42). Contrôles de vraisemblance :
  - Schefferville = 0,059 (site éloigné) ;
  - La Malbaie = 1,73 et Baie-Saint-Paul = 1,62 (Charlevoix) ;
  - Hull = 0,432, cohérent avec Ottawa (Hôtel de ville) = 0,439 ;
  - Montréal (Hôtel de ville) = 0,595.

  Une lecture brute, sans réalignement, donnerait Trois-Rivières = 0,492 au lieu de **0,366**. **Il faut vérifier visuellement au moins dix lignes sur le PDF (p. C-44 et C-45) avant usage.**
- **CNB 2025, Trois-Rivières (p. C-64, PDF 762)**, après réalignement : Smax = 0,235 (A), 0,339 (B), 0,398 (C), 0,52 (D), 0,603 (E), 0,603 (catégorie inconnue). **À CONFIRMER** visuellement. Ces valeurs ne servent pas à ah. Les 125 localités n'ont pas été extraites pour 2025.

## 4. Passage aux valeurs du site (question 2)

- **CNB 2020 et 2025** :
  1. On détermine la désignation X : XV si un Vs30 est mesuré (4.1.8.4.(2), avec les exceptions du tableau 4.1.8.4.-A), sinon XS, avec la catégorie A à E du tableau 4.1.8.4.-B (4.1.8.4.(3)).
  2. **PGA(X) se lit directement** dans l'outil RNCan pour cette désignation.
  3. Le CNB 2020 **ne contient aucun tableau de coefficients F(T), F(PGA) ou F(PGV)**. Seuls Fa et Fv sont **définis** par 4.1.8.4.(7), comme des rapports, pour les normes incorporées par renvoi. Aucun F(PGA) n'est défini.
- **Feuille de l'utilisateur** (Trois-Rivières, catégorie D : PGA = 0,23 ; PGAref = 0,19 ; F(PGA) = 1,12 ; kh = 0,26). Elle suit la **méthode F(PGA)·PGA_C**, que le CFEM attribue à la **partie 4 du CNB 2015 ou à la section 4 du CSA S6-19** (p. 629, PDF 661, **VÉRIFIÉ**). Elle **ne correspond pas au CNB 2020**, qui n'a pas de F(PGA) (4.1.8.4.(7) et p. C-38). Contrôles :
  - 1,12 × 0,23 = 0,258, arrondi à 0,26 : le calcul est cohérent ;
  - les règles 2015 de PGAref et la valeur de F(PGA) = 1,12 pour la catégorie D sont **À CONFIRMER**, faute du texte 2015 ou S6. Si la règle 2015 était PGAref = 0,8·PGA lorsque Sa(0,2)/PGA < 2 (souvenir non vérifié), on obtiendrait 0,8 × 0,23 = 0,184 et non 0,19 : à vérifier.

## 5. Méthode de calcul pas à pas

| Étape | Opération | Unité | Source |
|---|---|---|---|
| 1 | Localité ou coordonnées (lat., long.). La liste déroulante du C-3 sert à l'**identification** et affiche Sa(0,2) de la partie 9 à titre **informatif** seulement | — | C-3, p. C-44 et C-45 |
| 2 | Choix de la désignation X sous la **base de la semelle**, remblai exclu : XV (Vs30 saisi, en m/s) ou XS (catégorie A à E). **XF : calcul arrêté avec un message** (étude propre au site exigée). XA ou XB avec plus de 3 m de sol meuble : forcer X760 | — | 4.1.8.4.(2)-(4), tableaux A et B ; CFEM p. 629 |
| 3 | Source de ah (décision M3-1) : (a) PGA(X) de l'outil RNCan 2020 ou 2025 saisie, **défaut** ; (b) F(PGA)·PGA_C, méthode 2015 ou S6, en option et marquée « hors CNB 2020 » ; (c) étude propre au site | g | CFEM p. 629 ; p. C-38 |
| 4 | ah = PGA(X), en g. Contrôle 0 < ah ≤ 2,0 g, sinon alerte (borne proposée, sans source) | g | — |
| 5 | kh = ah/g (D6 par défaut) ; option CSA S6 : kh = 0,5·ah/g | — | CFEM éq. 18.22 ; MUR-02 D6 |
| 6 | kv = 2/3·kh par défaut, saisissable, avec les deux signes ; kv = 0 avec l'option S6 | — | CFEM p. 629 ; MUR-02 |
| 7 | Transmission à MUR-02 (KAE, ψ = atan[kh/(1 − kv)], forces d'inertie) | — | MUR-02 §4 |

## 6. Cas de référence (calcul à la main, tolérance ± 0,001)

**R1 : Trois-Rivières, catégorie D, méthode F(PGA)·PGA (option b), données de la feuille de l'utilisateur.**

| Entrée | Valeur |
|---|---|
| PGA_C | 0,23 g |
| F(PGA) | 1,12 |

| Calcul | Résultat |
|---|---|
| ah = 1,12 × 0,23 | **0,2576 g** |
| kh = ah/g | **0,2576** (affiché 0,258) |
| kv = 2/3 × 0,2576 | **0,1717** |
| ψ (kv = +0,1717) = atan[0,2576/0,8283] | 17,28° |
| ψ (kv = −0,1717) = atan[0,2576/1,1717] | 12,40° |
| Option S6 : kh = 0,5 × 0,2576, kv = 0 | kh = **0,1288** ; ψ = 7,34° |

**R2 : chemin CNB 2020 (option a).** Une entrée d'essai, PGA(XD) = 0,2576 g saisie, doit redonner exactement les mêmes kh, kv et ψ que R1. Ce n'est **pas** une donnée d'aléa : PGA(XD) pour Trois-Rivières dans l'outil 2020 est **À CONFIRMER**, car l'outil n'a pas pu être consulté.

**R3 : blocages.**
- La désignation XF doit arrêter le calcul avec un message.
- XB avec « plus de 3 m de sol meuble » coché doit passer à X760.
- L'option S6 activée doit donner kv = 0.

**R4 : localité.** Choisir « Trois-Rivières » doit afficher Sa(0,2), partie 9 = 0,366 (après confirmation visuelle du CSV), avec la mention « non utilisé pour ah ».

## 7. Décisions à soumettre à l'utilisateur

| ID | Question | Proposition par défaut |
|---|---|---|
| M3-1 | Source de ah | (a) PGA(X) saisie depuis l'outil RNCan de l'édition choisie, avec la référence (date, coordonnées, désignation). (b) F(PGA)·PGA_C en option, avec F(PGA) et PGA_C saisis et l'avertissement « méthode CNB 2015 / CSA S6, hors CNB 2020 » |
| M3-2 | Rôle de la liste des localités du C-3 | Identification et affichage informatif de Sa(0,2) (partie 9). Aucun ah déduit |
| M3-3 | Importer les archives APCNRC (679 points, PGA par désignation ?) | Oui, si l'utilisateur fournit le fichier ; il faut d'abord en vérifier le contenu (**À CONFIRMER**) |
| M3-4 | Désignation XV ou XS | XS (catégorie A à E) par défaut ; XV si un Vs30 mesuré est disponible |
| M3-5 | Catégorie inconnue | Exiger un choix explicite. Ne pas reprendre la règle « valeur maximale des catégories » de la partie 9 2025, prévue pour Smax |
| M3-6 | Arrondi de ah | Aucun arrondi interne ; affichage à 3 décimales |
| M3-7 | Feuille de l'utilisateur (PGAref = 0,19 contre 0,8 × 0,23 = 0,184) | À vérifier par l'utilisateur dans le CNB 2015 ou le CSA S6 |

## 8. Critères d'acceptation de l'implémentation

1. Liste déroulante des 125 localités du Québec chargée depuis le CSV, une fois validé. La note de calcul affiche « Sa(0,2) partie 9, CNB 2020 tableau C-3, p. C-44/C-45 – informatif ».
2. Choix de la désignation X : catégorie A à E, ou Vs30 en m/s. XF est bloquée avec un message, et la règle X760 est appliquée.
3. Saisie de PGA(X), en g, avec les champs de traçabilité suivants : outil et édition, latitude et longitude, désignation, date.
4. ah, kh et kv sont calculés selon le §5. R1 à R4 sont reproduits à ± 0,001.
5. La note de calcul contient :
   - les données d'entrée ;
   - la désignation et sa justification (sol sous la semelle) ;
   - la source de ah ;
   - les équations kh = ah/g et kv = 2/3·kh, avec les substitutions numériques ;
   - les références (CNB 4.1.8.4, CFEM éq. 18.22, p. 629) ;
   - l'avertissement quand l'option (b) ou l'option S6 est active ;
   - le statut À CONFIRMER des éléments non vérifiés.
6. Aucune valeur de PGA n'est codée en dur dans le programme.

## 9. Informations manquantes

- PGA(X) de l'outil RNCan 2020 ou 2025 pour Trois-Rivières (outil inaccessible, erreur 403).
- Contenu des archives APCNRC, doi 10.4224/nqzr-dz38 et 4x2v-sj58.
- Texte du CNB 2015, 4.1.8.4 (F(PGA), PGAref) et du CSA S6-19, section 4.
- Vérification visuelle du CSV (p. C-44 et C-45, PDF 721-722) et de l'alignement des colonnes du tableau 4.1.8.4.-B.
- Page imprimée du CFEM § 18.5.2.

## Complément du 2026-11-07 : archives du CNRC fournies par l'utilisateur

### Source et emplacement
- Les archives **SHD-VAS 2020** du CNRC (doi 10.4224/nqzr-dz38) sont déposées dans `csa-anchor-base-plate-design-pro-.../docs/SHD-VAS_2020/SHD-VAS_2020/`.
- Elles comptent **679 localités**, dont **125 au Québec**, à raison d'un fichier CSV par localité, encodé en UTF-16 LE.
- Le titre de chaque fichier est : « SEISMIC DESIGN DATA FOR SELECTED LOCATIONS IN CANADA FOR USE WITH NBC PART 4 ».

### Contenu de chaque fichier
- **Lignes :**
  - une ligne par désignation d'emplacement **XA, XB, XC, XD, XE** ;
  - puis 2 861 lignes **X140 à X3000**, pour un Vs30 en m/s.
- **Colonnes, pour 2 %, 5 % et 10 % en 50 ans :** Sa(0,2), Sa(0,5), Sa(1,0), Sa(2,0), Sa(5,0), Sa(10,0), **PGA** et PGV.

### Conséquence pour la méthode
La **PGA(X) du site** à utiliser pour ah (CNB 2020, 4.1.8.4) se lit **directement** dans ces fichiers :
- colonne « 2 %/50 PGA » ;
- ligne de la désignation d'emplacement du sol sous la semelle.

Aucun facteur F(PGA) n'est nécessaire.

### Valeurs lues (2 %/50 ans, PGA en g)

| Localité | XA | XB | XC | XD | XE |
|---|---|---|---|---|---|
| Trois-Rivières (46,35 ; −72,55) | 0,273 | 0,263 | 0,307 | **0,333** | 0,363 |
| Québec (46,80 ; −71,23) | 0,379 | 0,363 | 0,408 | 0,428 | 0,441 |
| Montréal, hôtel de ville (45,51 ; −73,55) | 0,444 | 0,422 | 0,459 | 0,480 | 0,460 |
| La Malbaie (47,65 ; −70,15) | 1,33 | 1,23 | 1,18 | 1,21 | 0,82 |

### Comparaison avec la feuille de l'utilisateur
Pour Trois-Rivières, classe D, la feuille de l'utilisateur donne kh = F(PGA)·PGA = 1,12 × 0,23 = **0,26**. C'est l'approche du CNB 2015 ou de la CSA S6. Les données du CNB 2020 donnent **PGA(XD) = 0,333 g**, soit kh = ah = 0,333, environ **28 % de plus**.

### Proposition d'implémentation (à approuver)
- **Fichier de données :** un fichier compact (environ 460 ko pour tout le Canada, environ 85 ko pour le Québec seul), extrait par script. Il contient les lignes XA à XE à 2 %/50, avec Sa, PGA, PGV, le nom et les coordonnées.
- **Saisie dans l'onglet SÉISME :**
  - liste déroulante de la province, puis de la localité ;
  - choix de la classe d'emplacement (XA à XE) ;
  - option Vs30, en phase 2 si l'utilisateur la demande, par lecture de la ligne X{Vs30}.
- **Résultat :** ah = PGA(X), avec la source « CNRC SHD-VAS 2020, {localité}, {X}, 2 %/50 ans ». ah reste modifiable par l'utilisateur.
- **Option conservée :** la saisie manuelle depuis l'outil RNCan, pour un site hors liste ou par coordonnées.
- **Hors CNB 2020 :** l'option F(PGA)·PGA_C (CNB 2015 ou CSA S6) n'est **pas** proposée par défaut. Elle est à ajouter seulement si l'utilisateur la demande, avec un avertissement.
- **CNB 2025 :** ces archives sont celles du CNB 2020. Pour l'édition 2025, les données équivalentes restent À CONFIRMER, et la note doit le signaler.
