# MUR-04 — Paramètres du sol avant et de fondation : type de sol, contact, frottement de base, adhérence, conditions drainées et non drainées

| Champ | Valeur |
|---|---|
| Statut | **APPROUVÉE** (2026-11-07). L'utilisateur a répondu « oui, il faut séparer sol avant et assise de la fondation » à la proposition minimale. Voir la section « Version approuvée ». Proposée et révisée le même jour. |
| Base | MUR-02 (APPROUVÉE) §1 (facteurs φgu, tableau 6.2), §2.1 (glissement), §2.2 (portance, B′, qu saisi) ; MUR-01 §3 (deux sols) |
| Juridiction / éditions | Québec, CNB 2020 par défaut (MUR-02 §0) ; **CFEM 5e édition (2023)** pour toute la géotechnique de cette fiche |
| Périmètre | Seulement les vérifications que le logiciel fait déjà : butée devant le mur, glissement, portance (**qu reste saisi**, MUR-02 §1 règle 3), poids du sol sur le patin |
| Code examiné | `src/lib/types.ts`, `src/lib/analysis.ts` (lecture seule, aucun code modifié) |

Notation : « p. » = page imprimée du CFEM ; « PDF » = page du fichier (PDF = p. + 32, décalage confirmé dans MUR-02). Les sources ont été lues dans l'extraction texte du CFEM. Le rendu des pages n'était pas disponible : l'alignement des colonnes du tableau 20.4 a été reconstruit à partir du texte et doit être **confirmé visuellement (PDF 723)**. Le livre de Paultre n'a pas pu être lu : toute comparaison avec Paultre est **À CONFIRMER**.

---

## 1. Clauses et sources

| # | Référence | Objet | Statut |
|---|---|---|---|
| S1 | CFEM §10.6, p. 351 (PDF 383) | Résistance horizontale d'une semelle : la plus faible de (a) la résistance de l'interface semelle-sol, avec c = adhérence, « if any at all », et φ = angle de frottement d'interface, fonction de la rugosité de la sous-face et du sol ; (b) la résistance au cisaillement du sol sous la semelle. Le béton préfabriqué a un angle d'interface plus faible que le béton coulé directement sur le sol. Les paramètres du sol se choisissent en conditions drainées ou non drainées. | VÉRIFIÉ (paraphrase) |
| S2 | CFEM tableau 20.4(a), p. 691 (PDF 723) | Angle δ et facteur tan δ entre le béton (de masse, ou formé/préfabriqué) et le sol, selon la classe USCS | VÉRIFIÉ ; **alignement des colonnes à confirmer** |
| S3 | CFEM tableau 20.4(b), p. 691 (PDF 723) | Adhérence dans les sols cohérents, en fonction de τu = su | VÉRIFIÉ |
| S4 | CFEM §20.2.6, p. 690 (PDF 722) | Frottement mur-sol : δ de ½ à ⅔ de φ ; δ > φ/2 à exclure pour la butée de Coulomb | VÉRIFIÉ |
| S5 | CFEM §20.7.3.3, p. 698 (PDF 730) | Glissement : frottement à la base et butée, celle-ci ignorée au-dessus de la profondeur de gel ; tenir compte de l'eau sous la base | VÉRIFIÉ (déjà dans MUR-02) |
| S6 | CFEM fig. 20.10, p. 699 (PDF 731) | Cas de stabilité : poids déjaugé, force de frottement F à la base, butée sous la profondeur de gel | VÉRIFIÉ (légende ; déjà dans MUR-02) |
| S7 | CFEM §20.7.3.4, p. 698 | Portance selon le ch. 10, avec l'excentricité et l'inclinaison de la résultante | VÉRIFIÉ |
| S8 | CFEM §10.3.2, p. 344 (PDF 376) | Non drainé : c = su, φ = 0, contrainte **totale** ; drainé : c = c′, φ = φ′, contrainte **effective**. « In most cases, bearing capacity for undrained conditions controls design » | VÉRIFIÉ |
| S9 | CFEM tableau 6.2, p. 199 | φ : glissement frottant 0,80 ; glissement cohésif 0,60 ; butée 0,50 ; portance 0,50 (valeurs typiques retenues par MUR-02) | VÉRIFIÉ (MUR-02 §1) |
| S10 | CFEM éq. 4.3, fig. 4.1 (§4) ; fig. 5.20-5.21, p. 127-128 | Ip sert à classer le sol (USCS) et à corriger su mesuré au scissomètre | VÉRIFIÉ |
| S11 | CFEM éq. 10.1 à 10.8, tableau 10.2, p. 343-347 | Formule générale de qu : facteurs N, forme, inclinaison, profondeur, pente β, inclinaison de la base | VÉRIFIÉ ; sert uniquement à justifier les « non retenus » (§3) |
| S12 | CFEM éq. 9.7, p. 249 | α = 0,21 + 0,26·pa/su, **pour les pieux** | VÉRIFIÉ ; non applicable aux semelles |
| — | « Contact rugueux : δb = φ′ » | Aucun énoncé lu ; seule la borne δb ≤ φ′ découle de S1 | **À CONFIRMER** |
| — | « Contact lisse : δb = ⅔·φ′ » pour la base | Le ⅔ de S4 concerne le frottement mur-sol, pas la base | **À CONFIRMER** |
| — | Adhérence drainée c′a = α·c′ | Aucune règle lue | **À CONFIRMER** |
| — | Interpolation linéaire dans le tableau 20.4(b) | Le tableau ne donne que des plages | **À CONFIRMER** |
| — | Butée non drainée (contraintes totales) | Non lue | **À CONFIRMER** |
| — | Paultre ch. 17 | Non lu | **À CONFIRMER** |

