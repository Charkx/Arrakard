# 0028 — Les brouillons, cachés par les droits d'accès

- **Statut** : Accepté
- **Date** : 2026-11-22
- **Complète** : [0012](0012-publier-les-resultats.md) (comment la base range brouillons et publications)

## Contexte

L'ADR 0012 décide qu'un résultat saisi ou importé est d'abord un brouillon,
invisible du public, et qu'une commande le publie. Il restait à dire comment
la base le range, et comment le public cesse de le voir. Le site lit cinq vues
qui joignent les matchs et les performances. Les commandes, elles, écrivent
par une connexion directe qui ne passe pas par les droits d'accès
(ADR 0023).

## Décision

**Un match porte une colonne `draft`**, fausse par défaut. Les matchs migrés
de la v1 restent donc publiés, sans changer l'outil de migration. Un match
saisi ou importé (#44, #45) sera écrit avec `draft = true`.

**Les droits d'accès cachent les brouillons à tous les rôles de l'API**, pas les
vues : la règle de lecture des matchs devient `not draft`, et celle des
performances ne laisse voir que celles d'un match publié. Les vues étant lues
avec les droits du visiteur (`security_invoker`), aucune n'a à être réécrite,
et une vue ajoutée plus tard ne peut pas oublier le filtre. Le recalcul des
projections lit lui aussi les seuls matchs publiés (`readFacts`).

**Une publication est une ligne de `publications`** : l'édition, les matchs
publiés (`match_ids`, un tableau), la date et l'auteur. Elle est publique, sauf
son auteur (un identifiant de connexion), et seule la commande
`publishEdition` l'écrit. Elle publie tous les brouillons de
l'édition à la fois, augmente sa version, et refuse une édition sans
brouillon (`nothing_to_publish`, `409`).

## Options écartées

- **Filtrer dans chaque vue** : cinq vues à réécrire, et le filtre à ne pas
  oublier dans chaque vue future. Un oubli montrerait un brouillon au public.
- **Une table de brouillons à part** : la saisie, l'import et la correction
  écriraient à deux endroits, et publier recopierait des lignes.
- **Une table de liaison publication ↔ match** : plus normale, mais rien ne
  la lit aujourd'hui ligne par ligne. Le tableau suffit à notre échelle
  (principe 5).

## Conséquences

- Même un admin ne voit pas les brouillons par l'API publique. L'aperçu (#47)
  et l'espace admin les liront par une commande ou une Edge Function, avec la
  connexion directe, ou par une règle d'accès réservée aux admins, à décider
  à ce ticket.
- `match_ids` n'a pas de clé étrangère : seule la commande l'écrit, avec les
  brouillons de l'édition qu'elle vient de lire.
- Une édition clôturée (ADR 0013) peut encore recevoir une publication : une
  correction tardive doit rester possible.
- L'édition elle-même reste publique, avec son MVP d'événement, même quand elle
  n'a encore que des brouillons. Le MVP se saisit avec les résultats (#44, #45) :
  à ce ticket de ne l'écrire qu'à la publication si besoin.
- La règle de lecture des performances fait une sous-requête par ligne : sans
  effet mesurable pour 12 000 performances.
- Le statut d'une édition (ADR 0027) ne compte déjà que les matchs publiés,
  puisque la vue de l'en-tête passe par ces droits.
