# Spécification de la migration v1 → v2

La migration transforme une sauvegarde de la base v1 en faits v2, une seule
fois, à la bascule. Elle est faite par le paquet
[`packages/migrate-v1`](../../packages/migrate-v1), en deux temps :

1. **Planification** (`planMigration`, fonction pure) : lit la sauvegarde v1
   (un objet JSON par table), produit les lignes v2 et un **rapport
   d'anomalies**. Rien n'est écrit.
2. **Écriture** : insère les lignes dans une base v2 vide, en une
   transaction, puis lance le recalcul des projections.

Chiffres de la sauvegarde du 2026-10-05 : 3 saisons, 3 splits, 11 éditions,
417 matchs, 2 085 lignes de match (4 170 performances), 301 joueurs,
32 équipes.

## Principes

1. **Migrer fidèlement, corriger ensuite.** Une donnée v1 fausse est migrée
   telle quelle et signalée dans le rapport. Elle est corrigée après la
   migration par une commande v2 (correction de match, fusion…), donc
   journalisée ([ADR 0009](../adr/0009-serialiser-et-journaliser-les-commandes.md)).
   Sans cela, on ne pourrait plus vérifier que les notes v2 égalent les notes
   v1 : chaque correction ferait bouger une note.
2. **Les identifiants v1 sont conservés.** Joueurs, équipes, éditions et
   matchs gardent leur UUID : les liens existants vers les cartes et les
   éditions restent valides, et chaque ligne v2 se compare à sa ligne v1.
3. **Les données calculées ne sont pas migrées.** Les notes, statistiques,
   formes et historiques v1 sont recalculés par `project()`. Ils servent
   seulement à vérifier le résultat.
4. **La migration est rejouable.** Même sauvegarde, même résultat. On la
   répète sur le staging autant que nécessaire.

## Identité des joueurs

En v1, une performance n'est reliée à un joueur que **par son nom** : les
colonnes `a_player_id` et `b_player_id` de `match_rows` sont vides sur toutes
les lignes.

La v1 regroupe les performances par **clé de joueur** :

1. retirer un tag d'équipe en tête (`^[A-Z]{2,4}\s+`) ;
2. passer en minuscules, retirer les accents, réduire les espaces.

La migration applique **exactement** cette clé, pour que les notes recalculées
portent sur les mêmes performances qu'en v1.

| Situation                                 | Règle                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Une clé, un joueur v1                     | Les performances vont à ce joueur                                                                                            |
| Une clé, aucun joueur v1                  | Nouveau joueur, nommé d'après la graphie la plus fréquente ; signalé                                                         |
| Une clé, plusieurs joueurs v1 (homonymes) | Les performances vont au joueur dont l'équipe actuelle apparaît dans les lignes ; les autres n'en reçoivent aucune ; signalé |
| Joueur v1 sans performance                | Migré tel quel (roster, inscrit…)                                                                                            |
| Joueur fusionné (`merged_into`)           | Migré avec `merged_into`, sans performance ; ses graphies deviennent des alias du joueur conservé                            |

Chaque graphie rencontrée dans les lignes devient un **alias** normalisé
(`player_aliases`) du joueur auquel elle a été attribuée
([ADR 0004](../adr/0004-identite-joueur-par-id.md)).

## Correspondance des tables

