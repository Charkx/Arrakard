# 0029 — Le site rangé par fonctionnalité

- **Statut** : Accepté
- **Date** : 2026-11-22
- **Complète** : [0025](0025-un-front-un-back.md) (le rangement de `frontend/src/`)

## Contexte

Le site était rangé par type technique : `pages/`, `components/`, `data/`,
`styles/`. Ce qui touche au classement était dispersé dans les quatre. La
tranche 2 ajoute l'espace admin et ses pages : ce rangement aurait mêlé
encore davantage des fichiers sans rapport (ticket #56).

## Décision

`frontend/src/` a trois dossiers :

- `features/<page>/` : une page (classement, profil, édition), avec ses
  composants, ses données et son style. **Une page n'importe pas une autre.**
- `shared/` : ce qui sert à plusieurs pages (composants, i18n, outils). Il ne
  dépend **d'aucune page**, ni de la source de données.
- `data/` : la source de données (`DataSource`, son contexte React, son
  implémentation Supabase). Elle connaît le type des données de chaque page :
  c'est l'endroit où les pages se branchent sur la base.

`App.tsx` et `main.tsx` assemblent le tout. Le lint impose les deux interdits.

## Options écartées

- **Garder le rangement par type** : simple au début, mais chaque nouvelle page
  disperse ses fichiers dans quatre dossiers.
- **Une source de données par page** : chaque page porterait son morceau
  d'implémentation Supabase. La source est petite et lue d'un bloc : la
  découper ajouterait des fichiers sans rien simplifier.

## Conséquences

- Une page se lit, se déplace ou se supprime d'un bloc.
- Ajouter une page touche encore `App.tsx`, `styles.css` et `data/` : c'est
  l'assemblage, voulu.
- Les tests suivent le même miroir (`tests/unit/features/…`).
- Une page n'a pas de sous-dossier : la règle de lint refuse tout `../` qui ne
  remonte que d'un niveau. Le jour où une page en aura besoin, la règle
  s'affinera avec lui.
