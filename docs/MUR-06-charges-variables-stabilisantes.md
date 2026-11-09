# MUR-06 — Charges variables stabilisantes (poids de la surcharge)          Statut : APPROUVÉE (2026-11-08)

| Champ | Valeur |
|---|---|
| Statut | **APPROUVÉE** par l'utilisateur le 2026-11-08 (« J'approuve MUR-06 »). |
| Demande | « il faut tenir en compte toutes les charges » ; choix explicite de l'utilisateur : **option B** — « son poids est compté partout, y compris comme force stabilisante ». |
| Base | MUR-01 (combinaisons CNB 4.1.3.2), MUR-02 §2–§5 et §12 (stabilité à l'ÉLU, portance ÉLU/ÉLS, efforts de la semelle), MUR-04 (glissement). |
| Fichiers visés | `src/lib/analysis.ts` (fonction `aggregate`, paramètre `zeroFav`, efforts du patin), `src/lib/types.ts`, interface Critères, note (sections 2, 3, 5). |

## 1. Situation actuelle (moteur)

- Le poids de la surcharge amont `q·L_talon` (et aval `q_av·L_patin`), la charge de tête `Fy` et les charges verticales saisies de type L, S, W sont des composantes du moteur.
- Dans les vérifications où elles sont favorables (glissement, renversement, et l'état « sans charges favorables » de la portance), le moteur leur donne le **facteur 0** (`zeroFav`, commentaire « CNB 4.1.3.2.(3) »). Leur poussée horizontale, défavorable, garde le facteur de la combinaison.
- Effet : ΣV identique en ELS S0 et S1 sur le projet par défaut ; la note affiche « non comptée ».

## 2. Texte normatif lu (CNB 2020, div. B, 4.1.3.2)

- (3) « Les autres combinaisons de charges qui doivent aussi être considérées sont les charges principales qui agissent avec les charges d'action concomitantes dont la valeur à retenir est zéro. »
- (5) charge permanente qui s'oppose : 0,9D (cas 2 à 4), 1,0D (cas 5).
- Le CNB ne prescrit pas de facteur 0 pour une charge **principale** variable qui est à la fois défavorable (poussée) et favorable (poids). Mettre ce poids à 0 en stabilité est une **pratique prudente**, pas une exigence lue. Référence CFEM sur ce point : À CONFIRMER.

## 3. Décisions (option B, choix de l'utilisateur)

| N° | Décision |
|---|---|
| D1 | Les charges variables **verticales** L, S, W qui stabilisent (poids de la surcharge amont sur le talon, surcharge aval sur le patin, charge de tête Fy, charges verticales saisies) reçoivent **le facteur de la combinaison** dans toutes les vérifications : glissement, renversement, portance ÉLU et ÉLS, excentricité, efforts du patin et du talon, flèche. |
| D2 | La poussée horizontale de la surcharge garde le facteur de la combinaison (inchangé). Une même charge a donc le même facteur pour son poids et pour sa poussée. |
| D3 | Les combinaisons de 4.1.3.2.(3) (charges d'accompagnement à zéro) restent générées : le cas sans L existe toujours (cas 1, variantes sans accompagnement). Les variantes 0,9D (4.1.3.2.(5)) sont inchangées. |
| D4 | Le séisme E garde le traitement actuel (signes de kv étudiés, MUR-02 §4.1) : la décision ne vise que L, S, W. |
| D5 | **Option dans Critères** : case « Compter les charges variables stabilisantes (L, S, W) en stabilité », **cochée par défaut** (décision de l'utilisateur). Décochée : comportement actuel (facteur 0, option prudente). Les anciens projets ouverts reçoivent la valeur cochée. |
| D6 | Efforts du patin : la surcharge aval est comptée avec le facteur de la combinaison (aujourd'hui facteur 0, ligne « charge variable à l'avant : favorable »), selon D1 ; option décochée : comportement actuel. |
| D7 | Note : le tableau 2a affiche le poids de la surcharge (Fv = q·L_talon, bras x = centre du talon, moment) et l'inclut dans « Σ L ». La note 3 et la section 5 (hypothèses) indiquent l'option retenue, avec la mention : « Choix de l'utilisateur, moins prudent que le facteur 0 ; CNB 4.1.3.2.(3) n'impose pas le facteur 0 à une charge principale (lu) ; pratique CFEM : À CONFIRMER ». |

## 4. Avertissement à l'utilisateur (à conserver)

Compter le poids d'une charge vive comme stabilisant suppose qu'il est présent en même temps que la poussée qu'il produit. Pour une surcharge qui peut n'occuper qu'une bande derrière le talon (camion, entreposage partiel), la poussée peut exister sans le poids sur le talon. Dans ce cas, décocher l'option.

## 5. Cas de référence (projet de la note « mur3 3 », données de la comparaison du 2026-11-08)

h = 4,00 m ; t = 0,35 m ; patin 0,80 m ; talon 1,75 m ; semelle 0,35 m ; hr = 3,50 m ; sol avant 1,35 m ; γ = 19 ; φ = 29° ; δb = 30° ; q = 12 kPa (L) ; sans nappe ; Ψ = 0,9 ; butée complète.

| Vérification | Option décochée (actuel) | Option cochée (attendu, calcul manuel) |
|---|---|---|
| Poids de la surcharge, nominal | 0 | 12 × 1,75 = 21,0 kN/m à x = 2,025 m (moment 42,53 kN·m/m) |
| 0,9D + 1,5L : ΣV | 174,4 | 174,4 + 31,5 = **205,9** kN/m |
| 0,9D + 1,5L : frottement pondéré 0,9·0,8·ΣV·tan 30° | 72,5 | **85,6** kN/m (note mur3 3 : 85,6) |
| 1,25D + 1,5L : ΣV | 246,2 | 277,7 kN/m |
| ELS S1 (1D + 1L) : ΣV | 193,7 | 214,7 kN/m (note mur3 3 : 214,7) |

Critère d'acceptation : écarts ≤ 0,1 kN/m ; option décochée = résultats actuels inchangés (tous les tests existants passent sans modification de valeur).
