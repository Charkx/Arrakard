# Spécification de la note (v1)

> **Statut : référence.** Ce document décrit _exactement_ la formule en
> production dans `arrakis-cards` (`src/lib/rating.ts`), y compris ses
> défauts. Elle sert de **golden master** : le moteur v2 doit la reproduire
> à l'identique, et toute évolution passera par un ADR dédié (voir
> [Q1](../open-questions.md)).
>
> Le README de la v1 décrit une formule plus ancienne (bonus MVP ×3, décroissance
> à 85 %), qui n'est plus utilisée. Ce document fait foi.

Chaque exemple chiffré de ce document deviendra un test.

## Entrées

- Les **performances** d'un joueur dans les éditions du **split actif**.
- Le **prestige** de l'édition de chaque match.

Les éditions hors du split actif ne comptent pas dans la note live. Elles
servent à l'historique.

## Constantes

| Constante                                  | Valeur                                                       |
| ------------------------------------------ | ------------------------------------------------------------ |
| Parties pour fiabilité complète            | 15                                                           |
| Plafond du KDA utilisé dans les sous-notes | 8,0                                                          |
| Multiplicateur de prestige                 | normal 1,0 · premium 1,3 · championship 1,6 (1,0 si inconnu) |
| Pondération de la note                     | impact 0,35 · consistance 0,35 · clutch 0,30                 |
| Bornes                                     | sous-notes [0, 99] · note [60, 99]                           |

Médianes de rôle :

| Rôle | KDA médian | Winrate médian |
| ---- | ---------- | -------------- |
| TOP  | 2,5        | 50 %           |
| JGL  | 3,0        | 50 %           |
| MID  | 3,0        | 50 %           |
| ADC  | 3,0        | 50 %           |
| SUP  | 4,0        | 50 %           |

## Algorithme

Notations : `n` = nombre de performances, `w(p)` = multiplicateur de prestige
de la performance `p`. `round` = arrondi à l'entier le plus proche, `.5` vers
le haut (`Math.round`).

**0. Aucune performance.** Impact, consistance, clutch et note valent 60 ;
palier Bronze ; forme `stable` ; toutes les stats brutes valent 0. Fin.

**1. Stats affichées (non pondérées).**

```
winrate affiché = round(victoires / n × 100)
KDA affiché     = round((K + A) / max(D, 1) × 100) / 100      # totaux bruts
```

**2. Stats pondérées par le prestige** (servent uniquement aux sous-notes).

```
W     = Σ w(p)
WR_w  = Σ w(p) pour les victoires / W
KDA_w = min( (Σ w·K + Σ w·A) / max(Σ w·D, 1), 8.0 )
```

**3. Rôle dominant.** Rôle le plus fréquent parmi les performances. En cas
d'égalité, celui rencontré en premier.

**4. Fiabilité** : régression vers la médiane du rôle dominant.

```
f        = min(n / 15, 1)
KDA_f    = KDA_w × f + KDAmédian × (1 − f)
WR_f     = WR_w  × f + WRmédian  × (1 − f)
```

**5. Scores intermédiaires (non arrondis).**

```
scoreKDA = KDA_f / KDAmédian × 60
scoreWR  = 60 + (WR_f − WRmédian) × 78
```

**6. Sous-notes.**

```
impact      = clamp(round(scoreKDA), 0, 99)
consistance = clamp(round(scoreWR), 0, 99)
clutch      = clamp(round(scoreKDA × 0,5 + scoreWR × 0,5), 0, 99)
```

⚠️ Le clutch utilise les scores **non arrondis**, la note utilise les
sous-notes **arrondies**.

**7. Note.**

```
note = clamp(round(impact × 0,35 + consistance × 0,35 + clutch × 0,30), 60, 99)
```

**8. Palier.** Élite ≥ 90 · Or ≥ 80 · Argent ≥ 70 · Bronze sinon.

**9. Forme récente.** Sur les 3 dernières performances : 2 ou 3 victoires →
`up`, 0 → `down`, sinon `stable`.

## Exemples réels (Saison 3, Split 1)

Statistiques réelles, joueurs anonymisés (le dépôt est public, voir
[ADR 0006](../adr/0006-tdd-et-golden-master.md)).

Toutes les éditions de ce split ont le prestige `championship` (×1,6). Comme le
poids est le même pour chaque match, les stats pondérées sont égales aux stats
brutes.

### Exemple A : peu de parties, la fiabilité joue (joueur A)

5 parties en JGL, 4 victoires, 19 / 8 / 44.

