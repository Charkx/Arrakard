# Arrakard

v2 de la plateforme de la communauté esport Arrakis (League of Legends). Charly
y travaille seul et apprend l'architecture et le TDD avec ce projet. Ce fichier
donne les règles ; le détail est dans les docs, qu'il ne recopie pas.

## À lire avant d'agir

1. [Glossaire](docs/domain/glossary.md), **en premier** : un mot = une
   définition, et la colonne « Code » donne le seul identifiant à utiliser.
2. [Contribuer](docs/contributing.md) : cycle TDD, conventions, définition de
   « terminé », rituels de travail avec un agent.
3. [ADR](docs/adr/README.md) : pourquoi l'architecture est ce qu'elle est. Lire
   ceux de la zone touchée, et signaler toute contradiction au lieu de passer
   outre.

Le reste (vision, cas d'usage, specs, modèle de données, questions ouvertes) est
listé dans le [README](README.md#documentation).

## Principes

1. **Les faits sont la vérité, tout le reste se recalcule** (ADR 0003).
2. **Le serveur décide** : le navigateur affiche et envoie des commandes, il ne
   calcule jamais une valeur qu'il enregistre ensuite.
3. **Le domaine est pur** : `packages/domain`, sans dépendance, écrit en TDD.
4. **Chaque décision structurante est écrite** dans un ADR, avec son pourquoi.
5. **Simple tant que les chiffres le permettent** : ~400 matchs, 260 joueurs.

## Commandes

```bash
pnpm check                              # lint, format, types, tests et couverture (= CI)
supabase db start && supabase test db   # schéma et droits d'accès en pgTAP (= CI)
pnpm --filter @arrakis/domain test:watch
```

**Lancer `pnpm check` et `supabase test db` avant de dire que c'est fini**, et
montrer leur résultat. Si l'une des deux ne peut pas tourner, le dire au lieu de
conclure.

## Conventions

- **Langues** : code en anglais ; docs, noms de tests, commits et PR en français.
- **Commits** : Conventional Commits (`feat(domain): …`, `docs(adr): …`).
- **ADR** : un choix structurant = un ADR dans la même PR, écrit depuis
  `docs/adr/template.md` et ajouté à l'index.
- **Vocabulaire** : un terme métier absent ou ambigu se règle dans le glossaire
  avant d'écrire le code.

## Règles absolues

- **Fichiers interdits.** Ne jamais lire, afficher ni commiter `.env*`,
  `*.local.json`, `*.export.json`, `localStorage_export.json`, ni aucune donnée
  réelle de joueur. Vaut aussi pour la v1 (`../arrakis-cards`) et pour le shell
  (`cat`, `grep`, scripts). Seule exception, au commit : un `.env.example` sans
  secret.
- **Jamais de travail sur `main`** : une branche, une PR. Charly fusionne
  lui-même. Pas de push forcé.
- **Pas de nouvelle dépendance** sans demander.
- **Aucune mention de Claude** dans les commits ni les PR : ni `Co-Authored-By`,
  ni « Generated with ».
- **Répondre en français.**

## Façon d'apprendre et de travailler de Charly

La méthode est dans `docs/contributing.md`, section « Travailler avec un
agent ». La lire avant tout travail. Ce qui ne doit jamais être oublié :

- Expliquer quoi, pourquoi et comment, **en mots simples**, et signaler ce qu'il
  peut faire lui-même (« à toi »).
- **Trois portes, toutes à lui**, hors petite correction : le ticket, le plan,
  la fusion.
- **Trois modes**, indiqués sur chaque ticket : Ensemble, Délégué, Outillage.
- S'arrêter et demander dans les cas listés sous « Quand l'agent s'arrête ».
- Lancer `revue` sur chaque PR avant de la lui présenter.
- En mode Ensemble, ne jamais écrire à sa place pendant son tour, et il doit
  pouvoir expliquer chaque ligne. Dans les deux autres modes, il doit pouvoir
  dire ce que fait la PR et pourquoi.
- Préférer le code simple et nommer les concepts nouveaux.

## Skills

Dans `.claude/skills/` ([présentation](.claude/skills/README.md)) : `ping-pong`,
`tdd`, `grill-with-docs`, `to-questionnaire`, `to-tickets`, `revue`, `handoff`.
Pas de nouveau skill avant que la même recette se soit répétée trois fois.
