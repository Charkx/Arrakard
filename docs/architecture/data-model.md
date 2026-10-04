# Modèle de données (Merise)

Ce document suit la démarche Merise, en deux niveaux :

1. **MCD** (modèle conceptuel de données) : les entités du métier, leurs
   associations et leurs cardinalités, indépendamment de toute base de données.
2. **MLD** (modèle logique de données) : sa traduction en tables relationnelles,
   telle qu'implémentée dans
   [la migration initiale](../../supabase/migrations/20261005000000_initial_schema.sql).

Les termes suivent le [glossaire](../domain/glossary.md).

## MCD

### Conventions

- **Rectangle** : entité. L'identifiant est souligné.
- **Ovale** : association, avec ses éventuelles propriétés.
- **Cardinalités `min,max`** sur chaque patte : combien de fois une occurrence
  de l'entité participe à l'association. Exemple : un match est contenu dans
  `1,1` édition ; une édition contient `0,n` matchs.
- **`(R)`** : identification relative. L'entité n'est identifiable qu'à travers
  l'entité à laquelle elle est rattachée.

Les **données calculées** (notes, historiques, classements) ne figurent pas
dans un MCD : ce sont des projections, recalculées à partir des faits
([ADR 0003](../adr/0003-faits-et-projections.md)). Elles sont décrites plus
bas, dans le MLD.

Le MCD est présenté en deux vues pour rester lisible. Les entités `JOUEUR` et
`ÉDITION` apparaissent dans les deux.

### Vue 1 : la compétition

```mermaid
flowchart LR
  classDef entity fill:#fff,stroke:#333,stroke-width:2px,color:#000
  classDef assoc fill:#f5f5f5,stroke:#666,color:#000

  ORG["<b>ORGANISATION</b><hr/><u>id</u><br/>slug<br/>nom<br/>règles de note<br/>serveur Discord<br/>rôle admin Discord"]:::entity
  SAISON["<b>SAISON</b><hr/><u>id</u><br/>nom<br/>année"]:::entity
  SPLIT["<b>SPLIT</b><hr/><u>id</u><br/>numéro<br/>nom<br/>début, fin<br/>statut"]:::entity
  EDITION["<b>ÉDITION</b><hr/><u>id</u><br/>nom, type, date<br/>prestige<br/>multiplicateur exceptionnel<br/>justification<br/>barème<br/>numéro d'affichage<br/>lieu, lien, description<br/>version"]:::entity
  MATCH["<b>MATCH</b><hr/><u>id</u><br/>numéro<br/>équipe gagnante<br/>durée<br/>journée<br/>finale"]:::entity
  JOUEUR["<b>JOUEUR</b><hr/><u>id</u><br/>pseudo<br/>archivé"]:::entity

  organiser(["ORGANISER"]):::assoc
  accueillir(["PROGRAMMER"]):::assoc
  composer(["COMPOSER"]):::assoc
  rattacher(["RATTACHER"]):::assoc
  contenir(["CONTENIR"]):::assoc
  jouer(["JOUER<hr/>ligne, côté<br/>équipe, rôle, champion<br/>résultat<br/>kills, morts, assists<br/>or"]):::assoc
  mvpMatch(["ÊTRE MVP<br/>DU MATCH"]):::assoc
  mvpEdition(["ÊTRE MVP<br/>DE SOIRÉE"]):::assoc
  participer(["PARTICIPER<br/>(événement externe)"]):::assoc

  ORG ---|"0,n"| organiser ---|"1,1"| SAISON
  ORG ---|"0,n"| accueillir ---|"1,1"| EDITION
  SAISON ---|"0,n"| composer ---|"1,1"| SPLIT
  SPLIT ---|"0,n"| rattacher ---|"0,1"| EDITION
  EDITION ---|"0,n"| contenir ---|"1,1"| MATCH
  MATCH ---|"1,10"| jouer ---|"0,n"| JOUEUR
  MATCH ---|"0,1"| mvpMatch ---|"0,n"| JOUEUR
  EDITION ---|"0,1"| mvpEdition ---|"0,n"| JOUEUR
  EDITION ---|"0,n"| participer ---|"0,n"| JOUEUR
```

À lire, par exemple :