Total : 12 VÉRIFIÉES (dont 1 avec alignement à confirmer), 6 À CONFIRMER.

---

## 2. Paramètres retenus (minimum exigé par le CFEM pour les vérifications existantes)

| # | Paramètre | Unité | Défaut | Utilité dans le logiciel | Justification CFEM |
|---|---|---|---|---|---|
| P1 | **Type de sol** : pulvérulent ou cohérent | — | pulvérulent | Choisit les conditions à vérifier. Pulvérulent : drainé seulement. Cohérent : non drainé (court terme) **et** drainé (long terme). | S8, p. 344 ; S1, p. 351 (choisir les paramètres selon la condition) |
| P2 | **γ** du sol de fondation et du sol avant | kN/m³ | 19 (existant) | Poids du sol sur le patin ; butée ; poids déjaugé sous la nappe (ΣV′) | S6, p. 699 (poids déjaugé, butée) ; S5, p. 698 |
| P3 | **φ′** du sol de fondation | ° | 30 (existant) | Coefficient de butée Kp ; borne supérieure de δb | S4, p. 690 (butée) ; S1, p. 351 (δb ≤ φ′) |
| P4 | **Contact de la base** : rugueux (béton coulé sur le sol) ou lisse (préfabriqué, coffré, membrane) | — | rugueux | Fixe la règle de δb | S1, p. 351 ; S2, p. 691 (deux colonnes : béton de masse, béton formé ou préfabriqué) |
| P5 | **δb** (frottement à la base), affiché avec tan δb, modifiable | ° | rugueux : φ′ ; lisse : à saisir | Terme de frottement du glissement drainé. **Remplace le champ μ actuel.** | S1, p. 351 ; S2, p. 691 ; S5 et S6 |
| P6 | **c′a**, adhérence drainée à la base | kPa | 0 | Terme d'adhérence du glissement drainé | S1, p. 351 (« adhesion, if any at all ») |
| P7 | **cu (su)**, seulement si le sol est cohérent | kPa | — (obligatoire si cohérent) | Adhérence non drainée ca (calculée), seul terme du glissement non drainé | S3, p. 691 ; S8, p. 344 |

Remarques :
- **c′ du sol n'est pas un paramètre distinct.** Avec qu saisi, aucune vérification existante n'utilise la cohésion propre du sol. La butée du code ne tient pas compte de c′, ce qui est conservateur, et la poussée active la néglige déjà (`types.ts:177`). Le champ actuel `foundation.cohesion` devient P6, c′a : il doit être saisi en tant qu'adhérence de l'interface et non en tant que c′ du sol (S1). Le géotechnicien doit s'assurer que c′a ≤ c′ (borne S1). Ce contrôle est rappelé dans la note, sans nouveau champ.
- **ca n'est pas saisi**. Il est calculé à partir de cu (§4.2).
- Limites de saisie : 0 ≤ φ′ ≤ 45° ; 0 ≤ δb ≤ φ′ (S1) ; c′a ≥ 0 ; cu > 0 si le sol est cohérent. Une saisie hors limites bloque le calcul avec un message.

