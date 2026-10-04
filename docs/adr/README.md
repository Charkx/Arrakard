# Architecture Decision Records

Un ADR consigne **une** décision structurante : son contexte, le choix fait,
les options écartées et les conséquences. Il ne se modifie pas après
acceptation. Si une décision change, on écrit un nouvel ADR qui _remplace_
l'ancien, et on met à jour le statut de l'ancien.

## Quand en écrire un

Dès qu'un choix est coûteux à défaire, ou qu'un nouveau contributeur se
demanderait « pourquoi c'est fait comme ça ? ».

## Comment

1. Copier [`template.md`](template.md) vers `NNNN-titre-court.md`.
2. Statut `Proposé`, puis ouvrir une PR.
3. Passer en `Accepté` une fois la décision prise.

## Index

| #                                           | Décision                                         | Statut                 |
| ------------------------------------------- | ------------------------------------------------ | ---------------------- |
| [0001](0001-monorepo-et-domaine-pur.md)     | Monorepo TypeScript avec un domaine pur          | Accepté                |
| [0002](0002-supabase-source-de-verite.md)   | Supabase comme backend et source de vérité       | Accepté                |
| [0003](0003-faits-et-projections.md)        | Séparer les faits des projections                | Accepté                |
| [0004](0004-identite-joueur-par-id.md)      | Identifier les joueurs par un identifiant stable | Accepté                |
| [0005](0005-ecritures-par-commandes.md)     | Écritures par commandes transactionnelles        | Proposé (spike requis) |
| [0006](0006-tdd-et-golden-master.md)        | TDD et golden master avant toute réécriture      | Accepté                |
| [0007](0007-evolution-de-la-note.md)        | Faire évoluer la note par étapes isolées         | Accepté                |
| [0008](0008-multi-tenant-et-portabilite.md) | Préparer le multi-tenant et la portabilité       | Accepté                |
