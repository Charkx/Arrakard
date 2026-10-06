# 0009 — Sérialiser et journaliser les commandes

- **Statut** : Proposé
- **Date** : 2026-10-06
- **Complète** : [0005](0005-ecritures-par-commandes.md)

## Contexte

Chaque commande recalcule **toutes** les projections de l'organisation
([ADR 0003](0003-faits-et-projections.md)) : elle supprime puis réécrit
`player_split_ratings`, `player_edition_history` et `edition_standings`.

Le contrôle de version de l'ADR 0005 (`editions.version`) ne protège qu'une
édition à la fois. Deux commandes portant sur des éditions **différentes**
peuvent donc tourner en même temps :

| Temps | Admin A : importe l'édition 12        | Admin B : corrige un match de l'édition 11 |
| ----- | ------------------------------------- | ------------------------------------------ |
| t1    | écrit les matchs de l'édition 12      |                                            |
| t2    |                                       | corrige le match                           |
| t3    | lit les faits (sans la correction)    |                                            |
| t4    |                                       | lit les faits (sans l'édition 12)          |
| t5    | réécrit les projections, `COMMIT`     |                                            |
| t6    |                                       | réécrit les projections, `COMMIT`          |

À t6, les projections ignorent l'édition 12, alors que ses matchs sont bien
en base. Rien ne signale l'erreur ; elle disparaît seulement à la commande
suivante.

Par ailleurs, une commande modifie les faits en place. Après une fusion de
profils ou la correction d'un match, rien ne dit qui l'a faite, quand, ni
avec quelles données d'entrée.

## Décision

**1. Une seule commande à la fois par organisation.** Juste après `BEGIN`,
chaque commande verrouille la ligne de son organisation :

```sql
select 1 from organizations where id = $1 for update;
```

Une seconde commande de la même organisation attend que la première ait
validé ou annulé, puis lit des faits à jour. Les organisations différentes
ne s'attendent pas. Le verrou est libéré automatiquement à la fin de la
transaction.

Le verrou et le contrôle de version répondent à deux problèmes distincts, et
on garde les deux :

- le **verrou** empêche deux _transactions_ de s'entrelacer (quelques
  millisecondes) ;
- la **version** détecte qu'un _humain_ agit sur un écran périmé (plusieurs
  minutes), et répond `409 Conflict`.

**2. Un journal des commandes.** Chaque commande validée ajoute une ligne à
`command_log`, **dans la même transaction** que ses écritures : une commande
annulée ne laisse aucune ligne, une commande validée en laisse toujours une.

| Colonne           | Contenu                                                |
| ----------------- | ------------------------------------------------------ |
| `id`              | identifiant                                            |
| `organization_id` | organisation                                           |
| `command`         | nom métier (`importEdition`, `mergePlayers`…)          |
| `actor_user_id`   | utilisateur authentifié qui l'a lancée                 |
| `input`           | entrée validée par le contrat (JSON)                   |
| `outcome`         | résumé de ce qui a été écrit (ex. le plan de fusion)   |
| `created_at`      | date                                                   |

Le journal n'est lisible que par les admins de l'organisation
(`is_org_admin`). Il est en ajout seul : aucune commande ne le modifie.

Les échecs (entrée invalide, `409`, erreur) vont dans les logs des Edge
Functions, pas dans ce journal.

## Options écartées

- **Advisory lock** (`pg_advisory_xact_lock`) : même effet, mais propre à
  Postgres ; l'ADR 0008 préfère le SQL standard quand il suffit.
- **Isolation `SERIALIZABLE`** : Postgres détecte le conflit, mais annule
  l'une des transactions ; il faut alors relancer la commande. Plus de code,
  pour un volume (quelques commandes par semaine) où attendre suffit.
- **Recalcul partiel** (seulement le split touché) : réduit les collisions sans
  les supprimer, et complique `project()`, qui est aujourd'hui une fonction
  simple et vérifiée par le golden master.
- **Audit par triggers** (une ligne par ligne modifiée) : dit _quelles lignes_
  ont changé, pas _quelle action métier_ ni _pourquoi_. Plus volumineux, moins
  lisible.
- **Event sourcing** : déjà écarté par l'ADR 0003.

## Conséquences

- Les commandes d'une organisation s'exécutent l'une après l'autre. Un
  recalcul dure environ 100 ms : l'attente est imperceptible.
- Un test d'intégration doit lancer deux commandes en parallèle et vérifier
  que les projections contiennent les deux.
- On peut répondre à « qui a fusionné ces deux joueurs, et quand ? ». Le
  journal ne permet **pas** d'annuler automatiquement : une annulation serait
  une nouvelle commande, à concevoir le jour où le besoin apparaît.
- La table `command_log` est créée avec la première commande.
