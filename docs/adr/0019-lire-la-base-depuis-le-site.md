# 0019 — Lire la base depuis le site

- **Statut** : Proposé
- **Date** : 2026-11-12

## Contexte

La page Classement est la première qui lit la base. L'[ADR 0017](0017-outils-du-site.md)
renvoyait à cette page trois choix : la navigation entre pages, l'accès à la
base et le cache.

Les chiffres : quelques centaines de joueurs, une saison en cours, des pages
qui changent après chaque publication, quelques fois par semaine.

## Décision

- **Navigation** : `react-router-dom`. Les adresses sont celles de la v1
  (`/leaderboard`, `/player/:id`), pour que les liens partagés restent valides.
  Les filtres d'une page vivent dans son adresse.
- **Accès à la base** : `@supabase/supabase-js`, qui lit une **vue SQL par
  page** (`leaderboard_view`), avec les droits d'un visiteur. Le site ne lit
  jamais une table directement.
- **Pas de cache** : chaque page charge ses données à l'ouverture, par un
  petit crochet maison (`useLoaded`). Les pages sont derrière une source de
  données (`DataSource`) : les tests les nourrissent en mémoire.

Le navigateur range et affiche. Il ne calcule aucune note : elles viennent de
la base. Il range avec la règle du domaine (`rankLeaderboard`), pour que l'ordre
soit le même partout.

## Options écartées

- **TanStack Query** (prévu dans la vue d'architecture) : un cache utile quand
  les données changent souvent ou que les pages se rechargent beaucoup. Pas ici,
  pas encore. Il s'ajoutera si une page le justifie.
- **Lire les tables directement** : chaque page devrait recoller elle-même les
  joueurs, les équipes et les notes, et en télécharger plus qu'elle n'affiche.
- **Requêtes SQL écrites à la main** (sans bibliothèque) : il faudrait refaire
  ce que fait déjà `supabase-js`.

## Conséquences

- Une page de plus, c'est une vue SQL de plus, avec ses tests d'accès.
- En local, le site lit la base de `pnpm db:start` sans configuration. En
  ligne, il lui faut l'adresse et la clé publique du projet (`env.example`).
- Le JavaScript du site passe de 69 à 143 kB compressés, surtout à cause de
  `supabase-js` : la limite reste à 250 kB.
- Le rang d'avant la dernière édition se calcule encore dans le navigateur, à
  partir des notes de la base. Il pourrait passer dans la vue si une autre page
  en a besoin.
