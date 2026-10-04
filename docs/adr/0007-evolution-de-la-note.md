# 0007 — Faire évoluer la note par étapes isolées

- **Statut** : Accepté
- **Date** : 2026-10-04

## Contexte

La note est ce que la communauté regarde en premier. La formule v1 a des
défauts connus ([anomalies](../domain/rating-spec.md#anomalies-connues-de-la-v1)),
et un prototype plus riche existe (Rating Lab). Deux décisions produit ont été
prises :

- le prestige doit découler du **type d'édition**, et non plus d'une saisie
  libre (anomalie A1) ;
- les soirées **In House** ne comptent plus dans la note de carte. Elles
  alimentent le classement de soirée et les badges.

Changer plusieurs règles en même temps qu'on réécrit le moteur rendrait
impossible de savoir d'où vient un écart de note.

## Décision

1. **La v2 démarre avec la formule v1 à l'identique**, validée par le golden
   master ([ADR 0006](0006-tdd-et-golden-master.md)).
2. Ensuite, chaque évolution est **une étape isolée** : une PR, des tests qui
   décrivent le nouveau comportement, une mise à jour de la
   [spec](../domain/rating-spec.md), et un tableau avant/après des notes
   publié à la communauté.
3. Évolutions planifiées, dans cet ordre :

| #   | Évolution                                                                                   | Anomalie corrigée |
| --- | ------------------------------------------------------------------------------------------- | ----------------- |
| E1  | Multiplicateur déduit du type d'édition ; exception possible avec justification enregistrée | A1                |
| E2  | Matchs In House exclus du calcul de la note                                                 | —                 |

D'autres évolutions (plancher, saturation de l'impact, formule du Rating Lab)
feront l'objet de leurs propres ADR.

Le golden master reste dans le dépôt après E1 et E2 : il documente la v1, et
le test vérifie que, **sans** les évolutions activées, le moteur reproduit
toujours la v1.

## Options écartées

- **Tout changer pendant la réécriture** : un écart de note ne pourrait plus
  être attribué à une cause précise.
- **Rester sur la v1 indéfiniment** : laisse en place des incohérences
  visibles par la communauté.

## Conséquences

- Chaque évolution est réversible et explicable (« ta note a baissé de 2
  points parce que… »).
- Le moteur doit accepter ses règles en paramètre (`RatingRules`) plutôt que
  de les coder en dur. La v1 est alors un jeu de règles parmi d'autres.
- Les multiplicateurs par type restent à fixer
  ([Q2 bis](../open-questions.md)).
