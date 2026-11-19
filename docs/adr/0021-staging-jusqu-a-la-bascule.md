# 0021 — Le projet v2 sert de staging jusqu'à la bascule

- **Statut** : Accepté
- **Date** : 2026-11-19

## Contexte

L'[ADR 0002](0002-supabase-source-de-verite.md) prévoit trois environnements :
local, staging et production. Les critères de bascule de la tranche 2
([cas d'usage](../product/use-cases.md#critères-de-bascule)) demandent que les
admins répètent sur le staging : import, aperçu, publication, correction,
fusion.

Mais l'offre gratuite de Supabase ne permet que deux projets, et les deux sont
pris : la v1 et la v2 en lecture ([ADR 0020](0020-heberger-le-site-en-lecture.md)).
Jusqu'à la bascule, la v1 reste l'outil officiel : rien de ce qui est saisi
dans la v2 n'est encore la vérité.

## Décision

- **Jusqu'à la bascule, le projet v2 hébergé est le staging.**
- Les répétitions se font dans une **organisation d'essai** (`arrakis-essai`),
  dans le même projet. Le site public ne lit que l'organisation `arrakis`
  (`VITE_ORGANIZATION_SLUG`, [ADR 0008](0008-multi-tenant-et-portabilite.md)) :
  une répétition n'y apparaît jamais.
- L'organisation d'essai se remplit avec la même sauvegarde de la v1 que
  `arrakis`, et se recharge à volonté.
- **À la bascule**, la v1 coupée libère un projet gratuit. Il devient le
  staging dédié prévu par l'ADR 0002, et le projet v2 devient la production.

## Options écartées

- **Un troisième projet, payant** (offre Pro, environ 25 $ par mois) : un
  staging séparé dès maintenant, pour un besoin qui dure quelques semaines.
- **La base locale seulement** : gratuite, mais les admins ne peuvent pas
  répéter eux-mêmes, et rien n'est essayé sur l'hébergement réel.

## Conséquences

- Les répétitions se font sur l'hébergement réel, avec les vraies données, sans
  rien coûter.
- Une erreur de migration de base, pendant une répétition, toucherait aussi le
  site public : les migrations s'essaient d'abord sur la base locale, comme
  aujourd'hui.
- La page de connexion et les droits d'admin doivent être limités à
  l'organisation choisie : un admin d'essai n'est pas admin d'`arrakis`. C'est
  déjà la règle (`is_org_admin(organization_id)`, ADR 0008), à tester sur les
  commandes.
- La sauvegarde de la v1 doit pouvoir se charger dans une autre organisation
  que `arrakis` : la commande `load` reçoit l'organisation en option, dans le
  premier ticket qui en a besoin.
