# 0006 — TDD et golden master avant toute réécriture

- **Statut** : Accepté
- **Date** : 2026-10-03

## Contexte

La v1 a 73 tests, tous sur des fonctions pures. Les erreurs de lint ne
bloquaient pas la CI : c'est ainsi qu'un appel conditionnel de hooks React,
qui fait planter des pages en production, est passé.

Réécrire le moteur de note fait courir un risque précis : **changer
silencieusement la note des 260 joueurs** de la communauté.

## Décision

**1. Golden master d'abord.** Avant d'écrire le moteur v2, on extrait de la
production v1 :

- toutes les données de matchs ;
- pour chaque joueur, les notes et sous-notes calculées par le code v1.

Ces paires (entrée, sortie attendue) forment un test : le moteur v2 doit les
reproduire **exactement**. Chaque écart doit être voulu, et justifié par un
ADR.

**2. TDD strict sur le domaine.** Cycle rouge → vert → refactor. Aucun code de
`packages/domain` sans un test qui échouait avant.

**3. Pyramide de tests.**

| Niveau       | Outil                      | Cible                               |
| ------------ | -------------------------- | ----------------------------------- |
| Domaine      | Vitest                     | ~70 % des tests ; couverture ≥ 95 % |
| Commandes    | Vitest + dépôts en mémoire | Scénarios métier complets           |
| Intégration  | Supabase local + pgTAP     | RLS, contraintes, commandes réelles |
| Bout en bout | Playwright                 | 3 à 4 parcours critiques            |

**4. CI bloquante dès le premier commit** : lint (zéro erreur), `tsc --strict`,
tests, seuil de couverture du domaine.

## Options écartées

- **Tests après le code** : en pratique, ils ne couvrent que le chemin
  heureux. La v1 en est l'illustration.
- **Réécrire la formule « au propre » directement** : impossible de
  distinguer une amélioration d'une régression.

## Conséquences

- Les débuts sont plus lents ; les refactorings ultérieurs deviennent sûrs.
- Les données de production extraites ne sont **jamais commitées** (voir
  `.gitignore`). Seuls des jeux anonymisés ou réduits peuvent l'être.
- Les anomalies v1 ([spec, § anomalies](../domain/rating-spec.md#anomalies-connues-de-la-v1))
  sont d'abord reproduites, puis corrigées une par une, chacune avec son test.
