# Vision et périmètre

## Le produit en une phrase

Donner à chaque joueur de la communauté Arrakis une **carte qui reflète
fidèlement son niveau**, et à la communauté un endroit unique pour suivre ses
compétitions internes.

## Acteurs

| Acteur                 | Qui                                               | Ce qu'il attend                                     |
| ---------------------- | ------------------------------------------------- | --------------------------------------------------- |
| **Visiteur**           | N'importe qui, sans compte                        | Consulter classements, cartes, profils, événements  |
| **Joueur**             | Membre connecté via Discord, lié à une carte      | Personnaliser _sa_ carte, s'inscrire aux événements |
| **Admin**              | Membre ayant le rôle admin sur le Discord Arrakis | Saisir les résultats, gérer rosters et saisons      |
| **Discord**            | Système externe                                   | Authentification, rôles, réception de notifications |
| **Twitch**             | Système externe                                   | Statut « en direct » des chaînes de la communauté   |
| **Riot / Data Dragon** | Système externe                                   | Icônes des champions                                |

## Objectifs de la v2

1. **Intégrité** : une note, un historique ou un classement affiché est
   toujours cohérent avec les matchs enregistrés, et reconstructible.
2. **Parité fonctionnelle** avec la v1 sur les cas d'usage prioritaires
   (voir [cas d'usage](use-cases.md)).
3. **Évolutivité** : changer la formule de note, ajouter un type
   d'événement ou un barème se fait sans migration manuelle de données.
4. **Accueil des contributeurs** : un membre qui connaît TypeScript lance le
   projet et comprend où modifier une règle en moins d'une heure.

## Préparé, mais pas construit

- **Plusieurs structures esport** sur une même instance (multi-tenant), et
  installation chez un client (on premise). Le modèle de données et la
  configuration le permettent dès la v2 ; le produit SaaS (inscription,
  facturation) attendra un premier client. Voir l'[ADR 0008](../adr/0008-multi-tenant-et-portabilite.md).

## Non-objectifs (v2)

- Application mobile native (le site reste responsive).
- Temps réel (WebSocket) : un rechargement suffit pour voir un nouveau résultat.
- Import automatique depuis l'API Riot (l'import reste un fichier Excel
  produit par les organisateurs). _Candidat pour une v3._

## Volumétrie

Mesurée sur l'export de juin 2026 :

| Donnée                                  | Volume                     |
| --------------------------------------- | -------------------------- |
| Éditions                                | 9 (dont 6 avec des matchs) |
| Matchs                                  | 396                        |
| Lignes de rôle (2 performances chacune) | 1 980                      |
| Joueurs                                 | 261                        |
| Équipes                                 | 32                         |

Projection pessimiste : ×10 en cinq ans, soit ~4 000 matchs et ~40 000
performances. **Postgres traite ce volume en quelques millisecondes.**

Conséquence assumée : on recalcule toutes les projections à chaque écriture
plutôt que de maintenir un calcul incrémental. Seuil de réexamen : un recalcul
complet qui dépasse 2 secondes.

## Exigences non fonctionnelles

| Exigence       | Cible                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Intégrité      | Toute projection peut être supprimée et reconstruite à l'identique                                                                  |
| Sécurité       | Écritures réservées aux admins (RLS + vérification dans chaque commande) ; un joueur ne modifie que la personnalisation de sa carte |
| Concurrence    | Deux admins qui modifient la même édition : le second est prévenu, jamais écrasé en silence                                         |
| Performance    | Page publique utilisable en < 2 s sur mobile 4G ; JS initial < 250 kB gzip                                                          |
| Coût           | Reste dans les offres gratuites Supabase et Vercel                                                                                  |
| Qualité        | CI bloquante : lint, TypeScript strict, tests ; couverture ≥ 95 % sur le domaine                                                    |
| Exploitabilité | Un environnement local complet démarre avec deux commandes                                                                          |