---

## 3. Paramètres non retenus (et raison)

| Paramètre de la feuille | Raison | Source |
|---|---|---|
| Ip | Sert à classer le sol et à corriger su mesuré au scissomètre. Aucun usage n'a été trouvé pour l'adhérence ou le glissement d'une semelle. On suppose que su est déjà corrigé dans le rapport géotechnique. | S10, p. 127-128 |
| β (pente devant ou sous la semelle) | N'intervient que dans la formule générale de qu (facteurs ζβ). qu reste saisi (MUR-02 §1) : le géotechnicien en tient compte. | S11, tableau 10.2, p. 347 ; S7, p. 698 |
| δinc (inclinaison de la charge ou de la base) | Même raison : facteurs ζi et ζδ de la formule générale de qu. L'inclinaison de la charge, H/V, est déjà connue du programme à chaque combinaison. | S11, tableau 10.2, p. 347 |
| Type de semelle « filante » | Le mur est toujours une semelle filante, calculée par mètre. Le type n'agit que par les facteurs de forme de qu (tous égaux à 1 pour une semelle filante), donc pas avec qu saisi. | S11, tableau 10.2, p. 347 |
| μ séparé | Il double tan δb (P5). Le CFEM raisonne en δ et tan δ. Le champ μ est remplacé par P5, et la note affiche tan δb. | S2, p. 691 |
| c′ du sol séparé de c′a | Il n'est utilisé par aucune vérification existante quand qu est saisi (voir §2). | S1, p. 351 |
| Rugueux ou lisse dans Nγ | Effet réel (éq. 10.4/10.5, p. 345), mais seulement dans le calcul de qu. | S11 |

Si l'utilisateur décide plus tard de **calculer qu** (formule générale du CFEM, éq. 10.1, p. 343), il faudra ajouter β, δinc et c′ du sol, ainsi que la profondeur D et la position de la nappe (tableau 10.3, p. 349). C'est hors de cette fiche (décision D9).

---

## 4. Règles de calcul

### 4.1 Angle de frottement de base δb (P4, P5)

- Le CFEM **ne prescrit pas δb = φ′ ni δb = ⅔·φ′** pour la base. Il impose la borne δb ≤ φ′ (S1) et fournit le tableau 20.4(a) (lecture du texte, alignement à confirmer) :

| Sol (USCS) | Béton de masse (≈ coulé sur le sol) δ (°) / tan δ | Béton formé ou préfabriqué δ (°) / tan δ |
|---|---|---|
| Roc sain propre | 35 / 0,70 | — |
| GW, GP | 29–31 / 0,55–0,60 | 22–26 / 0,40–0,50 |
| GM, GC, SW, SP | 24–29 / 0,45–0,55 | 17 / 0,30 |
| SM, SC | 19–24 / 0,35–0,45 | 14 / 0,25 |
| ML (non plastique) | 17–19 / 0,30–0,35 | 14 / 0,25 |
| CL (raide à dure), sols résiduels | 22–26 / 0,40–0,50 | — |

- Pour le béton de masse, ces δ sont **inférieurs** aux φ′ usuels des mêmes sols. La règle « rugueux : δb = φ′ » est la borne supérieure de S1, et non une valeur du tableau.

Règle proposée (D1) :
1. **Rugueux** : δb = φ′ par défaut, modifiable. La note affiche l'avertissement suivant : « borne supérieure (CFEM §10.6, p. 351) ; le tableau 20.4 donne des valeurs plus faibles selon la classe du sol ».
2. **Lisse** : δb saisi, avec une aide affichant la colonne « béton formé ou préfabriqué » du tableau 20.4. Aucun défaut automatique. Sans saisie, le glissement est NON VÉRIFIABLE.
3. Toujours : δb ≤ φ′.

