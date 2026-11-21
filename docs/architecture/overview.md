# Vue d'architecture

Ce document montre les grands blocs et la circulation des données. Le _pourquoi_
de chaque choix est dans les [ADR](../adr/README.md).

## Diagrammes

- [Modèle C4](c4.md) : contexte, conteneurs, composants, code.
- [Modèle de données](data-model.md) : MCD Merise et MLD.

Ce document se concentre sur la circulation des données.

## Faits et projections

Le cœur du modèle ([ADR 0003](../adr/0003-faits-et-projections.md)).

```mermaid
flowchart LR
  subgraph Faits["Faits (écrits par les commandes)"]
    F1[saisons]
    F2[éditions, matchs, performances]
    F3[joueurs, alias, équipes, transferts]
    F4[personnalisation, inscriptions]
  end
  P{{"domain.project(faits)<br/>fonction pure"}}
  subgraph Projections["Projections (jetables)"]
    P1[notes par joueur et par saison]
    P2[historique par édition]
    P3[classements de soirée]
    P4[badges]
  end
  Faits --> P --> Projections
```

Schéma indicatif, à figer en tranche 1 :

| Faits                                               | Projections                                               |
| --------------------------------------------------- | --------------------------------------------------------- |
| `seasons` (dates, état)                             | `player_season_ratings` (note, sous-notes, palier, forme) |
| `editions` (avec `scoring`, `version`)              | `player_edition_history`                                  |
| `matches`, `performances` (`player_id` obligatoire) | `edition_standings`                                       |
| `players`, `player_aliases`                         | `player_badges`                                           |
| `teams`, `team_memberships` (datées)                |                                                           |
| `card_customizations`, `registrations`              |                                                           |
| `edition_participants` (événements externes)        |                                                           |

Règles :

- Les projections ne sont écrites **que** par le recalcul, dans la même
  transaction que la commande qui les a rendues obsolètes.
- Supprimer toutes les projections puis relancer le recalcul doit redonner
  exactement le même état (test automatique).
- Les instantanés de saison clôturée sont recalculés comme le reste. « Figé »
  signifie que la saison ne reçoit plus de nouveaux matchs, pas que la valeur
  est stockée à part.

## Chemin d'écriture : une commande

Trois couches ([ADR 0023](../adr/0023-ecritures-en-trois-couches.md)) : l'Edge Function est un adaptateur mince. `executeCommand`
(`packages/application`) enchaîne toujours les mêmes étapes, et ne parle à la
base qu'à travers des ports, que `packages/postgres` implémente.

```mermaid
sequenceDiagram
  participant UI as Admin (web)
  participant FN as Edge Function
  participant APP as executeCommand
  participant DOM as domain
  participant PG as Ports Postgres
  UI->>FN: importEdition(payload, expectedVersion) + JWT
  FN->>FN: utilisateur du JWT, valide le payload (contrats)
  FN->>APP: importEdition, entrée, acteur
  APP->>PG: BEGIN, verrou de l'organisation
  APP->>PG: l'acteur est-il admin ?
  APP->>PG: lit la version (sinon conflit)
  APP->>DOM: règles métier
  APP->>PG: écrit les faits, puis le journal
  APP->>PG: lit tous les faits et les règles de note
  APP->>DOM: project(faits)
  APP->>PG: remplace les projections
  APP->>PG: COMMIT (ROLLBACK si erreur)
  APP-->>FN: résumé, ou conflit
  FN-->>UI: 200 + résumé (409 si conflit)
```

En cas d'erreur à n'importe quelle étape : `ROLLBACK`, rien n'a changé.

## Chemin de lecture

Une vue SQL par besoin de page (`leaderboard_view`, `player_profile_view`,
`edition_page_view`…), exposée en lecture publique. La page ne télécharge
que ce qu'elle affiche. Pas de cache côté navigateur pour l'instant
([ADR 0019](../adr/0019-lire-la-base-depuis-le-site.md)).

## Structure du dépôt (cible)

```
arrakis/
├── apps/
│   └── web/                 Le site, rangé par fonctionnalité (classement, profil, édition…)
├── packages/
│   ├── domain/              Règles métier pures — zéro dépendance runtime
│   │   └── src/
│   │       ├── rating/      Note, sous-notes, palier, fiabilité
│   │       ├── standings/   Classement, classement de soirée
│   │       ├── identity/    Alias, résolution de pseudo, fusion
│   │       ├── import/      Analyse d'un import Excel (sans lire le fichier)
│   │       └── projection/  project(faits) → projections
│   ├── application/         Cas d'usage et ports (ADR 0023)
│   │   └── src/
│   │       ├── commands/    Une commande par fichier, avec son test
│   │       └── testing/     Ports en mémoire, jeu d'essai, suites de contrat
│   ├── postgres/            Transaction et entrepôts SQL : implémente les ports
│   ├── contracts/           Schémas Zod des entrées de commande
│   └── migrate-v1/          Migration depuis une sauvegarde de la v1
├── supabase/
│   ├── migrations/
│   ├── functions/           Une fonction par commande, mince (adaptateur HTTP)
│   └── tests/               pgTAP : RLS et contraintes
├── tools/
│   └── golden-master/       Extraction des données v1 et des notes attendues
└── docs/
```

### Où ranger un fichier

- **Par sujet, pas par type.** Le domaine se range par sujet métier
  (`rating/`, `identity/`), les commandes par commande, le site par
  fonctionnalité. On trouve un sujet à son nom.
- **Le test à côté de son code** : `close-edition.ts` et
  `close-edition.test.ts` dans le même dossier ; `*.db.test.ts` pour ceux qui
  ont besoin de la base locale.
- **Les outils de test dans `testing/`** du paquet qu'ils servent.

## Ce qui n'est pas encore décidé

- Le partage du package `domain` avec le runtime Deno des Edge Functions :
  à valider par un spike ([ADR 0005](../adr/0005-ecritures-par-commandes.md)).
- La formule de note v2 ([Q1](../open-questions.md)).
- Le schéma SQL exact (tranches 1 et 2).
