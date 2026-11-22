# 0026 — La chaîne HTTP des commandes

- **Statut** : Accepté
- **Date** : 2026-11-22
- **Amende** : [0005](0005-ecritures-par-commandes.md) et
  [0023](0023-ecritures-en-trois-couches.md) (comment une Edge Function reçoit
  une commande)

## Contexte

La première commande, clôturer une édition (ticket #39), fait passer pour la
première fois une écriture par une Edge Function. Les ADR 0005 et 0023 disent
ce que fait la fonction : lire le JWT, valider l'entrée, appeler
`executeCommand`, traduire le résultat en HTTP. En la construisant, quatre
points restaient ouverts, et la base locale en a tranché deux :

- `postgres` 4.1, la version du back, ne tourne pas dans le moteur des Edge
  Functions (`LibuvStreamWrap.useUserBuffer` n'y existe pas). La 3.4.7 y
  tourne.
- Sous Deno, en local, le nom d'hôte de `SUPABASE_DB_URL`
  (`supabase_db_arrakis`) ne se résout pas, à cause du tiret bas. L'alias
  `db` du même conteneur, lui, se résout.

## Décision

**Le contrat.** L'entrée d'une commande est décrite par un schéma Zod dans
`backend/src/contracts/`, une par fichier, comme prévu par l'ADR 0025. Il
n'importe que Zod, et le site pourra le réutiliser. Le contrat porte aussi
`organizationId`, l'organisation où l'admin agit.

**L'adaptateur HTTP vit dans l'infrastructure.** `commandHandler`
(`backend/src/infrastructure/http.ts`) prend une commande, son contrat, les
services et un `Authenticator`, et rend une fonction `Request → Response`
écrite en API Web standard. Il se teste donc sous Node, sans base et sans
Deno. Ses réponses :

| Cas                                        | Code  |
| ------------------------------------------ | ----- |
| Commande exécutée                          | `200` |
| Entrée illisible ou refusée par le contrat | `400` |
| Pas de jeton valide                        | `401` |
| L'acteur n'est pas admin (`forbidden`)     | `403` |
| Agrégat introuvable (`not_found`)          | `404` |
| Version périmée, ou déjà fait              | `409` |
| Erreur imprévue, sans détail               | `500` |

**L'Edge Function tient en trois imports et une ligne.** Elle n'importe que
les points d'entrée du back (`application`, `contracts`, `infrastructure`),
et une règle de lint l'impose. `edgeCommandHandler` y branche la base et
Supabase Auth d'après les variables de la fonction.

**L'utilisateur est identifié par Supabase Auth**, qui vérifie lui-même le
jeton (`GET /auth/v1/user`). La vérification du JWT par la passerelle est
coupée pour ces fonctions (`verify_jwt = false`) : sinon un visiteur sans
jeton recevrait une erreur de la passerelle au lieu de notre `401`, et le
code dépendrait de l'algorithme de signature du projet.

**`postgres` est figé à 3.4.7** dans tout le dépôt, et
`supabase/functions/deno.json` charge les mêmes versions de `postgres` et de
Zod que le back. Un test le vérifie.

**En local, `COMMAND_DB_URL`** (`supabase/config.toml`) remplace
`SUPABASE_DB_URL`, avec l'hôte `db`. En ligne, seule `SUPABASE_DB_URL` existe.

**`pnpm db:start` et la CI lancent aussi la connexion et les Edge Functions**,
pour que `pnpm test:db` essaie la fonction de bout en bout.

## Options écartées

- **Le gestionnaire HTTP dans `supabase/functions/`** : il ne se testerait
  que sous Deno, sur la base locale. Dans l'infrastructure, il se teste en
  quelques millisecondes, avec les entrepôts en mémoire.
- **Vérifier le JWT nous-mêmes** : il faudrait une bibliothèque de plus
  (`jose`) et la clé publique du projet. Un appel à Supabase Auth par
  commande ne coûte rien à notre échelle.
- **Garder `postgres` 4.1 sous Node et la 3 sous Deno** : deux versions pour
  le même code, avec des écarts qu'aucun test ne verrait.
- **Réécrire l'URL de la base dans le code** (remplacer l'hôte quand il
  contient un tiret bas) : une rustine, propre au local, cachée dans le code
  de production.

## Conséquences

- Chaque nouvelle commande ajoute un contrat, une fonction dans
  `application/commands/`, et une Edge Function de quelques lignes.
- `pnpm db:start` démarre deux services de plus : il est un peu plus long.
- Le premier déploiement sur le projet hébergé reste à vérifier (déjà noté
  par les ADR 0005 et 0023) : le bundler doit embarquer les fichiers du back,
  et `SUPABASE_DB_URL` doit être joignable depuis la fonction.
- `Access-Control-Allow-Origin: *` : n'importe quel site peut appeler une
  commande, mais seulement avec le jeton d'un admin, que seul notre site
  obtient. On le resserrera au domaine du site si besoin.
