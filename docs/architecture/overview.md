# Vue d'architecture

Ce document montre les grands blocs et la circulation des données. Le _pourquoi_
de chaque choix est dans les [ADR](../adr/README.md).

## Contexte (C4 niveau 1)

```mermaid
flowchart LR
  V[Visiteur] -->|consulte| A
  J[Joueur] -->|personnalise sa carte, s'inscrit| A
  AD[Admin] -->|importe, corrige, gère les splits| A
  A[Arrakis]
  A -->|OAuth, rôles du serveur| D[Discord]
  A -->|notifications| D
  A -->|statut en direct| T[Twitch]
  A -->|icônes champions| R[Riot Data Dragon]
```

## Conteneurs (C4 niveau 2)

```mermaid
flowchart TB
  subgraph Vercel
    WEB[apps/web<br/>React + Vite<br/>lecture seule + envoi de commandes]
  end
  subgraph Supabase
    AUTH[Auth<br/>Discord OAuth]
    REST[PostgREST<br/>vues de lecture publiques]
    FN[Edge Functions<br/>commandes métier]
    DB[(Postgres<br/>faits + projections<br/>RLS)]
  end
  DOM[[packages/domain<br/>TypeScript pur]]

  WEB -->|login| AUTH
  WEB -->|GET vues par page| REST --> DB
  WEB -->|POST commande + JWT| FN
  FN -->|transaction SQL| DB
  DOM -. importé par .-> FN
  DOM -. importé par .-> WEB
```

Le domaine est importé côté web uniquement pour l'**affichage** (aperçu d'un
import avant validation, par exemple). Il n'y produit jamais une valeur
enregistrée.

## Faits et projections

Le cœur du modèle ([ADR 0003](../adr/0003-faits-et-projections.md)).

```mermaid
flowchart LR
  subgraph Faits["Faits (écrits par les commandes)"]
    F1[saisons, splits]
    F2[éditions, matchs, performances]
    F3[joueurs, alias, équipes, transferts]
    F4[personnalisation, inscriptions]
  end
  P{{"domain.project(faits)<br/>fonction pure"}}
  subgraph Projections["Projections (jetables)"]
    P1[notes par joueur et par split]
    P2[historique par édition]
    P3[classements de soirée]
    P4[badges]
  end
  Faits --> P --> Projections
```

Schéma indicatif, à figer en phase 3 :

| Faits                                               | Projections                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `seasons`, `splits`                                 | `player_split_ratings` (note, sous-notes, palier, forme ; `is_final` après clôture) |
| `editions` (avec `scoring`, `version`)              | `player_edition_history`                                                            |
| `matches`, `performances` (`player_id` obligatoire) | `edition_standings`                                                                 |
| `players`, `player_aliases`                         | `player_badges`                                                                     |
| `teams`, `team_memberships` (datées)                |                                                                                     |
| `card_customizations`, `registrations`              |                                                                                     |
| `edition_participants` (événements externes)        |                                                                                     |

Règles :

- Les projections ne sont écrites **que** par le recalcul, dans la même
  transaction que la commande qui les a rendues obsolètes.
- Supprimer toutes les projections puis relancer le recalcul doit redonner
  exactement le même état (test automatique).
- Les instantanés de split clos sont recalculés comme le reste. « Figé »
  signifie que le split ne reçoit plus de nouveaux matchs, pas que la valeur
  est stockée à part.

## Chemin d'écriture : une commande

```mermaid
sequenceDiagram
  participant UI as Admin (web)
  participant FN as Edge Function
  participant DOM as domain
  participant DB as Postgres
  UI->>FN: importEdition(payload, expectedVersion) + JWT
  FN->>FN: vérifie JWT et rôle admin
  FN->>DOM: valide le payload (schéma + règles)
  FN->>DB: BEGIN
  FN->>DB: contrôle version (sinon 409 Conflict)
  FN->>DB: écrit les faits
  FN->>DB: lit tous les faits
  FN->>DOM: project(faits)
  FN->>DB: remplace les projections
  FN->>DB: COMMIT
  FN-->>UI: 200 + résumé
```

En cas d'erreur à n'importe quelle étape : `ROLLBACK`, rien n'a changé.

## Chemin de lecture

Une vue SQL par besoin de page (`leaderboard_view`, `player_profile_view`,
`edition_page_view`…), exposée en lecture publique. La page ne télécharge
que ce qu'elle affiche. Le cache côté navigateur est géré par TanStack Query.

## Structure du dépôt (cible)

```
arrakis/
├── apps/
│   └── web/                 React, pages, composants (design repris de la v1)
├── packages/
│   ├── domain/              Règles métier pures — zéro dépendance runtime
│   │   └── src/
│   │       ├── rating/      Note, sous-notes, palier, fiabilité
│   │       ├── standings/   Classement, classement de soirée
│   │       ├── identity/    Alias, résolution de pseudo, fusion
│   │       ├── import/      Analyse d'un import Excel (sans lire le fichier)
│   │       └── projection/  project(faits) → projections
│   └── contracts/           Schémas Zod des commandes et des vues
├── supabase/
│   ├── migrations/
│   ├── functions/           Une fonction par commande
│   └── tests/               pgTAP : RLS et contraintes
├── tools/
│   └── golden-master/       Extraction des données v1 et des notes attendues
└── docs/
```

## Ce qui n'est pas encore décidé

- Le partage du package `domain` avec le runtime Deno des Edge Functions :
  à valider par un spike ([ADR 0005](../adr/0005-ecritures-par-commandes.md)).
- La formule de note v2 ([Q1](../open-questions.md)).
- Le schéma SQL exact (phase 3).
