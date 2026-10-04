# Glossaire

Le langage commun du projet. **Un mot = une définition.** Si un terme manque
ou est ambigu, on corrige ce fichier _avant_ d'écrire le code.

Convention : on parle français, le code est en anglais. La colonne « Code »
donne l'identifiant à utiliser, et il n'y en a qu'un.

## Calendrier

| Terme                   | Code            | Définition                                                                                                                                                         |
| ----------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Saison**              | `Season`        | Une année de compétition (« Saison 3 », 2026). Contient un ou plusieurs splits.                                                                                    |
| **Split**               | `Split`         | Période de compétition à l'intérieur d'une saison. **La note live d'un joueur ne compte que les matchs du split actif** : chaque split remet le classement à zéro. |
| **Split actif**         | `activeSplit`   | Le seul split ouvert à un instant donné. Il en existe au plus un.                                                                                                  |
| **Clôture de split**    | `closeSplit`    | Action admin qui fige la note de chaque joueur pour ce split (instantané de split) et ouvre le suivant.                                                            |
| **Instantané de split** | `SplitSnapshot` | Note et statistiques d'un joueur, figées à la clôture d'un split. _Projection, recalculable._                                                                      |

## Événements

| Terme                      | Code                             | Définition                                                                                                                                                                              |
| -------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Édition**                | `Edition`                        | Un événement daté : une soirée In House, une ligue, un tournoi, une LAN. _C'est le seul mot pour « événement » dans le code._                                                           |
| **Type d'édition**         | `EditionType`                    | `league_div1`, `league_div2`, `inhouse`, `tournament`, `lan`, `external_lan`, `external_event`.                                                                                         |
| **Ligue**                  | `league_div1` / `league_div2`    | Compétition entre équipes permanentes, en deux divisions, jouée en journées.                                                                                                            |
| **Division**               | `Division`                       | `div1` ou `div2`. Niveau d'une ligue ou d'une équipe.                                                                                                                                   |
| **In House (IH)**          | `inhouse`                        | Soirée où les joueurs sont répartis en équipes éphémères (équipes IH).                                                                                                                  |
| **Événement externe**      | `external_lan`, `external_event` | Événement hors Arrakis auquel des membres participent. **Pas de matchs enregistrés**, seulement des participants et éventuellement une victoire.                                        |
| **Prestige**               | `Prestige`                       | `normal` (×1,0), `premium` (×1,3), `championship` (×1,6). Multiplie le poids des matchs de l'édition dans le calcul des sous-notes. _Voir [question ouverte Q2](../open-questions.md)._ |
| **Journée**                | `matchday`                       | Numéro de manche d'une ligue (J1, J2…).                                                                                                                                                 |
| **Finale / Grande finale** | `isFinal` / `isGrandFinal`       | Match décisif d'un tournoi / dernière confrontation d'une ligue.                                                                                                                        |
| **Numéro d'affichage**     | `displayNumber`                  | Numéro séquentiel d'une édition (« D1 #3 »). **Immuable** une fois attribué, pour que les liens partagés restent valides.                                                               |
| **Inscription**            | `Registration`                   | Déclaration d'un joueur connecté qui veut participer à une édition à venir. Distincte de la participation réelle, qui est déduite des matchs.                                           |

## Matchs

| Terme             | Code           | Définition                                                                                                                                                                        |
| ----------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Match**         | `Match`        | Une partie entre deux équipes au sein d'une édition. Contient exactement 5 lignes de rôle.                                                                                        |
| **Ligne de rôle** | `RoleLine`     | Les deux joueurs qui s'affrontent sur le même rôle dans un match.                                                                                                                 |
| **Performance**   | `Performance`  | Ce qu'un joueur a fait dans un match : rôle, champion, K/D/A, or, résultat. **Unité de base de tous les calculs.** Référence le joueur par son `playerId`, jamais par son pseudo. |
| **Rôle**          | `Role`         | `TOP`, `JGL`, `MID`, `ADC`, `SUP`. _Un seul énuméré dans tout le code : la v1 en avait deux (`JUNGLE`/`JGL`)._                                                                    |
| **Rôle dominant** | `dominantRole` | Le rôle le plus joué par un joueur sur la période considérée.                                                                                                                     |
| **KDA**           | `kda`          | (kills + assists) / max(deaths, 1), calculé sur les **totaux**, jamais comme moyenne de KDA par match.                                                                            |

## Joueurs et équipes

| Terme                | Code           | Définition                                                                                                                                           |
| -------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Joueur**           | `Player`       | Une personne de la communauté. Identifiée par un `playerId` stable ; son pseudo peut changer.                                                        |
| **Pseudo**           | `nickname`     | Nom affiché du joueur, sans tag d'équipe (« Zéphyr »).                                                                                               |
| **Tag d'équipe**     | `teamTag`      | Abréviation de 2 à 4 majuscules (« ARK »). Dans les fichiers Excel, il préfixe le pseudo (« ARK Zéphyr »).                                           |
| **Alias**            | `PlayerAlias`  | Une graphie sous laquelle un joueur apparaît dans les imports (« ark zephyr », « Zéphyr »). Sert uniquement à rattacher un import au bon `playerId`. |
| **Équipe**           | `Team`         | Roster permanent d'une ligue (ARK, BLB…).                                                                                                            |
| **Équipe IH**        | `InhouseTeam`  | Équipe éphémère d'une soirée In House, nommée d'après une région de Runeterra. N'existe qu'au sein de son édition.                                   |
| **Statut de roster** | `RosterStatus` | `starter` (titulaire), `sub` (remplaçant), `coach`.                                                                                                  |
| **Transfert**        | `Transfer`     | Changement d'équipe d'un joueur, daté. L'historique d'équipes est la suite de ses transferts.                                                        |
| **Fusion**           | `merge`        | Déclarer que deux profils sont la même personne. Le profil absorbé devient un alias du profil conservé.                                              |
| **Archivage**        | `archived`     | Masque un joueur ou une équipe des pages publiques sans supprimer son historique.                                                                    |

## Notation

| Terme                    | Code                              | Définition                                                                                                                  |
| ------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Note**                 | `rating`                          | Note de carte, entre 60 et 99, calculée sur le split actif. Voir la [spécification](rating-spec.md).                        |
| **Sous-notes**           | `impact`, `consistency`, `clutch` | Les trois composantes de la note (0 à 99). _« Consistance » en v1 ; le code v2 dit `consistency`._                          |
| **Palier**               | `Tier`                            | Bronze (< 70), Argent (70–79), Or (80–89), Élite (≥ 90). Débloque des options de personnalisation.                          |
| **Fiabilité**            | `reliability`                     | Coefficient de 0 à 1 qui atteint 1 à 15 parties. En dessous, les stats d'un joueur sont tirées vers la médiane de son rôle. |
| **Médiane de rôle**      | `roleBaseline`                    | KDA et winrate de référence d'un rôle, servant d'ancre au calcul.                                                           |
| **Forme récente**        | `recentForm`                      | `up`, `stable`, `down`, d'après les 3 dernières performances.                                                               |
| **Classement**           | `Leaderboard`                     | Liste des joueurs triée par note, avec départage déterministe.                                                              |
| **Classement de soirée** | `EventStandings`                  | Classement **en points** d'une édition, selon son barème. _Système distinct de la note._                                    |
| **Barème**               | `ScoringRules`                    | Points attribués par victoire, défaite, kill, assist, mort et MVP pour le classement de soirée. Propre à chaque édition.    |
| **MVP de soirée**        | `eventMvp`                        | Joueur désigné meilleur de l'édition. Donne un bonus au classement de soirée.                                               |
| **MVP de match**         | `matchMvp`                        | Joueur désigné meilleur d'un match. Enregistré, sans effet au barème officiel actuel.                                       |
| **Badge**                | `Badge`                           | Distinction déduite des faits (« Bourreau ×3 », « Champion »). _Projection._                                                |
| **Carte**                | `Card`                            | Représentation visuelle d'un joueur : note, sous-notes, palier, personnalisation.                                           |
| **Personnalisation**     | `CardCustomization`               | Choix du joueur sur sa carte : titre, badges affichés, fond, comptes Riot. _Seule donnée qu'un joueur peut écrire._         |

## Architecture

| Terme          | Code      | Définition                                                                                                                       |
| -------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Fait**       | —         | Donnée saisie, source de vérité : éditions, matchs, performances, transferts, personnalisation.                                  |
| **Projection** | —         | Donnée calculée à partir des faits : notes, historiques, classements, badges. Peut être supprimée et reconstruite à tout moment. |
| **Commande**   | `Command` | Une intention d'écriture nommée en langage métier (`importEdition`, `closeSplit`). Exécutée en une transaction côté serveur.     |

## Termes à ne plus utiliser

| Ne pas dire                      | Dire plutôt               | Pourquoi                                   |
| -------------------------------- | ------------------------- | ------------------------------------------ |
| événement / event (dans le code) | édition                   | Trois mots désignaient la même chose en v1 |
| soirée (dans le code)            | édition de type `inhouse` | Idem                                       |
| `JUNGLE`, `SUPPORT`              | `JGL`, `SUP`              | Un seul énuméré de rôles                   |
| `playerName` comme identifiant   | `playerId`                | Le pseudo change, l'identifiant non        |
| saison (pour parler d'un split)  | split                     | La saison contient les splits              |
