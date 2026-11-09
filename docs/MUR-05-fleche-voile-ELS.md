# MUR-05 — Flèche du voile en service (ÉLS)          Statut : APPROUVÉE (2026-11-08)

| Champ | Valeur |
|---|---|
| Statut | **APPROUVÉE** par l'utilisateur le 2026-11-08. Sources complémentaires lues : Chaallal (2012) §3.4.2, p. 33 à 36 (éq. 3.22, 3.25 à 3.27 ; tableau 3.3, K = 2,4 pour un porte-à-faux, note a : ajouter la flèche due à la rotation de l'appui). |
| Demande | « Il faut calculer la flèche, en service » : tableau « Service – Déflexion mur » de la feuille de l'utilisateur (une ligne par combinaison ÉLS, colonnes D, L, S, W, E, Ha, Hp, U ; résultats \|Δtête\|, \|Δmax\|, H/Δ, limite H/300). |
| Base | MUR-02 (APPROUVÉE ; §5 efforts du voile, §6 articles A23.3, §7.1 cas G1) ; MUR-04, amendement M4-A1 (hauteur du remblai hr) |
| Juridiction / normes / éditions | Québec (MUR-02 §0). CNB 2020, division B, partie 4 (défaut) et CNB 2025 (option) ; CSA A23.3-19 (béton, édition retenue par MUR-02 §6) ; CFEM 5e éd. (2023) ; Commentaires sur le calcul des structures, CNB 2020 (NRC, éd. 2025) |
| Code examiné | Aucun code n'est modifié par cette fiche. |

Notation : « p. » = page imprimée. Les extraits des normes sont paraphrasés ; seules de courtes citations sont reproduites.

---

## 1. Clauses et sources

