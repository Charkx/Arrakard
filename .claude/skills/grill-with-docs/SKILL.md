---
name: grill-with-docs
description: Interroge Charly sans relâche sur un plan, une décision ou une question ouverte, par tours de questions, et consigne au fil de l'eau ce qui est tranché dans le glossaire, les ADR et les questions ouvertes. À utiliser quand Charly demande un « grill » ou veut éprouver une décision.
argument-hint: 'Le plan, la décision ou les questions à trancher (ex. Q9 et Q10)'
---

# Grill, avec la doc

Deux disciplines menées ensemble : interroger jusqu'à une compréhension partagée,
et écrire le modèle du domaine au moment où il se précise.

## L'interrogatoire

Voir la décision comme un **arbre** : chaque choix ouvre les choix qui en
dépendent.

Avancer par **tours**. La **frontière** est l'ensemble des décisions dont les
prérequis sont déjà réglés, donc les questions qu'on peut poser maintenant sans
deviner une réponse pas encore entendue. Poser toute la frontière en un tour,
chaque question numérotée et suivie d'une recommandation, puis attendre les
réponses.

```
**Q1 — <titre>** : <la question, avec ses options et ce qu'elles coûtent>

→ <la réponse recommandée>
```

- Formuler chaque question pour que « oui » accepte la recommandation.
- Une question qui dépend d'une autre encore ouverte dans ce tour appartient au
  tour suivant.
- Chaque réponse redessine l'arbre : recalculer la frontière, puis poser le tour
  suivant.

**Les faits sont le travail de l'agent, les décisions celui de Charly.** Quand une
question dépend d'un fait (fichier, code, outil, documentation), aller le chercher
au lieu de le demander. Pendant cette recherche, seules les questions qui en
dépendent attendent : poser le reste de la frontière.

La session est finie quand la frontière est vide : chaque branche visitée, rien
de supposé en silence. Ne rien exécuter avant que Charly ait confirmé qu'on se
comprend.

## Pendant la session

- **Confronter au glossaire.** Si Charly emploie un terme dans un autre sens que
  `docs/domain/glossary.md`, le dire tout de suite : « le glossaire définit
  "édition" comme X, tu sembles dire Y. Lequel ? »
- **Préciser le flou.** Devant un terme vague ou surchargé, proposer un terme
  canonique précis.
- **Éprouver par des scénarios.** Inventer des cas concrets qui forcent à tracer
  la limite entre deux concepts.
- **Recouper avec le code.** Quand Charly décrit un fonctionnement, vérifier que
  le code dit la même chose, et signaler toute contradiction.

## Consigner au fil de l'eau

Ne pas attendre la fin de la session : écrire chaque point au moment où il est
tranché.

### Glossaire

`docs/domain/glossary.md`, dans son format actuel : des tableaux
« Terme | Code | Définition » par thème, et la section « Termes à ne plus
utiliser ».

- Un seul mot par concept. Les synonymes écartés vont dans « Termes à ne plus
  utiliser », avec la raison.
- Une définition tient en une ou deux phrases et dit ce que la chose **est**.
- Seulement les termes propres au projet, pas les notions générales de
  programmation.
- Aucun détail d'implémentation : ce n'est ni une spec ni un brouillon.

### ADR

Ne proposer un ADR que si les trois conditions sont réunies :

1. **Difficile à défaire** : changer d'avis plus tard coûterait cher.
2. **Surprenant sans contexte** : un lecteur futur se demanderait pourquoi.
3. **Fruit d'un vrai arbitrage** : il existait d'autres options sérieuses.

Dans ce cas :

- copier `docs/adr/template.md` vers `docs/adr/NNNN-titre-court.md`, avec le
  numéro qui suit le plus grand existant ;
- statut « Proposé », puis « Accepté » quand Charly a tranché ;
- ajouter la ligne à l'index de `docs/adr/README.md` ;
- ne jamais modifier un ADR accepté : écrire un nouvel ADR qui le remplace, et
  mettre à jour le statut de l'ancien.

### Questions ouvertes

Quand une question de `docs/open-questions.md` est tranchée, la déplacer de « En
attente » vers le tableau « Tranchées », avec la décision et un lien vers sa
trace (ADR, spec).

Ce qui se décide avec les admins de la communauté ne se tranche pas ici : préparer
un questionnaire avec le skill `to-questionnaire`.
