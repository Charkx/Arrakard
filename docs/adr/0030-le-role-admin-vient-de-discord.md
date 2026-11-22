# 0030 — Le rôle admin vient de Discord, à chaque connexion

- **Statut** : Accepté
- **Date** : 2026-11-22
- **Amende** : [0024](0024-lire-avec-postgrest-js.md) (`auth-js` au lieu de `supabase-js`)

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
4. écrit l'adhésion, datée (`synced_at`) : `admin` avec le rôle, `member`
   sans le rôle (il servira à la carte du joueur), aucune si le joueur n'est
   plus sur le serveur ;
5. l'inscrit au journal des commandes, sans le jeton.

Ce n'est pas une commande : `executeCommand` exige un admin, et la
synchronisation sert justement à le devenir. Elle passe par la même unité de
travail, et par un `requestHandler` commun que `commandHandler` utilise aussi.

**Un rôle admin ne vaut que 7 jours après sa dernière vérification**, la
durée d'un jeton Discord. La règle est écrite une fois, dans la fonction SQL
`is_admin_of`, qu'appellent les droits de la base (`is_org_admin`) et les
commandes. Le serveur ne dépend donc pas du navigateur : un ancien admin qui
ne repasse jamais par la synchronisation, ou dont la session reste ouverte
des semaines, perd ses droits de lui-même. Un admin se reconnecte au moins une
fois par semaine.

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
- Un admin retiré sur Discord le reste jusqu'à sa prochaine connexion, et au
  plus 7 jours. Pour une coupure immédiate, il faut supprimer son adhésion à
  la main.
- L'organisation d'essai a le même serveur et le même rôle (ADR 0021) : un
  admin d'Arrakis l'est aussi de l'essai, et chaque organisation a sa propre
  adhésion, synchronisée à part.
- Quand Discord répond que le joueur n'est pas sur le serveur, il ne dit pas
  à qui est le jeton : le seul effet possible est de retirer sa propre
  adhésion.
- Le jeton Discord n'est jamais enregistré par le serveur. Il reste dans la
  session du navigateur, comme le jeton de connexion : une faille XSS du site
  laisserait lire les rôles Discord de l'utilisateur, rien de plus
  (`guilds.members.read` ne permet aucune écriture).
- L'outil de migration ne remplace pas une configuration Discord déjà en
  base : la changer se fait à la main, en SQL, faute d'écran prévu.
- Les tests ne joignent jamais Discord : la passerelle est testée avec un
  faux `fetch`, la synchronisation avec un Discord simulé sur la vraie base,
  et l'Edge Function sur ce qu'elle refuse avant d'appeler Discord. Seul
  l'essai de connexion avec un vrai compte se fait à la main.
- Une dépendance de plus dans le site, `@supabase/auth-js` (approuvée le
  2026-11-22).
