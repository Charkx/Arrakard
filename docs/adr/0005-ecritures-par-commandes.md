# 0005 — Écritures par commandes transactionnelles

- **Statut** : Accepté (spike concluant, 2026-10-05)
- **Date** : 2026-10-03
- **Complété par** : [0009](0009-serialiser-et-journaliser-les-commandes.md) (verrou par organisation, journal)

## Contexte

En v1, le front écrit directement dans les tables (upsert via PostgREST) :
plusieurs requêtes par action, sans transaction commune, et sans protection
contre deux admins qui modifient la même chose. Une seule RPC (remplacement
des matchs d'une édition) était transactionnelle.

## Décision

Toute écriture passe par une **commande** nommée en langage métier :
`importEdition`, `updatePerformance`, `mergePlayers`, `transferPlayer`,
`closeSplit`, `updateMyCardCustomization`…

Chaque commande est une Edge Function qui :

1. vérifie le JWT et l'autorisation ;
2. valide l'entrée avec le schéma Zod de `contracts` ;
3. ouvre une **transaction Postgres** (connexion directe via `SUPABASE_DB_URL`) ;
4. contrôle la **version** de l'agrégat modifié (`editions.version`) et répond
   `409 Conflict` si elle a changé depuis la lecture de l'admin ;
5. écrit les faits, recalcule les projections ([ADR 0003](0003-faits-et-projections.md)),
   puis valide (`COMMIT`).

Le rôle `anon` / `authenticated` n'a **aucun droit d'écriture** direct sur les
tables, à deux exceptions près, limitées par la RLS à la ligne du joueur
connecté : ses **inscriptions** (libre-service) et la **personnalisation de
sa carte** (RPC dédiée, comme en v1).

## Résultats du spike

| Question                                                        | Résultat                                                                                                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Une Edge Function (Deno) peut-elle importer `packages/domain` ? | **Oui**, directement, à condition que les imports relatifs du domaine portent leur extension (`'./rating.ts'`). Une règle de lint l'impose. Pas de bundle ni de fichier généré. |
| Transaction Postgres depuis une Edge Function ?                 | **Oui**, via `SUPABASE_DB_URL` et le client `npm:postgres` : écriture validée, annulée en cas d'erreur.                                                                         |
| Durée d'un recalcul complet ?                                   | **83 ms** pour 12 540 performances (3× la production). Cible : < 2 s.                                                                                                           |

Reste à vérifier au premier déploiement sur le projet de staging : le
bundler de `supabase functions deploy` embarque bien les fichiers du domaine
situés hors de `supabase/functions/`.

## Options écartées

- **RPC PL/pgSQL** : atomique, mais la logique métier serait réécrite en SQL,
  hors du domaine testé.
- **Écriture directe depuis le front + RLS** (v1) : ni transaction ni
  contrôle de concurrence, et c'est le client qui décide de la valeur.

## Conséquences

- Une seule porte d'entrée par action métier : facile à auditer et à tester.
- Les commandes se testent d'abord avec des dépôts en mémoire, puis contre
  un Supabase local.
- Il y a plus de code serveur qu'en v1, et le démarrage à froid des Edge
  Functions ajoute de la latence aux actions admin. C'est acceptable.
