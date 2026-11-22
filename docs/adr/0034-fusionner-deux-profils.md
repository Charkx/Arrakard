# 0034 — Fusionner deux profils, lier une carte à Discord

- **Statut** : Accepté
- **Date** : 2026-11-22

## Contexte

Un même joueur peut avoir deux profils : un pseudo mal orthographié à l'import,
un changement de pseudo (ADR 0004). L'admin doit pouvoir les réunir (cas
d'usage A5) et lier une carte au compte Discord du joueur (A6), un compte par
carte (`unique (organization_id, discord_user_id)`). Le schéma prévoit déjà le
renvoi (`players.merged_into`) et le site sait suivre un renvoi. Il reste à dire
ce que la fusion déplace, ce qu'elle refuse, et comment elle se concilie avec
l'ADR 0032 : une saison clôturée ne reçoit plus de match.

## Décision

**`mergePlayers` déplace vers le profil conservé tout ce que le joueur a
fait** : ses performances (brouillons compris), ses MVP de match et de soirée,
ses participations. Son pseudo et ses alias deviennent des alias du conservé,
pour que les prochains imports le reconnaissent. Son compte Discord le suit.
Son passage en cours se termine le jour de la fusion ; ses passages terminés
restent sur l'ancien profil. L'ancien profil renvoie vers le conservé, comme
ceux qui renvoyaient déjà vers lui : un renvoi n'a jamais qu'un pas.

Elle refuse :

- deux profils qui ont joué le même match : ce sont deux joueurs (`conflict`) ;
- deux cartes liées à deux comptes Discord différents : l'admin en délie une
  d'abord (`conflict`) ;
- un profil déjà fusionné, ou le même profil deux fois.

**La fusion est la deuxième exception assumée de l'ADR 0032**, après le
changement des règles de note : elle ne change aucun match, elle corrige qui
l'a joué. Elle touche donc aussi les saisons clôturées, dont les notes
deviennent celles du vrai joueur.

**`linkDiscordAccount` lie ou délie une carte**, et refuse un compte déjà lié à
une autre carte. **Le compte Discord d'une carte n'est plus public** : comme
celui des inscrits, le public lit les joueurs sans cette colonne, et l'espace
admin lit les profils par `admin_profiles` (ADR 0031).

## Options écartées

- **Refuser la fusion qui touche une saison clôturée** : un double découvert
  après la clôture resterait un double pour toujours.
- **Déplacer aussi les passages terminés** : deux historiques d'équipes se
  mêleraient, avec des chevauchements à arbitrer, pour un cas rare.
- **Garder les comptes Discord publics** : rien ne s'en sert sur les pages
  publiques, et ce serait la seule donnée de connexion visible de tous.

## Conséquences

- Une fusion ne se défait pas : la page la fait confirmer.
- Les personnalisations de carte de l'ancien profil restent sur lui, cachées
  avec lui.
- Ce lien permettra plus tard à un joueur connecté de retrouver sa carte (sa
  personnalisation, cas d'usage du joueur), sans nouvelle donnée.
