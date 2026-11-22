# 0027 — Le statut d'une édition se calcule à l'affichage

- **Statut** : Accepté
- **Date** : 2026-11-22
- **Complète** : [0013](0013-statut-d-edition-deduit.md) (« où ce calcul a lieu se décide dans le ticket du statut »)

## Contexte

Le statut d'une édition (à venir, en cours, terminée) se déduit des faits
(ADR 0013). Il dépend aussi du **jour** : une soirée In House passe de « en
cours » à « terminée » le lendemain, sans qu'aucune commande ne s'exécute. Une
projection, recalculée seulement après une commande, serait donc périmée dès
minuit.

## Décision

Le statut **n'est pas stocké**. La règle vit dans le domaine
(`editionStatus`), et la page d'une édition l'applique au moment de
l'affichage, à partir de ce que lit la vue `edition_page_view` : date, type,
clôture, présence de matchs publiés et d'un match final.

Le « jour » est celui d'Arrakis, au fuseau `Europe/Paris` : une soirée du
lundi soir reste en cours jusqu'à minuit à Paris, où que soit le visiteur.

Le principe « le serveur décide » tient : le navigateur affiche ce statut, il
ne l'enregistre jamais. Une commande qui en aurait besoin le recalculera côté
serveur, avec la même fonction du domaine.

## Options écartées

- **Une projection recalculée par les commandes** : fausse dès que le jour
  change sans commande.
- **Le calcul dans la vue SQL** (`current_date`) : la règle existerait en
  deux endroits, en SQL et dans le domaine, et le SQL n'a pas les tests cas par
  cas que demande l'ADR 0013.
- **Le jour du visiteur** : deux visiteurs, à Paris et à Montréal, verraient
  deux statuts pour la même soirée.

## Conséquences

- Le statut est toujours à jour, sans tâche planifiée.
- La règle n'a qu'un endroit, testé, que le site et le serveur partagent.
- Au ticket des brouillons (#43), la vue ne devra compter que les matchs
  publiés.

> **Complété par [0028](0028-brouillons-caches-par-les-droits.md).**
> Les droits d'accès cachent les brouillons : la vue ne compte que les matchs
> publiés, sans avoir été réécrite.
