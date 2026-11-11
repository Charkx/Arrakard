# Cas d'usage

Ce que le système doit faire, rangé par tranche de livraison
([ADR 0011](../adr/0011-livrer-par-tranches.md)) :

- **T1 — Lecture** : le site v2 est en ligne en lecture seule, nourri par la
  migration. La v1 reste l'outil des admins.
- **T2 — Soirée** : les admins saisissent et publient dans la v2. La v1 est
  coupée à la fin de cette tranche : c'est la bascule. Un cas marqué « peut
  suivre » peut arriver quelques semaines après la bascule.
- **T3 — Histoire** : après la bascule, dans l'ordre que la communauté
  demande.

La v2 ne vise pas la parité avec la v1
([ADR 0016](../adr/0016-perimetre-repris-de-la-v1.md)). Les cas d'usage
marqués _nouveau_ n'existent pas en v1.

Les termes en gras sont définis dans le [glossaire](../domain/glossary.md).

## Visiteur

| ID  | Cas d'usage                                                                                                                                                            | Tranche |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| V1  | Voir le **classement** de la **saison active**, filtrable par division et **rôle**, avec podium                                                                        | T1      |
| V2  | Voir la **carte** et le profil d'un joueur : note, sous-notes, **palier**, historique de matchs, champions                                                             | T1      |
| V3  | Remonter le temps d'un joueur : son **historique de note** et sa carte après chaque édition, puis de saison en saison. Au grain de la publication en T2                | T1      |
| V4  | Voir une page **édition** : résultats, matchs, **classement de soirée**, timeline par **journée**                                                                      | T1      |
| V5  | Voir le profil d'une **équipe** : roster, palmarès, confrontations directes                                                                                            | T1      |
| V6  | Parcourir la galerie de toutes les cartes (recherche, filtre par palier). C'est la seule liste de cartes                                                               | T1      |
| V7  | Page d'accueil : la dernière édition jouée et la prochaine. En T2, elle gagne le dernier **récap** et, pour le joueur connecté, où il en est (J5)                      | T1      |
| V8  | Feuilleter l'**album de saison** : les cartes figées de chaque saison clôturée et ses **récompenses de saison**. Remplace l'ArrakisDex                                 | T3      |
| V9  | Recherche rapide (palette de commandes)                                                                                                                                | T3      |
| V10 | Comprendre une note : lire l'**explication de note** d'un joueur, pourquoi elle a bougé, et ce qui lui manque pour le palier suivant. _Nouveau_                        | T1      |
| V11 | Lire le **récap** d'une publication : qui monte, qui change de palier, le MVP, les badges gagnés. _Nouveau_                                                            | T2      |
| V12 | Voir le **bilan de saison** d'un joueur, une image à partager, à la clôture de la saison. _Nouveau_                                                                    | T3      |
| V13 | Lire la **fiche de match** d'un match à venir : les dix cartes, les duels par rôle, l'historique entre les deux équipes, deux anecdotes tirées des chiffres. _Nouveau_ | T3      |
| V14 | Lire une **note de patch** : ce qui change dans le calcul de la note, pourquoi, et la note de chacun avant et après. _Nouveau_                                         | T3      |

## Joueur connecté

| ID  | Cas d'usage                                                                              | Tranche         |
| --- | ---------------------------------------------------------------------------------------- | --------------- |
| J1  | Se connecter avec Discord                                                                | T2              |
| J2  | Personnaliser **sa** carte (titre, badges affichés, fond, comptes Riot) selon son palier | T2, peut suivre |
| J3  | S'**inscrire** à une édition à venir, modifier ou annuler son inscription                | T2, peut suivre |
| J4  | Exporter sa carte en PNG et la partager sur Discord                                      | T3              |
| J5  | Voir où il en est : sa soirée en tête du récap, son résumé sur l'accueil. _Nouveau_      | T2, peut suivre |

## Admin

