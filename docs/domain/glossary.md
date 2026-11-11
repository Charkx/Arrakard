# Glossaire

Le langage commun du projet. **Un mot = une définition.** Si un terme manque
ou est ambigu, on corrige ce fichier _avant_ d'écrire le code.

Convention : on parle français, le code est en anglais. La colonne « Code »
donne l'identifiant à utiliser, et il n'y en a qu'un.

## Calendrier

| Terme                    | Code             | Définition                                                                                                                                                                                                               |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Saison**               | `Season`         | Période de compétition, ouverte puis clôturée par un admin. **La note live d'un joueur ne compte que les matchs de la saison active** : chaque saison remet le classement à zéro.                                        |
| **Saison active**        | `activeSeason`   | La seule saison ouverte à un instant donné. Il en existe au plus une.                                                                                                                                                    |
| **Clôture de saison**    | `closeSeason`    | Action admin qui fige la note de chaque joueur pour cette saison (instantané de saison) et ouvre la suivante.                                                                                                            |
| **Instantané de saison** | `SeasonSnapshot` | Note et statistiques d'un joueur, figées à la clôture d'une saison. _Projection, recalculable._                                                                                                                          |
| **Édition hors saison**  | `seasonId: null` | Édition rattachée à aucune saison. Elle ne compte dans aucune note de saison, mais reste dans l'historique du joueur. _À ne pas confondre avec une édition d'une saison clôturée, qui n'est plus dans la saison active._ |

Il n'y a qu'un niveau de période
([ADR 0014](../adr/0014-une-seule-periode-la-saison.md)). Le calcul, la
migration, la base et les documents sont alignés : « split » ne reste que pour
décrire la v1, et dans les ADR antérieurs, qui ne se réécrivent pas.

## Événements

