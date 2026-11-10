---
name: ping-pong
description: TDD en ping-pong entre Charly et l'agent, chacun faisant passer le test rouge de l'autre. À utiliser pour tout code qui porte une règle métier ou une règle d'accès (domaine TypeScript, SQL des commandes, RLS, tests pgTAP), ou quand Charly dit « ping-pong ».
---

# Ping-pong

Le ping-pong de `docs/contributing.md`, adapté au travail solo : A est Charly, B
est l'agent. Le but n'est pas d'aller vite : c'est que Charly écrive la moitié du
code et comprenne l'autre moitié.

Ce qu'est un bon test est décrit dans `docs/contributing.md` et dans le skill
`tdd`. Ce skill ne fixe que l'alternance.

## Avant le premier test

1. Partir de l'issue. Sa liste « Done when » dit ce qui doit marcher à la fin.
2. En tirer la **liste de tests** : un comportement par ligne, du plus simple au
   plus riche (aucun cas → un cas → plusieurs → cas limites). La montrer à Charly
   et attendre son accord.
3. Convenir de la frontière testée (voir `tdd`).

La liste vit dans la conversation. Chacun peut l'amender en route : un
comportement découvert s'ajoute, un test devenu inutile se raye. Si la session
s'arrête avant la fin, la liste part dans le handoff.

## La boucle

1. **Charly écrit un test rouge.**
2. **L'agent vérifie le rouge.** Il lance le test et dit pourquoi il échoue.
   - Bonne raison : le comportement n'existe pas encore. Une fonction absente
     compte.
   - Mauvaise raison : faute de frappe, import cassé, erreur dans le test,
     assertion qui ne vérifie pas ce que dit le nom du test.
   - Si la raison est mauvaise, l'agent l'explique et s'arrête : corriger le test
     est le tour de Charly.
3. **L'agent passe au vert** avec le minimum de code et relance toute la suite.
   Il explique ce qu'il a écrit et pourquoi rien de plus, puis commite ce vert.
   S'il voit un refactor, il le propose : si Charly l'accepte, il le fait, tests
   verts à chaque pas, et le commite à part.
4. **L'agent écrit le test rouge suivant**, pris dans la liste. Il le lance,
   montre qu'il échoue pour la bonne raison, dit en une phrase le comportement
   visé, puis rend la main.
5. **Charly passe au vert.** L'agent relance la suite et relit : si le code
   dépasse ce que le test exige, il le signale. Charly commite ce vert. S'il
   propose un refactor, il le fait et le commite à part. Puis il écrit le test
   rouge suivant : retour à l'étape 2.

## Règles

- **Jamais plus de code que le test n'en exige.** S'il en faut plus, c'est qu'il
  manque un test : on l'ajoute à la liste, on ne l'anticipe pas. La règle vaut
  pour l'agent comme pour Charly.
- **Celui qui vient de passer au vert propose le refactor.** L'autre peut le
  refuser. Un refactor garde les tests verts à chaque pas et ne change aucun
  comportement.
- **Pendant le tour de Charly, l'agent n'écrit rien** : ni code, ni test, ni
  correction « au passage ». Il peut lire et lancer les tests.
- **Un tour à la fois.** L'agent ne prend pas d'avance sur les tests suivants.

## Indices

L'agent ne donne un indice que si Charly le demande, et ne monte que d'un niveau
à la fois :

1. une question qui oriente (« que renvoie la fonction quand la liste est
   vide ? ») ;
2. le concept ou le passage de doc à relire (glossaire, spec, ADR, doc d'un
   outil) ;
3. la forme de la solution, en mots, sans code.

Du code seulement si Charly dit « montre-moi ». L'agent note alors que ce tour a
été le sien, et c'est Charly qui écrit le test suivant.

## Commits

- Un commit à chaque vert, test et code ensemble, fait par celui qui vient de
  passer au vert. Le refactor a son propre commit.
- L'agent commite ses verts sans redemander. Il ne pousse jamais sans l'accord de
  Charly.
- Conventional Commits, en français : `feat(rating): …`, `refactor(rating): …`.

## Commandes

- Domaine : `pnpm --filter @arrakis/domain test:watch`
- Base : `supabase test db`