| ID  | Cas d'usage                                                                                                                                                         | Tranche         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| A1  | **Importer une édition** depuis un fichier Excel, en **brouillon**, avec détection des réimports, des joueurs inconnus, des équipes inconnues et des **transferts** | T2              |
| A2  | Corriger un match ou une performance, en brouillon ou déjà publié                                                                                                   | T2              |
| A3  | Créer, modifier, archiver une édition (y compris événements externes sans matchs) ; la **clôturer** quand les faits ne suffisent pas à la terminer                  | T2              |
| A4  | Gérer les équipes et les rosters : créer, transférer un joueur, archiver                                                                                            | T2              |
| A5  | **Fusionner** deux profils qui désignent le même joueur                                                                                                             | T2              |
| A6  | Lier une carte à un compte Discord                                                                                                                                  | T2              |
| A7  | Ouvrir et clôturer une **saison** (la clôture fige les notes de la saison)                                                                                          | T2              |
| A8  | Désigner le **MVP de soirée** et ajuster le **barème** d'une édition                                                                                                | T2, peut suivre |
| A9  | Consulter et gérer les inscriptions d'une édition                                                                                                                   | T2, peut suivre |
| A10 | Configurer les chaînes Twitch suivies                                                                                                                               | T3              |
| A11 | **Publier** les résultats en brouillon d'une édition, après avoir lu l'**aperçu** de ce qui va changer. _Nouveau_                                                   | T2              |
| A12 | Obtenir une proposition d'équipes d'In House équilibrées, à partir des inscrits, de leurs rôles et de leurs notes. _Nouveau_                                        | T3              |
| A13 | Simuler un changement de règle de note, puis le publier avec sa **note de patch**. _Nouveau_                                                                        | T3              |

## Système

| ID  | Cas d'usage                                                                                                                                | Tranche |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| S1  | Recalculer toutes les **projections** quand les faits changent : à chaque migration en T1, à chaque publication et à chaque commande en T2 | T1      |
| S2  | Attribuer le rôle admin d'après le rôle Discord, et le retirer quand il disparaît                                                          | T2      |
| S3  | Annoncer chaque publication sur Discord, avec le lien du récap                                                                             | T2      |
| S4  | Exposer le statut « en direct » des chaînes Twitch                                                                                         | T3      |
| S5  | Rejouer la migration v1 → v2 de bout en bout, sans intervention manuelle, pour rafraîchir le site en lecture. _Nouveau_                    | T1      |

## Critères de mise en ligne de la tranche 1

Le site en lecture est ouvert au public quand **tous** les critères suivants
sont remplis. Chacun se vérifie par un test automatisé ou une action datée,
pas par une impression.

- [ ] La migration v1 → v2 tourne de bout en bout sur une copie de la
      production, sans intervention manuelle, et se rejoue (S5).
- [ ] Pour chaque joueur et chaque saison, la note v2 est identique à la note
      v1, sauf les écarts expliqués par une anomalie connue
      ([spécification](../domain/migration-spec.md#vérification)).
- [ ] V1, V2, V4 et V10 fonctionnent avec les données migrées. V3, V5, V6 et
      V7 peuvent suivre dans la même tranche.
- [ ] Les écarts connus avec la v1 sont annoncés à la communauté, et le site
      dit qu'il est en lecture seule.
- [ ] La CI est verte sur `main`, et `main` est protégée.

## Critères de bascule

La v1 est coupée, à la fin de la tranche 2, quand **tous** les critères
suivants sont remplis. Ils se vérifient de la même façon.

### Fonctionnels

- [ ] Tous les cas d'usage **T2** fonctionnent sur le staging, avec les
      données de production migrées. Ceux marqués « peut suivre » ne bloquent
      pas.
- [ ] Une édition réelle est importée, relue dans l'aperçu puis publiée sur le
      staging (A1, A11) avec le même fichier qu'en production, et donne le
      même classement de soirée.
- [ ] _À trancher :_ J2 (personnalisation) et J3 (inscriptions) existent en v1
      et sont marqués « peut suivre ». Les livrer à la bascule, ou accepter de
      les retirer quelques semaines ?

### Données

- [ ] Les critères de la tranche 1 sont remplis sur la dernière sauvegarde de
      la production.
- [ ] Chaque compte Discord lié en v1 est lié à la même carte en v2.

### Exploitation

- [ ] Une sauvegarde SQL complète de la production v1 (`supabase db dump`)
      existe, et sa restauration a été essayée.
- [ ] Le retour arrière est écrit : comment remettre la v1 en ligne, en
      combien de temps, et ce qui est perdu des écritures faites entre-temps.
- [ ] Les admins ont fait une répétition sur le staging : import, aperçu,
      publication, correction, fusion.