- Un match fait jouer **de 1 à 10** joueurs (5 rôles × 2 équipes) ; un joueur
  joue **0 à n** matchs. Les statistiques du joueur sont des **propriétés de
  l'association** JOUER : elles n'appartiennent ni au joueur ni au match seuls.
- Une édition est rattachée à **0 ou 1** split : un événement externe peut
  n'appartenir à aucun split.

### Vue 2 : les personnes et les équipes

```mermaid
flowchart LR
  classDef entity fill:#fff,stroke:#333,stroke-width:2px,color:#000
  classDef assoc fill:#f5f5f5,stroke:#666,color:#000

  ORG["<b>ORGANISATION</b><hr/><u>id</u><br/>slug<br/>nom"]:::entity
  USER["<b>UTILISATEUR</b><hr/><u>id</u><br/>identifiant Discord"]:::entity
  JOUEUR["<b>JOUEUR</b><hr/><u>id</u><br/>pseudo<br/>archivé"]:::entity
  ALIAS["<b>ALIAS</b><hr/><u>graphie</u>"]:::entity
  EQUIPE["<b>ÉQUIPE</b><hr/><u>id</u><br/>tag<br/>nom<br/>divisions<br/>logo<br/>archivée le"]:::entity
  PERSO["<b>PERSONNALISATION</b><hr/>titre<br/>badges affichés<br/>fond<br/>comptes Riot"]:::entity
  INSCRIPTION["<b>INSCRIPTION</b><hr/><u>id</u><br/>identifiant Discord<br/>pseudo<br/>rôle, rôle secondaire<br/>rang, OP.GG<br/>compte secondaire<br/>parle anglais"]:::entity
  EDITION["<b>ÉDITION</b><hr/><u>id</u><br/>…"]:::entity

  adherer(["ADHÉRER<hr/>rôle (admin, membre)"]):::assoc
  recruter(["RECRUTER"]):::assoc
  engager(["ENGAGER"]):::assoc
  designer(["DÉSIGNER"]):::assoc
  faitPartie(["FAIRE PARTIE<hr/>statut<br/>arrivé le, parti le"]):::assoc
  absorber(["ABSORBER<br/>(fusion)"]):::assoc
  personnaliser(["PERSONNALISER"]):::assoc
  lier(["LIER<br/>(compte ↔ carte)"]):::assoc
  sinscrire(["S'INSCRIRE À"]):::assoc

  USER ---|"0,n"| adherer ---|"0,n"| ORG
  ORG ---|"0,n"| recruter ---|"1,1"| JOUEUR
  ORG ---|"0,n"| engager ---|"1,1"| EQUIPE
  ALIAS ---|"1,1 (R)"| designer ---|"0,n"| JOUEUR
  JOUEUR ---|"0,n"| faitPartie ---|"0,n"| EQUIPE
  JOUEUR ---|"0,1 absorbé"| absorber ---|"0,n conservé"| JOUEUR
  PERSO ---|"1,1 (R)"| personnaliser ---|"0,1"| JOUEUR
  USER ---|"0,n"| lier ---|"0,1"| JOUEUR
  INSCRIPTION ---|"1,1"| sinscrire ---|"0,n"| EDITION
```

À lire, par exemple :

- Un alias désigne **exactement un** joueur, et n'est identifiable qu'à travers
  lui `(R)` : deux joueurs homonymes peuvent porter la même graphie
  ([ADR 0004](../adr/0004-identite-joueur-par-id.md)).
- FAIRE PARTIE est une association **historisée** : un joueur a plusieurs
  passages dans des équipes, au plus un en cours (sans date de départ).
- ABSORBER est **réflexive** : un joueur absorbé par une fusion pointe vers le
  joueur conservé.
- Un utilisateur peut être lié à une carte dans **plusieurs** organisations,
  mais à une seule par organisation.

## MLD

Traduction du MCD en tables, selon les règles Merise usuelles :

| Cas du MCD                           | Traduction                                                          |
| ------------------------------------ | ------------------------------------------------------------------- |
| Entité                               | Une table, l'identifiant devient la clé primaire                    |
| Association `0,n` / `1,1` (ou `0,1`) | La table du côté `1,1` (ou `0,1`) reçoit une clé étrangère          |
| Association `0,n` / `0,n`            | Une table d'association, dont la clé primaire combine les deux clés |
| Propriétés d'une association         | Colonnes de la table qui la porte                                   |
| Identification relative `(R)`        | La clé de l'entité « parente » entre dans la clé primaire           |