| Terme                      | Code                             | Définition                                                                                                                                                                                                     |
| -------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Édition**                | `Edition`                        | Un événement daté : une soirée In House, une ligue, un tournoi, une LAN. _C'est le seul mot pour « événement » dans le code._                                                                                  |
| **Type d'édition**         | `EditionType`                    | `league_div1`, `league_div2`, `inhouse`, `tournament`, `lan`, `external_lan`, `external_event`.                                                                                                                |
| **Ligue**                  | `league_div1` / `league_div2`    | Compétition entre équipes permanentes, en deux divisions, jouée en journées.                                                                                                                                   |
| **Division**               | `Division`                       | `div1` ou `div2`. Niveau d'une ligue ou d'une équipe.                                                                                                                                                          |
| **In House (IH)**          | `inhouse`                        | Soirée où les joueurs sont répartis en équipes éphémères (équipes IH).                                                                                                                                         |
| **Événement externe**      | `external_lan`, `external_event` | Événement hors Arrakis auquel des membres participent. **Pas de matchs enregistrés**, seulement des participants et éventuellement une victoire.                                                               |
| **Prestige**               | `Prestige`                       | `normal` (×1,0), `premium` (×1,3), `championship` (×1,6). Multiplie le poids des matchs de l'édition dans le calcul des sous-notes. _Voir [question ouverte Q2](../open-questions.md)._                        |
| **Journée**                | `matchday`                       | Numéro de manche d'une ligue (J1, J2…).                                                                                                                                                                        |
| **Finale / Grande finale** | `isFinal` / `isGrandFinal`       | Match décisif d'un tournoi / dernière confrontation d'une ligue.                                                                                                                                               |
| **Numéro d'affichage**     | `displayNumber`                  | Numéro séquentiel d'une édition (« D1 #3 »). **Immuable** une fois attribué, pour que les liens partagés restent valides.                                                                                      |
| **Inscription**            | `Registration`                   | Déclaration d'un joueur connecté qui veut participer à une édition à venir. Distincte de la participation réelle, qui est déduite des matchs.                                                                  |
| **Statut d'édition**       | `EditionStatus`                  | `upcoming` (à venir), `ongoing` (en cours) ou `completed` (terminée). **Jamais saisi** : déduit de la date, des publications et d'une éventuelle clôture ([ADR 0013](../adr/0013-statut-d-edition-deduit.md)). |
| **Clôture d'édition**      | `closeEdition`                   | Action admin qui déclare terminée une édition que les faits ne suffisent pas à terminer : une ligue sans finale, un tournoi interrompu.                                                                        |

## Publication

Voir l'[ADR 0012](../adr/0012-publier-les-resultats.md).

| Terme           | Code                 | Définition                                                                                                                                                  |
| --------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Brouillon**   | `draft`              | Résultat saisi ou importé, pas encore publié : enregistré, mais invisible du public et ignoré par tout ce qu'il voit.                                       |
| **Publication** | `Publication`        | Acte par lequel un admin rend publics les brouillons d'une édition. _Fait_ : quelle édition, quels matchs, quand, par qui.                                  |
| **Aperçu**      | `PublicationPreview` | Ce qu'une publication changera (notes, paliers, classement, badges), montré à l'admin avant qu'il publie. _Projection, la seule qui compte les brouillons._ |
| **Récap**       | `Recap`              | Ce qu'une publication a changé, montré à tous : qui monte, qui change de palier, le MVP, les badges gagnés. _Projection._                                   |

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
| **Note**                 | `rating`                          | Note de carte, entre 60 et 99, calculée sur la saison active. Voir la [spécification](rating-spec.md).                      |
| **Historique de note**   | `editionHistory`                  | La note d'un joueur après chaque édition qu'il a jouée. _Projection._ Passera au grain de la publication (ADR 0012).        |
| **Explication de note**  | `RatingBreakdown`                 | Le détail du calcul d'une note : ce que chaque sous-note et chaque règle y apporte. _Projection._                           |
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

## Prévu en tranche 3

Ces termes servent déjà dans la [vision](../product/vision.md) et les
[cas d'usage](../product/use-cases.md). Leur identifiant de code sera fixé à
l'ouverture de leur ticket.

| Terme                    | Code | Définition                                                                                                                       |
| ------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Album de saison**      | —    | Les cartes de tous les joueurs telles que la clôture d'une saison les a figées, avec les récompenses de cette saison.            |
| **Récompense de saison** | —    | Badge attribué une fois par saison, à sa clôture : meilleure progression, révélation, meilleur duo.                              |
| **Bilan de saison**      | —    | Résumé de la saison d'un joueur, en une image à partager.                                                                        |
| **Note de patch**        | —    | Annonce d'un changement de règle de calcul de la note : ce qui change, pourquoi, et la note de chacun avant et après (ADR 0007). |
| **Fiche de match**       | —    | Page préparée pour les commentateurs avant un match : les dix cartes, les duels par rôle, l'historique entre les deux équipes.   |

## Architecture

| Terme          | Code      | Définition                                                                                                                                                                                   |
| -------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fait**       | —         | Donnée saisie, source de vérité : éditions, matchs, performances, publications, transferts, personnalisation.                                                                                |
| **Projection** | —         | Donnée calculée à partir des faits : notes, historiques, classements, badges, récaps. Peut être supprimée et reconstruite à tout moment. Les brouillons n'y entrent pas, sauf dans l'aperçu. |
| **Commande**   | `Command` | Une intention d'écriture nommée en langage métier (`importEdition`, `closeSeason`). Exécutée en une transaction côté serveur.                                                                |

## Termes à ne plus utiliser

| Ne pas dire                      | Dire plutôt               | Pourquoi                                                                     |
| -------------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| événement / event (dans le code) | édition                   | Trois mots désignaient la même chose en v1                                   |
| soirée (dans le code)            | édition de type `inhouse` | Idem                                                                         |
| `JUNGLE`, `SUPPORT`              | `JGL`, `SUP`              | Un seul énuméré de rôles                                                     |
| `playerName` comme identifiant   | `playerId`                | Le pseudo change, l'identifiant non                                          |
| split                            | saison                    | Un seul niveau de période (ADR 0014). Le mot ne reste que pour décrire la v1 |
