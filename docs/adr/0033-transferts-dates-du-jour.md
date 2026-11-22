# 0033 — Les transferts sont datés du jour, l'archivage libère les joueurs

- **Statut** : Accepté
- **Date** : 2026-11-22

## Contexte

Un admin crée les équipes, y transfère les joueurs et archive celles qui
disparaissent (cas d'usage A4, ticket #51). Le schéma garde déjà l'historique
d'équipes d'un joueur : une ligne de `team_memberships` par passage, au plus un
en cours (sans date de départ). Il reste à dire comment les commandes écrivent
ces passages : quelle date, ce que devient un changement de statut, et ce que
deviennent les joueurs d'une équipe archivée.

## Décision

**Un transfert (`transferPlayer`) termine le passage en cours du joueur et en
commence un nouveau, les deux datés du jour à Paris, que fixe le serveur.** Un
changement de statut dans la même équipe (remplaçant devenu titulaire) est
aussi un transfert : il ouvre un nouveau passage. Un joueur peut quitter son
équipe sans en rejoindre une autre (`to: null`). Être déjà à la place demandée
est refusé (`already_done`), comme rejoindre une équipe archivée (`conflict`).

**Archiver une équipe (`archiveTeam`) termine le jour même les passages en
cours de ses joueurs**, qui se retrouvent sans équipe. Ses passages terminés
restent, et son tag reste pris : deux équipes ne portent jamais le même tag
dans une organisation, archivée ou non.

Les équipes ne comptent pas dans la note : les commandes passent quand même
par le recalcul, comme toutes (ADR 0023). Le site lit les équipes et les
passages par l'API ordinaire, car ils sont publics (ADR 0031).

## Options écartées

- **Une date de transfert choisie par l'admin** : il faudrait refuser les
  passages qui se chevauchent ou qui partent avant le précédent. Rien ne le
  demande aujourd'hui ; l'historique repris de la v1 est déjà daté par la
  migration.
- **Modifier le statut du passage en cours** au lieu d'en ouvrir un : on
  perdrait la date où le joueur est devenu titulaire.
- **Garder les joueurs dans une équipe archivée** : le classement et les
  profils afficheraient le tag d'une équipe que les pages publiques cachent.

## Conséquences

- L'historique d'un joueur se lit sans calcul : ses passages, dans l'ordre.
- Deux transferts le même jour laissent un passage d'un jour (arrivée et
  départ le même jour) : c'est la trace honnête de ce qui s'est passé.
- Corriger la date d'un passage demandera une commande à part, si le besoin
  vient.
- La fusion de profils (#52) devra dire ce que deviennent les passages du
  profil absorbé.

> **Complété par [0034](0034-fusionner-deux-profils.md)** : la fusion termine
> le passage en cours de l'absorbé, et le conservé sans équipe prend sa place.
