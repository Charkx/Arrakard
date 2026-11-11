# 0016 — Ne reprendre de la v1 que ce qui sert

- **Statut** : Accepté
- **Date** : 2026-11-11

## Contexte

La v2 visait la « parité fonctionnelle » avec la v1. Or la v1 a grandi par
ajouts successifs : trois pages listent les mêmes cartes, quatre pages de
laboratoire sont en ligne, des champs ne servent presque plus. Tout refaire à
l'identique coûterait des mois sans rien apporter à la communauté.

## Décision

La v2 **ne vise plus la parité** avec la v1. Elle ne reprend que ce qui sert
la [vision](../product/vision.md).

À la date de cet ADR, cette règle écarte quatre éléments :

| Élément de la v1                                      | Ce qu'il devient                            | Pourquoi                                                                                    |
| ----------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Bio libre des cartes (Q11)                            | Non reprise                                 | 9 joueurs en ont une ; le titre et les badges de la carte jouent ce rôle                    |
| Composition des équipes d'In House, `ih_teams` (Q13)  | Non migrée                                  | Ces équipes n'existent que le temps d'une soirée ; chaque performance porte déjà son équipe |
| Pages de laboratoire (Q7)                             | Non reprises                                | Leurs idées deviennent des cas d'usage (V7, V13, A13) ou disparaissent                      |
| Trois listes de cartes (galerie, joueurs, ArrakisDex) | Une galerie (V6) et un album de saison (V8) | Trois pages montraient la même chose                                                        |

Elle garde en revanche l'interface en français et en anglais (Q6), malgré
son coût sur chaque texte : une bonne partie de la communauté est anglophone.

## Options écartées

- **La parité complète** : refaire ce qui ne sert pas, et retarder ce qui est
  neuf.
- **Décider au cas par cas, sans trace** : un contributeur se demanderait où
  est passée telle page ou telle donnée.
- **Abandonner l'anglais** : moins de textes à tenir à jour, mais le site
  deviendrait illisible pour une partie de ses membres.

## Conséquences

- Moins de pages et de données à construire, à tester et à migrer.
- Rien n'est perdu : ce qui n'est pas migré reste dans la sauvegarde de la
  v1, et le rapport de migration liste ce qu'il écarte.
- Un retrait décidé plus tard ne s'ajoute pas à cet ADR : il s'écrit dans les
  [questions ouvertes](../open-questions.md) ou dans son propre ADR, comme la
  suppression des splits ([ADR 0014](0014-une-seule-periode-la-saison.md)).
- Chaque texte du site existe en deux langues. La façon de le faire se décide
  à l'ouverture du site, dans son propre ADR.
- Les résultats de tournoi sans match restent une question ouverte (Q10).
