# 0025 — Ranger les paquets par couche

- **Statut** : Accepté
- **Date** : 2026-11-21
- **Amende** : [0001](0001-monorepo-et-domaine-pur.md) (l'arborescence du monorepo)

## Contexte

L'[ADR 0023](0023-ecritures-en-trois-couches.md) fixe trois couches et une
règle des dépendances, imposée par le lint. Mais tous les paquets vivaient côte
à côte dans `packages/` : `domain`, `application`, `postgres` et `migrate-v1`.
En ouvrant le dépôt, rien ne disait lequel est au centre et lequel à la
périphérie ; il fallait lire le README ou la configuration du lint.

## Décision

L'arborescence montre les couches :

- `core/` : le centre, sans I/O. `domain`, `application`, et `contracts` quand
  il naîtra ;
- `adapters/` : la périphérie, qui implémente les ports. `postgres` ;
- `apps/` : ce qui se lance. Le site ;
- `tools/` : les outils ponctuels. `migrate-v1` et le golden master.

Les noms des paquets (`@arrakis/domain`…) ne changent pas : aucun import ne
bouge, seulement des chemins de configuration et de documentation.

Seule exception : les Edge Functions, des adaptateurs HTTP, restent dans
`supabase/functions/`, où l'outil de Supabase les cherche.

Le dossier dit la durée de vie, l'ADR 0023 dit le rôle. `migrate-v1` reste un
adaptateur au sens de l'ADR 0023 (il appelle l'application), mais il vit dans
`tools/` : il sert une fois, à la bascule, puis se supprime.

## Options écartées

- **Garder `packages/` et ajouter un README par paquet** : rien à déplacer,
  mais les couches restent invisibles dans l'explorateur.
- **Préfixer les noms (`1-domain`, `2-application`)** : l'ordre se voit, mais
  les noms deviennent artificiels et le site ne trouve pas sa place.

## Conséquences

- Le sens des dépendances se lit dans l'arborescence : `apps`, `adapters` et
  `tools` dépendent de `core`, jamais l'inverse.
- Un nouvel adaptateur (par exemple Discord) a sa place toute trouvée.
- Les docs citent les nouveaux chemins. Les ADR acceptés gardent ceux de leur
  date, avec un encart qui renvoie ici.
- Plus difficile : les chemins sont un peu plus longs, et l'exception des Edge
  Functions est à connaître. Le lint n'impose rien encore à `tools/` : la
  règle « `tools/` dépend de `core/`, jamais l'inverse » tient parce que
  `core/` n'importe que lui-même.
