# 0037 — Saisir un match à la main

- **Statut** : Accepté
- **Date** : 2026-11-23

## Contexte

Les soirées In House n'ont pas toujours de fichier Excel : l'admin doit pouvoir
saisir un match lui-même (cas d'usage A14, ticket #44). Le match doit rester
invisible jusqu'à la publication (ADR 0012), et une feuille incohérente ne
doit jamais entrer dans les faits. La maquette « deux côtés face à face, une
ligne par rôle » a été validée le 2026-11-23.

## Décision

**`recordMatch` enregistre un match en brouillon**, numéroté après les matchs
de l'édition, à la version que l'admin a sous les yeux (ADR 0005).

**La cohérence d'une feuille est une règle du domaine, `matchEntryProblems`** :
chaque rôle une fois du TOP au SUP, deux équipes aux noms distincts, un joueur
et un champion à chaque place, un joueur une seule fois. Le formulaire s'en
sert pour expliquer les erreurs pendant la saisie, et la commande pour refuser
une feuille (`conflict`). Le contrat ne vérifie que la forme.

La commande refuse aussi un événement externe et une édition archivée
(`conflict`), une saison clôturée (`season_closed`, ADR 0032), et un joueur
inconnu ou fusionné (`not_found`).

Les noms d'équipe d'un match sont du texte libre, comme dans les fichiers
Excel : une équipe IH n'existe qu'au sein de son édition (glossaire).

## Options écartées

- **Vérifier la feuille dans le contrat seulement** : le formulaire ne
  pourrait pas expliquer les erreurs avec la même règle, et elle ne serait pas
  testée comme le reste du domaine.
- **Créer les joueurs inconnus pendant la saisie** : c'est le rôle de l'import
  (tickets #45 et #46), avec ses décisions explicites.

## Conséquences

- L'aperçu et la publication (#47, ADR 0012) s'appliquent aux matchs saisis
  comme aux matchs importés.
- Corriger un match saisi passe par la correction (#48).
