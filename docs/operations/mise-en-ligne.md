# Mise en ligne du site en lecture

La marche à suivre de la tranche 1 ([ADR 0020](../adr/0020-heberger-le-site-en-lecture.md)).
Elle se fait **une fois**, sauf la partie « Recharger après un événement »,
qui revient après chaque soirée ou tournoi.

Toutes les commandes se lancent dans un terminal (zsh), depuis le dépôt :

```sh
cd "$HOME/Cartes Arrakis/arrakis"
git switch main
git pull
corepack pnpm install
```

Les secrets (mot de passe, adresse de connexion) ne se tapent jamais dans une
commande : `read -rs` les demande sans les afficher ni les garder dans
l'historique. Ils ne vont dans aucun fichier du dépôt.

## 1. Créer la base

1. Sur [supabase.com/dashboard](https://supabase.com/dashboard), **New
   project**, dans la même organisation que la v1. Nom : `arrakard`. Région :
   la même que la v1. Garde le mot de passe de la base dans ton gestionnaire de
   mots de passe.
2. Relie le dépôt à ce projet. La commande liste tes projets : choisis
   `arrakard`, **pas celui de la v1**.

   ```sh
   supabase login
   supabase link
   ```

3. Envoie le schéma (les migrations du dépôt). La commande demande le mot de
   passe de la base.

   ```sh
   supabase db push
   ```

## 2. Faire une sauvegarde de la v1

La v1 n'est que lue, par son API publique. Il te faut son adresse et sa clé
publique : tableau de bord Supabase, projet **de la v1**, **Project Settings →
API Keys** (clé `anon` ou `publishable`) et **Data API** (l'adresse en
`https://….supabase.co`).

```sh
read -r "V1_SUPABASE_URL?Adresse de la v1 : " && export V1_SUPABASE_URL
read -rs "V1_SUPABASE_ANON_KEY?Clé publique de la v1 (elle ne s'affiche pas) : " && export V1_SUPABASE_ANON_KEY && echo
corepack pnpm --filter @arrakis/migrate-v1 backup "$HOME/Cartes Arrakis/backups/v1-rest-$(date +%F)"
```

La commande affiche le nombre de lignes de chaque table. Elle refuse un dossier
qui existe déjà ou qui est dans le dépôt. Le dossier contient des données
réelles : il reste sur ta machine.

## 3. Charger la sauvegarde dans la base en ligne

Il te faut l'adresse de connexion de la nouvelle base : projet `arrakard`,
bouton **Connect**, onglet **Session pooler**, adresse en `postgresql://…`,
avec ton mot de passe à la place de `[YOUR-PASSWORD]`.

```sh
read -rs "DATABASE_URL?Adresse de connexion de la base arrakard (elle ne s'affiche pas) : " && export DATABASE_URL && echo
corepack pnpm --filter @arrakis/migrate-v1 load "$HOME/Cartes Arrakis/backups/v1-rest-$(date +%F)" --confirm-hosted
```

Le rapport s'affiche d'abord, puis « Chargement terminé dans … ». Il cite des
pseudos réels : ne le colle pas dans une issue ni dans une PR.

Vérifie que les notes sont celles de la v1 : la comparaison doit redonner
**2 écarts, ceux de l'anomalie A6** ([spécification de la migration](../domain/migration-spec.md)).

```sh
corepack pnpm --filter @arrakis/migrate-v1 report "$HOME/Cartes Arrakis/backups/v1-rest-$(date +%F)" v1-reference.local.json
```

La référence `v1-reference.local.json` date du 2026-10-05 : sur une sauvegarde
plus récente, des écarts apparaissent pour les matchs joués depuis. Pour une
comparaison exacte, régénère la référence avec l'extracteur du golden master
(option `V1_REFERENCE`) sur la même sauvegarde.

## 4. Mettre le site en ligne

1. Sur [vercel.com/new](https://vercel.com/new), importe le dépôt
   `Charkx/Arrakard`. Nom du projet : `arrakard`.
2. **Root Directory** : `apps/web`. Le préréglage **Vite** est reconnu ; le
   reste vient de `apps/web/vercel.json`.
3. **Environment Variables**, avant le premier déploiement :

   | Nom                            | Valeur                                                                 |
   | ------------------------------ | ---------------------------------------------------------------------- |
   | `VITE_SUPABASE_URL`            | l'adresse du projet `arrakard` (Project Settings → Data API)           |
   | `VITE_SUPABASE_ANON_KEY`       | la clé **publishable** du projet `arrakard` (jamais la clé `secret`)   |
   | `VITE_ORGANIZATION_SLUG`       | `arrakis`                                                              |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1` (Vercel prend alors la version de pnpm écrite dans `package.json`) |

4. **Settings → Build and Deployment → Node.js Version** : `24.x`.
5. **Deploy**. Le site est à `https://arrakard.vercel.app`, ou à l'adresse que
   Vercel affiche si ce nom est pris.

Ensuite, chaque fusion dans `main` redéploie le site tout seul.

## 5. Vérifier

- Ouvre le classement, un profil (avec « Pourquoi cette note »), une édition.
  Le bandeau « lecture seule » est en haut.
- Ouvre directement une adresse `https://arrakard.vercel.app/player/…` copiée
  depuis un profil, dans un nouvel onglet : la page doit s'afficher, pas une
  erreur 404.
- **Vitesse sur mobile** : dans Chrome, outils de développement
  (`Cmd + Option + I`), onglet **Lighthouse**, appareil **Mobile**, catégorie
  **Performance**, **Analyze page load**. Note dans la PR du ticket 16 le
  « Largest Contentful Paint » du classement et d'un profil : il doit être sous
  2 secondes.

## 6. Protéger `main`

Une PR et une CI verte deviennent obligatoires, pour toi aussi :

```sh
gh api -X PUT repos/Charkx/Arrakard/branches/main/protection --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint · format · types · tests", "schéma · RLS (pgTAP)"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

Vérification, qui doit répondre `true` :

```sh
curl -s https://api.github.com/repos/Charkx/Arrakard/branches/main | jq .protected
```

## 7. Prévenir la communauté

Le texte est prêt dans [Annonce des écarts connus](annonce-ecarts.md). Mets-y
l'adresse du site si elle n'est pas `https://arrakard.vercel.app`, puis
publie-le sur le Discord.

## Recharger après un événement

Après chaque soirée ou tournoi saisi dans la v1, refais les étapes 2 et 3,
avec `--replace` en plus au chargement :

```sh
cd "$HOME/Cartes Arrakis/arrakis"
read -r "V1_SUPABASE_URL?Adresse de la v1 : " && export V1_SUPABASE_URL
read -rs "V1_SUPABASE_ANON_KEY?Clé publique de la v1 (elle ne s'affiche pas) : " && export V1_SUPABASE_ANON_KEY && echo
corepack pnpm --filter @arrakis/migrate-v1 backup "$HOME/Cartes Arrakis/backups/v1-rest-$(date +%F)"
read -rs "DATABASE_URL?Adresse de connexion de la base arrakard (elle ne s'affiche pas) : " && export DATABASE_URL && echo
corepack pnpm --filter @arrakis/migrate-v1 load "$HOME/Cartes Arrakis/backups/v1-rest-$(date +%F)" --replace --confirm-hosted
```

Si tu recharges deux fois le même jour, la sauvegarde est refusée parce que
le dossier existe déjà : ajoute `-2` à la fin du nom, dans les deux commandes.

Le chargement se fait en une seule transaction : s'il échoue, le site garde
les données d'avant. Le site n'a pas besoin d'être redéployé.

**Base en pause.** Un projet gratuit sans activité pendant 7 jours se met en
pause, et le site n'affiche plus rien. Tableau de bord Supabase, projet
`arrakard`, **Restore project**.
