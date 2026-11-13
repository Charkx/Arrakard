# 0020 — Héberger le site en lecture

- **Statut** : Accepté
- **Date** : 2026-11-13

## Contexte

La tranche 1 met en ligne un site en lecture seule, nourri par la migration
([ADR 0011](0011-livrer-par-tranches.md)). Il lui faut une base et une adresse
(question Q17).

Les contraintes : rester dans les offres gratuites
([vision](../product/vision.md#exigences-non-fonctionnelles)), ne faire courir
aucun risque à la v1, qui reste l'outil des admins jusqu'à la bascule, et
garder des outils que Charly connaît déjà. La v1 occupe un projet Supabase et
un projet Vercel. L'offre gratuite de Supabase permet deux projets actifs.

Le site est un ensemble de fichiers statiques (Vite) qui lit la base avec la
clé publique ([ADR 0019](0019-lire-la-base-depuis-le-site.md)).

## Décision

- **La base** : un **nouveau projet Supabase** gratuit, séparé de celui de la
  v1. Il reçoit les migrations du dépôt (`supabase db push`), puis la
  sauvegarde de la v1 chargée par `load --confirm-hosted`.
- **Le site** : un **nouveau projet Vercel** gratuit, dont la racine est
  `apps/web`. Il se reconstruit à chaque fusion dans `main`. Toutes les
  adresses servent `index.html`, pour qu'un lien vers un profil s'ouvre
  directement (`apps/web/vercel.json`).
- **Recharger après un événement** : une nouvelle sauvegarde de la v1
  (`backup`), puis `load --replace --confirm-hosted`. Le site n'a pas besoin
  d'être reconstruit : il lit la base à chaque ouverture de page.

La marche à suivre est dans [Mise en ligne](../operations/mise-en-ligne.md).

## Options écartées

- **Les tables de la v2 dans le projet Supabase de la v1** : un seul projet à
  gérer, mais une erreur de migration toucherait la production de la v1.
- **Cloudflare Pages ou Netlify pour le site** : gratuits aussi, mais un compte
  et un outil de plus, sans gain à cette taille.
- **Synchroniser la v1 vers la v2 en continu** : plus d'automatisme, mais un
  outil à écrire et à surveiller pour une tranche qui dure quelques semaines.
  Un rechargement à la main après chaque événement suffit.

## Conséquences

- La v1 ne peut pas être abîmée par la v2 : elle n'est que lue, par son API
  publique.
- Un projet Supabase gratuit **se met en pause après 7 jours sans activité**.
  Hors saison, il faut le relancer depuis le tableau de bord.
- Deux projets gratuits sont pris : il n'en reste plus pour un environnement de
  test hébergé. Les essais se font sur la base locale.
- Recharger remplace toute l'organisation : rien ne doit être saisi dans la v2
  tant que la tranche 2 n'a pas basculé l'écriture.
