# 0038 — Importer le fichier Excel d'une édition

- **Statut** : Accepté
- **Date** : 2026-11-23

## Contexte

Les ligues et la plupart des soirées ont un fichier Excel, dont la feuille
`LIGUE1_STATS` donne une ligne par rôle, équipe A puis équipe B. L'admin doit
pouvoir l'importer (cas d'usage A1, ticket #45), et l'ADR 0022 veut que
l'import et la saisie à la main (ADR 0037) produisent les mêmes faits. Le
domaine savait déjà lire la feuille (`parseStatsSheet`), rattacher les pseudos
(`analyzeImport`) et appliquer les décisions de l'admin (`planImport`). Charly
a approuvé SheetJS 0.20.3, pris sur le site de SheetJS (la version de npm,
0.18.5, a des failles connues), et un faux fichier pour les tests.

## Décision

**Le navigateur lit, le serveur décide.** Le site lit le fichier avec
SheetJS, comme la v1 : la feuille `LIGUE1_STATS` (ou la troisième), sans sa
ligne de totaux. Il envoie les lignes brutes, chacune avec son numéro dans le
fichier. SheetJS est chargé au premier import seulement, comme la connexion
(ADR 0024) ; le contrôle du poids le vérifie. Le serveur interprète les
colonnes : `importEdition` passe la feuille au domaine.

**L'import écrit par le même chemin que la saisie.** Chaque match du plan
devient la feuille d'une saisie (`plannedMatchEntries`) : côté A, côté B, le
vainqueur étant le côté de l'équipe gagnante. Les feuilles passent ensuite
par les mêmes vérifications (`checkEntries`, donc `matchEntryProblems`) et la
même écriture (`recordDraftMatch`) que `recordMatch`. Les matchs sont des
brouillons (ADR 0012), numérotés dans l'ordre du fichier.

**Un fichier mal formé est refusé en entier, et le message nomme la ligne.**
Un poste inconnu, une statistique qui n'est pas un nombre, un joueur ou un
champion manquant : la v1 avertissait et continuait, l'import les refuse
désormais, une ligne du fichier par ligne du message. Rien n'est écrit tant
qu'une seule feuille est refusée.

**Le cas simple seulement.** Tout pseudo doit être reconnu sans hésitation,
et, dans une ligue ou un tournoi, toute équipe connue et aucun transfert
détecté. Sinon l'import est refusé, en nommant le pseudo, l'équipe ou le
transfert. Décider de ces cas (nouveau joueur, nouvelle équipe, transfert)
arrive avec la réimportation (#46). Une édition qui a déjà des matchs n'est
pas importée. Les équipes d'une ligue ou d'un tournoi sont des rosters
(`teamsAreRosters`) ; celles d'une In House ou d'une LAN se forment le soir
même.

## Options écartées

- **Lire le fichier sur le serveur** : il faudrait y envoyer le fichier
  entier et y charger SheetJS ; le navigateur le lit déjà, et le serveur
  garde la décision puisqu'il interprète les lignes.
- **Avertir et importer quand même, comme la v1** : un match incomplet
  entrerait dans les faits sans que personne ne l'ait voulu.
- **Une commande `recordMatches` pour la saisie et l'import** : la saisie
  n'envoie qu'un match ; partager les vérifications et l'écriture suffit à
  garantir les mêmes faits.

## Conséquences

- La réimportation (#46) ajoutera les décisions de l'admin au même chemin.
- L'aperçu (#47) montrera les brouillons importés comme les saisis.
- Classer une LAN parmi les éditions sans roster est à confirmer par Charly.
- La fonction `import-edition` est à déployer (`mise-en-ligne.md`).