| v1                                           | v2                                  | Règles                                                                                                                                    |
| -------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| —                                            | `organizations`                     | Une organisation Arrakis, règles de note `v1`                                                                                             |
| `seasons`                                    | `seasons`                           | Telle quelle                                                                                                                              |
| `splits`                                     | `splits`                            | `is_active` → statut `open`, sinon `closed`                                                                                               |
| `teams`                                      | `teams`                             | Telle quelle (logos compris, voir Q12)                                                                                                    |
| `players`                                    | `players`                           | `name` → `nickname`. Les colonnes calculées (note, palier, forme…) sont ignorées                                                          |
| `players.team_id`, `status`                  | `team_memberships`                  | Un passage en cours. `joined_on` : date de la première édition jouée avec ce tag, sinon début du split actif                              |
| `players.customization`                      | `card_customizations`               | `title`, `selectedBadges`, `background`, `accounts` → `riot_accounts`. `bio` : voir Q11                                                   |
| `players.riot_id`                            | `card_customizations.riot_accounts` | Ajouté comme compte principal s'il n'y figure pas déjà                                                                                    |
| `editions`                                   | `editions`                          | `ligue_div1` → `league_div1`, `ligue_div2` → `league_div2`. Prestige conservé. `division`, `status` : voir Q9. `ih_teams` non migré (Q13) |
| `editions.mvp_player_name`                   | `editions.event_mvp_player_id`      | Résolu par la clé de joueur                                                                                                               |
| `matches`                                    | `matches`                           | Durée lue dans `duration_display` (`mm:ss`), exacte à la seconde. `journee` → `matchday`                                                  |
| `match_rows`                                 | `performances`                      | Une ligne v1 → deux performances (côtés A et B). `line` : 0 à 4 dans l'ordre TOP, JGL, MID, ADC, SUP. `WIN`/`LOSE` → `win`/`loss`         |
| `edition_participants`                       | `edition_participants`              | Telle quelle                                                                                                                              |
| `registrations`                              | `registrations`                     | Telle quelle                                                                                                                              |
| `player_split_stats`, `player_event_entries` | —                                   | Calculées : servent à la vérification. Exception : les résultats de tournoi sans match (anomalie M4)                                      |
| `app_settings`                               | —                                   | Chaînes Twitch et lives manuels : cas d'usage P3, non migrés. Conservés dans la sauvegarde                                                |

## Anomalies de la sauvegarde

Constatées par profilage de la sauvegarde du 2026-10-05. Le rapport de
migration les liste à chaque exécution, ligne par ligne.

| #   | Constat                                                                                                                                                                   | Règle de migration                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | 2 graphies des lignes de match (24 performances) ne correspondent à aucun joueur, à la casse près                                                                         | Résolues par la clé de joueur, qui ignore la casse. Rien à signaler                                                                       |
| M2  | 2 joueurs v1 portent le même nom, dans deux équipes. Les lignes ne citent qu'une équipe ; en v1, **les deux cartes affichaient les mêmes parties**                        | Performances au joueur de l'équipe citée ; l'autre est migré sans performance. Signalé : fusion ou suppression à décider après la bascule |
| M3  | 3 matchs de Div 2 où **les deux équipes ont perdu**, et où le vainqueur enregistré n'est aucune des deux. Deux d'entre eux sont identiques (même affiche, même vainqueur) | Migrés tels quels (parité des notes). Signalés : à corriger ou supprimer après la bascule, par commande                                   |
| M4  | 14 résultats d'un tournoi **sans match** (`player_event_entries` de type `tournament`), rattachés par erreur à une édition Div 1. Ils n'existent nulle part ailleurs      | Non représentables en v2 aujourd'hui : voir Q10. En attendant, listés dans le rapport et conservés dans la sauvegarde                     |
| M5  | 10 lignes de match sans nom d'équipe (Div 1)                                                                                                                              | Complétées par `matches.team_a` ou `team_b` selon le côté                                                                                 |
| M6  | Dans les lignes de match, des équipes absentes de `teams` : équipes d'In House, et noms « tag + joueur » (anomalie A7 de la note)                                         | `performances.team` est un texte libre : migré tel quel                                                                                   |
| M7  | Statuts d'édition périmés : une LAN externe passée est encore « en cours »                                                                                                | Voir Q9                                                                                                                                   |
| M8  | Aucun historique d'équipe (`player_team_history` vide) : seule l'équipe actuelle est connue                                                                               | Un seul passage par joueur, avec une date d'arrivée estimée (voir la correspondance)                                                      |

## Vérification

La migration est acceptée quand, après recalcul avec les règles `v1` :

1. pour chaque joueur et chaque split, **note, impact, constance, clutch,
   palier, parties, victoires et défaites** sont égaux aux valeurs de
   `player_split_stats` v1, sauf les écarts **expliqués** par une anomalie
   (M2 : le joueur sans performance n'a plus de note) ;
2. chaque compte Discord lié en v1 est lié au même joueur ;
3. les nombres de lignes concordent : 417 matchs, 4 170 performances,
   301 joueurs.

Un écart non expliqué bloque la bascule. Les critères complets sont dans les
[cas d'usage](../product/use-cases.md#critères-de-bascule).