### 4.2 Adhérence

- **Non drainé (sol cohérent)** : ca est tiré du tableau 20.4(b), p. 691.

| Consistance | su (kPa) | ca (kPa) |
|---|---|---|
| Très molle | 0–12 | 0–12 |
| Molle | 12–25 | 12–25 |
| Moyennement raide | 25–50 | 25–38 |
| Raide | 50–100 | 38–48 |
| Très raide | 100–200 | 48–65 |

  Règle proposée (D2) : interpolation linéaire entre les bornes (0→0, 12→12, 25→25, 50→38, 100→48, 200→65), plafonnée à 65 kPa au-delà de 200 kPa (À CONFIRMER). ca ≤ cu. L'éq. 9.7 (pieux) n'est pas retenue.
- **Drainé** : c′a est saisi (P6), défaut 0 (S1). Aucune règle α·c′ n'a été lue (À CONFIRMER).

### 4.3 Conditions vérifiées et glissement (forme MUR-02 §2.1 conservée)

| Type de sol | Conditions |
|---|---|
| Pulvérulent | Drainée seulement |
| Cohérent | Non drainée (CT) **et** drainée (LT), pour chaque combinaison ELU. Le statut retenu est le plus défavorable des deux (D3, proposition ; le CFEM, p. 344, indique seulement que la condition non drainée gouverne le plus souvent). |

- **Drainé** : Rs = Ψ·[φgs·ΣV′·tan δb + φcoh·c′a·B′ + φp·(P′p + Pw,a)] ≥ ΣHf.
- **Non drainé** : Rs = Ψ·[φcoh·ca·B′ + φp·Pp,u] ≥ ΣHf. Le frottement est nul (φ = 0, S8). Pp,u = 0 par défaut (D5), car la butée en contraintes totales n'a pas été lue.
- φgs = 0,80 ; φcoh = 0,60 ; φp = 0,50 (S9, MUR-02). B′ comme dans MUR-02 (D13 de MUR-02, À CONFIRMER).
- Portance : inchangée, qf ≤ Ψ·φgu·qu avec qu saisi (MUR-02 §2.2). Pour un sol cohérent, la note demande que qu corresponde à la condition la plus défavorable (S8, p. 344).

### 4.4 Butée et poids sur le patin

Ils sont inchangés et utilisent γ (P2) et φ′ (P3) du sol de fondation, comme aujourd'hui. Le δ de Coulomb pour la butée ne doit plus être borné par le μ de la base, mais suivre S4 (δ ≤ φ′/2 en butée de Coulomb) (D10).

---

## 5. Cas de référence (calculs à la main)

Hypothèses communes (cas fictif, pour le contrôle seulement) : B′ = 2,40 m ; ΣV′ = 200 kN/m et ΣHf = 60 kN/m, pondérés. Ψ = 1,0 ; φgs = 0,80 ; φcoh = 0,60. La butée est ignorée (Pp = 0) pour isoler les termes de base. Tolérance : ±0,5 %.

**R1 : feuille de l'utilisateur** (pulvérulent, rugueux, φ′ = 30°, c′a = 0, γ = 19 kN/m³)
1. δb = φ′ = 30° ; tan δb = **0,5774** (feuille : 0,58).
2. Rs = 0,80 × 200 × 0,5774 = **92,38 kN/m** ≥ 60 : **OK** (rapport 1,54).
3. Contrôle avec le tableau 20.4 (SW/SP, béton de masse, borne haute tan δ = 0,55) : Rs = 88,0 kN/m (−4,7 %). Cela illustre D1.

**R2 : sol cohérent**, cu = 50 kPa
- CT (non drainé) :
  1. ca = **38 kPa** (borne 50 → 38 du tableau 20.4b).
  2. Rs = 0,60 × 38 × 2,40 = **54,72 kN/m** < 60 : **NON**.
  3. Variante ca = cu = 50 kPa (D2) : 72,0 kN/m, donc OK. Ce choix change la conclusion.
- LT (drainé ; paramètres fictifs φ′ = 26°, c′a = 0, rugueux) :
  4. tan δb = 0,4877.
  5. Rs = 0,80 × 200 × 0,4877 = **78,04 kN/m** : OK.
