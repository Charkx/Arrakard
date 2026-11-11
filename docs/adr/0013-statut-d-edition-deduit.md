# 0013 — Déduire le statut d'une édition

- **Statut** : Accepté
- **Date** : 2026-11-11

## Contexte

La v1 a un statut saisi (`upcoming`, `ongoing`, `completed`), parfois périmé :
une LAN externe passée y est encore « en cours » (anomalie M7 de la
[migration](../domain/migration-spec.md)). La v2 n'a pas de statut, alors que
les inscriptions (J3) et l'accueil (V7) doivent savoir qu'une édition est à
venir.

Une ligue dure plusieurs semaines, et sa fin dépend de l'agenda des équipes :
on ne peut pas la dire terminée dès que ses premiers matchs existent.

## Décision

Le statut d'une édition (`EditionStatus`) n'est **jamais saisi**. Il se déduit
des faits :

- **à venir** : sa date est dans le futur et rien n'est publié ;
- **terminée** dans l'un de ces cas :
  - son match final est publié ;
  - c'est une soirée In House dont des résultats sont publiés, et sa date est
    passée ;
  - c'est un événement externe, et sa date est passée ;
  - un admin l'a **clôturée** ;
- **en cours** dans tous les autres cas.

La **clôture** est un fait daté, posé par une commande. Elle sert quand les
faits ne suffisent pas : une ligue sans finale, un tournoi interrompu.

La règle exacte s'écrit en tests dans le domaine.

## Options écartées

- **Un statut saisi, mis à jour par les commandes** : il peut être périmé,
  comme en v1.
- **« Terminée » dès que des matchs existent** (première proposition de la
  question Q9) : une ligue serait terminée dès sa première journée.

## Conséquences

- Aucun statut à tenir à jour. Les inscriptions et l'accueil lisent le statut
  déduit.
- Le statut dépend de la date du jour : il se calcule à la lecture, il ne se
  stocke pas.
- La migration ne reprend pas `editions.status`. Une édition `completed` en
  v1 reçoit une clôture, pour rester terminée même sans match final repéré.
  Les autres statuts v1 sont ignorés.
- Un statut « terminée » n'interdit pas d'écrire : on peut encore publier un
  match oublié ou corriger un résultat.