| Étape       | Calcul                                  | Résultat    |
| ----------- | --------------------------------------- | ----------- |
| KDA_w       | (19 + 44) / 8 = 7,875 (sous le plafond) | 7,875       |
| f           | 5 / 15                                  | 0,3333      |
| KDA_f       | 7,875 × ⅓ + 3,0 × ⅔                     | 4,625       |
| WR_f        | 0,8 × ⅓ + 0,5 × ⅔                       | 0,6         |
| scoreKDA    | 4,625 / 3,0 × 60                        | 92,5        |
| scoreWR     | 60 + 0,1 × 78                           | 67,8        |
| impact      | round(92,5)                             | **93**      |
| consistance | round(67,8)                             | **68**      |
| clutch      | round(46,25 + 33,9) = round(80,15)      | **80**      |
| note        | round(32,55 + 23,8 + 24) = round(80,35) | **80 — Or** |

Sans la fiabilité, un KDA de 7,9 sur 5 parties donnerait une note Élite.

### Exemple B : régime établi, plafond de l'impact (joueur B)

24 parties en JGL, 19 victoires, 165 / 74 / 219.

| Étape       | Calcul                                    | Résultat       |
| ----------- | ----------------------------------------- | -------------- |
| KDA_w       | 384 / 74                                  | 5,189          |
| f           | min(24 / 15, 1)                           | 1              |
| scoreKDA    | 5,189 / 3,0 × 60                          | 103,78         |
| scoreWR     | 60 + (0,7917 − 0,5) × 78                  | 82,75          |
| impact      | round(103,78) → plafond                   | **99**         |
| consistance | round(82,75)                              | **83**         |
| clutch      | round(51,89 + 41,375) = round(93,27)      | **93**         |
| note        | round(34,65 + 29,05 + 27,9) = round(91,6) | **92 — Élite** |

### Autres valeurs de référence (même split)

| Joueur   | Rôle · parties | V   | K/D/A      | Impact | Cons. | Clutch | Note              |
| -------- | -------------- | --- | ---------- | ------ | ----- | ------ | ----------------- |
| Joueur C | TOP · 25       | 18  | 115/61/173 | 99     | 77    | 95     | 90                |
| Joueur D | SUP · 20       | 11  | 29/54/305  | 93     | 64    | 78     | 78                |
| Joueur E | JGL · 5        | 4   | 23/22/56   | 64     | 68    | 66     | 66                |
| Joueur F | JGL · 3        | 1   | 17/29/24   | 54     | 57    | 56     | **60** (plancher) |

## Classement

Tri par note décroissante, puis départage dans cet ordre :

1. winrate affiché (décroissant)
2. KDA affiché (décroissant)
3. nombre de parties (décroissant)
4. pseudo (ordre alphabétique)

## Classement de soirée (système distinct)

Points d'un joueur sur une édition, selon le barème de l'édition :

```
points = victoires × win + défaites × loss
       + kills × kill + assists × assist + morts × death
       + MVP de match × mvpMatch + (MVP de soirée ? mvpSoiree : 0)
```

Barème officiel par défaut : win **+5**, loss **−3**, kill **+3**, assist **+2**,
death **−3**, mvpSoiree **+10**, mvpMatch **0**.

Départage : points, puis kills (décroissants), puis pseudo (alphabétique).

## Anomalies connues de la v1

Le golden master les reproduit. Les corriger est une décision produit
([questions ouvertes](../open-questions.md)).

| #   | Anomalie                                                                           | Effet observé                                                                                            |
| --- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A1  | Le prestige est saisi à la main pour chaque édition                                | La Div 2 était `premium` en S1–S2 et `championship` en S3 : une même performance vaut plus selon l'année |
| A2  | Le plancher à 60 écrase le bas du classement                                       | Le joueur F (sous-notes ~55,6) et un joueur à ~50 affichent tous deux 60                                 |
| A3  | L'impact sature vite (KDA fiabilisé ≥ ~1,64 × médiane → 99)                        | Les 3 premiers du split ont tous 99 d'impact : la sous-note ne les départage plus                        |
| A4  | Arrondis mélangés (clutch non arrondi, note arrondie)                              | Écarts de ±1 selon l'implémentation : à reproduire exactement                                            |
| A5  | Forme récente prise dans l'ordre de stockage des matchs, pas l'ordre chronologique | Peut être fausse si les éditions ne sont pas stockées par date                                           |
| A6  | Égalité de rôle dominant tranchée par ordre de rencontre                           | Résultat dépendant de l'ordre des données                                                                |
| A7  | Identité par pseudo normalisé                                                      | Un joueur sans tag dont le pseudo commence par 2 à 4 majuscules (« KGB Fan ») est mal découpé            |