- Statut gouvernant : **NON (CT)**.

---

## 6. Écarts avec le code actuel

| Fichier:ligne | Constat | Gravité proposée |
|---|---|---|
| `src/lib/types.ts:169`, `src/lib/analysis.ts:713`, `:1357` | `foundation.cohesion` est appelée « c′ » mais sert d'adhérence de base. Il faut la redéfinir comme c′a (S1). | MAJEUR |
| `src/lib/types.ts:182`, `src/lib/analysis.ts:1356` | `mu` est porté par le sol de remblai, n'a pas de lien avec le contact, et rien ne vérifie tan δb ≤ tan φ′. | MAJEUR |
| `src/lib/types.ts:166-170` | Il manque le type de sol, le contact et cu. Il n'existe aucune vérification non drainée. | MAJEUR |
| `src/lib/analysis.ts:108-137` | Les presets donnent μ et c′ sans source. `stiff_clay` mélange des paramètres drainés et non drainés (c′ = 35, φ = 18°) et n'a pas de cu. | MAJEUR |
| `src/lib/analysis.ts:478`, `:487` | Le δ de Coulomb est borné par atan(μ) de la base : les interfaces sont différentes (S4). | MINEUR à MAJEUR |

---

## 7. Contenu exigé dans la note de calcul

- Type de sol, γ, φ′, contact, δb et tan δb (avec leur règle), c′a, cu et ca (avec α = ca/cu).
- Pour chaque combinaison ELU et chaque condition : substitution de Rs, ΣHf, rapport et statut, puis statut gouvernant.
- Références CFEM avec les pages du §1. Les mentions À CONFIRMER sont reprises dans `normCoverage`.
- Avertissements :
  - δb = φ′ est une borne supérieure ;
  - Pp,u = 0 en non drainé ;
  - qu saisi doit correspondre à la condition gouvernante et tenir compte de l'inclinaison, de l'excentricité et de la pente (S7) ;
  - les paramètres non retenus du §3 ne sont pas utilisés.

---

## 8. Décisions à soumettre à l'utilisateur (proposition par défaut en gras)

| # | Question | Proposition | Alternatives |
|---|---|---|---|
| D1 | δb, contact rugueux | **δb = φ′, avec avertissement** | Tableau 20.4 « béton de masse » selon la classe USCS |
| D1b | δb, contact lisse | **Saisie obligatoire, aide tableau 20.4** | ⅔·φ′ (À CONFIRMER) |
| D2 | ca non drainé | **Tableau 20.4(b) interpolé** | ca = cu (À CONFIRMER) ; saisie |
| D3 | Sol cohérent | **Vérifier CT et LT, retenir le plus défavorable** | CT seulement |
| D5 | Butée en non drainé | **Pp,u = 0** | Butée drainée existante |
| D9 | qu | **Reste saisi ; β, δinc, Ip et type de semelle non retenus** | qu calculé (ajoute β, δinc, c′, D, nappe) |
| D10 | δ de Coulomb | **Découplé du μ de base, selon S4** | État actuel |
| D11 | Tableau 20.4 | **Contrôle visuel des colonnes (PDF 723) avant approbation** | — |

---

## 9. Critères d'acceptation (pour l'implémentation qui suivra l'approbation)

1. R1 : tan δb = 0,5774 ; Rs = 92,38 kN/m (±0,5 %).
2. R2 : ca = 38,0 kPa ; Rs,CT = 54,72 kN/m, statut NON ; Rs,LT = 78,04 kN/m ; statut gouvernant NON.
3. Sol pulvérulent : cu n'a aucun effet sur les résultats (test de non-dépendance).
4. δb > φ′, ou sol cohérent sans cu : calcul bloqué avec message.
5. Non-régression : avec un sol pulvérulent, un tan δb égal à l'ancien μ et c′a égal à l'ancien c′, le glissement est identique à l'état actuel.
6. Chaque valeur de la note provient du moteur. Aucune substitution n'est écrite à la main.
7. Les mentions À CONFIRMER apparaissent dans `normCoverage`.
8. `npm run lint` sans erreur.

---

## 10. Informations manquantes

