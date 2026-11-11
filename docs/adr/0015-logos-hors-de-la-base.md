# 0015 — Stocker les logos d'équipe hors de la base

- **Statut** : Accepté
- **Date** : 2026-11-11

## Contexte

En v1, le logo de chaque équipe est une image encodée en base64 dans la table
`teams` : 2,5 Mo pour 32 équipes, renvoyés à chaque lecture de la liste des
équipes.

## Décision

Les logos vont dans le stockage de fichiers de Supabase (Storage). La table
`teams` ne garde que l'adresse du fichier (`logo_url`).

## Options écartées

- **Garder l'image en base** : son poids est payé à chaque lecture, même quand
  la page n'affiche aucun logo.
- **Un hébergeur d'images externe** : une dépendance de plus. Le stockage de
  Supabase est compatible S3, donc portable
  ([ADR 0008](0008-multi-tenant-et-portabilite.md)).

## Conséquences

- Les lectures d'équipes deviennent légères, et le navigateur met les logos
  en cache.
- La migration doit extraire chaque logo, le déposer dans le stockage et
  écrire son adresse. Aujourd'hui elle recopie la valeur de la v1 telle
  quelle : c'est un ticket à prévoir.
- Une sauvegarde complète comprend désormais deux choses : la base et les
  fichiers.
- Les droits d'accès du stockage (lecture publique, écriture réservée aux
  admins) sont à tester comme ceux des tables.