| # | Référence | Objet | Statut |
|---|---|---|---|
| C1 | CNB 2020, 4.1.3.4. 1) à 3) | Vérifier les ÉLS de tenue en service avec les combinaisons du tableau 4.1.3.4 ; la combinaison la plus critique gouverne ; les charges principales seules (charges concomitantes nulles) sont aussi à considérer | **VÉRIFIÉ** (`cnb2020_Francais.pdf`, p. 4-6 ; extraction `cnb20.txt`) |
| C2 | CNB 2020, 4.1.3.4. 4) | Les flèches dues aux charges P, T et **H**, avec un coefficient de 1,0, sont **incluses** dans les flèches dues aux charges principales | **VÉRIFIÉ** (p. 4-6) |
| C3 | CNB 2020, 4.1.3.4. 5) | Matériaux sujets au fluage : distinguer Ls (soutenue) et Lt (transitoire) ; la flèche due à D et Ls est augmentée d'un facteur de fluage « comme il est précisé dans les normes » de la section 4.3 | **VÉRIFIÉ** (p. 4-6) |
| C4 | CNB 2020, 4.1.3.4. 6) | Tassements à long terme des fondations : calculés à partir des propriétés du sol fournies par un ingénieur en géotechnique | **VÉRIFIÉ** (p. 4-6) |
| C5 | CNB 2020, tableau 4.1.3.4 | Combinaisons ÉLS de flèche (voir §5) ; renvoi (2) : 0,35L porté à 0,5 pour les aires de stockage, d'équipement et les locaux techniques | **VÉRIFIÉ** (p. 4-7) |
| C6 | CNB 2025, 4.1.3.4 et tableau 4.1.3.4 | Texte et tableau identiques à ceux du CNB 2020 pour les points C1 à C5 | **VÉRIFIÉ** (`cnb25.txt`, p. 4-6 et suivante) |
| C7 | CNB 2020, notes A-4.1.3.4. 1) et A-4.1.3.5. 1) | Les critères de déformation sont dans les normes de la section 4.3 et dans le Commentaire D | **VÉRIFIÉ** (p. 4-111) |
| C8 | Commentaire D (Guide de l'utilisateur, CNB 2020), §1 et tableau D-1 | Critère historique L/360 ; « pour les porte-à-faux, la valeur de L peut être considérée comme égale au double de la longueur ». Le tableau D-1 ne donne **aucune limite pour un mur de soutènement** (lignes « Éléments de mur » : limites pour le vent sur les murs de bâtiment) | **VÉRIFIÉ** (`g.txt`, p. D-1 ; colonnes du tableau D-1 mélangées par l'extraction) |
| C9 | CFEM 5e, 20.2.5 et tableau 20.3 | Rotation Y/H nécessaire pour mobiliser la poussée active : 0,001 (pulvérulent dense), 0,004 (lâche), 0,010 (cohérent raide), 0,020 (cohérent mou). Y est le déplacement en tête relatif au pied. Information seulement, ce n'est pas une limite | **VÉRIFIÉ** (`cfem.txt`, p. 689-690 ; ordre des lignes du tableau à relire sur le PDF) |
| C10 | CFEM 5e, 20.7.3.5 | Sol compressible : estimer les tassements totaux et différentiels ; si l'inclinaison dépasse des « acceptable limits », changer de fondation ; résultante dans le tiers central. **Aucune valeur limite ni méthode de rotation** | **VÉRIFIÉ** (p. 699) |
| C11 | CSA A23.3-19, 8.6.2.3 | Ec = 4500√f′c (béton normal) | **À CONFIRMER** (non lu ; A23.3-14 : 8.6.2 p. 56, table des matières p. 2) |
| C12 | CSA A23.3-19, 8.6.4 | fr = 0,6λ√f′c | **À CONFIRMER** (non lu ; A23.3-14 : p. 56) |
| C13 | CSA A23.3-19, 9.8.2.3 | Ie = Icr + (Ig − Icr)(Mcr/Ma)³ ≤ Ig ; Mcr calculé avec **fr/2** pour la flèche | **À CONFIRMER** (non lu ; A23.3-14 : 9.8.2, p. 61-63, table des matières p. 3) |
| C14 | CSA A23.3-19, 9.8.2.4 | Ie des porte-à-faux et des travées continues (Ie à l'appui, ou moyenne pondérée) | **À CONFIRMER** |
| C15 | CSA A23.3-19, 9.8.2.5 | Flèche différée = [s/(1 + 50ρ′)] × flèche immédiate sous charge soutenue ; s = 2,0 pour 5 ans et plus | **À CONFIRMER** |
| C16 | CSA A23.3-19, tableau 9.3 | Flèches maximales admissibles : toits et planchers ; **ne viserait pas les murs** | **À CONFIRMER** |
| C17 | CSA A23.3-19, 8.3.3 | Combinaisons de charges pour les ÉLS (renvoi probable au CNB) | **À CONFIRMER** (A23.3-14 : p. 54) |

Lecture impossible dans cette session : les PDF CSA sont en images et aucun outil de rendu ou d'exécution Python n'était disponible pour cet agent. Les pages à extraire sont **A23.3-14 p. 54, 56, 61 à 64** (`docs/methodes/CSA14.pdf`) et leurs équivalents dans `CSA A23.19.pdf`. Une recherche web n'a donné que des forums et des documents ACI, qui ne valent pas une vérification.

---

## 2. Domaine d'application et limites

- Voile en béton armé, section rectangulaire de largeur unitaire (b = 1 000 mm), épaisseur t constante, armature verticale principale côté remblai.
- **Mur libre** : console encastrée dans la semelle (MUR-02 §5). **Mur de sous-sol** : voile encastré au pied et appuyé en tête (et appuis intermédiaires éventuels), même modèle de poutre que pour les efforts.
- Charges latérales du voile identiques à celles de MUR-02 §5 et M4-A1 (`stemItems`), non pondérées, avec les coefficients ÉLS du §5.
- **Hors périmètre**, à signaler NON VÉRIFIÉ dans la note : rotation et translation de la semelle (tassement différentiel, glissement), retrait et température, effets du deuxième ordre, voile à épaisseur variable, fissuration due au retrait gêné au-delà du fr/2 de C13.
- Le séisme (E) n'entre pas dans les combinaisons de flèche du tableau 4.1.3.4 (C5).

## 3. Hypothèses

1. Ec = 4500√f′c (C11), Es = 200 000 MPa (MUR-02).
2. Ig = b·t³/12, section brute de béton sans l'armature (C13, À CONFIRMER).
3. Icr : section fissurée transformée ; armature tendue As à la profondeur d ; l'armature comprimée est négligée par défaut (décision D5).
4. Mcr = (fr/2)·Ig/yt, yt = t/2 (C13, À CONFIRMER).
5. Toutes les charges H (poussée des terres, pression d'eau sur le voile) et D sont **soutenues**. La surcharge est soutenue si elle est de type D ; de type L, elle est transitoire sauf fraction Ls saisie (D4).
6. La butée Hp n'agit pas sur le voile (cohérent avec `stemItems`, qui ne la contient pas) ; la sous-pression U n'agit que sur la semelle et n'a pas d'effet sur la flèche du voile tant que la rotation de la semelle est hors périmètre.
7. Signe : Δ positif vers l'avant (côté opposé au remblai). Le résultat est présenté en valeur absolue.

## 4. Nomenclature

| Symbole | Définition | Unité | Source dans le code |
|---|---|---|---|
| h | hauteur du voile, du dessus de la semelle au sommet | m | `geo.hMur` |
| hr | hauteur du remblai depuis le dessus de la semelle | m | `hr` (M4-A1) |
| zs = h − hr | profondeur de la surface du remblai sous le sommet | m | `zs` |
| t | épaisseur du voile | mm | `geo.epStem` |
| d | hauteur utile de l'armature tendue | mm | (calcul du voile, MUR-02 §7.1) |
| As, As′ | armature tendue et comprimée par mètre | mm²/m | — |
| p(z) | pression latérale ÉLS à la profondeur z | kPa | `stemItems`, `stemItemFactor` |
| M(y), Ma | moment ÉLS à la hauteur y ; moment maximal ÉLS | kN·m/m | `stemSectionEffort` |
| Ec, n | module du béton ; n = Es/Ec | MPa ; — | à créer (actuellement `E_fem` = 25 000 MPa, `analysis.ts:1096`) |
| Ig, Icr, Ie | inerties brute, fissurée, effective | mm⁴/m | à créer (actuellement `I_fem` brut, `analysis.ts:1097`) |
| fr, Mcr | module de rupture ; moment de fissuration | MPa ; kN·m/m | à créer |
| Δi, Δi,sus, ΔLT | flèches immédiate (combinaison), immédiate sous charges soutenues, totale à long terme | mm | à créer |
| ζ | facteur de flèche différée s/(1 + 50ρ′) | — | à créer |
| Hréf, k | hauteur de référence et diviseur de la limite (Δadm = Hréf/k) | mm ; — | à créer (saisie) |

## 5. Combinaisons ÉLS de flèche

Tableau 4.1.3.4 du CNB (C5, matériaux assujettis au fluage), avec H à 1,0 dans toutes les lignes (C2) et les lignes « charge principale seule » (C1, 4.1.3.4. 3)). Identique en 2020 et en 2025 (C6).

| N° | Combinaison | Remarque |
|---|---|---|
| S0 | 1,0D + 1,0H | charges soutenues seules (base de la flèche différée) |
| S1 | 1,0D + 1,0L + 1,0H | L = Ls + Lt |
| S1a | 1,0D + 1,0L + 0,3W + 1,0H | |
| S1b | 1,0D + 1,0L + 0,35S + 1,0H | |
| S2 | 1,0D + 1,0W + 1,0H | |
| S2a | 1,0D + 1,0W + 0,35L + 1,0H | 0,5L pour stockage, équipement, locaux techniques (renvoi (2)) |
| S2b | 1,0D + 1,0W + 0,35S + 1,0H | |
| S3 | 1,0D + 1,0S + 1,0H | |
| S3a | 1,0D + 1,0S + 0,3W + 1,0H | |
| S3b | 1,0D + 1,0S + 0,35L + 1,0H | idem renvoi (2) |

Les lignes de la feuille de l'utilisateur (1D + 1Ha + 1Hp ; 1D + 1L + 0,35S + 1Ha + 1Hp + 1U ; 1D + 0,35L + 1W + 1Ha + 1Hp, etc.) correspondent à ce tableau. Une charge variable favorable (pression négative) prend 0, comme dans `stemItemFactor`.

## 6. Étapes et équations

Unités : N, mm, MPa ; charges linéiques par mètre de mur (1 kN/m = 1 N/mm ; 1 kN·m/m = 10⁶ N·mm/m).

**É1 — Propriétés de section** (une fois par mur)
- Ec = 4500√f′c ; n = 200 000/Ec. (C11)
- fr = 0,6λ√f′c ; Mcr = (fr/2)·Ig/(t/2). (C12, C13)
- Ig = 1000·t³/12.
- Axe neutre fissuré c : 500·c² + n·As·c − n·As·d = 0 (racine positive).
- Icr = 1000·c³/3 + n·As·(d − c)².

**É2 — Moments ÉLS** : pour chaque combinaison du §5, M(y) sur 0 ≤ y ≤ h avec les mêmes `stemItems` que l'ÉLU, coefficients du §5 (mur libre : console ; sous-sol : même schéma d'appuis qu'à l'ÉLU). Ma = max|M(y)|. Avec hr < h, la poussée n'agit que de zs à h (M4-A1), mais **la flèche est calculée jusqu'au sommet du voile** (É4).