- Contrôle visuel du tableau 20.4 (PDF 723).
- Paultre ch. 17, pour comparaison.
- Règle de c′a drainée ; butée non drainée.
- Le dossier `docs/` du projet mur n'a pas de `README.md` : l'index est à créer, sur décision de l'utilisateur.

## D11 : vérification visuelle du tableau 20.4 (2026-11-07)

Le tableau a été rendu à l'écran depuis le PDF du CFEM 5e (PDF p. 723, p. imprimée 691). L'alignement des colonnes est **confirmé**.

**(a) Matériaux frottants, structure en béton de masse ou maçonnerie** (« mass concrete », béton coulé contre le sol) :

| Sol (USCS) | δ (°) | tan δ |
|---|---|---|
| Roc sain et propre | 35 | 0,7 |
| GW, GP | 29–31 | 0,55–0,60 |
| GM, GC, SW, SP | 24–29 | 0,45–0,55 |
| SM, SC | 19–24 | 0,35–0,45 |
| ML (non plastique) | 17–19 | 0,30–0,35 |
| CL (ferme à dur), sols résiduels | 22–26 | 0,40–0,50 |

**Béton formé ou préfabriqué** (« formed or pre-cast concrete ») :

| Sol (USCS) | δ (°) | tan δ |
|---|---|---|
| Enrochement bien gradué | 22–26 | 0,40–0,50 |
| Enrochement uniforme | 17–22 | 0,30–0,40 |
| GW, GP | 22–26 | 0,40–0,50 |
| GM, GC, SW, SP | 17 | 0,30 |
| SM, SC | 14 | 0,25 |
| ML (non plastique) | 14 | 0,25 |

**(b) Adhérence dans les sols cohérents** :

| Consistance | su (kPa) | Adhérence (kPa) |
|---|---|---|
| Très molle | 0–12 | 0–12 |
| Molle | 12–25 | 12–25 |
| Moyennement ferme | 25–50 | 25–38 |
| Ferme | 50–100 | 38–48 |
| Très ferme | 100–200 | 48–65 |

### Option proposée en complément de D1
- Le **type de sol** est choisi parmi les classes USCS du tableau. C'est une seule saisie, qui sert aussi à P1 (pulvérulent ou cohérent).
- Combiné au **contact** (béton coulé contre le sol ou béton formé/préfabriqué), il propose **δb = borne inférieure du tableau**, ce qui est prudent.
- La valeur reste modifiable. Elle est limitée par δb ≤ φ′ (p. 351).
- Cette option remplace la règle « rugueux : δb = φ′ », qui donne une borne supérieure non tirée du manuel.

## Version approuvée (2026-11-07) : trois sols séparés, paramètres minimaux

L'utilisateur a approuvé la proposition minimale. Il demande de **séparer le sol avant et le sol d'assise de la fondation**. Le logiciel aura donc **trois sols** :

| Sol | Paramètres | Usage dans le calcul |
|---|---|---|
| **Sol arrière (remblai)** | γ, φ′, c′ (c′ négligée dans la poussée active) | Poussée sur le voile, poids sur le talon, ΔPAE. Sans changement. Le δ de Coulomb du remblai devient indépendant de la base (D10). |
| **Sol avant** (au-dessus du patin) | γ, φ′, hauteur hs,av | Butée (Kp avec le φ′ de ce sol, intégration par couches A2/A3, gel D9) ; poids sur le patin ; poids déjaugé sous la nappe |
| **Sol d'assise** (sous la semelle) | Type de sol (classe USCS du tableau 20.4) ; φ′ ; contact du béton (coulé contre le sol ou formé/préfabriqué) ; δb (proposé, modifiable) ; cu (seulement si le sol est cohérent) ; qadm (ÉLS) et qu (ÉLU), tirés du rapport géotechnique | Glissement (tan δb à long terme ; ca à court terme si le sol est cohérent) ; portance |

