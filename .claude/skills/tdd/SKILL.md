---
name: tdd
description: Référence de TDD du projet. Ce qu'est un bon test, à quelle frontière tester, les anti-patterns et les règles de la boucle. À consulter avant et pendant tout travail piloté par les tests, y compris en ping-pong.
---

# TDD

_Dérivé de `tdd`, mattpocock/skills v1.3.2 (licence MIT). Écarts et licence :
`.claude/skills/README.md`._

Le cycle rouge, vert, refactor et les conventions de test du projet sont dans
`docs/contributing.md` : les lire d'abord. Ce skill ajoute ce que ce document ne
dit pas. Pour le code qui porte une règle métier ou une règle d'accès, le mode de
travail est le skill `ping-pong`.

Avant d'écrire un test, lire `docs/domain/glossary.md` : les noms de tests et
d'interfaces emploient ses termes. Respecter les ADR de la zone touchée.

## Un bon test

Un test vérifie un comportement par l'interface publique, jamais un détail
d'implémentation. Le code peut changer du tout au tout, le test ne bouge pas. Il
se lit comme une spécification : « un joueur sans partie a une note de 60 » dit
quelle capacité existe, et survit à un refactor parce qu'il ignore la structure
interne.

Exemples dans [tests.md](tests.md), règles de mock dans [mocking.md](mocking.md).

## Frontières : où placer les tests

Une **frontière** est l'interface publique où l'on observe un comportement sans
regarder à l'intérieur. Les tests vivent aux frontières, jamais contre les
rouages internes.

**Ne tester qu'aux frontières convenues.** Avant le premier test, noter les
frontières visées et les faire confirmer par Charly, avec pour chacune une ligne
sur ce qu'elle attrape et ce qu'elle laisse passer. On ne peut pas tout tester :
se mettre d'accord d'abord, c'est placer l'effort sur les chemins critiques et la
logique complexe.

Dans ce dépôt, le domaine se teste par ses fonctions exportées, et la base par ce
qu'un rôle donné peut lire et écrire (pgTAP).

## Anti-patterns

- **Couplé à l'implémentation** : le test mocke des collaborateurs internes,
  teste une fonction privée ou vérifie par un chemin détourné (interroger la base
  au lieu de passer par l'interface). Le signe : il casse à un refactor alors que
  le comportement n'a pas changé.
- **Tautologique** : l'assertion recalcule la valeur attendue comme le fait le
  code (`expect(add(a, b)).toBe(a + b)`). Le test passe par construction et ne
  peut jamais contredire le code. La valeur attendue vient d'une source
  indépendante : un littéral connu, un exemple chiffré de la spec.
- **Tranches horizontales** : écrire tous les tests, puis tout le code. Des tests
  écrits en bloc vérifient un comportement imaginé et figent une structure avant
  qu'on ait compris l'implémentation. Travailler en **tranches verticales** : un
  test, son code, puis le suivant, chaque cycle tenant compte de ce que le
  précédent a appris.

## Règles de la boucle

- **Rouge avant vert.** Le test qui échoue d'abord, puis juste assez de code pour
  le faire passer. Pas de fonctionnalité spéculative.
- **Une tranche à la fois.** Une frontière, un test, une implémentation minimale
  par cycle.
- **Le refactor fait partie de la boucle.** Après chaque vert, on nettoie le code
  et les tests, tests verts à chaque pas (`docs/contributing.md`). C'est un écart
  voulu avec le skill d'origine, qui renvoie le refactor à la revue.