**É3 — Inertie effective** (C13, C14)
- Ie = Icr + (Ig − Icr)·(Mcr/Ma)³, avec Ie ≤ Ig ; Ie = Ig si Ma ≤ Mcr.
- Méthode par défaut (D1, option A) : **Ie constant**, calculé avec Ma au pied (encastrement) pour le mur libre ; pour le mur de sous-sol, selon 9.8.2.4 (À CONFIRMER), sinon Ie calculé avec le plus grand |M|.

**É4 — Flèche immédiate Δi** : double intégration de la courbure κ(y) = M(y)/(Ec·Ie), avec les conditions d'appui du modèle (pied : v = 0 et v′ = 0 ; sous-sol : v = 0 en tête et aux appuis saisis). Résultat : v(y) sur toute la hauteur, Δtête = v(h), Δmax = max|v(y)|.
Formules fermées de contrôle (EI constant, console de longueur h) :
- poussée triangulaire sur toute la hauteur (p0 au pied) : Δtête = p0·h⁴/(30EI) = Ma·h²/(5EI) ;
- poussée triangulaire sur hr seulement (hr < h) : Δtête = p0·hr³/(EI)·[hr/30 + (h − hr)/24], avec p0 = Ka·γ·hr ;
- surcharge uniforme q·Ka sur hr : Δ(hr) = w·hr⁴/(8EI), θ = w·hr³/(6EI), Δtête = Δ(hr) + θ·(h − hr) ;
- voile encastré au pied et appuyé en tête, triangulaire (p0 au pied) : R tête = p0·h/10 ; Δmax = p0·h⁴/(419,3·EI) à 0,447h sous la tête.

