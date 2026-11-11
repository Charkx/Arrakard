# 0011 — Livrer par tranches, la lecture d'abord

- **Statut** : Accepté
- **Date** : 2026-11-11

## Contexte

La feuille de route prévoyait tout le serveur (phase 3), puis tout le site
(phase 4), puis une bascule en une fois (phase 5). Jusqu'à la bascule, la
communauté ne voit rien de la v2, et le jour de la bascule concentre tous les
risques.

Deux faits permettent de faire autrement :

- la migration v1 → v2 est **rejouable** et vérifiée contre la v1
  ([spécification](../domain/migration-spec.md)) ;
- la v1 reste en production, et les admins savent s'en servir.

## Décision

La v2 se livre en **trois tranches**, chacune mise en ligne :

1. **Lecture** : un site public en lecture seule (classement, cartes, profils,
   éditions), à sa propre adresse, nourri par la migration rejouée depuis une
   sauvegarde de la v1. Les admins continuent d'écrire dans la v1.
2. **Soirée** : les outils d'écriture (import, corrections, publication,
   inscriptions, personnalisation). À la fin de cette tranche, une dernière
   migration, les admins passent sur la v2 et la v1 est archivée : c'est la
   bascule.
3. **Histoire** : le reste, dans l'ordre que la communauté demande.

Le contenu de chaque tranche est dans les
[cas d'usage](../product/use-cases.md). Ces tranches remplacent les phases 3,
4 et 5.

## Options écartées

- **Tout le serveur, puis tout le site** (plan d'origine) : rien de visible
  avant des mois, et les défauts d'assemblage entre la base, le domaine et les
  pages n'apparaissent qu'à la fin.
- **Écrire dans la v1 et la v2 en même temps** : deux sources de vérité, ce
  que l'[ADR 0002](0002-supabase-source-de-verite.md) interdit.

## Conséquences

- La communauté voit la v2 tôt. Chaque tranche traverse toutes les couches,
  de la base à la page.
- Tant que la v2 est en lecture seule, elle ne contient aucune écriture qui
  lui soit propre : on peut la vider et la recharger sans rien perdre. La
  migration doit donc tourner de bout en bout, sans intervention manuelle, dès
  la tranche 1.
- Recharger la base en ligne touche des données réelles : c'est Charly qui le
  fait, pas l'agent ([contribuer](../contributing.md#travailler-avec-un-agent)).
- Deux sites sont en ligne en même temps et peuvent afficher des chiffres
  différents pour un même joueur (anomalies M9 de la migration et A6 de la
  note). C'est à annoncer ; la v2 explique ses notes (cas d'usage V10).
- Le squelette des commandes ([ADR 0005](0005-ecritures-par-commandes.md),
  [ADR 0009](0009-serialiser-et-journaliser-les-commandes.md)) n'est construit
  qu'en tranche 2. En tranche 1, seule la migration écrit, avec le même
  recalcul des projections.
- La personnalisation des cartes et les inscriptions restent dans la v1
  jusqu'à la bascule.
