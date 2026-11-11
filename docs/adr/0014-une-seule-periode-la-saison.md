# 0014 — Une seule période de compétition : la saison

- **Statut** : Accepté
- **Date** : 2026-11-11

## Contexte

Le modèle de la v2 reprend les deux niveaux de la v1 : une saison contient des
splits, et la note ne compte que les matchs du split actif.

Ce second niveau ne sert pas :

- la sauvegarde du 2026-10-05 contient 3 saisons et 3 splits, soit un split
  par saison ([migration](../domain/migration-spec.md)) ;
- le sélecteur de split a été retiré du classement de la v1 en juin 2026,
  faute d'usage.

Deux niveaux, ce sont deux fois plus de règles (ouverture, clôture,
instantanés), de tests et d'écrans d'administration.

## Décision

Il n'y a plus qu'un niveau : la **saison** (`Season`). Elle s'ouvre et se
clôture. La note ne compte que les matchs de la **saison active**, et la
clôture fige les notes dans un **instantané de saison**.

Le mot « split » est appelé à disparaître du produit, des documents et du
code. Tant que le ticket d'alignement n'est pas fait, le README, les
spécifications, le modèle de données et le code le disent encore.

## Options écartées

- **Garder les deux niveaux au cas où** : un coût certain pour un besoin
  hypothétique. Si un découpage plus fin devient utile, des saisons plus
  courtes y répondent.
- **Supprimer toute période** (une note sur toute la carrière) : toutes les
  notes changeraient, ce que l'[ADR 0007](0007-evolution-de-la-note.md)
  interdit à ce stade.

## Conséquences

- Moins de concepts à apprendre, à tester et à administrer.
- **Aucune note ne change** : chaque split de la v1 devient la saison qui le
  contenait. La migration s'arrête et le signale si une saison de la v1
  contient plusieurs splits.
- Le changement touche du code déjà écrit : 26 fichiers du domaine, de la
  migration et du schéma, plus le glossaire, les spécifications et le modèle
  de données. Il se fait dans un ticket dédié, avant les pages de la
  tranche 1.
- D'ici là, le [glossaire](../domain/glossary.md) définit déjà la saison
  seule, et range « split » parmi les termes à ne plus utiliser.
- Le golden master compare des notes par saison au lieu de notes par split,
  avec les mêmes chiffres.