**É5 — Flèche différée** (C3, C15)
- Δi,sus = flèche de É4 sous les seules charges soutenues de la combinaison (D + H + Ls), avec le **même Ie** que la combinaison (D3, option conservatrice).
- ζ = s/(1 + 50ρ′), s = 2,0 (≥ 5 ans), ρ′ = As′/(1000·d) ; ρ′ = 0 par défaut (D5).
- ΔLT = Δi + ζ·Δi,sus.

**É6 — Vérification** : Δadm = Hréf/k ; rapport Hréf/|ΔLT| et taux |ΔLT|/Δadm, pour chaque combinaison, en tête (mur libre) ou au maximum (sous-sol).

**É7 — Information (non bloquante)** : rapport |Δtête|/h comparé au Y/H du tableau 20.3 du CFEM (C9). Si la flexion du voile seule donne Y/H < 0,001 en sol pulvérulent dense, la note rappelle que la poussée active suppose un déplacement du mur (rotation de la semelle comprise, non calculée) et que l'hypothèse de poussée active reste à justifier par le concepteur.

## 7. Facteurs

| Facteur | Valeur | Condition | Source |
|---|---|---|---|
| Coefficients de charge ÉLS | 1,0 pour les charges principales et H ; 0,3W ; 0,35S ; 0,35L (0,5L) | §5 | C2, C5 (VÉRIFIÉ) |
| φ | aucun (ÉLS) | — | — |
| s | 2,0 | charge soutenue ≥ 5 ans | C15 (À CONFIRMER) |
| fr/2 | dans Mcr pour la flèche seulement | — | C13 (À CONFIRMER) |

## 8. Critères d'acceptation

- **Vérification** : |ΔLT| ≤ Δadm = Hréf/k pour toutes les combinaisons du §5. Défauts proposés : Hréf = h (hauteur du voile), k = 300, **critère de l'utilisateur** (aucune source lue ne fixe une limite pour un mur de soutènement : C8, C10, C16).
- **Implémentation** :
  1. Le cas R1 (§10) est reproduit à ±0,5 % sur Δ et ±1 % sur Icr et Ie ; les cas R2 et R3 à ±0,5 %.
  2. La flèche numérique sous un EI constant égale les formules fermées de É4 à ±0,5 %.
  3. Avec hr = h, la flèche n'a aucun effet sur les autres résultats (aucune régression).
  4. La note affiche la limite avec la mention « critère de l'utilisateur » et les clauses À CONFIRMER en clair.

