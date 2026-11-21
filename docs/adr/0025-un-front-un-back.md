# 0025 — Un front, un back

- **Statut** : Accepté
- **Date** : 2026-11-22
- **Amende** : [0001](0001-monorepo-et-domaine-pur.md) (les paquets), [0023](0023-ecritures-en-trois-couches.md) (où vivent les couches)

## Contexte

Après l'[ADR 0023](0023-ecritures-en-trois-couches.md), le dépôt comptait cinq
paquets (`domain`, `application`, `postgres`, `migrate-v1`, `web`), chacun avec
son `package.json`, son `tsconfig.json` et une ou deux configs de tests : une
quinzaine de fichiers de configuration pour environ 400 matchs, et des couches
qu'on ne voyait pas en ouvrant le dossier `packages/`. Charly trouvait
l'arborescence trop complexe.

## Décision

Trois paquets au lieu de cinq :

- **`frontend/`** (`@arrakis/frontend`) : le site React ;
- **`backend/`** (`@arrakis/backend`) : le serveur, en trois dossiers, un par
  couche de l'ADR 0023, sans dossier `src/` :
  - `domain/` : les règles pures ;
  - `application/` : les cas d'usage et leurs ports ;
  - `infrastructure/` : les adaptateurs, Postgres aujourd'hui ;
- **`tools/migrate-v1/`** : l'outil de migration, supprimé après la bascule.

`supabase/` reste à la racine, où l'outil de Supabase le cherche : ses Edge
Functions sont des adaptateurs HTTP, rangés là par contrainte.

La règle des dépendances ne passe plus par les paquets mais par les dossiers.
Le lint l'impose dossier par dossier : le domaine n'importe rien d'une autre
couche, l'application rien de l'infrastructure, et le site n'utilise du back
que le domaine (`@arrakis/backend/domain`). Le domaine et l'application sont
vérifiés sans les types de Node (`tsconfig.pure.json`), comme avant.

## Options écartées

- **Ranger les cinq paquets par couche** (`core/`, `adapters/`, `apps/`,
  `tools/`, PR 58) : les couches se voient, mais il reste cinq paquets et leur
  configuration.
- **Mettre `supabase/` dans `backend/`** : tout le serveur au même endroit,
  mais chaque commande Supabase devrait préciser `--workdir backend`.
- **Garder un dossier `src/` dans le back** : la même forme partout, mais un
  niveau de plus avant de voir les couches.

## Conséquences

- Moins de configuration : un `package.json` pour tout le serveur, une config
  de tests, des seuils de couverture par couche.
- Les couches se lisent en ouvrant `backend/`.
- Un nouvel adaptateur (Discord, par exemple) va dans `infrastructure/`, qui
  se découpera alors en un sous-dossier par adaptateur.
- Plus difficile : la frontière entre couches n'est plus celle d'un paquet,
  seul le lint la tient. Les ADR acceptés gardent les chemins de leur date,
  avec un encart qui renvoie ici. L'hébergeur du site doit pointer vers
  `frontend/`.
