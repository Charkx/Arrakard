# 0003 — Séparer les faits des projections

- **Statut** : Accepté
- **Date** : 2026-10-03

## Contexte

En v1, un objet `Player` contient à la fois des données saisies (pseudo,
équipe) et des données calculées (note, historique, stats de split). Trois
bugs majeurs de l'audit en découlent :

1. L'historique et les stats de split étaient recalculés en mémoire mais
   jamais réécrits en base : après un rechargement, ils revenaient à l'état
   du jour de la migration.
2. Chaque modification réécrivait toutes les éditions et tous les joueurs.
3. La note enregistrée était calculée dans le navigateur de l'admin.

## Décision

Deux catégories de données, sans mélange possible :

- **Faits** : ce qui a été saisi (éditions, matchs, performances, transferts,
  personnalisation). Seules les commandes les écrivent.
- **Projections** : tout ce qui se calcule (notes, historiques, classements,
  badges, instantanés de split). Seul le recalcul les écrit, via la fonction
  pure `domain.project(faits)`.

Après chaque commande, on recalcule **toutes** les projections, dans la même
transaction. Pas de calcul incrémental tant qu'un recalcul complet reste sous
2 secondes.

## Options écartées

- **Calcul incrémental** (mettre à jour seulement les joueurs touchés) : plus
  rapide en théorie, mais source classique d'écarts. Inutile à 2 000 lignes.
- **Projections calculées à la lecture** (vues SQL qui calculent la note) :
  pas de stockage, mais la formule devrait être écrite en SQL, loin du
  domaine testé.
- **Event sourcing complet** (journal d'événements immuable) : même idée
  poussée plus loin, mais trop lourd pour le besoin. La séparation
  faits/projections en garde l'essentiel.

## Conséquences

- Changer la formule de note = déployer le nouveau code puis lancer un
  recalcul. Aucune migration de données.
- Un test vérifie que supprimer les projections puis recalculer redonne un
  état identique.
- Les projections sont dénormalisées pour la lecture : pas de jointures
  coûteuses côté pages.
- Chaque écriture coûte un recalcul complet. C'est négligeable aujourd'hui,
  et le seuil de réexamen est écrit noir sur blanc.