## 9. Contenu exigé dans la note de calcul

- Données : h, hr, t, d, As, As′, f′c, Ka, γ, charges ; Hréf et k saisis.
- Hypothèses du §3 et décisions D1 à D8 retenues.
- Références : C1 à C17 avec leur statut ; les clauses À CONFIRMER sont signalées.
- Équations É1 à É6 avec substitutions numériques pour la combinaison gouvernante : Ec, fr, Mcr, c, Icr, Ma, Ie, Δi, Δi,sus, ζ, ΔLT.
- Tableau par combinaison : coefficients D, L, S, W, H, \|Δtête\| (mm), \|Δmax\| (mm), Hréf/Δ, Δadm, statut.
- Conclusion : CONFORME / NON CONFORME au critère de l'utilisateur.
- Avertissements : rotation de la semelle NON VÉRIFIÉE (C4, C10) ; limite choisie par l'utilisateur ; information É7.

## 10. Cas de référence (calculés à la main)

Données G1 (MUR-02 §7.1) : h = 3,000 m, hr = h, t = 300 mm, f′c = 30 MPa, 15M @ 120 côté remblai (As = 1 666,7 mm²/m), enrobage 60 → d = 232 mm, Ka = 0,3073, γ = 19 kN/m³, pas de nappe, pas de surcharge. Combinaison S0 : 1,0D + 1,0H. D ne crée pas de charge latérale sur le voile.

### R1 — Mur libre, hr = h (défauts : Ie constant, fr/2, ρ′ = 0)

| Grandeur | Calcul | Valeur attendue |
|---|---|---|
| p0 | 0,3073·19·3,0 | 17,516 kPa |
| Ma (pied) | p0·h²/6 | **26,274 kN·m/m** (= 26,27 de MUR-02 §7.2) |
| Ec ; n | 4500·√30 ; 200 000/Ec | 24 647,5 MPa ; 8,1144 |
| Ig | 1000·300³/12 | 2,250·10⁹ mm⁴ |
| fr ; Mcr | 0,6·√30 = 3,2863 ; (3,2863/2)·2,25·10⁹/150 | **Mcr = 24,648 kN·m/m** < Ma : voile fissuré au pied |
| c | 500c² + 13 524c − 3 137 568 = 0 | 66,84 mm |
| Icr | 1000·66,84³/3 + 13 524·165,16² | **4,684·10⁸ mm⁴** |
| Ie | 4,684·10⁸ + 1,7816·10⁹·(24,648/26,274)³ = … ·0,82558 | **1,9393·10⁹ mm⁴** (0,862Ig) |
| Ec·Ie | 24 647,5·1,9393·10⁹ | 4,7798·10¹³ N·mm² |
| Δi (tête) | Ma·h²/(5EcIe) = 26,274·10⁶·9·10⁶/(5·4,7798·10¹³) | **0,989 mm** |
| Δi,sus | toutes les charges sont soutenues | 0,989 mm |
| ζ ; ΔLT | 2,0/(1 + 0) ; 0,989 + 2·0,989 | **ΔLT = 2,968 mm** |
| Vérification | h/ΔLT = 3000/2,968 ; Δadm = 3000/300 | **1 011 ; 10,0 mm ; taux 0,297 : CONFORME** |
| Sensibilités | (a) fr entier : Mcr = 49,30 > Ma → Ie = Ig, Δi = 0,853, ΔLT = 2,558 mm ; (b) ρ′ = 333/(1000·232) = 0,00144 (10M @ 300 face avant) : ζ = 1,866, ΔLT = 2,835 mm | à reproduire selon D2 et D5 |
| É7 (information) | Δi/h = 0,989/3000 | 0,00033 < 0,001 (dense) |

### R2 — Mur libre, hr = 2,0 m < h = 3,0 m (S0, mêmes données)

p0 = 0,3073·19·2,0 = 11,677 kPa ; Ma = p0·hr²/6 = 7,785 kN·m/m < Mcr → Ie = Ig ; Ec·Ig = 5,5457·10¹³ N·mm².
Δtête = p0·hr³/(EcIg)·[hr/30 + (h − hr)/24] = 11,677·2000³/5,5457·10¹³·(66,67 + 41,67) = **0,1825 mm** (dont 0,1123 mm à hr et 0,0702 mm par rotation au-dessus de hr). ΔLT = 3·0,1825 = **0,547 mm**.

