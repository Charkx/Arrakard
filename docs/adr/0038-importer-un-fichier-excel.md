# 0038 — Importer le fichier Excel d'une édition

- **Statut** : Accepté, complété par [0039](0039-decider-a-l-import.md)
- **Date** : 2026-11-23

## Contexte

Les ligues et la plupart des soirées ont un fichier Excel, dont la feuille de
statistiques `LIGUE1_STATS` donne une ligne par rôle, équipe A puis équipe B. L'admin doit
pouvoir l'importer (cas d'usage A1, ticket #45), et l'ADR 0022 veut que
l'import et la saisie à la main (ADR 0037) produisent les mêmes faits. Le
domaine savait déjà lire la feuille de statistiques (`parseStatsSheet`), rattacher les pseudos
(`analyzeImport`) et appliquer les décisions de l'admin (`planImport`). Charly
a approuvé SheetJS 0.20.3, pris sur le site de SheetJS (la version de npm,
0.18.5, a des failles connues), et un faux fichier pour les tests.

## Décision

> **Complété par [0039](0039-decider-a-l-import.md)** : l'admin décide des
> pseudos, des équipes et des transferts non reconnus, et un fichier ne
> s'importe qu'une fois.

**Le navigateur lit, le serveur décide.** Le site lit le fichier avec
SheetJS, comme la v1 : la feuille `LIGUE1_STATS` (ou la troisième), sans sa
ligne de totaux. Il envoie les lignes brutes, chacune avec son numéro dans le
fichier. SheetJS est chargé au premier import seulement, comme la connexion
(ADR 0024) ; le contrôle du poids le vérifie. Le serveur interprète les
colonnes : `importEdition` passe les lignes au domaine
(`parseNumberedStatsSheet`).

**L'import écrit par le même chemin que la saisie.** Chaque match du plan
devient une feuille de match (`MatchEntry`, `plannedMatchEntries`), comme une saisie : côté A, côté B, le
vainqueur étant le côté de l'équipe gagnante. Ces feuilles de match passent ensuite
par les mêmes vérifications (`checkEntries`, donc `matchEntryProblems`) et la
même écriture (`recordDraftMatch`) que `recordMatch`. Les matchs sont des
brouillons (ADR 0012), numérotés dans l'ordre du fichier.

**Un fichier mal formé est refusé en entier, et le message nomme la ligne.**
Un poste inconnu, une statistique qui n'est pas un nombre, un joueur ou un
champion manquant : la v1 avertissait et continuait, l'import les refuse
désormais, une ligne du fichier par ligne du message. Rien n'est écrit tant
qu'une seule feuille de match est refusée. Le refus a la raison `conflict`,
comme une saisie incohérente : `RejectionReason` n'a pas de raison « invalide »,
et en ajouter une ne changerait rien pour l'admin, qui lit le message.

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
- **Une seule commande `recordMatches` pour la saisie et l'import**, comme le
  ticket le disait (« la même commande de création de matchs ») : la saisie
  n'envoie qu'un match, et l'import a ses propres refus (fichier, pseudos).
  Partager les vérifications et l'écriture garantit les mêmes faits ; un test
  le vérifie en comparant un match importé et le même match saisi.

## Conséquences

- La réimportation (#46) ajoutera les décisions de l'admin au même chemin.
- L'aperçu (#47) montrera les brouillons importés comme les saisis.
- Classer une LAN parmi les éditions sans roster est à confirmer par Charly.
- La fonction `import-edition` est à déployer (`mise-en-ligne.md`).
