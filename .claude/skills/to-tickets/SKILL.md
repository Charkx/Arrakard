---
name: to-tickets
description: Découpe un plan, une spec ou la conversation en tickets, des tranches verticales qui déclarent ce qui les bloque, puis les publie en issues GitHub après validation. À utiliser quand Charly demande de découper un travail en tickets.
argument-hint: "Ce qu'il faut découper (ex. la phase 3, une spec, une issue)"
---

# Tickets

Découper un plan, une spec ou une conversation en **tickets** : des tranches
verticales, chacune déclarant les tickets qui la **bloquent**.

## 1. Réunir le contexte

Partir de ce qui est déjà dans la conversation. Si Charly passe une référence
(chemin d'une spec, numéro d'issue), la lire en entier, commentaires compris
(`gh issue view <n> --comments`).

## 2. Explorer le dépôt

Comprendre l'état actuel du code. Les titres et descriptions emploient le
vocabulaire de `docs/domain/glossary.md` et respectent les ADR de la zone
touchée.

Chercher ce qu'il faudrait réorganiser d'abord pour rendre le changement facile :
« rendre le changement facile, puis faire le changement facile ».

## 3. Esquisser les tranches verticales

- Chaque tranche traverse **toutes** les couches par un chemin étroit mais
  complet (schéma, commande, droits d'accès, tests, et plus tard l'interface).
  Ce n'est pas la tranche horizontale d'une seule couche.
- Une tranche terminée se démontre ou se vérifie seule.
- Une tranche tient dans une session de travail.
- Toute réorganisation préalable passe en premier.

Donner à chaque ticket ses **blocages** : les tickets qui doivent être terminés
avant qu'il commence. Un ticket sans blocage peut démarrer tout de suite.

**Exception : le changement mécanique large.** Renommer une colonne ou retyper un
symbole partagé casse tout d'un coup, et aucune tranche verticale ne peut rester
verte. Le découper en trois temps : **étendre** (ajouter la nouvelle forme à côté
de l'ancienne), **migrer** les appelants par lots, chaque lot dans son ticket
bloqué par l'extension, puis **contracter** (supprimer l'ancienne forme) dans un
ticket bloqué par tous les lots.

## 4. Soumettre le découpage à Charly

Présenter une liste numérotée. Pour chaque ticket :

- **Titre** : court et descriptif.
- **Bloqué par** : les tickets à terminer avant.
- **Ce qu'il livre** : le comportement de bout en bout que ce ticket fait
  marcher.

Demander :

- Le grain est-il bon : trop gros, trop fin ?
- Les blocages sont-ils justes : chaque ticket ne dépend-il que de ce qui le
  conditionne vraiment ?
- Faut-il fusionner ou scinder des tickets ?

Itérer jusqu'à ce que Charly approuve. **Ne rien publier avant son accord.**

## 5. Publier en issues GitHub

Créer une issue par ticket avec `gh issue create`, dans l'ordre des dépendances
(les bloquants d'abord), pour que « Bloqué par » cite de vrais numéros. Ne fermer
ni modifier l'issue d'origine.

```markdown
## Origine

Référence à l'issue ou au document d'origine. Section omise s'il n'y en a pas.

## Ce qu'il faut construire

Le comportement de bout en bout que ce ticket fait marcher, vu par celui qui s'en
sert. Pas une liste de tâches par couche.

## Done when

- [ ] Critère 1
- [ ] Critère 2

## Bloqué par

- #<numéro> pour chaque ticket bloquant, ou « Rien : peut démarrer tout de suite ».
```

La liste « Done when » sert de critères d'acceptation : chaque ligne se vérifie
par un test ou une action précise.

Éviter les chemins de fichiers et les extraits de code, qui vieillissent vite.
Exception : un extrait qui fixe une décision mieux que la prose (schéma, forme
d'un type, machine à états), réduit à l'essentiel.

On travaille ensuite la **frontière** : tout ticket dont les bloquants sont
terminés.
