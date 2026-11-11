# Arrakis

Plateforme de la communauté esport **Arrakis** (League of Legends) : cartes
joueurs façon FUT, classements, pages d'événements, inscriptions et
administration des résultats.

> **Statut : tranche 1 en préparation (lecture).** Le domaine est terminé : les
> règles métier sont écrites en TDD dans `packages/domain` et validées contre
> la production v1 (golden master). Côté serveur, le schéma initial et ses
> droits d'accès sont testés en pgTAP, et la migration v1 → v2 est planifiée
> et vérifiée (`packages/migrate-v1`). Prochaine étape : mettre en ligne un
> site en lecture seule, nourri par la migration.
> L'ancienne version (`arrakis-cards`) reste en production : les admins y
> écrivent jusqu'à la bascule.

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
| [Cas d'usage](docs/product/use-cases.md)                | Savoir ce que le système doit faire, par tranche          |
| [Glossaire](docs/domain/glossary.md)                    | **À lire en premier.** Un mot = une définition, FR ↔ code |
| [Spécification de la note](docs/domain/rating-spec.md)  | Formule exacte, exemples chiffrés, cas limites            |
| [Spécification de l'import](docs/domain/import-spec.md) | Format de la feuille Excel et règles de lecture           |
| [Modèle C4](docs/architecture/c4.md)                    | Contexte, conteneurs, composants, code                    |
| [Modèle de données](docs/architecture/data-model.md)    | MCD Merise et MLD                                         |
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

## Le domaine (`packages/domain`)

| Module           | Rôle                                                        | Cas d'usage |
| ---------------- | ----------------------------------------------------------- | ----------- |
| `rating/`        | Note, sous-notes, palier ; règles v1 et E1 + E2             | V1, V2      |
| `stats/`         | Statistiques affichées, forme récente                       | V2          |
| `leaderboard/`   | Classement du split, filtres, rang précédent                | V1          |
| `standings/`     | Classement de soirée au barème, classement MVP de saison    | V4, A8      |
| `identity/`      | Pseudos, tags, alias, résolution, fusion de profils         | A1, A5      |
| `import/`        | Lecture de la feuille Excel, analyse, plan d'import         | A1          |
| `projection/`    | `project(faits)` : recalcul complet des projections         | S1          |
| `golden-master/` | Preuve que le moteur reproduit la v1 sur les vraies données | —           |

## Feuille de route

Les phases 1 et 2 sont terminées. La suite se livre en trois tranches, chacune
mise en ligne ([ADR 0011](docs/adr/0011-livrer-par-tranches.md)). Elles
remplacent les anciennes phases 3 (backend), 4 (front) et 5 (bascule).

| Étape                   | Contenu                                                                                                            | Livrable                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **Phase 1. Cadrage**    | Vision, cas d'usage, glossaire, spec de note, ADR                                                                  | Cette documentation                                              |
| **Phase 2. Domaine**    | Monorepo, `packages/domain` en TDD, golden master v1                                                               | Moteur de calcul validé contre la prod                           |
| **Tranche 1. Lecture**  | Écriture des données migrées, pages publiques, explication de la note, design v1 réutilisé                         | Site v2 en ligne en lecture seule ; les admins restent sur la v1 |
| **Tranche 2. Soirée**   | Import, corrections, brouillon puis publication, récap, annonce Discord, connexion, inscriptions, personnalisation | Les admins passent sur la v2 ; v1 archivée (bascule)             |
| **Tranche 3. Histoire** | Album de saison, notes de patch, équipes d'In House proposées, fiche de match                                      | Dans l'ordre que la communauté demande                           |

Le détail de chaque tranche est dans les
[cas d'usage](docs/product/use-cases.md).
