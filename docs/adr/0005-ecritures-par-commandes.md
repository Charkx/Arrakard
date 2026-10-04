# 0005 — Écritures par commandes transactionnelles

- **Statut** : Proposé — un spike doit valider la faisabilité technique
- **Date** : 2026-10-03

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
tables. Seule la personnalisation de carte d'un joueur passe par une RPC
dédiée, comme en v1.

## Points à valider par le spike

- Les Edge Functions (Deno) peuvent-elles importer `packages/domain` ?
  Repli : construire `domain` en un fichier ESM unique, copié dans
  `supabase/functions/_shared/` à la compilation.
- Durée d'un recalcul complet sur les données réelles, à l'intérieur d'une
  transaction : cible < 2 s.

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
