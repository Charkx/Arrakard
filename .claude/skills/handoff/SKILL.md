---
name: handoff
description: Résume la session en une note de passation pour que la session suivante reprenne le travail sans rien redemander. À utiliser à la fin de chaque session, ou quand Charly demande un handoff.
argument-hint: 'À quoi servira la prochaine session ?'
---

# Handoff

Écrire une note de passation qui permette à un agent sans aucun contexte de
continuer le travail.

L'enregistrer dans `.handoff/AAAA-MM-JJ-<sujet>.md`, à la racine du dépôt. Ce
dossier est ignoré par git : la note survit entre deux sessions sans être
publiée.

## Contenu

1. **État** : ce qui est fait, ce qui est en cours, sur quelle branche, avec quels
   tests verts ou rouges. En ping-pong : à qui est le tour, et la liste de tests
   restante.
2. **Décisions** : ce qui a été tranché pendant la session, et où c'est écrit.
3. **Prochaine étape** : la première action de la session suivante, assez précise
   pour démarrer sans question.
4. **Skills suggérés** : ceux que l'agent suivant devrait charger.

## Règles

- **Ne pas recopier** ce qui est déjà écrit ailleurs (ADR, issues, specs, commits,
  diffs). Y renvoyer par un chemin ou une URL.
- **Une décision ne vit pas seulement ici.** Si elle doit durer, elle va dans un
  ADR, une issue ou la doc. Si ce n'est pas encore fait, l'écrire dans « Prochaine
  étape ».
- **Rien de sensible** : ni secret, ni contenu des fichiers interdits, ni donnée
  réelle de joueur.
- Si Charly a précisé à quoi servira la prochaine session, orienter la note en
  conséquence.