Deux règles propres à Arrakis, non représentées pour alléger le schéma :

- **Chaque table porte un `organization_id` obligatoire** et ses clés
  étrangères sont **composites** `(organization_id, id)` : la base refuse
  qu'une ligne référence une ligne d'une autre organisation
  ([ADR 0008](../adr/0008-multi-tenant-et-portabilite.md)).
- Les utilisateurs sont gérés par Supabase Auth (`auth.users`) ; le lien
  compte ↔ carte passe par l'identifiant Discord.

### Faits

```mermaid
erDiagram
  organizations ||--o{ organization_members : "a pour membres"
  organizations ||--o{ seasons : organise
  seasons ||--o{ splits : compose
  splits |o--o{ editions : "rattache"
  editions ||--o{ matches : contient
  matches ||--|{ performances : "fait jouer"
  players ||--o{ performances : joue
  players |o--o{ matches : "MVP du match"
  players |o--o{ editions : "MVP de soirée"
  editions ||--o{ edition_participants : "a pour participants"
  players ||--o{ edition_participants : participe
  players ||--o{ player_aliases : "est désigné par"
  players ||--o{ team_memberships : "fait partie"
  teams ||--o{ team_memberships : "compte"
  players |o--o{ players : "absorbé par"
  players ||--o| card_customizations : personnalise
  editions ||--o{ registrations : "reçoit"

  organizations {
    uuid id PK
    text slug UK
    text name
    text rating_rules
    text discord_guild_id
  }
  organization_members {
    uuid organization_id PK,FK
    uuid user_id PK,FK
    text role
  }
  seasons {
    uuid id PK
    text name
    int year
  }
  splits {
    uuid id PK
    uuid season_id FK
    int number
    text status
  }
  editions {
    uuid id PK
    uuid split_id FK
    uuid event_mvp_player_id FK
    text type
    date date
    text prestige
    numeric weight_override
    jsonb scoring
    int version
  }
  matches {
    uuid id PK
    uuid edition_id FK
    uuid mvp_player_id FK
    int match_number
    text winner_team
    int duration_seconds
  }
  performances {
    uuid match_id PK,FK
    smallint line PK
    char side PK
    uuid player_id FK
    text role
    text champion
    text result
    int kills
    int deaths
    int assists
    int gold
  }
  players {
    uuid id PK
    text nickname
    boolean archived
    uuid merged_into FK
    text discord_user_id UK
  }
  player_aliases {
    uuid player_id PK,FK
    text alias PK
  }
  teams {
    uuid id PK
    text tag UK
    text name
    text[] divisions
  }
  team_memberships {
    uuid id PK
    uuid player_id FK
    uuid team_id FK
    text status
    date joined_on
    date left_on
  }
  edition_participants {
    uuid edition_id PK,FK
    uuid player_id PK,FK
  }
  card_customizations {
    uuid player_id PK,FK
    text title
    text[] selected_badges
    text background
  }
  registrations {
    uuid id PK
    uuid edition_id FK
    text discord_user_id
    text pseudo
    text role
  }
```

### Projections

Recalculées entièrement par `project()` après chaque commande. Supprimer ces
tables puis relancer le recalcul redonne le même état.

```mermaid
erDiagram
  splits ||--o{ player_split_ratings : "note par split"
  players ||--o{ player_split_ratings : ""
  editions ||--o{ player_edition_history : "historique"
  players ||--o{ player_edition_history : ""
  editions ||--o{ edition_standings : "classement de soirée"
  players ||--o{ edition_standings : ""

  player_split_ratings {
    uuid split_id PK,FK
    uuid player_id PK,FK
    int rating
    int impact
    int consistency
    int clutch
    text tier
    int previous_rating
  }
  player_edition_history {
    uuid edition_id PK,FK
    uuid player_id PK,FK
    int career_rating
    text result
  }
  edition_standings {
    uuid edition_id PK,FK
    uuid player_id PK,FK
    int rank
    int points
  }
```
