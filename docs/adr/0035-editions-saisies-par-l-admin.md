# 0035 — Les éditions saisies par l'admin, et leur archivage

- **Statut** : Accepté
- **Date** : 2026-11-23

## Contexte

Un admin crée, modifie, archive et clôture une édition, y compris un événement
externe, qui n'a pas de match mais des participants (cas d'usage A3, ticket
#49). La clôture existe déjà (ADR 0013). Ce que l'admin saisit d'une édition
change les notes : son type et son prestige fixent le poids de ses parties, sa
date leur ordre, sa saison la note où elles comptent. Le schéma n'avait aucun
archivage d'édition.

## Décision

**Trois commandes, à la version que l'admin a sous les yeux (ADR 0005) :
`createEdition`, `updateEdition`, `archiveEdition`.** Une modification
remplace tout ce que l'admin saisit, et les notes sont refaites par la chaîne
commune (ADR 0023).

**Elles respectent l'ADR 0032** : on ne crée pas d'édition dans une saison
clôturée, on n'y en déplace pas, et une édition d'une saison clôturée ne se
modifie plus (`season_closed`).

**Seul un événement externe a des participants**, des joueurs non fusionnés
de l'organisation, et peut-être une victoire d'Arrakis. Une édition qui a des
matchs ne devient pas un événement externe.

**Seule une édition sans match s'archive.** Elle disparaît alors des pages
publiques et de la liste de l'espace admin (`archived_at`, droits de lecture
d'`editions`), et elle ne change plus. Archiver ne change donc jamais une note.
Une édition qui a des matchs se corrige (ticket #48), elle ne s'archive pas.

## Options écartées

- **Archiver aussi une édition qui a des matchs, en gardant ses notes** : le
  site montrerait des notes qui dépendent d'une édition invisible.
- **Archiver en retirant ses matchs des notes** : un archivage deviendrait une
  correction silencieuse, sans aperçu ni note de patch.
- **Une commande à part pour les participants** : ils font partie de ce que
  l'admin saisit d'un événement externe, ils se saisissent avec lui.

## Conséquences

- Une édition créée par erreur, sans match, s'archive sans laisser de trace
  publique.
- Pour désarchiver une édition, il faudra une commande à part, si le besoin
  vient.
- Corriger une édition d'une saison clôturée demandera de rouvrir la saison
  (ticket #48), comme pour ses matchs.
