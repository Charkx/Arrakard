# 0032 — Une saison clôturée ne reçoit plus de match

- **Statut** : Accepté
- **Date** : 2026-11-22

## Contexte

La clôture d'une saison fige ses notes (ADR 0014, cas d'usage A7). Les
projections, elles, se recalculent toutes après chaque commande (ADR 0003), et
`docs/architecture/overview.md` dit déjà que « figé » signifie que la saison
ne reçoit plus de match, pas que la valeur est stockée à part. Il reste à dire
qui garantit que rien n'entre dans une saison clôturée.

## Décision

**Toute commande qui ajoute, publie ou change un match ou une performance
refuse une édition d'une saison clôturée**, avec la raison `season_closed`
(409). L'état d'une édition (`EditionState.seasonClosed`) le dit à la
commande. `publishEdition` est la première ; la saisie (A14), l'import (A1),
la correction (#48), la fusion de profils (A5) et le barème (A8) devront
faire de même, et rattacher une édition à une saison clôturée sera refusé.

**Changer les règles de note est l'exception assumée** (A13, ADR 0007) : le
recalcul touche toutes les saisons, clôturées comprises. C'est un acte
délibéré, annoncé par une note de patch.

## Options écartées

- **Stocker les notes à la clôture**, à part du recalcul : la seule valeur qui
  ne se recalcule plus, contre l'ADR 0003, et une correction légitime d'une
  saison passée deviendrait impossible à refléter.
- **Un garde central dans `executeCommand`** : il ne sait pas quelle édition
  une commande touche ; chaque commande le sait.

## Conséquences

- Chaque nouvelle commande sur les matchs a un test « refuse une saison
  clôturée » dans sa suite de contrat.
- Corriger un match d'une saison clôturée (les matchs contradictoires M3)
  demandera de rouvrir la saison, ce qui n'existe pas encore : à trancher avec
  le ticket #48.
