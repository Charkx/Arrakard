# Skills du projet

Sept skills en français, adaptés aux chemins et aux rituels de ce dépôt. Les
rituels eux-mêmes sont dans
[`docs/contributing.md`](../../docs/contributing.md#travailler-avec-un-agent).

| Skill              | Sert à                                                          | Origine                                 |
| ------------------ | --------------------------------------------------------------- | --------------------------------------- |
| `ping-pong`        | TDD en alternance entre Charly et l'agent                       | Projet, d'après `docs/contributing.md`  |
| `tdd`              | Référence : bon test, frontières, anti-patterns                 | Dérivé de `tdd`                         |
| `grill-with-docs`  | Éprouver une décision et tenir à jour glossaire, ADR, questions | Dérivé de `grilling`, `domain-modeling` |
| `to-questionnaire` | Préparer un questionnaire pour quelqu'un d'autre                | Dérivé de `to-questionnaire`            |
| `to-tickets`       | Découper un travail en issues GitHub avec leur « Done when »    | Dérivé de `to-tickets`                  |
| `revue`            | Relire une branche : conventions du dépôt et demande de l'issue | Dérivé de `code-review`                 |
| `handoff`          | Passer le relais à la session suivante                          | Dérivé de `handoff`                     |

## Règle de trois

On n'écrit pas de skill à l'avance. On en écrit un quand la même recette s'est
répétée trois fois.

## Origine

Les six skills dérivés viennent de
[mattpocock/skills](https://github.com/mattpocock/skills), version `v1.3.2`
(commit `d1478fcb140db0b93c0c8df17bcfd311844749d0`). Ils ont été traduits, élagués
et adaptés. Aucune mise à jour automatique : pour reprendre une amélioration, on
compare à la main avec la version d'origine.

Ce qui a changé par rapport à l'origine :

- **Chemins** : le glossaire est `docs/domain/glossary.md`, en tableaux, et les
  ADR suivent `docs/adr/template.md`. Le mode à plusieurs contextes a été retiré.
- **`tdd`** : le refactor fait partie de la boucle, comme dans
  `docs/contributing.md`. Le renvoi au skill `codebase-design` a été retiré.
- **`grill-with-docs`** : réunit `grilling` et `domain-modeling`, cherche les
  faits sans sous-agent, et met à jour `docs/open-questions.md`.
- **`to-tickets`** : GitHub seulement, critères titrés « Done when », pas de
  label de triage, rien n'est publié avant validation.
- **`to-questionnaire`** : écrit dans `docs/questionnaires/`, sans donnée réelle
  de joueur.
- **`revue`** : renommé pour ne pas se confondre avec la commande intégrée
  `/code-review`, sources de conventions fixées, `main` par défaut.
- **`handoff`** : écrit dans `.handoff/` au lieu du dossier temporaire du système.

## Licence des textes d'origine

```
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
