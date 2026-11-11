# 0010 — Travailler avec un agent : trois portes, trois modes

- **Statut** : Accepté
- **Date** : 2026-11-11

## Contexte

Le projet se fait seul, avec un agent de code qui écrit vite. Deux besoins
tirent en sens contraire :

- avancer vite sur la phase 3, qui contient une dizaine de commandes bâties sur
  le même squelette ([ADR 0005](0005-ecritures-par-commandes.md)) ;
- garder le contrôle : rien n'arrive sur `main` sans que Charly l'ait validé,
  et il continue d'apprendre l'architecture et le TDD.

La première règle, le ping-pong sur tout le code métier, servait le second
besoin au détriment du premier : Charly aurait écrit la moitié de chaque
commande, y compris la neuvième, de même forme que la première.

## Décision

**Trois portes** reviennent toujours à Charly : le ticket (quoi construire), le
plan (comment), la fusion (oui ou non). Entre deux portes, le travail avance
sans nouvelle validation.

**Trois modes**, portés par chaque ticket :

- **Ensemble** : le premier exemplaire d'une famille de code, en ping-pong ;
- **Délégué** : les suivants de la même famille, par l'agent seul, en TDD ;
- **Outillage** : CI, scripts, configuration et documentation, par l'agent seul.

Le détail est dans
[`docs/contributing.md`](../contributing.md#travailler-avec-un-agent).

## Options écartées

- **Ping-pong sur tout le code métier** : le plus formateur, mais bien plus
  lent, alors que l'essentiel s'apprend sur le premier exemplaire d'un modèle.
- **L'agent écrit tout, Charly relit** : le plus rapide, mais Charly jugerait
  des PR sur un modèle qu'il n'a jamais pratiqué.

## Conséquences

- Le rythme dépend du temps de relecture de Charly, plus de son temps
  d'écriture. Les PR doivent rester petites et arriver avec leurs preuves et
  leur revue.
- En mode Délégué, Charly valide une PR dont il sait dire ce qu'elle fait et
  pourquoi, sans expliquer chaque ligne. C'est un contrôle moins fin, accepté
  en échange de la vitesse.
- La protection de `main` sur GitHub devient le garde-fou principal : sans
  elle, la troisième porte ne tient qu'à la discipline.
- La méthode se réévalue après trois PR déléguées, puis à chaque fin de phase.
