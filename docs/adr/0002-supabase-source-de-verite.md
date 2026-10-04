# 0002 — Supabase comme backend et source de vérité

- **Statut** : Accepté
- **Date** : 2026-10-03

## Contexte

La v1 tourne sur Supabase (Postgres, Auth Discord, RLS, Edge Functions). Sa
couche sécurité est solide : identité Discord lue depuis `auth.identities`,
RPC `SECURITY DEFINER` qui vérifient le rôle admin. En revanche, la v1
maintenait aussi un mode `localStorage` complet derrière un feature flag. Le
développement local ne tournait donc pas sur le même backend que la prod.

Volumétrie : environ 2 000 lignes de matchs, très loin des limites de l'offre
gratuite.

## Décision

- Supabase reste le backend. **Postgres est l'unique source de vérité.**
- Le mode `localStorage` disparaît. On développe sur un Supabase local
  (`supabase start`) aux migrations identiques à la prod.
- Trois environnements : local, staging (projet Supabase dédié) et production.
- Les acquis de sécurité v1 sont repris : identité via `auth.identities`, rôle
  admin en claim JWT posé par une fonction serveur.
- Le claim admin est **revérifié** à chaque connexion, et retiré si le rôle
  Discord a disparu (cas d'usage S2).

## Options écartées

- **Backend Node dédié (Hono + Drizzle)** : plus de contrôle, mais il faut
  réimplémenter l'auth et l'hébergement, sans besoin identifié.
- **Garder le double mode localStorage / Supabase** : deux implémentations à
  maintenir, et des bugs qui n'existent qu'en prod.

## Conséquences

- Docker est nécessaire pour développer localement.
- Les tests d'intégration tournent contre un vrai Postgres.
- Dépendance assumée à un fournisseur. Elle reste limitée, car le domaine est
  pur et le schéma est du SQL standard.
