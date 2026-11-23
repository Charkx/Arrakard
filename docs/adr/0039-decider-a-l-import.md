# 0039 — Décider à l'import, et ne jamais importer deux fois

- **Statut** : Accepté
- **Date** : 2026-11-23

## Contexte

L'import du cas simple (ADR 0038) refuse un fichier dès qu'un pseudo n'est
pas reconnu, qu'une équipe est inconnue ou qu'un joueur a changé d'équipe.
L'admin doit être prévenu avant d'enregistrer, et choisir quoi faire de chaque
cas ; le même fichier ne doit pas créer de doublon (cas d'usage A1, ticket
#46). Le domaine sait déjà analyser un fichier (`analyzeImport`) et appliquer
des décisions (`planImport`). Charly a validé la maquette le 2026-11-23 : une
liste par sorte de cas, un choix par ligne, « Importer » actif quand tout est
décidé.

## Décision

**Le navigateur montre, le serveur décide.** Le site analyse le fichier avec
le domaine, à partir des joueurs connus (la vue publique `import_directory` :
pseudo, alias, équipe et statut actuels), et liste les cas : pseudos non
reconnus, à relier à un joueur (les plus proches d'abord) ou à créer ; équipes
inconnues, à créer, à ignorer ou à relier à une équipe connue (un tag mal
écrit) ; transferts, à appliquer ou à ignorer. Les transferts à trancher
dépendent de ce qui est décidé des équipes (`transfersToDecide`, domaine) :
aucun vers une équipe ignorée, aucun vers l'équipe où le joueur est déjà. Le
site envoie les lignes et les décisions. `importEdition` refait l'analyse sur le
serveur et refuse toute décision manquante (`planImport`).

**Tout est écrit dans la transaction de la commande, ou rien** : les équipes
créées (le tag pour nom, à compléter ensuite), les joueurs créés, les alias
(un pseudo relié devient un alias du joueur, ADR 0004), les changements de
roster, puis les matchs, par la même écriture que la saisie (ADR 0038).

**Les changements de roster sont une règle du domaine, `rosterMoves`** : un
nouveau joueur rattaché à une équipe la rejoint comme titulaire, puisqu'il a
joué pour elle ; un transfert appliqué garde le statut que le joueur avait.
Comme un transfert à la main, il est daté du jour (ADR 0033), et une équipe
archivée ne recrute pas.

**Un fichier ne s'importe qu'une fois.** Son empreinte (SHA-256 des lignes
lues, calculée par la base) va dans `editions.source_file_hash`, colonne qui
existe depuis la v1. Le même fichier est refusé (`already_done`), dans la même
édition comme dans une autre, et le message nomme l'édition. Le site calcule
la même empreinte pour prévenir l'admin dès le choix du fichier, sans rien
enregistrer : c'est le serveur qui l'écrit.

## Options écartées

- **Analyser sur le serveur, par une lecture à part** : il faudrait une
  fonction de plus, hors de la chaîne des commandes ; le domaine tourne aussi
  dans le navigateur, et le serveur revérifie de toute façon.
- **Une table des imports** : la colonne de la v1 suffit, puisqu'une édition
  ne reçoit qu'un import (ADR 0038).
- **Enregistrer l'empreinte calculée par le navigateur, comme la v1** : le
  serveur enregistrerait une valeur qu'il n'a pas calculée (principe 2). Le
  navigateur la calcule seulement pour prévenir.

## Conséquences

- Un fichier importé en v1 n'a pas la même empreinte qu'en v2 (la v1 hachait
  le fichier même) : le réimporter dans une autre édition n'est pas détecté.
  Dans la même édition, il l'est, puisqu'elle a déjà des matchs.
- L'empreinte reste quand des matchs sont corrigés ou supprimés (#48) : le
  fichier ne se réimporte pas.
- La migration `import_directory` est à pousser (`supabase db push`).
