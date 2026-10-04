# 0004 — Identifier les joueurs par un identifiant stable

- **Statut** : Accepté
- **Date** : 2026-10-03

## Contexte

En v1, une performance référence son joueur par une chaîne (`playerName`,
par exemple « ARK Zéphyr »). Chaque calcul retrouve le joueur en normalisant le
pseudo (retrait du tag, minuscules, accents). Conséquences :

- un renommage ou une fusion oblige à réécrire les lignes de matchs ;
- deux joueurs homonymes sont confondus ;
- le découpage tag/pseudo est heuristique : « KGB Fan » sans équipe est lu
  comme tag `KGB` + pseudo `Fan` ;
- chaque calcul compare des chaînes, partout dans le code.

## Décision

- Chaque performance porte un `player_id` **obligatoire** (clé étrangère).
- Les graphies rencontrées dans les imports sont stockées comme **alias**
  (`player_aliases`), rattachés à un joueur.
- La résolution pseudo → `player_id` a lieu **une seule fois**, à l'import,
  dans `domain/identity`. L'admin tranche explicitement les cas ambigus (joueur
  inconnu, homonyme, faute de frappe). Ensuite, plus aucun calcul ne manipule
  de pseudo.
- Une **fusion** réattribue les performances au joueur conservé et transforme
  le joueur absorbé en alias de celui-ci.
- L'identifiant est un UUID. L'URL publique utilise un _slug_ dérivé du pseudo,
  qui peut changer (avec redirection depuis les anciens slugs).

## Options écartées

- **Garder le pseudo normalisé comme clé** : c'est la cause du problème.
- **Identifiant = slug du pseudo** (comme `generatePlayerId` en v1) : il casse
  au premier renommage.

## Conséquences

- Renommer un joueur = modifier une seule ligne.
- L'import devient une étape explicite de résolution, avec un écran de
  décisions (déjà présent en v1 sous une autre forme).
- La migration des données v1 doit résoudre une fois pour toutes chaque
  `playerName` historique : c'est un livrable testé de la phase 3.
