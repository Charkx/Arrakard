# 0018 — Deux langues, un dictionnaire maison

- **Statut** : Accepté
- **Date** : 2026-11-12

## Contexte

L'interface reste en français et en anglais
([ADR 0016](0016-perimetre-repris-de-la-v1.md)) : une bonne partie de la
communauté est anglophone. Chaque texte affiché existe donc deux fois.

La v1 a son propre système de traduction, sans dépendance. Son défaut : une
clé mal écrite ou oubliée en anglais ne se voit qu'à l'écran.

## Décision

Les textes vivent dans un **dictionnaire maison**
(`apps/web/src/i18n/dictionary.ts`) : une clé, un texte par langue. Le
français est la langue de référence.

- Les clés sont typées : une clé inconnue, ou un texte oublié en anglais,
  empêche le site de compiler.
- À la première visite, la langue est le français si le navigateur est en
  français, l'anglais sinon. C'est la règle de la v1.
- Un bouton change la langue. Le choix est gardé dans le navigateur
  (`localStorage`) et retrouvé au rechargement.
- La page déclare sa langue (`<html lang>`), pour les lecteurs d'écran.

## Options écartées

- **Une bibliothèque** (react-i18next) : deux dépendances et leurs concepts,
  utiles pour beaucoup de langues ou des pluriels compliqués. Deux langues
  n'en ont pas besoin.
- **La langue dans l'adresse** (`/en/…`) : utile au référencement, mais
  double chaque route. À revoir si le besoin apparaît.

## Conséquences

- Aucune dépendance, et environ 50 lignes à comprendre.
- Un texte ne peut pas manquer dans une langue.
- Les textes avec une variable ou un pluriel (« 3 inscrits ») ne sont pas
  encore gérés : ils s'ajouteront avec la première page qui en a besoin.
- Un lien partagé ne porte pas la langue : chacun le voit dans la sienne.
- Les données saisies par les admins (noms d'édition, descriptions) ne sont
  pas traduites.
