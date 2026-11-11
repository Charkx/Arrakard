# 0017 — Les outils du site : React, Vite et Tailwind

- **Statut** : Accepté
- **Date** : 2026-11-12

## Contexte

La tranche 1 met en ligne un site en lecture
([ADR 0011](0011-livrer-par-tranches.md)). Il faut choisir ses outils avant la
première page, car toutes les pages suivantes s'y poseront.

Deux contraintes :

- le design de la v1 est repris. La v1 est écrite avec React, Vite et
  Tailwind, et Charly connaît ces trois outils ;
- le navigateur affiche et envoie des commandes, il ne calcule rien qu'il
  enregistre. Le site n'a donc pas besoin d'un serveur à lui.

## Décision

Le site vit dans `apps/web`. Il est écrit avec **React**, construit par
**Vite** et stylé avec **Tailwind**. Ses composants sont testés avec Vitest,
Testing Library et jsdom.

Les couleurs et la typographie de la v1 sont des variables de style, déclarées
une seule fois dans `apps/web/src/styles.css`.

La CI construit le site et mesure le JavaScript chargé à l'ouverture : elle
échoue au-delà de 250 kB compressé.

Toute autre dépendance (navigation entre pages, accès à la base, cache)
s'ajoute avec la première page qui en a besoin, après validation.

## Options écartées

- **Un framework avec rendu côté serveur** (Next.js, Remix) : un serveur de
  plus à héberger et à comprendre, pour un site que 260 joueurs consultent.
- **Du CSS sans Tailwind** : aucune dépendance, mais chaque composant repris
  de la v1 serait à réécrire.
- **Un autre framework** (Svelte, Vue) : rien à reprendre de la v1, et un
  outil de plus à apprendre en même temps que l'architecture et le TDD.

## Conséquences

- Les composants de la v1 se reprennent presque tels quels.
- Le site est un ensemble de fichiers statiques : n'importe quel hébergeur
  convient ([Q17](../open-questions.md)).
- Le lint applique les règles des hooks React, qui avaient manqué à la v1
  ([ADR 0006](0006-tdd-et-golden-master.md)).
- Les couleurs ont été reprises de la feuille de style de la v1, pas de sa
  configuration Tailwind : les deux se contredisaient par endroits.
- **Les fichiers de police ne sont pas encore chargés.** La v1 en déclare
  plusieurs, de sources différentes. Le choix se fera avec la première vraie
  page : il dépend de la licence de chaque police (le dépôt est public) et du
  refus de faire appeler un service tiers par le navigateur des visiteurs.
  D'ici là, le site utilise les polices de secours.
