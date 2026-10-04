# Spécification de l'import Excel

L'import d'une édition (cas d'usage A1) se fait en trois étapes. Seule la
première touche au fichier.

1. **Extraction** (côté web) : la bibliothèque Excel transforme la feuille en
   lignes d'objets (`SheetRow`). Le domaine ne dépend d'aucune bibliothèque.
2. **Lecture** (`parseStatsSheet`, domaine) : validation et structuration en
   matchs, lignes de rôle et performances brutes.
3. **Résolution** (domaine) : chaque nom brut est rattaché à un joueur
   ([ADR 0004](../adr/0004-identite-joueur-par-id.md)), les équipes inconnues
   et les transferts sont détectés, puis l'admin tranche.

## Format de la feuille `LIGUE1_STATS`

- La première ligne (totaux) est ignorée ; la deuxième contient les en-têtes.
- Chaque ligne décrit **un rôle d'un match** : l'équipe A à gauche, l'équipe B
  à droite, avec les mêmes colonnes suffixées `.1` (ou `_1`, selon la version
  de la bibliothèque).
- Colonnes obligatoires (côté A) : `MATCH`, `GAGNANT`, `DURÉE`, `EQUIPE`,
  `POSTE`, `NOM DU JOUEUR`, `CHAMPION`, `K`, `D`, `A`, `GOLD`.

## Règles de lecture

| Règle              | Détail                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lignes ignorées    | Sans numéro de match, ou sans nom de joueur côté A (totaux Excel)                                                                                |
| Regroupement       | Par numéro de match ; matchs triés par numéro, rôles dans l'ordre TOP, JGL, MID, ADC, SUP                                                        |
| Postes             | Synonymes acceptés : `JUNGLE` → JGL, `MIDDLE` → MID, `BOT` → ADC, `SUPP`/`SUPPORT` → SUP. Un poste inconnu ignore la ligne avec un avertissement |
| Résultat           | `WIN` (casse et espaces ignorés) est une victoire, tout le reste une défaite                                                                     |
| Nombres            | Arrondis à l'entier ; une cellule vide ou illisible vaut 0                                                                                       |
| Durée              | `minutes.secondes` : 33.11 → 33:11 ; 33.5 → 33:50                                                                                                |
| Garde-fous         | Équipe ≤ 16 caractères, nom ≤ 80, champion ≤ 32                                                                                                  |
| Avertissements     | Match qui n'a pas exactement 5 lignes, poste inconnu                                                                                             |
| Erreurs bloquantes | Feuille vide, colonnes manquantes, aucune colonne d'équipe B, aucun match exploitable                                                            |

KDA et GPM ne sont **pas** lus dans le fichier : ils se recalculent à partir des
kills, morts, assists, de l'or et de la durée.

## Écarts avec la v1

- **Durées** : la v1 transformait les secondes de 01 à 09 en dizaines (33:05 →
  33:50), ce qui faussait le GPM et le « match le plus rapide ». C'est corrigé.
- **Tags d'équipe** : le préfixe d'un nom n'est retiré que s'il désigne une
  équipe connue (anomalie A7 de la [spec de note](rating-spec.md)).
