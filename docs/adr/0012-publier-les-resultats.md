# 0012 — Publier les résultats : brouillon, aperçu, récap

- **Statut** : Accepté
- **Date** : 2026-11-11

## Contexte

En v1, un résultat est public dès qu'il est saisi. Une édition à moitié
saisie est donc visible, et l'admin ne découvre l'effet d'un import sur les
notes qu'après coup.

Les joueurs, eux, viennent surtout après une édition, pour voir ce qui a
bougé. Rien dans le modèle ne marque ce moment : on ne sait pas dire « voici
ce que la soirée d'hier a changé ».

## Décision

1. Un résultat saisi ou importé est d'abord un **brouillon** : enregistré,
   mais ignoré par les projections et invisible du public.
2. Une commande **publie** les brouillons d'une édition. Chaque
   **publication** est un fait : quelle édition, quels matchs, quand, par qui.
3. Avant de publier, l'admin lit un **aperçu** : ce que la publication
   changera (notes, paliers, classement, badges).
4. Après chaque publication, le **récap** dit à tous ce qui a changé.

L'aperçu, le récap et l'historique de note sont des **projections** : la
différence entre l'état avant et l'état après une publication, calculée par
une fonction pure du domaine
([ADR 0003](0003-faits-et-projections.md)).

## Options écartées

- **Public dès la saisie** (v1) : pas de filet pour l'admin, pas de moment à
  raconter.
- **Un import « à blanc » sans brouillon enregistré** : ne couvre pas une
  édition saisie en plusieurs fois, et l'aperçu serait perdu en fermant la
  page.
- **Garder une copie des notes à chaque publication** : ce serait stocker une
  projection comme un fait. La copie deviendrait fausse à la première
  correction d'un match.

## Conséquences

- Le récap (V11), l'historique de note (V3, V10), l'aperçu (A11) et l'annonce
  Discord (S3) reposent sur le même calcul.
- Corriger un match déjà publié reste une commande à effet immédiat,
  journalisée ([ADR 0009](0009-serialiser-et-journaliser-les-commandes.md)).
  Le récap concerné change alors, puisqu'il se recalcule. Le message Discord
  déjà envoyé, lui, ne change pas.
- Le domaine doit savoir calculer l'état « à la date d'une publication ». À
  ~400 matchs, on recalcule tout à chaque fois ; le seuil de réexamen reste
  2 secondes ([vision](../product/vision.md#volumétrie)).
- Le schéma gagne les publications et le lien entre un match et sa
  publication. La migration crée les publications des éditions de la v1, au
  grain le plus fin que ses données permettent.
- Le statut d'une édition se déduit en partie des publications
  ([ADR 0013](0013-statut-d-edition-deduit.md)).
