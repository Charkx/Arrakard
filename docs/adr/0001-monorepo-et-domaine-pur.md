# 0001 — Monorepo TypeScript avec un domaine pur

- **Statut** : Accepté
- **Date** : 2026-10-03

## Contexte

En v1, les règles métier (note, classement, fusion de joueurs) étaient
dispersées entre des hooks React, des composants et des repositories. La même
règle était parfois recalculée à plusieurs endroits, avec des écarts. Elles
étaient difficiles à tester, car mêlées à React et au stockage.

Les règles doivent tourner à deux endroits : dans les commandes côté serveur
(pour enregistrer) et dans le navigateur (pour prévisualiser un import).

## Décision

Un seul dépôt avec des workspaces **pnpm** :

- `packages/domain` : règles métier en TypeScript **pur**, sans dépendance
  runtime, sans I/O, sans date courante implicite (l'heure est passée en
  paramètre). Entrées et sorties sont des données simples.
- `packages/contracts` : schémas **Zod** des commandes et des vues, partagés
  entre le web et les fonctions.
- `apps/web` et `supabase/` consomment ces packages.

TypeScript en mode `strict` partout. Identifiants de code en anglais,
documentation en français (correspondance dans le [glossaire](../domain/glossary.md)).

## Options écartées

- **Dépôt unique sans packages** (comme la v1) : rien n'empêche le domaine
  d'importer React ou Supabase, la frontière s'érode.
- **Logique métier en PL/pgSQL** : atomique et proche des données, mais
  difficile à tester en TDD et peu lisible pour la communauté.
- **npm workspaces** : fonctionne, mais pnpm est plus strict sur les
  dépendances fantômes, ce qui protège la règle « zéro dépendance ».

## Conséquences

- Le domaine se teste en millisecondes, sans base ni navigateur.
- Une règle métier n'a qu'un seul emplacement possible.
- Un outillage de plus à apprendre (workspaces pnpm).
- Une règle de lint (`no-restricted-imports`) interdit à `domain` d'importer
  autre chose que lui-même.
