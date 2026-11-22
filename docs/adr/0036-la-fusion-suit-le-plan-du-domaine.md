# 0036 — La fusion suit le plan du domaine

- **Statut** : Accepté
- **Date** : 2026-11-23

## Contexte

Le domaine avait déjà, avant le ticket #52, une fonction pure et testée qui
décide de ce qu'une fusion de profils écrit : `planMerge`
(`backend/src/domain/identity/merge.ts`). La commande `mergePlayers`, livrée
avec l'ADR 0034, ne s'en servait pas. Elle refaisait les règles dans le dépôt
Postgres et dans le dépôt en mémoire, et elle s'écartait du plan sur deux
points :

- les passages de l'absorbé restaient sur lui, alors que le plan les donne au
  conservé ;
- la personnalisation de carte de l'absorbé restait sur lui, alors que le plan
  la donne au conservé quand il n'en a pas.

## Décision

**`mergePlayers` lit les faits des deux profils, demande le plan à
`planMerge`, puis le dépôt écrit ce plan, et rien d'autre.** Le domaine décide
(principe 3 de `CLAUDE.md`), le dépôt écrit.

Ce que le plan décide, et qui remplace l'ADR 0034 sur ces points :

- **Tous les passages de l'absorbé passent au conservé.** Si le conservé est
  déjà dans une équipe, le passage en cours de l'absorbé se clôt le jour de la
  fusion.
- **La personnalisation de l'absorbé passe au conservé s'il n'en a pas**. S'il
  en a une, c'est la sienne qui l'emporte, et celle de l'absorbé est supprimée.
- Les graphies ajoutées comme alias sont normalisées comme à l'import (sans
  accents, en minuscules).

Le reste de l'ADR 0034 tient : les refus, le compte Discord qui suit, le
renvoi, et l'exception à l'ADR 0032.

## Options écartées

- **Garder les règles dans le dépôt** : deux implémentations (Postgres et
  mémoire) à garder d'accord, sans le test du domaine, et en désaccord avec
  lui.

## Conséquences

- Une règle de fusion se change dans le domaine, en TDD, et les deux dépôts
  n'ont qu'à écrire le plan.
- L'historique d'équipes du joueur réuni est complet sur son profil.
