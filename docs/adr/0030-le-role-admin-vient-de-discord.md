# 0030 — Le rôle admin vient de Discord, à chaque connexion

- **Statut** : Accepté
- **Date** : 2026-11-22
- **Précise** : [0002](0002-supabase-source-de-verite.md), [0008](0008-multi-tenant-et-portabilite.md), [0024](0024-lire-avec-postgrest-js.md)

## Contexte

Les admins d'Arrakis sont ceux qui ont le rôle admin sur le serveur Discord
de la communauté. La v2 doit le refléter sans qu'on tienne une liste à la
main : un admin qui perd son rôle sur Discord perd ses droits sur le site, à
sa prochaine connexion (ADR 0002). Le serveur et le rôle sont dans la
configuration de l'organisation (ADR 0008) : serveur `1031291061936595015`,
rôle `1514024774131519638` (Q18, 2026-11-22). L'organisation d'essai a la même
configuration (ADR 0021).

Discord ne dit les rôles d'un membre qu'à un bot du serveur, ou au membre
lui-même, avec la permission `guilds.members.read` qu'il accorde à la
connexion.

## Décision

**Le joueur se connecte avec Discord par Supabase Auth**, en demandant
`identify` et `guilds.members.read`. Au retour, le site envoie le jeton que
Discord lui a remis à l'Edge Function `sync-discord-role`, qui :

1. lit le serveur et le rôle admin de l'organisation, sinon répond 404 ;
2. lit l'identité Discord de l'utilisateur dans `auth.identities`, jamais
   dans la requête, sinon répond 403 ;
3. demande à Discord le membre du serveur à qui appartient le jeton, et
   refuse le jeton s'il appartient à un autre compte ;
4. écrit l'adhésion : `admin` avec le rôle, `member` sans le rôle, aucune si
   le joueur n'est plus sur le serveur ;
5. l'inscrit au journal des commandes, sans le jeton.

Ce n'est pas une commande d'admin : `executeCommand` exige un admin, et la
synchronisation sert justement à le devenir. Elle passe par la même unité de
travail, et par un `requestHandler` commun que `commandHandler` utilise aussi.

**Le site charge `@supabase/auth-js` à la demande**, au premier usage de la
connexion, et non `supabase-js` entier. Les pages publiques ne le
téléchargent pas : le script de poids de la CI ne compte que les fichiers que
cite `index.html`, et échoue si la bibliothèque de connexion s'y trouve.

## Options écartées

- **Un bot Discord** : il verrait les changements de rôle en direct, mais il
  faut l'héberger et le garder en ligne, pour une communauté où la
  revérification à la connexion suffit.
- **Un crochet d'émission du jeton (`custom_access_token`)** : il ne reçoit
  pas le jeton Discord, et remettrait le rôle dans le JWT, ce que l'ADR 0008
  a retiré.
- **Faire confiance à l'identifiant Discord envoyé par le site** : un jeton
  Discord volé suffirait à se faire admin d'un autre compte.
- **`supabase-js` entier**, prévu par l'ADR 0024 : environ trois fois plus
  lourd, et il ferait doublon avec postgrest-js.
- **La connexion écrite à la main** : aucune dépendance, mais le PKCE et le
  renouvellement des jetons sont faciles à rater.

## Conséquences

- Aucun service à héberger : Supabase Auth, une Edge Function et l'API de
  Discord.
- Un admin retiré sur Discord reste admin jusqu'à sa prochaine connexion. Pour
  une coupure immédiate, il faut supprimer son adhésion à la main.
- Le jeton Discord n'est jamais enregistré par le serveur ; il reste dans la
  session du navigateur, comme le jeton de connexion.
- Les tests ne joignent jamais Discord : la passerelle est testée avec un
  faux `fetch`, la synchronisation avec un Discord simulé sur la vraie base,
  et l'Edge Function sur ce qu'elle refuse avant d'appeler Discord. Seul
  l'essai de connexion avec un vrai compte se fait à la main.
- Une dépendance de plus dans le site, `@supabase/auth-js` (approuvée le
  2026-11-22).
