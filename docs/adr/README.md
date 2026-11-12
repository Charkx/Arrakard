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

| #                                                       | Décision                                             | Statut  |
| ------------------------------------------------------- | ---------------------------------------------------- | ------- |
| [0001](0001-monorepo-et-domaine-pur.md)                 | Monorepo TypeScript avec un domaine pur              | Accepté |
| [0002](0002-supabase-source-de-verite.md)               | Supabase comme backend et source de vérité           | Accepté |
| [0003](0003-faits-et-projections.md)                    | Séparer les faits des projections                    | Accepté |
| [0004](0004-identite-joueur-par-id.md)                  | Identifier les joueurs par un identifiant stable     | Accepté |
| [0005](0005-ecritures-par-commandes.md)                 | Écritures par commandes transactionnelles            | Accepté |
| [0006](0006-tdd-et-golden-master.md)                    | TDD et golden master avant toute réécriture          | Accepté |
| [0007](0007-evolution-de-la-note.md)                    | Faire évoluer la note par étapes isolées             | Accepté |
| [0008](0008-multi-tenant-et-portabilite.md)             | Préparer le multi-tenant et la portabilité           | Accepté |
| [0009](0009-serialiser-et-journaliser-les-commandes.md) | Sérialiser et journaliser les commandes              | Accepté |
| [0010](0010-travailler-avec-un-agent.md)                | Travailler avec un agent : trois portes, trois modes | Accepté |
| [0011](0011-livrer-par-tranches.md)                     | Livrer par tranches, la lecture d'abord              | Accepté |
| [0012](0012-publier-les-resultats.md)                   | Publier les résultats : brouillon, aperçu, récap     | Accepté |
| [0013](0013-statut-d-edition-deduit.md)                 | Déduire le statut d'une édition                      | Proposé |
| [0014](0014-une-seule-periode-la-saison.md)             | Une seule période de compétition : la saison         | Accepté |
| [0015](0015-logos-hors-de-la-base.md)                   | Stocker les logos d'équipe hors de la base           | Accepté |
| [0016](0016-perimetre-repris-de-la-v1.md)               | Ne reprendre de la v1 que ce qui sert                | Accepté |
| [0017](0017-outils-du-site.md)                          | Les outils du site : React, Vite et Tailwind         | Accepté |
| [0018](0018-deux-langues-dictionnaire-maison.md)        | Deux langues, un dictionnaire maison                 | Accepté |
| [0019](0019-lire-la-base-depuis-le-site.md)             | Lire la base depuis le site                          | Proposé |
