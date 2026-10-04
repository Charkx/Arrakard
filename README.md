# Arrakis

Plateforme de la communauté esport **Arrakis** (League of Legends) : cartes
joueurs façon FUT, classements, pages d'événements, inscriptions et
administration des résultats.

> **Statut : phase 1 — cadrage.** Ce dépôt ne contient encore que de la
> documentation. Le code arrive en phase 2, écrit en TDD.
> L'ancienne version (`arrakis-cards`) reste en production et sert de
> référence fonctionnelle.

## Pourquoi une v2

La v1 a été construite comme un prototype local (`localStorage`) puis branchée
sur Supabase. Elle fonctionne, mais l'audit d'octobre 2026 a montré que ses
problèmes graves ont une seule racine : **les données saisies et les données
calculées sont mélangées**. Conséquences : historique non sauvegardé, chaque
modification réécrit toute la base, notes calculées dans le navigateur de
l'admin, joueurs identifiés par leur pseudo.

La v2 repart d'un modèle propre, garde Supabase, et réutilise l'identité
visuelle de la v1.

## Principes

1. **Les faits sont la vérité, tout le reste se recalcule.** Une note, un
   classement, un historique sont des projections reconstructibles à tout
   moment depuis les matchs ([ADR 0003](docs/adr/0003-faits-et-projections.md)).
2. **Le serveur décide.** Le navigateur affiche et envoie des commandes ; il
   ne calcule jamais une valeur qu'il enregistre ensuite.
3. **Le domaine est pur.** Les règles métier (notation, classement, identité)
   vivent dans un package TypeScript sans dépendance, couvert par TDD.
4. **Chaque décision structurante est écrite** dans un ADR, avec son
   _pourquoi_.
5. **Simple tant que les chiffres le permettent.** ~400 matchs et 260
   joueurs : pas de microservices, pas de cache, pas d'incrémental
   ([vision](docs/product/vision.md#volumétrie)).

## Documentation

| Document                                                | Pour qui / quand                                          |
| ------------------------------------------------------- | --------------------------------------------------------- |
| [Vision et périmètre](docs/product/vision.md)           | Comprendre le produit, ses acteurs, ses contraintes       |
| [Cas d'usage](docs/product/use-cases.md)                | Savoir ce que le système doit faire, par priorité         |
| [Glossaire](docs/domain/glossary.md)                    | **À lire en premier.** Un mot = une définition, FR ↔ code |
| [Spécification de la note](docs/domain/rating-spec.md)  | Formule exacte, exemples chiffrés, cas limites            |
| [Spécification de l'import](docs/domain/import-spec.md) | Format de la feuille Excel et règles de lecture           |
| [Vue d'architecture](docs/architecture/overview.md)     | Les blocs du système et comment les données circulent     |
| [Décisions (ADR)](docs/adr/README.md)                   | Pourquoi l'architecture est ce qu'elle est                |
| [Contribuer](docs/contributing.md)                      | Workflow TDD, conventions, définition de « terminé »      |
| [Questions ouvertes](docs/open-questions.md)            | Décisions produit en attente                              |

## Démarrer

Prérequis : Node 24 (`.nvmrc`). pnpm est fourni par Corepack.

```bash
corepack enable        # une seule fois par machine : rend `pnpm` disponible
pnpm install
pnpm check             # lint + format + types + tests avec couverture (= la CI)
```

Pendant le TDD : `pnpm --filter @arrakis/domain test:watch`.

## Feuille de route

| Phase          | Contenu                                                                 | Livrable                               |
| -------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| **1. Cadrage** | Vision, cas d'usage, glossaire, spec de note, ADR                       | Cette documentation                    |
| **2. Domaine** | Monorepo, `packages/domain` en TDD, golden master v1                    | Moteur de calcul validé contre la prod |
| **3. Backend** | Schéma faits/projections, commandes, RLS testées, migration des données | Supabase de staging rempli             |
| **4. Front**   | Pages en lecture sur les vues, admin par commandes, design v1 réutilisé | Site complet en staging                |
| **5. Bascule** | Migration à blanc, comparaison, mise en production                      | v2 en prod, v1 archivée                |
