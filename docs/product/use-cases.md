# Cas d'usage

Inventaire tiré de la v1, à valider. Priorités :

- **P1** — cœur de la v2, requis pour la bascule.
- **P2** — attendu à la bascule, mais peut suivre de quelques semaines.
- **P3** — après la bascule.

Les termes en gras sont définis dans le [glossaire](../domain/glossary.md).

## Visiteur

| ID  | Cas d'usage                                                                                                | Prio |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- |
| V1  | Voir le **classement** du **split** actif, filtrable par division et **rôle**, avec podium                 | P1   |
| V2  | Voir la **carte** et le profil d'un joueur : note, sous-notes, **palier**, historique de matchs, champions | P1   |
| V3  | Voir la progression d'un joueur de split en split                                                          | P1   |
| V4  | Voir une page **édition** : résultats, matchs, **classement de soirée**, timeline par **journée**          | P1   |
| V5  | Voir le profil d'une **équipe** : roster, palmarès, confrontations directes                                | P2   |
| V6  | Parcourir la galerie de toutes les cartes (recherche, filtre par palier)                                   | P2   |
| V7  | Page d'accueil : prochain événement, dernier résultat, top 3, chaînes en direct                            | P2   |
| V8  | ArrakisDex : encyclopédie des joueurs                                                                      | P3   |
| V9  | Recherche rapide (palette de commandes)                                                                    | P3   |

## Joueur connecté

| ID  | Cas d'usage                                                                              | Prio |
| --- | ---------------------------------------------------------------------------------------- | ---- |
| J1  | Se connecter avec Discord                                                                | P1   |
| J2  | Personnaliser **sa** carte (titre, badges affichés, fond, comptes Riot) selon son palier | P2   |
| J3  | S'**inscrire** à une édition à venir, modifier ou annuler son inscription                | P2   |
| J4  | Exporter sa carte en PNG et la partager sur Discord                                      | P3   |

## Admin

| ID  | Cas d'usage                                                                                                                                       | Prio |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| A1  | **Importer une édition** depuis un fichier Excel, avec détection des réimports, des joueurs inconnus, des équipes inconnues et des **transferts** | P1   |
| A2  | Corriger un match ou une performance après import                                                                                                 | P1   |
| A3  | Créer, modifier, archiver une édition (y compris événements externes sans matchs)                                                                 | P1   |
| A4  | Gérer les équipes et les rosters : créer, transférer un joueur, archiver                                                                          | P1   |
| A5  | **Fusionner** deux profils qui désignent le même joueur                                                                                           | P1   |
| A6  | Lier une carte à un compte Discord                                                                                                                | P1   |
| A7  | Ouvrir et clôturer un **split** (la clôture fige les notes du split)                                                                              | P1   |
| A8  | Désigner le **MVP de soirée** et ajuster le **barème** d'une édition                                                                              | P2   |
| A9  | Consulter et gérer les inscriptions d'une édition                                                                                                 | P2   |
| A10 | Configurer les chaînes Twitch suivies                                                                                                             | P3   |

## Système

| ID  | Cas d'usage                                                                       | Prio |
| --- | --------------------------------------------------------------------------------- | ---- |
| S1  | Recalculer toutes les **projections** après chaque commande d'écriture            | P1   |
| S2  | Attribuer le rôle admin d'après le rôle Discord, et le retirer quand il disparaît | P1   |
| S3  | Notifier Discord à la publication d'un résultat                                   | P3   |
| S4  | Exposer le statut « en direct » des chaînes Twitch                                | P3   |

## Critères de bascule

La v1 est coupée quand **tous** les critères suivants sont remplis. Chacun se
vérifie par un test automatisé ou une action datée, pas par une impression.

### Fonctionnels

- [ ] Tous les cas d'usage **P1** fonctionnent sur le staging, avec les données
      de production migrées.
- [ ] Une édition réelle est importée sur le staging (A1) avec le même fichier
      qu'en production, et donne le même classement de soirée.
- [ ] _À trancher :_ J2 (personnalisation) et J3 (inscriptions) existent en v1.
      Les livrer à la bascule, ou accepter de les retirer quelques semaines ?

### Données

- [ ] La migration v1 → v2 tourne de bout en bout sur une copie de la
      production, sans intervention manuelle.
- [ ] Pour chaque joueur et chaque split, la note v2 est identique à la note
      v1 (même principe que le golden master, sur toutes les données).
- [ ] Chaque compte Discord lié en v1 est lié à la même carte en v2.

### Exploitation

- [ ] Une sauvegarde SQL complète de la production v1 (`supabase db dump`)
      existe, et sa restauration a été essayée.
- [ ] Le retour arrière est écrit : comment remettre la v1 en ligne, en
      combien de temps, et ce qui est perdu des écritures faites entre-temps.
- [ ] La CI est verte sur `main`, et `main` est protégée.
- [ ] Les admins ont fait une répétition sur le staging : import, correction,
      fusion.