### R3 — Contrôle mécanique du modèle « sous-sol » (EI = EcIg, triangulaire sur h)

R tête = p0·h/10 = 5,255 kN/m ; Δmax = p0·h⁴/(419,3·EcIg) = 17,516·3000⁴/(419,26·5,5457·10¹³) = **0,0610 mm** à 1,342 m sous la tête. Ce cas ne contrôle que l'intégration (le choix de Ie en sous-sol dépend de D1 et C14).

## 11. Écarts avec le code actuel

| Fichier:ligne | Constat | Gravité |
|---|---|---|
| `src/lib/analysis.ts:175-187` | `SLS_COMBINATIONS` (0,5S, 0,5W, 0,5L, 1S + 1W, etc.) ne correspondent pas au tableau 4.1.3.4 du CNB 2020 ni du CNB 2025 (une charge principale à la fois ; 0,3W, 0,35S, 0,35L). Ces combinaisons servent aussi à q_adm et à e ≤ B/6 (`analysis.ts:1375-1376`) | MAJEUR (décision D6) |
| `src/` (ensemble) | Aucune flèche n'est calculée (aucune occurrence) | fonction manquante |
| `src/lib/fem.ts:52-57` | `FEMResult` ne retourne pas les déplacements (sous-sol avec appuis saisis) | MINEUR (à étendre) |
| `src/lib/analysis.ts:1096-1097` | `E_fem` = 2,5·10⁷ kPa fixe et `I_fem` brut : à remplacer par Ec(f′c) et Ie pour la flèche (sans changer les efforts ÉLU, sauf décision) | MINEUR |
| `src/lib/analysis.ts:141-142` et type `LoadCaseType` | Pas de distinction Ha / Hp / U comme dans la feuille de l'utilisateur ; H regroupe la poussée et l'eau. Acceptable pour la flèche du voile (Hp et U n'y agissent pas, §3.6) ; la note doit l'expliquer | COSMÉTIQUE |

## 12. Décisions requises de l'utilisateur (proposition par défaut en gras)

- **D1 — Méthode de Ie** : **A. Ie constant (Branson avec Ma au pied ; 9.8.2.4 pour le sous-sol)** ; B. intégration section par section avec Ie(Ma(y)) (plus fine, mais Branson est une rigidité moyenne d'élément, pas une propriété de section : non prévu par la norme, À CONFIRMER).
- **D2 — Mcr avec fr/2** : **oui, si 9.8.2.3 le confirme à la lecture** ; sinon fr entier.
- **D3 — Flèche différée** : **oui, sur D + H + Ls** (C3 nomme D et Ls ; H est une charge constante selon le Commentaire A, §29-31, cité dans MUR-02 §4.5), avec Ie de la combinaison.
- **D4 — Part soutenue de la surcharge** : **surcharge de type L transitoire (Ls = 0)**, fraction Ls saisissable ; type D toujours soutenue.
- **D5 — Armature comprimée** : **ρ′ = 0** (conservateur) ; option : prendre As′ de la face avant si elle règne sur toute la hauteur.
- **D6 — Combinaisons ÉLS** : **utiliser le §5 pour la flèche** ; remplacer aussi `SLS_COMBINATIONS` pour q_adm et e ≤ B/6 est une décision séparée, qui modifie les résultats de MUR-02.
- **D7 — Limite** : **Δadm = h/300, « critère de l'utilisateur »**, Hréf et k saisissables. Le Commentaire D permet de prendre L = 2 × longueur pour un porte-à-faux (soit 2h/300) : à retenir ou non. Constat sur la feuille : |Δmax| = 12,0 mm correspond à 3,6 m/300, mais les rapports H/Δ (2 297 pour 1,7 mm ; 11 598 pour 0,3 mm) supposent H ≈ 3,9 m. Préciser quelle hauteur est utilisée (h, h + ts ou hr).
- **D8 — Rotation de la semelle** : **hors périmètre, NON VÉRIFIÉ dans la note** (le CFEM ne donne ni méthode ni limite, C10 ; C4 renvoie à l'ingénieur en géotechnique). Option future : rotation θ saisie d'après le rapport géotechnique, ajoutée comme θ·h.

## 13. Informations manquantes

- Lecture de A23.3-19 : 8.3.3, 8.6.2.3, 8.6.4, 9.8.2.3 à 9.8.2.6, tableau 9.3 (C11 à C17). Tant qu'elles restent À CONFIRMER, la vérification de flèche ne peut pas être déclarée conforme à la CSA (seulement au critère de l'utilisateur, avec réserve).
- Paultre (chapitre sur les flèches) non lu dans cette session : pourrait servir de seconde source pour C13 à C15.
- Valeurs du tableau 6.2 du CFEM pour « Deflection/tilt » (φgs) : non lues, sans usage dans cette fiche.

## Vérification visuelle de la CSA A23.3-14 (2026-11-08, coordinateur)

Pages lues dans `docs/methodes/CSA14.pdf` (A23.3-14, pages imprimées = pages PDF) :

| Article | Contenu lu | Page |
|---|---|---|
| 8.3.3 | ÉLS sous les charges de service ; combinaison qui produit l'effet le plus néfaste | 54 |
| 8.5.4.1 | Es = 200 000 MPa | 55 |
| 8.6.2.3, éq. 8.2 | **Ec = 4500·√f′c** (béton de densité normale, 20 ≤ f′c ≤ 40 MPa) ; variante éq. 8.1 (8.6.2.2) | 56 |
| 8.6.4, éq. 8.3 | **fr = 0,6·λ·√f′c** ; λ = 1,00 pour le béton de densité normale (8.6.5) | 56 |
| 9.8.2.2 | Flèches instantanées : équations élastiques avec fissuration et armature, ou intégration des courbures | 62 |
| 9.8.2.3, éq. 9.1 et 9.2 | **Ie = Icr + (Ig − Icr)·(Mcr/Ma)³ ≤ Ig** ; **Mcr = fr·Ig/yt**, **avec fr égal à la moitié de l'éq. 8.3** | 62 |
| 9.8.2.4 | Ie moyen pour les pièces continues (éq. 9.3 et 9.4) | 63 |
| 9.8.2.5, éq. 9.5 | **ζs = 1 + s/(1 + 50ρ′)**. s = 2,0 (5 ans ou plus), 1,4 (12 mois), 1,2 (6 mois), 1,0 (3 mois). ρ′ est pris à l'appui pour un porte-à-faux. | 63 |
| 9.8.2.6 et tableau 9.3 | Limites de flèche pour les toits et planchers seulement (ℓn/180, /360, /480, /240). **Aucune limite pour un mur de soutènement.** | 63, 65 |

**Conséquences pour la fiche :**
- D2 (fr/2) : **confirmé** par 9.8.2.3.
- La règle de flèche différée (D3) et le facteur ζs sont **confirmés** par 9.8.2.5, avec s = 2,0 pour une charge soutenue de 5 ans ou plus.
- **H/300 n'a pas de source normative** : le tableau 9.3 ne vise pas les murs. C'est un **critère de l'utilisateur** (D7), à saisir, avec 300 par défaut, et la note le dit.
- La correspondance avec l'édition -19 reste À CONFIRMER (numérotation identique attendue).

## Approbation (2026-11-08)

Réponse de l'utilisateur : « D6 : remplacer aussi les combinaisons ÉLS de la portance par celles du tableau 4.1.3.4 […] utiliser celui du CNB. D7 : limite H/300, modifiable, mesurée sur la hauteur du voile. ok »

Décisions retenues :
- **D1** : Ie constant, calculé avec Ma au pied (proposition par défaut).
- **D2** : fr/2, confirmé par 9.8.2.3.
- **D3** : flèche différée sur D + H + Ls, avec ζs = 1 + s/(1 + 50ρ′) et s = 2,0 (9.8.2.5).
- **D4** : part soutenue Ls = 0 par défaut, modifiable.
- **D5** : ρ′ = 0.
- **D6** : **les combinaisons ÉLS du logiciel sont remplacées par celles du tableau 4.1.3.4 du CNB** (2020 ou 2025 selon l'édition choisie), aussi pour la portance ÉLS et le tiers central.
- **D7** : limite **h/300**, h = hauteur du voile, diviseur modifiable (300 par défaut). C'est un critère de l'utilisateur, sans source normative.
- **D8** : rotation de la semelle hors périmètre, marquée NON VÉRIFIÉ dans la note.
