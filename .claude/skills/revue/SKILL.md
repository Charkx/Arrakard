---
name: revue
description: Relit les changements d'une branche ou d'une PR selon deux axes séparés. Conventions, le code suit-il les règles écrites du dépôt ? Demande, le code fait-il ce que l'issue demandait ? À utiliser sur chaque PR avant fusion, ou quand Charly demande une revue.
argument-hint: 'Le point de comparaison (par défaut main)'
---

# Revue

Revue en deux axes du diff entre `HEAD` et un point fixe :

- **Conventions** : le code suit-il les règles écrites de ce dépôt ?
- **Demande** : le code fait-il ce que l'issue d'origine demandait ?

Chaque axe tourne dans un **sous-agent** au contexte vierge, les deux en
parallèle. Un relecteur qui n'a pas écrit le code voit ce que son auteur ne voit
plus, et les deux axes ne se contaminent pas.

## 1. Fixer le point de comparaison

Le point fixe est ce que Charly indique (branche, commit, tag). Sans indication,
c'est `main`.

- Diff : `git diff <point>...HEAD` (trois points, donc depuis l'ancêtre commun).
- Commits : `git log <point>..HEAD --oneline`.

Vérifier d'abord que le point existe (`git rev-parse <point>`) et que le diff
n'est pas vide. Sinon s'arrêter ici.

## 2. Trouver la demande

Dans cet ordre :

1. l'issue citée dans les commits ou la PR (`#12`, `Closes #12`), lue avec
   `gh issue view`, et sa liste « Done when » ;
2. un chemin passé par Charly ;
3. sinon, demander où est la demande. S'il n'y en a pas, l'axe Demande est sauté
   et le rapport le dit.

## 3. Réunir les conventions

Les sources du dépôt :

- `docs/contributing.md` : cycle TDD, tests, langues, commits, définition de
  « terminé » ;
- `docs/domain/glossary.md` : un seul identifiant par terme, et la liste des
  termes à ne plus utiliser ;
- les ADR de `docs/adr/` qui touchent la zone modifiée ;
- `CLAUDE.md` : principes et règles absolues.

S'y ajoute toujours la **liste d'odeurs** ci-dessous (Fowler, _Refactoring_,
ch. 3). Deux règles :

- **Le dépôt prime.** Une règle écrite du dépôt l'emporte sur la liste.
- **Toujours un jugement.** Une odeur est un indice étiqueté (« possible Feature
  Envy »), jamais une violation. Ignorer ce que l'outillage vérifie déjà (lint,
  format, types).

Les odeurs, chacune avec son remède :

- **Mysterious Name** : un nom qui ne dit pas ce que la chose fait ou contient →
  renommer ; si aucun nom honnête ne vient, la conception est floue.
- **Duplicated Code** : la même logique à plusieurs endroits du changement →
  extraire la forme commune.
- **Feature Envy** : une fonction qui manipule les données d'un autre objet plus
  que les siennes → la déplacer près de ces données.
- **Data Clumps** : les mêmes champs ou paramètres voyagent toujours ensemble →
  en faire un type.
- **Primitive Obsession** : un nombre ou une chaîne tient lieu de concept métier
  → lui donner un petit type.
- **Repeated Switches** : le même `switch` ou la même cascade de `if` revient →
  une table partagée ou du polymorphisme.
- **Shotgun Surgery** : un changement logique impose des retouches dispersées →
  regrouper ce qui change ensemble.
- **Divergent Change** : un module modifié pour plusieurs raisons sans rapport →
  le scinder.
- **Speculative Generality** : abstraction ou paramètre ajouté pour un besoin que
  la demande n'a pas → supprimer.
- **Message Chains** : longues navigations `a.b().c().d()` → cacher le parcours
  derrière une méthode.
- **Middle Man** : une fonction qui ne fait que déléguer → appeler la cible
  directement.
- **Refused Bequest** : un héritier qui ignore l'essentiel de ce dont il hérite →
  préférer la composition.

## 4. Lancer les deux sous-agents en parallèle

**Sous-agent Conventions.** Lui donner la commande de diff, la liste des commits,
les fichiers de conventions de l'étape 3 et la liste d'odeurs **recopiée en
entier** (il n'y a pas accès autrement). Consigne : « Signale, par fichier et par
passage, (a) chaque endroit où le diff enfreint une règle écrite, en citant le
fichier et la règle ; (b) chaque odeur repérée, nommée, avec le passage cité.
Distingue les infractions des jugements : une odeur est toujours un jugement, et
une règle du dépôt prime sur la liste. Ignore ce que l'outillage vérifie. Moins de
400 mots, en français. »

**Sous-agent Demande.** Lui donner la commande de diff, la liste des commits et
le texte de la demande. Consigne : « Signale (a) ce que la demande exigeait et
qui manque ou reste partiel ; (b) ce que le diff fait sans qu'on l'ait demandé ;
(c) ce qui semble fait mais mal. Cite la ligne de la demande pour chaque point.
Moins de 400 mots, en français. »

## 5. Rassembler

Présenter les deux rapports sous `## Conventions` et `## Demande`, tels quels ou
à peine nettoyés. Ne pas les fusionner ni les reclasser : un changement peut
réussir un axe et rater l'autre, et les séparer empêche l'un de masquer l'autre.

Finir par une ligne de bilan : nombre de points par axe, et le plus grave de
chaque axe.

## 6. Rappeler la suite du rituel

La revue ne remplace pas l'étape suivante : Charly vérifie qu'il peut expliquer
chaque ligne avant de fusionner. Lui proposer de l'interroger sur les passages les
plus denses du diff, sans donner les réponses d'avance.
