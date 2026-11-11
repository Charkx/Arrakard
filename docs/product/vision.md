# Vision et périmètre

## Le produit en une phrase

Raconter la vie compétitive de la communauté Arrakis, édition après édition :
chaque joueur a une **carte qui reflète fidèlement son niveau**, et la
communauté un endroit unique pour suivre ses compétitions.

La v1 est un site de statistiques, où l'on vient consulter des chiffres. La v2
garde chaque match et sait tout recalculer à n'importe quelle date : elle peut
dire ce qui a changé, quand, et pourquoi.

## Ce que la v2 apporte

Les identifiants renvoient aux [cas d'usage](use-cases.md).

**Pour les joueurs**

- **Le récap**, cœur du site : après chaque publication de résultats, qui
  monte, qui change de palier, le MVP, les badges gagnés (V11). Un lien à
  poster sur Discord (S3).
- **Une carte qui a une histoire** : sa note après chaque publication, et
  pourquoi elle a bougé (V3, V10).
- **La saison comme un album** : à la clôture, les cartes sont figées, les
  récompenses calculées, et chacun reçoit son bilan à partager (V8, V12).

**Pour la note**

- **Des notes de patch** : quand une règle de calcul change, le site publie ce
  qui change, pourquoi, et la note de chacun avant et après. Les admins
  simulent avant de valider (A13, V14). C'est la mise en forme du principe
  posé par l'[ADR 0007](../adr/0007-evolution-de-la-note.md).

**Pour ceux qui font vivre l'association**

- **Préparer, saisir, publier** : les résultats restent en brouillon jusqu'à
  la publication, et l'admin voit avant ce qui va changer (A11,
  [ADR 0012](../adr/0012-publier-les-resultats.md)).
- **Des équipes d'In House proposées** à partir des inscrits (A12).
- **Une fiche de match** prête à lire pour les commentateurs (V13).

## Acteurs

| Acteur                 | Qui                                               | Ce qu'il attend                                         |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| **Visiteur**           | N'importe qui, sans compte                        | Consulter classements, cartes, profils, éditions        |
| **Joueur**             | Membre connecté via Discord, lié à une carte      | Personnaliser _sa_ carte, s'inscrire aux éditions       |
| **Admin**              | Membre ayant le rôle admin sur le Discord Arrakis | Saisir et publier les résultats, gérer rosters, saisons |
| **Commentateur**       | Membre qui commente les matchs en direct          | Une fiche prête à lire avant chaque match               |
| **Discord**            | Système externe                                   | Authentification, rôles, réception des annonces         |
| **Twitch**             | Système externe                                   | Statut « en direct » des chaînes de la communauté       |
| **Riot / Data Dragon** | Système externe                                   | Icônes des champions                                    |

## Objectifs de la v2

1. **Intégrité** : une note, un historique ou un classement affiché est
   toujours cohérent avec les matchs publiés, et reconstructible.
2. **Du visible, tôt** : la v2 se livre par tranches, la lecture d'abord
   ([ADR 0011](../adr/0011-livrer-par-tranches.md)). Elle ne vise pas la
   parité avec la v1 : elle reprend ce qui sert
   ([ADR 0016](../adr/0016-perimetre-repris-de-la-v1.md)).
3. **Une note qui s'explique** : chaque joueur peut lire d'où vient sa note
   et pourquoi elle a bougé.
4. **Évolutivité** : changer la formule de note, ajouter un type
   d'édition ou un barème se fait sans migration manuelle de données.
5. **Accueil des contributeurs** : un membre qui connaît TypeScript lance le
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
  produit par les organisateurs). _À étudier, voir la
  [question Q14](../open-questions.md)._
- Habillage de stream (scènes à incruster dans la diffusion) : la fiche de
  match (V13) vient d'abord.

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
| Langues        | Interface en français et en anglais                                                                                                 |
| Coût           | Reste dans les offres gratuites Supabase et Vercel                                                                                  |
| Qualité        | CI bloquante : lint, TypeScript strict, tests ; couverture ≥ 95 % sur le domaine                                                    |
| Exploitabilité | Un environnement local complet démarre avec deux commandes                                                                          |
