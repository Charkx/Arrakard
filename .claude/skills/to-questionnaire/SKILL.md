---
name: to-questionnaire
description: Transforme une décision que Charly ne peut pas trancher seul en questionnaire à faire remplir par quelqu'un d'autre, par exemple les admins de la communauté. À utiliser quand Charly le demande.
argument-hint: 'La décision ou les questions ouvertes concernées (ex. Q2 bis et Q4)'
---

# Questionnaire

_Dérivé de `to-questionnaire`, mattpocock/skills v1.3.2 (licence MIT). Écarts et
licence : `.claude/skills/README.md`._

Transformer ce que Charly ne peut pas décider seul en **questionnaire** : un
document Markdown remis à une personne, qui le remplit de son côté ou avec lui en
réunion. Le destinataire détient un savoir que Charly n'a pas ; le questionnaire
va le chercher.

**Interroger sur l'envoi, pas sur le sujet.** N'interroger Charly que sur ce
qu'il sait toujours dire : à qui va le document, et ce qu'il doit en retirer. Les
questions du document visent ensuite l'**écart** entre ce que sait le
destinataire et ce dont Charly a besoin.

## Étapes

1. **À qui ?** Demander en un seul échange le rôle du destinataire, ce qu'il
   connaît et sa relation avec Charly. Cela fixe le ton et la quantité de contexte
   à fournir.
2. **Pour obtenir quoi ?** Demander en un seul échange les décisions ou les faits
   que Charly ne peut pas établir seul. Fini quand on a une liste concrète de ce
   qu'il doit pouvoir décider ensuite.
3. **Écrire le questionnaire** dans `docs/questionnaires/<sujet>.md`, selon la
   structure ci-dessous, et donner le chemin. Fini quand chaque point de l'étape 2
   est couvert par une question.

Le dépôt est public : aucun nom ni aucune donnée réelle de joueur dans le
questionnaire. Illustrer avec des cas inventés.

## Structure du document

Un questionnaire de découverte : Charly manque de contexte, le destinataire l'a.
Les questions vont de la plus importante à la moins importante, car on n'aura
peut-être qu'un seul passage. Les regrouper par thème dès qu'il y en a plus d'une
poignée.

```markdown
# <Titre du questionnaire>

**But :** pourquoi ce questionnaire existe, et la décision qui en dépend.

**De :** <Charly> · **Pour :** <destinataire> · **Usage des réponses :** <où elles vont>

## Contexte

Un paragraphe pour quelqu'un qui n'était pas dans la tête de Charly. Assez pour
bien répondre, pas une page.

## Comment répondre

Date limite et effort estimé. Une réponse partielle ou un « je ne sais pas » sont
utiles : signaler un doute plutôt que sauter la question.

## <Thème>

### <Une question, une seule idée>

_Pourquoi c'est important : seulement si la question peut être mal comprise ou
appeler une réponse expédiée._

>

## Autre chose ?

Ce qu'on n'a pas demandé et qu'on devrait savoir.
```

Quand les réponses reviennent, les décisions se consignent avec le skill
`grill-with-docs` : ADR et questions ouvertes.
