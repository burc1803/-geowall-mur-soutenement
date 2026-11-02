# MUR-02 — Méthode : géotechnique, séisme et articles CSA A23.3 du mur de soutènement

| Champ | Valeur |
|---|---|
| Statut | **PROPOSÉE** (2026-10-31). Seul l'utilisateur peut la passer à APPROUVÉE ou REJETÉE. |
| Base | MUR-00 (revue, §2 et §8 mis à jour le 2026-10-31) ; MUR-01 (APPROUVÉE, combinaisons du CNB 2025) |
| Éditions | CNB, division B, partie 4 : **2020 par défaut**, 2025 en option à cocher (amendement A1 de MUR-01, 2026-11-01) ; CFEM 5e édition (2023) ; CSA A23.3:19 complète (acceptée par l'utilisateur pour tous les articles béton du mur) ; Paultre, *Structures en béton armé*, comme référence d'enseignement pour les efforts dans le voile, le talon et le patin |
| Hors périmètre | Stabilité d'ensemble, gel, drainage, tassement calculé, liquéfaction : à signaler comme **NON VÉRIFIÉ** dans la note |
| Code examiné | Aucun code n'est modifié par cette fiche |

Notation : « p. » désigne la page imprimée, « PDF » la page du fichier. Tout ce qui n'a pas été lu est marqué **À CONFIRMER**.

---

## 0. Juridiction : Québec

- Au Québec, la construction des bâtiments relève du **Code de construction du Québec, chapitre I – Bâtiment**, qui reprend le CNB avec des modifications québécoises. **Édition en vigueur et modifications touchant les fondations et les murs : À CONFIRMER**, car aucune source n'était disponible pour cette lecture.
- L'utilisateur a choisi le **CNB 2025** comme référence. Si l'édition adoptée au Québec est différente au moment du projet, la note doit le signaler et les facteurs de MUR-01 doivent être revérifiés dans cette édition (décision D17).
- Un mur de soutènement isolé, qui ne fait pas partie d'un bâtiment, peut sortir du champ de la partie 4. L'application du CNB à ce cas est **À CONFIRMER** (décision D18).

---

## 1. Facteurs de résistance géotechnique

Source : CFEM 5e, tableau 6.2, p. 199 (PDF 231) et tableau 6.4, p. 200 (PDF 232). Le CFEM précise (p. 198, PDF 230) qu'en 2022 le CNB ne prescrit toujours pas de facteurs de résistance géotechnique et qu'il recommande ceux du tableau 6.2.

Forme de la vérification (CFEM, éq. 6.1, p. 191) : **Ψ·φgu·R̂u ≥ Σ αi·F̂i**.

| Résistance | Ligne du tableau 6.2 | Faible | **Typique (défaut proposé)** | Élevé |
|---|---|---|---|---|
| Portance de la semelle du mur | Retaining systems, Bearing | 0,45 | **0,50** | 0,60 |
| Renversement | Retaining systems, Overturning | 0,45 | **0,50** | 0,55 |
| Glissement à la base (frottement) | Retaining systems, Base sliding | 0,70 | **0,80** | 0,90 |
| Glissement, sol cohésif (c′ ou su) | Shallow foundations, Sliding cohesive | 0,55 | **0,60** | 0,65 |
| Butée | Shallow foundations, Passive resistance | 0,40 | **0,50** | 0,55 |
| Tassement, déplacement (ELS) | Retaining systems, Settlement | 0,7 | **0,8** | 0,9 |

Facteur de conséquence Ψ (tableau 6.4) : 0,9 (conséquence élevée), **1,0 (typique, défaut)**, 1,15 (faible).

Règles proposées :
1. Le degré de compréhension et Ψ sont saisis par l'utilisateur (défauts : typique ; Ψ = 1,0). Ils sont affichés dans la note.
2. **Aucune autre réduction** : la réduction Kp × 0,50 (`reduced_cfem`) est supprimée (E20).
3. La résistance ultime qu est donnée par le rapport géotechnique. La note indique si la valeur saisie est **non pondérée** (le programme applique φ) ou déjà **pondérée** (φ = 1). C'est un choix explicite (D2).

---

## 2. Stabilité : glissement, renversement, excentricité, portance

Toutes les grandeurs d'une même combinaison utilisent **le même jeu de facteurs** (MUR-01). Les charges variables favorables sont nulles (4.1.3.2.(3)).

### 2.1 Glissement

Ψ·[φgs·ΣV′·tan δb + φcoh·c′a·B′ + φp·Pp] ≥ ΣHf

- ΣV′ est la force verticale **effective** : poids déjaugé et sous-pression déduite (CFEM fig. 20.10, p. 699, PDF 731 : « Buoyant weight […] reduced by any uplift force due to water pressures »).
- tan δb (ou μ) et c′a sont ceux du **sol de fondation** (deux sols, MUR-01 §3). Le terme cohésif agit sur la largeur comprimée B′ (proposition, **À CONFIRMER**, D13).
- Pp est la butée calculée **sous la profondeur de gel** (CFEM 20.7.3.3, p. 698 ; fig. 20.10 : « Force due to passive pressure below frost depth »). Kp suit Rankine, ou Coulomb avec δ ≤ φ′/2 (CFEM p. 632 et 696).

### 2.2 Excentricité et portance

- e = B/2 − (ΣM_stab − ΣM_renv)/ΣV, calculé avec les facteurs de la combinaison. Aucune résistance pondérée (butée × φ) n'entre dans e (E06).
- **Option b de MUR-01 (largeur réduite, proposée par défaut)** : B′ = B − 2e (CFEM éq. 10.12, p. 348, PDF 380) ; qf = ΣV/B′ ≤ Ψ·φgu·qu(B′). Le calcul de qu par la formule générale avec facteurs d'inclinaison (CFEM tableau 10.2) est **À CONFIRMER** ; à défaut, qu vient du rapport géotechnique.
- **Option a de MUR-01 (distribution linéaire)** : q = ΣV/B·(1 ± 6e/B) si e ≤ B/6 ; sinon q_max = 2ΣV/(3x), avec x = B/2 − e (Paultre éq. 17.1-17.2, p. 585-586). La valeur q_max est comparée à Ψ·φgu·qu.
- **Limite d'excentricité (décision D3)** :
  - ELS (D + H non pondérés, charges soutenues) : **e ≤ B/6**. Le CFEM recommande le tiers central pour le tassement et l'inclinaison (20.7.3.5, p. 699) et pour la portance (20.7.3.4, p. 698).
  - ELU : le CFEM présente B′ = B − 2e comme une approche approximative valable si **e < B/6** (p. 348). Proposition par défaut : **e ≤ B/6 à l'ELU aussi**, ce qui est conservateur. Une limite plus large, comme e ≤ B/3, n'a **aucune source lue (À CONFIRMER)** et ne pourrait être retenue que sur décision de l'utilisateur.

### 2.3 Renversement

- CFEM 20.7.3.4 (p. 698) : si la portance tient compte de l'excentricité et de l'inclinaison, « a separate check on overturning is typically not required ».
- Proposition : avec l'option b, le renversement est couvert par la portance et la limite de e, et la note l'indique. Avec l'option a, on vérifie Ψ·φ_ov·ΣM_stab ≥ ΣM_renv, avec φ_ov = 0,50 (tableau 6.2). Cette **forme d'application est À CONFIRMER**, car le texte qui accompagne le tableau ne la donne pas. Le facteur φ_ov ne s'applique plus au seul moment de la butée (E08).

---

## 3. Poussées statiques (rappel des sources)

| Élément | Méthode | Source |
|---|---|---|
| Mur libre (stabilité et voile) | Poussée active, Rankine sur le plan vertical fictif qui passe par l'extrémité du talon (δ = 0 si le remblai est horizontal, D11) | CFEM 20.7.1, p. 697 ; fig. 20.10, p. 699 |
| Mur retenu (sous-sol) | Poussée au repos, K0 = 1 − sin φ′ | CFEM p. 697 ; éq. 18.36, p. 633 |
| Surcharge uniforme | σ = q·K | CFEM éq. 20.7, p. 693 |
| Charge linéaire ou ponctuelle | Fig. 20.8 : m ≤ 0,4 : σh·H/QL = 0,20n/(0,16 + n²)², PH = 0,55QL ; m > 0,4 : σh·H/QL = 1,28m²n/(m² + n²)², PH = 0,64QL/(m² + 1) (et l'équivalent pour la charge ponctuelle) | CFEM p. 694 (corrige E25) |
| Compactage | Fig. 20.9 (option) | CFEM p. 695 |
| Sol immergé | γsub = γsat − γw | CFEM éq. 10.14, p. 349 |

---

## 4. Séisme

### 4.1 Coefficients

- kh = ah/g (CFEM éq. 18.22, p. 629), où ah est la PGA du site. Deux sources possibles : la PGA du calculateur d'aléa de RNCan avec la classe d'emplacement, ou F(PGA)·PGA. Les valeurs du CNB 2025 (4.1.8.4) sont **À CONFIRMER**.
- **Défaut, pour tous les murs : kh = ah/g** (CFEM éq. 18.22). Décision de l'utilisateur du 2026-11-01 (D6).
- **Option avancée, désactivée par défaut : kh = 0,5·ah/g et kv = 0.** Réservée aux **murs qui soutiennent des remblais routiers ou autoroutiers** et qui peuvent se déplacer de 25 à 50 mm. Source : CSA S6 (CHBDC 2019), citée par le CFEM p. 631, § 18.7.1.3. Quand l'option est activée, la note doit :
  - signaler que la règle vient de la CSA S6 et non du CNB ;
  - indiquer le déplacement admis, 25 à 50 mm, comme hypothèse non vérifiée par le logiciel.
- **Mur rigide ou retenu** : kh = ah/g (Wood, §4.3) ; l'option avancée ne s'y applique pas.
- kv = 2/3·kh à défaut d'étude du site (CFEM p. 629, « may be assumed »), en étudiant les deux signes. La valeur de kv est saisissable (D6).

### 4.2 Mur libre : Mononobe-Okabe

- PAE = ½·KAE·γ·H²·(1 − kv) (CFEM éq. 18.20, p. 628) ; KAE selon l'éq. 18.21, avec ψ = atan[kh/(1 − kv)] et la condition φ − β ≥ ψ. Si la racine n'existe pas, on calcule par équilibre limite (CFEM 18.7.4, p. 634) : le programme doit alors **arrêter le calcul avec un message**.
- PAE = PA + ΔPAE (éq. 18.23) ; PA et KAE prennent **le même δ** (E13b). Sur le plan fictif, δ = 0 pour un remblai horizontal (D11).
- Point d'application : PA à H/3, ΔPAE à **0,6H** (Seed-Whitman, CFEM éq. 18.26, p. 630 ; 20.5, p. 696).
- Butée sismique : KPE (éq. 18.28), qui réduit la butée (CFEM p. 631). Par défaut, la butée n'est pas comptée en séisme (proposition conservatrice, D9).
- Eau : remblai saturé selon Matsuzawa (éq. 18.34-18.35) ; eau devant le mur selon Westergaard (éq. 18.33) (CFEM p. 632-633).

### 4.3 Mur rigide (sous-sol) : Wood

P0E = P0 + ΔP0E, avec ΔP0E = kh·γ·H² appliqué à **0,58H** (CFEM éq. 18.37-18.39, p. 633). Le CNB 2025, 4.1.8.16.(7) (p. 4-73, PDF 521), exige ce calcul pour les murs de sous-sol en catégorie sismique SC3 ou SC4. La définition de SC est **À CONFIRMER**.

### 4.4 Inertie

Forces horizontales kh·W, appliquées au centre de gravité de chaque masse :
- le voile ;
- la semelle ;
- **le sol situé au-dessus du talon**, entre le voile et le plan fictif (corrige E13d).

Avec la poussée prise sur le plan fictif, ce sol se déplace avec le mur. Cohérence pseudo-statique : cette masse est à l'intérieur du plan où PAE est calculée (fig. 18.34 : khW appliqué à la masse du coin). La source qui formule explicitement cette règle pour le mur en porte-à-faux est **À CONFIRMER**. Si kv ≠ 0, les forces kv·W s'appliquent aussi, avec les deux signes.

### 4.5 Combinaison sismique (cas 5) : facteurs de D et de H

- D = **1,0** dans le cas 5 (4.1.3.2.(5), p. 4-4, PDF 452). La variante 0,9D + E du code est supprimée. MUR-01 l'applique déjà.
- E comprend l'incrément de poussée sismique (4.1.3.2.(10), p. 4-5, PDF 453) et les forces d'inertie.
- **Facteur de la poussée statique H au cas 5 : décision D16.**
  - Texte : 4.1.3.2.(4) affecte 1,5 à H sans distinguer les cas (p. 4-4, PDF 452).
  - Note A-4.1.3.2.(4) (PDF 555) : « 1.5H is added to load combinations 2 to 4. For cantilever retaining wall structures, see the Commentary entitled Limit States Design ». Le commentaire 2025 n'est pas disponible : **À CONFIRMER**.
  - Historique : le commentaire A du CNB 2005 (tableau A-3, p. A-6) donnait H = « 1,5 ou 0,0 ou 1,0 », avec 1,0 « pour les combinaisons de charges rares ».
  - **Commentaire A du CNB 2020 (Guide de l'utilisateur, partie 4, édition 2025 du NRC ; lu le 2026-11-01, fichier `GUP4_2020p1.pdf`)** :
    - § 29-31, PDF p. 23, p. A-6 : la poussée des terres H est une **charge constante**, au même titre que D, T et P.
    - **Tableau A-3** « Coefficients de charge pour les combinaisons de charges rares », PDF p. 24, p. A-7 : coefficient de charge principale **1,0** pour les charges constantes D, H, T, P combinées à la charge rare E. Renvoi (1) vers 4.1.3.2.(6) du CNB pour D avec E.
    - § 35, PDF p. 24-25, p. A-7 : les coefficients des charges rares (séismes) valent 1,0 ; la poussée des terres prend **1,5** dans les combinaisons de charges variables.
    - § 40, p. A-8 : D contraire à 0,9 aux cas 2 à 4 et à 1,0 au cas 5 ; charges variables contraires prises à 0.
    - § 42-43, PDF p. 26, p. A-9 : murs de soutènement en porte-à-faux. Pour le renversement, le texte ne donne aucun facteur de H propre et renvoie au CFEM et à la CSA S6.
    - Le commentaire de 2020 confirme donc **1,0H au cas 5**. Le commentaire de 2025 reste à vérifier (À CONFIRMER), car le CNB 2025 renvoie au commentaire de son édition.
  - **Option A, RETENUE par l'utilisateur le 2026-11-01** : 1,0D + 1,0E + **1,0H**, avec la poussée statique dans H à 1,0 et l'incrément ΔPAE et l'inertie dans E à 1,0. Elle est appuyée par le tableau A-3 du commentaire de 2020 et cohérente avec la note A-4.1.3.2.(4), qui limite le 1,5H aux cas 2 à 4, et avec le commentaire de 2005. La note de calcul cite le tableau A-3 et indique que le commentaire de 2025 est À CONFIRMER.
  - Option B, non retenue : 1,0D + 1,0E + 1,5H, en lecture littérale de 4.1.3.2.(4). Au cas G2, elle augmente le moment au pied du voile de 29 % et fait échouer le renversement.
  - Cas 1 à 4 : 1,5H, sans changement. ELS : H à 1,0.
- Charges d'accompagnement : 0,5L + **0,15S** selon le tableau 4.1.3.2.-A du **CNB 2025** (lu le 2026-10-30). Le CNB 2020 donnait 0,25S : ne pas mélanger les éditions. Un facteur 0 s'applique si elles stabilisent.
- Les augmentations de 4.1.8.16.(3) (1,5 × portance, 1,3 × autres résistances) visent les fondations du SFRS. Elles **ne s'appliquent pas** à un mur de soutènement qui ne fait pas partie du SFRS (proposition, **À CONFIRMER**).

---

## 5. Efforts dans le voile, le talon et le patin

Paultre n'a pas de chapitre sur les murs de soutènement (table des matières, PDF 9 à 12). Les principes viennent du ch. 17 (semelles), p. 585-589 (PDF 617-621).

| Élément | Section critique, efforts | Source |
|---|---|---|
| Voile (console encastrée dans la semelle) | Mf et Vf à la jonction avec la semelle (y = 0), puis en y quelconque pour l'arrêt des barres. Charges : H (terres, surcharge, eau), ΔPAE ou ΔP0E sur la hauteur du voile, inertie du voile, charges en tête (Fx, Mz), pour chaque combinaison (E01). Vf peut être pris à dv de la face si 11.3.2 est satisfait. | Mécanique ; A23.3 11.3.2 ; MUR-01 E01 |
| Talon (console) | Section de flexion **à la face arrière du voile**. Charge nette = poids pondéré du sol et du talon (sous-pression déduite) − réaction du sol q(x) de la même combinaison. Vf à d de la face. | Paultre p. 589 (fig. 17.6, éq. 17.5-17.6) |
| Patin (console) | Section **à la face avant du voile**. Charge nette = q(x) − poids pondéré du patin (et du sol qu'il porte). | Paultre p. 589 |
| Pression du sol pour les efforts | Distribution linéaire q = P/A ± M·y/I ; si e > B/6, distribution triangulaire sur 3x. Même distribution pour toutes les combinaisons. | Paultre éq. 17.1-17.2, p. 585-586 |

La méthode de la « pression nette » de Paultre (17.3, p. 586-588) ne s'applique pas telle quelle au talon : le sol au-dessus n'est pas uniforme par rapport à la réaction. On intègre explicitement la charge vers le bas et la réaction q(x) (corrige E11).

---

## 6. Articles CSA A23.3:19 utilisés (tous lus, `CSA A23.19.pdf`)

| Vérification | Article et règle | Page |
|---|---|---|
| Matériaux | φc = 0,65 (8.4.2) ; φs = 0,85 (8.4.3) ; fy ≤ 500 MPa (8.5.1) | p. 50 |
| Bloc de contraintes | α1 = 0,85 − 0,0015f′c ≥ 0,67 ; β1 = 0,97 − 0,0025f′c ≥ 0,67 (10.1.7) | p. 61 |
| Ductilité | c/d ≤ **0,8**·700/(700 + fy) (10.5.2) | p. 63 |
| Armature minimale de flexion | 10.5.1.1 : Mr ≥ 1,2Mcr. 10.5.1.2 a) : semelles selon 7.8 ; b) autres éléments, As,min = 0,2√f′c/fy·bt·h. 10.5.1.3 : dispense si Mr ≥ 4/3·Mf. Le module de rupture fr (8.6.4) n'a pas été relu : **À CONFIRMER** | p. 63 |
| Semelle (talon, patin) : armature minimale et de retrait | 7.8.1 : 0,002Ag **dans chaque direction** ; 7.8.3 : espacement ≤ min(5h ; 500 mm) ; 7.8.4 : armature développée selon l'article 12 | p. 47 |
| Voile : armature minimale | 14.1.8.5 : verticale **0,0015Ag** ; 14.1.8.6 : horizontale **0,002Ag** ; 14.1.8.4 : espacement ≤ min(3t ; 500 mm) ; 14.1.8.2 : db ≤ t/10 ; 14.1.8.3 : un lit permis pour un mur de soutènement. Décision D20 : le voile est-il traité comme un mur (14.1.8) ou comme un élément fléchi (10.5.1.2 b) ? Proposition : appliquer les deux et retenir la plus grande valeur. | p. 126 |
| Fissuration | z = fs·(dc·A)^(1/3) ≤ 30 000 (intérieur) ou 25 000 N/mm (extérieur, défaut pour un mur de soutènement) ; fs = 0,6fy permis ; enrobage pris ≤ 50 mm pour dc et A (10.6.1) | p. 64 |
| Cisaillement (voile, talon, patin) | Vr = Vc ≤ Vr,max = 0,25φc f′c bw dv (11.3.3) ; Vc = φcλβ√f′c bw dv, β ≥ 0,05, √f′c ≤ 8 MPa (11.3.4) ; dv = max(0,9d ; 0,72h) (définition **À CONFIRMER**, article 2 non relu) ; β = 0,21 pour les semelles de h ≤ 350 mm ou si la distance entre le point d'effort tranchant nul et la face du mur est < 2dv (11.3.6.2) ; sinon β = 230/(1000 + dv) avec un granulat ≥ 20 mm (11.3.6.3 b), ou sze = 35sz/(15 + ag) (11.3.6.3 c) | p. 79-80 |
| Cisaillement par frottement (jonction voile-semelle) | vr = λφc(c + μσ) + φsρv fy cos αf (11.5.1), avec λφc(c + μσ) ≤ 0,25φc f′c ; c et μ selon 11.5.2 (0,25/0,60 ; 0,50/1,00 ; 1,00/1,40) ; σ = ρv fy sin αf + N/Ag, **N = charge permanente non pondérée** (11.5.4). Pour αf = 90° : vr = λφc[c + μ(ρv fy + N/Ag)]. Le cumul avec l'armature tendue en flexion (déduction éventuelle) est **À CONFIRMER**. | p. 89-90 |
| Développement des barres droites | ld ≥ 300 mm (12.2.1) ; éq. 12.1 (12.2.2) ou tableau 12.1 (12.2.3) : 0,45k1k2k3k4·(fy/√f′c)·db pour les murs et dalles avec un espacement libre ≥ 2db, sinon 0,6. Conditions : enrobage ≥ db et espacement ≥ 1,4db. k1 = 1,3 pour l'armature **horizontale** avec plus de 300 mm de béton frais dessous (barres supérieures du talon si h − enrobage > 300 mm) ; k4 = 0,8 pour 20M et moins, 1,0 pour 25M et plus ; k1k2 ≤ 1,7 (12.2.4) ; réduction As,req/As,prov (12.2.5) | p. 92-93 |
| Crochets | ldh = lhb × facteurs ≥ max(8db ; 150 mm) ; lhb = 100db/√f′c (12.5.1-12.5.2) ; × fy/400 ; × 0,7 si l'enrobage latéral est ≥ 60 mm et l'enrobage du prolongement ≥ 50 mm (12.5.3) ; confinement si les enrobages sont < 60 mm (12.5.4) | p. 94 |
| Enrobage | 7.9 : selon la CSA A23.1. Valeurs (classe d'exposition, béton coulé contre le sol) : **À CONFIRMER** (A23.1 absente). L'enrobage reste saisi par l'utilisateur (MUR-01). | p. 47 |

Correspondance avec l'édition :24 (7.8, 10.5, 14.1.8 et les autres) : **À CONFIRMER**. Seule l'édition -19 a été lue ; l'utilisateur l'accepte pour le béton du mur. La note de calcul doit citer « CSA A23.3-19 ».

---

## 7. Cas de référence calculés à la main

Géométrie et sols de MUR-00 §5 :
- hMur = 3,00 m ; voile de 0,30 m ; patin de 0,60 m ; talon de 1,50 m ; semelle de 0,40 m ; B = 2,40 m ; H = 3,40 m ;
- γ = 19 kN/m³ ; φ′ = 32° ; c′ = 0 ; tan δb = 0,55 ; γc = 24 kN/m³ ;
- pas de nappe, pas de surcharge, pas de butée ;
- f′c = 30 MPa ; fy = 400 MPa ; voile armé de 15M à 120 mm à la face intérieure (et de 10M à 300 mm à la face extérieure pour le joint) ; enrobage de 60 mm ;
- φ en compréhension typique, Ψ = 1,0 ; qu = 300 kPa (valeur supposée du rapport géotechnique, non pondérée).

Données de base : Ka = 0,3073 ; Pa = 33,74 kN/m à 1,133 m ; ΣD = 130,14 kN/m ; ΣM_D (par rapport à l'orteil) = 184,92 kN·m/m. Au cas 2, le facteur du sol porté vaut 1,25 : hs = 3,0 m > 1,2 m, donc 1 + 0,6/3 = 1,20, porté à 1,25 (4.1.3.2.(8)).

Tolérance : ±0,5 % sur les forces et les moments ; ±0,002 sur les coefficients.

### 7.1 Cas G1 : statique

| Grandeur | Calcul | Valeur attendue |
|---|---|---|
| Glissement, 0,9D + 1,5H | Rf = 1,0·0,80·0,55·(0,9·130,14) = 51,54 ; Hf = 1,5·33,74 = 50,61 | **Rf/Hf = 1,018, conforme** |
| Renversement (option a), 0,9D + 1,5H | Ψφ_ov·Ms = 0,50·166,43 = 83,21 ; Mo = 57,36 | Rapport de 1,451 (forme À CONFIRMER) |
| e et B′, 1,4D + 1,5H | V = 182,20 ; e = 0,094 m ≤ B/6 = 0,400 | B′ = 2,212 m ; **qf = 82,4 kPa** ≤ 0,50·300 = 150 kPa |
| e et B′, 1,25D + 1,5H | V = 162,68 ; e = 0,132 | B′ = 2,137 m ; qf = 76,1 kPa |
| e et B′, 0,9D + 1,5H | V = 117,13 ; e = 0,269 ≤ 0,400 | B′ = 1,862 m ; qf = 62,9 kPa |
| ELS, D + H | e = 0,073 m ≤ B/6 | q = 64,1 / 44,3 kPa (distribution linéaire) |
| Voile, 1,5H | Mf = 1,5·½·0,3073·19·3,0²·(3,0/3) ; Vf à la base ; Vf à dv = 0,216 m | **Mf = 39,41 kN·m/m** ; Vf = 39,41 kN/m ; Vf(dv) = 33,94 kN/m |
| Voile, résistance | d = 232 ; a = 36,10 ; Mr = 121,24 ; c/d = 0,174 ≤ 0,8·700/1100 = 0,509 ; Vc (β = 0,1891) = 145,5 ; Vr,max = 1 053 kN/m | Conforme |
| Voile, armature minimale | 14.1.8.5 : 0,0015·300 000 = 450 mm²/m ; éq. 10.4 : 821,6 mm²/m, mais dispense 10.5.1.3 (Mr = 121,2 ≥ 4/3·39,41 = 52,5) | As = 1 667 mm²/m, conforme |
| Fissuration | dc = 50 + 8 = 58 (enrobage pris ≤ 50) ; A = 2·58·120 = 13 920 ; z = 240·(58·13 920)^(1/3) | **z = 22 350 N/mm** ≤ 25 000 |
| ld et ldh, 15M | 0,45·0,8·400/√30·16 = 420,7 ≥ 300 ; lhb = 292,1 ; ×0,7 = 204,5 ≥ 150 | 420,7 mm ; 204,5 mm (si enrobage latéral ≥ 60 mm) |
| Talon, à la face du voile | Charge vers le bas fD·(19·3 + 24·0,4) moins q(x) linéaire | Mf = 31,18 (1,4D) ; 32,04 (1,25D) ; **34,05 kN·m/m (0,9D, gouverne)** ; Vf (à la face) = 36,01 kN/m |
| Patin, à la face du voile | q(x) − fD·24·0,4 | **Mf = 13,92 kN·m/m (1,4D)** ; Vf (à la face) = 45,50 kN/m |
| Joint voile-semelle (11.5) | N = 21,6 kN/m (non pondéré) ; ρv = 2 000/300 000 = 0,00667 ; σ = 2,667 + 0,072 = 2,739 MPa ; vr = 0,65·(0,25 + 0,60·2,739) = 1,231 MPa (surface non rendue rugueuse) | **Vr = 369 kN/m** ≥ Vf = 39,41 kN/m |

### 7.2 Cas G2 : séisme (kh = 0,15 ; kv = 0 ; δ = 0 ; 1,0D)

Le cas sert à deux vérifications :
- **défaut** : ah = 0,15 g, kh = ah ; kv = 0 est saisi explicitement ;
- **option avancée CSA S6** : ah = 0,30 g, kh = 0,5·ah.

Dans les deux cas, kh = 0,15, et les valeurs ci-dessous restent les mêmes.

| Grandeur | Calcul | Valeur attendue |
|---|---|---|
| ψ ; KAE | ψ = atan 0,15 = 8,531° ; KAE = cos²(32° − 8,531°)/[cos ψ·cos ψ·(1 + √(sin 32°·sin 23,469°/cos ψ))²] | **KAE = 0,4025** (contrôle : kh = 0 donne Ka = 0,3073) |
| ΔPAE | ½·19·3,4²·(0,4025 − 0,3073) | **10,46 kN/m**, à 0,6H = 2,04 m ; M = 21,34 |
| Inertie | voile 3,24 à 1,90 m ; semelle 3,456 à 0,20 m ; **sol du talon 12,83 à 1,90 m** | ΣE_H = 29,98 kN/m ; ΣE_M = 52,56 kN·m/m |
| Option A (1,0H), glissement | Hf = 33,74 + 29,98 = 63,73 ; Rf = 0,80·0,55·130,14 = 57,26 | **0,899, NON CONFORME** |
| Option A, excentricité et portance | Mo = 38,24 + 52,56 = 90,80 ; e = 0,477 m > B/6 | B′ = 1,446 m ; qf = 90,0 kPa ; **limite e ≤ B/6 non respectée** |
| Option A, renversement (option a) | 0,50·184,92 = 92,46 ≥ 90,80 | Rapport de 1,018 |
| Option A, voile | 1,0H : 26,27 ; ΔPAE du voile = ½·19·9·0,0952 = 8,145 à 1,8 m → 14,66 ; inertie 3,24 à 1,5 m → 4,86 | **Mf = 45,79 kN·m/m** ; Vf = 37,66 kN/m |
| Option A, talon et patin | distribution triangulaire (e > B/6) | talon Mf = 56,06, Vf = 55,33 ; patin Mf = 17,87 |
| Option B (1,5H), glissement | Hf = 80,60 | **0,710, NON CONFORME** |
| Option B, excentricité et renversement | Mo = 109,92 ; e = 0,624 m | B′ = 1,153 m ; qf = 112,9 kPa ; renversement : 92,46 < 109,92, **NON CONFORME** |
| Option B, voile | | **Mf = 58,93 kN·m/m** ; Vf = 50,79 kN/m (Mr = 121,2, conforme) |
| Sans l'inertie du sol du talon (comportement du code) | Hf = 33,74 + 17,16 = 50,90 | Rapport de 1,125 : l'oubli (E13d) masque le défaut de glissement |

Le mur de référence ne résiste pas au séisme de G2. Ce n'est pas une erreur : le cas sert à montrer l'effet de chaque correction.

---

## 8. Décisions restantes pour l'utilisateur

| N° | Décision | Proposition par défaut |
|---|---|---|
| D2 | Degré de compréhension (faible, typique ou élevé) et Ψ (0,9 / 1,0 / 1,15) ; qu saisi pondéré ou non | Typique ; Ψ = 1,0 ; qu non pondéré |
| D3 | Limite d'excentricité à l'ELU (e ≤ B/6 selon CFEM p. 348, ou plus large sans source) ; option a ou b (déjà au choix dans MUR-01) | e ≤ B/6 à l'ELU et à l'ELS ; option b |
| D6 | **DÉCIDÉ le 2026-11-01** : kh = ah par défaut ; 0,5·ah (CSA S6) en option avancée, désactivée, réservée aux murs de remblais routiers ou autoroutiers. Reste : kv et la source de ah | kv = 2/3·kh saisissable, deux signes ; ah saisi avec sa source |
| D9 | Profondeur de gel à négliger pour la butée ; butée en séisme | Butée sous la profondeur de gel seulement ; aucune butée en séisme |
| D11 | δ sur le plan fictif | 0 (remblai horizontal) |
| D13 | Terme cohésif au glissement (c′a sur B′, court ou long terme) | c′a du sol de fondation sur B′ |
| **D16** | Facteur de H au cas 5 | **DÉCIDÉ le 2026-11-01 : option A, 1,0H** (tableau A-3 du commentaire du CNB 2020 ; commentaire de 2025 À CONFIRMER) |
| D17 | Édition du Code de construction du Québec en vigueur pour le projet, et ses modifications | À fournir par l'utilisateur |
| D18 | Mur isolé hors bâtiment : application de la partie 4 du CNB | Appliquer la partie 4 et le dire dans la note |
| D19 | Joint voile-semelle : N non pondéré (A23.3 11.5.4) au lieu de 0,9D (MUR-01 E03) ; état de surface (D14) | N non pondéré (texte de la norme) ; surface non rendue rugueuse |
| D20 | Armature minimale du voile : 14.1.8 (mur), 10.5.1 (élément fléchi) ou la plus exigeante des deux | La plus exigeante, avec la dispense de 10.5.1.3 |
| D21 | Inertie du sol du talon en séisme (proposition par cohérence, source À CONFIRMER) | Incluse |

---

## 9. Critères d'acceptation (pour l'implémentation qui suivra l'approbation)

- Les cas G1 et G2 sont reproduits dans les tolérances du §7, avec les options par défaut.
- Chaque facteur φ, Ψ, kh, kv, ainsi que le facteur de H au cas 5, apparaît dans la note avec sa source (page) et son statut.
- Aucun « CONFORME » écrit en dur. La limite d'excentricité, le glissement, la portance et le renversement (option a) ont chacun un statut calculé.
- Si KAE est indéterminé (φ − β < ψ), le programme s'arrête avec un message ; il ne doit jamais renvoyer NaN.
- La note indique l'édition de chaque norme (CNB 2025, CFEM 5e 2023, CSA A23.3-19) et la liste des points NON VÉRIFIÉS (stabilité d'ensemble, gel, drainage, tassement, liquéfaction, A23.1, Code de construction du Québec).