**Règles :**
- **R1, valeur proposée de δb :** borne **inférieure** du tableau 20.4(a), selon la classe et le contact. La valeur est modifiable et limitée à δb ≤ φ′ d'assise (p. 351). Si la classe n'a pas de valeur pour le contact choisi (par exemple CL avec du béton formé), δb doit être saisi.
- **R2, assise cohérente (classe CL) :**
  - court terme : ca selon le tableau 20.4(b), interpolé linéairement dans la plage de su (adhérence = borne de la plage) ; R = Ψ·φcoh·ca·B′ ;
  - long terme : tan δb ;
  - on retient le plus défavorable.
- **R3, butée :** elle est nulle dans la vérification à court terme (D5). À long terme, elle reste selon MUR-02, A2, A3 et §11.
- **R4, adhérence à long terme :** c′a = 0 (« adhesion, if any at all », p. 351). Le c′ du remblai ne sert plus d'adhérence à la base.
- **R5 :** le champ μ et les presets de sol sans source sont supprimés. Un ancien projet est migré ainsi :
  - le sol avant et le sol d'assise reprennent les γ et φ′ de l'ancien sol de fondation ;
  - δb = atan(μ) de l'ancien projet, plafonné à φ′, avec la mention « valeur reprise d'un ancien projet » ;
  - la classe d'assise est « non définie ». Le choix est à faire, et R1 ne propose rien tant qu'il ne l'est pas.
- **R6 :** qu reste saisi (D9). Ip, β, δinc et le type de semelle ne sont pas retenus.
- **Note de calcul :** chaque sol a son propre tableau. On y indique δb avec sa source (tableau 20.4, classe, contact, ou saisie), ca si l'assise est cohérente, et la condition drainée ou non drainée qui gouverne.

## Amendement M4-A1 : hauteur du sol arrière (2026-11-07)

L'utilisateur demande d'ajouter la hauteur du sol arrière dans la carte du remblai. C'est une décision de conception de l'utilisateur. La règle ci-dessous relève de la mécanique, sans nouvelle clause.

- **Nouveau paramètre : hr**, hauteur du remblai mesurée **depuis le dessus de la semelle**, comme hs,av.
  - Défaut : hr = hauteur du voile, ce qui reproduit le comportement actuel, avec le remblai au sommet du voile.
  - Bornes : 0 < hr ≤ h du voile. Le remblai incliné n'est pas modélisé (β = 0).
- **Hauteur de poussée :** H_p = hr + ts, mesurée sur le plan fictif depuis la sous-face. Elle remplace la hauteur totale dans tous les cas suivants :
  - poussée active ou au repos ;
  - surcharge, appliquée à la surface du remblai ;
  - eau ;
  - Mononobe-Okabe (ΔPAE à 0,6·H_p) ;
  - Wood (ΔP0E à 0,58·H_p) ;
  - inertie du sol du talon.
- **Poids du sol sur le talon :** sa hauteur passe de h à hr.
- **Nappe :** hw ≤ H_p. Sinon, un avis est affiché et hw est plafonné.
- **Voile :** les efforts M et V du voile ne viennent de la poussée que sur la hauteur où il y a du remblai. Au-dessus de hr, le voile ne reçoit que les charges en tête et l'inertie propre.
- **Affichage :**
  - croquis de la note et Visualizer : le remblai est tracé jusqu'à hr ;
  - note, tableau 1.1 : une ligne « Hauteur du sol arrière hr » est ajoutée.
- **Critère d'acceptation :** avec hr = h, aucun résultat ne change. Il faut un test avec hr < h, avec Pa recalculé à la main.

## Décision de l'utilisateur du 2026-11-08 : charges linéaires et hr

Message de l'utilisateur : « (a) les limiter à la hauteur remblayée ; faire les calculs selon la hauteur de sol rentrée ».

- Les charges linéaires et ponctuelles sur le remblai (CFEM fig. 20.8) et les charges additionnelles réparties agissent sur la **hauteur remblayée seulement**. On prend H = H_p = hr + ts sur le plan fictif, et l'origine des distances (x, m = x/H, n = z/H) est la **surface du remblai**, à hr au-dessus du dessus de la semelle, et non le haut du voile.
- Aucune pression du sol ne s'applique sur la partie du voile au-dessus du remblai.
- Ce principe vaut pour **tous** les calculs qui dépendent de la hauteur de sol : poussées, surcharge, eau, séisme, charges sur le remblai, poids sur le talon et efforts du voile (M4-A1).
