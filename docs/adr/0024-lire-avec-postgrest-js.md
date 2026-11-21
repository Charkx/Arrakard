# 0024 — Lire la base avec postgrest-js

- **Statut** : Accepté
- **Date** : 2026-11-21
- **Amende** : [0019](0019-lire-la-base-depuis-le-site.md) (la bibliothèque d'accès à la base)

## Contexte

L'[ADR 0019](0019-lire-la-base-depuis-le-site.md) fait lire la base par
`@supabase/supabase-js`. À la mise en ligne (ticket 16), Lighthouse mesure sur
un profil, en mobile, un Largest Contentful Paint de 3,3 à 3,7 s, pour un
objectif de 2 s ([vision](../product/vision.md#volumétrie)). Le temps part
surtout dans le téléchargement et l'exécution du JavaScript (2,3 s de travail
sur le fil principal), pas dans la base.

Le code de nos pages pèse peu (36 kB de source). `supabase-js` embarque la
connexion, le stockage de fichiers et le temps réel, soit environ un tiers du
JavaScript du site, alors que le site ne fait que lire des vues.

## Décision

Le site lit la base avec **`@supabase/postgrest-js`**, le client de l'API REST
que `supabase-js` utilise lui-même. Les requêtes s'écrivent de la même façon ;
seul l'adaptateur de lecture (`supabase-source.ts`) change.

`supabase-js` reviendra avec la connexion Discord (tranche 2), chargé
seulement par les pages qui en ont besoin.

## Options écartées

- **Garder `supabase-js`** : rien à changer, mais un tiers du JavaScript ne
  sert à rien sur des pages publiques en lecture.
- **Des appels `fetch` écrits à la main** : aucune dépendance, mais il faudrait
  refaire la construction des filtres et des jointures que fait postgrest-js.
- **Découper le code par page** : nos pages font 36 kB, le gain serait
  presque nul.

## Conséquences

- Le JavaScript du site passe de 152 à 102 kB compressés.
- Une dépendance directe change, sans paquet nouveau dans l'arbre :
  postgrest-js y était déjà, par `supabase-js`.
- La connexion de la tranche 2 devra charger `supabase-js` à part, sans
  l'imposer aux pages publiques.
