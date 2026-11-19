# 0022 — Le périmètre de la tranche 2

- **Statut** : Accepté
- **Date** : 2026-11-19
- **Amende** : [0016](0016-perimetre-repris-de-la-v1.md) (les résultats de tournoi sans match)

## Contexte

La tranche 2 fait passer l'écriture de la v1 à la v2, puis coupe la v1
([ADR 0011](0011-livrer-par-tranches.md)). Avant de la découper en tickets,
il fallait savoir ce qui doit exister à la bascule. Les cas d'usage laissaient
quatre points ouverts : la saisie d'un match à la main (Q16), la
personnalisation et les inscriptions (J2, J3, « peut suivre »), les 14 résultats
de tournoi sans match (Q10, anomalie M4), et les questions qui ne bloquent pas
la saisie (Q2 bis, Q4, Q5, Q14, Q15).

Charly a tranché ces points le 2026-11-19.

## Décision

- **Rien de ce que fait la v1 ne disparaît à la bascule.** La personnalisation
  des cartes (J2), les inscriptions (J3) et leur gestion par les admins (A9)
  sont dans la tranche 2, sans « peut suivre ».
- **Un match se saisit aussi à la main** (cas d'usage A14), en plus de l'import
  d'un fichier Excel (A1) : en v1, des soirées In House ont été saisies ainsi.
- **Les 14 résultats de tournoi sans match sont abandonnés** : ni migrés ni
  comptés. Les notes n'en dépendent pas (la comparaison avec la v1 est
  identique sans eux). Le rapport de migration les liste, la sauvegarde les
  garde, et l'annonce de mise en ligne le dit.
- **La note reste celle de la v1** pendant la tranche 2. Q2 bis, Q4 et Q5
  partent dans un questionnaire aux admins. Q14 (API de Riot) et Q15 (équipes
  d'In House) sont reportées en tranche 3.

## Options écartées

- **J2 et J3 après la bascule** : la bascule viendrait plus tôt, mais les
  inscriptions se feraient ailleurs quelques semaines, et les cartes
  perdraient leur personnalisation.
- **L'import seul, la saisie à la main en tranche 3** : une tranche plus courte,
  mais les soirées sans fichier ne pourraient plus être saisies.
- **Garder les résultats sans match dans une table à part** : une table et un
  affichage pour 14 lignes d'un seul tournoi.

## Conséquences

- La tranche 2 est plus longue : la connexion Discord (J1) arrive tôt, car la
  personnalisation et les inscriptions en dépendent.
- La saisie à la main et l'import doivent produire les mêmes faits, en
  brouillon puis publiés ([ADR 0012](0012-publier-les-resultats.md)) : c'est
  à vérifier au découpage, avec une commande commune si possible.
- Les joueurs du tournoi concerné ne verront plus ces 14 résultats.
