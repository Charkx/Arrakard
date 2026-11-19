# Questions ouvertes

Décisions **produit** en attente. Elles ne bloquent pas la
tranche 1 : la v2 reproduit d'abord les notes de la v1 telles quelles. Chaque
réponse donne lieu à un ADR et à des tests.

## Tranchées

| #   | Question                                       | Décision                                                                   | Trace                                                  |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| Q1  | Quelle formule pour la v2 ?                    | v1 à l'identique d'abord, puis évolutions isolées et annoncées             | [ADR 0007](adr/0007-evolution-de-la-note.md)           |
| Q2  | Prestige saisi ou déduit du type d'édition ?   | Déduit du type ; exception possible, justifiée et enregistrée              | [ADR 0007](adr/0007-evolution-de-la-note.md), évol. E1 |
| Q3  | Les In House comptent-ils dans la note ?       | Non : classement de soirée et badges uniquement                            | [ADR 0007](adr/0007-evolution-de-la-note.md), évol. E2 |
| Q6  | Interface bilingue FR/EN ?                     | Oui : une bonne partie de la communauté est anglophone                     | [ADR 0016](adr/0016-perimetre-repris-de-la-v1.md)      |
| Q7  | Que deviennent les pages de laboratoire ?      | Non reprises ; leurs idées deviennent des cas d'usage ou disparaissent     | [ADR 0016](adr/0016-perimetre-repris-de-la-v1.md)      |
| Q8  | Hébergement du dépôt                           | GitHub public ; aucune donnée joueur réelle non anonymisée                 | [ADR 0006](adr/0006-tdd-et-golden-master.md)           |
| Q9  | Comment savoir qu'une édition est à venir ?    | Statut déduit, jamais saisi ; règle validée le 2026-11-19                  | [ADR 0013](adr/0013-statut-d-edition-deduit.md)        |
| Q10 | Résultats de tournoi sans match (M4) ?         | Abandonnés : ni migrés ni comptés, annoncés                                | [ADR 0022](adr/0022-perimetre-de-la-tranche-2.md)      |
| Q11 | Garder la bio des cartes ?                     | Non                                                                        | [ADR 0016](adr/0016-perimetre-repris-de-la-v1.md)      |
| Q12 | Où stocker les logos d'équipe ?                | Dans le stockage de fichiers ; la table ne garde que l'adresse             | [ADR 0015](adr/0015-logos-hors-de-la-base.md)          |
| Q13 | Garder la composition des équipes d'In House ? | Non migrée : ces équipes n'existent que le temps d'une soirée              | [ADR 0016](adr/0016-perimetre-repris-de-la-v1.md)      |
| Q16 | Saisir un match à la main ?                    | Oui, dès la tranche 2 (cas d'usage A14), en plus de l'import               | [ADR 0022](adr/0022-perimetre-de-la-tranche-2.md)      |
| Q17 | Où héberger le site en lecture ?               | Nouveau projet Supabase gratuit et nouveau projet Vercel, séparés de la v1 | [ADR 0020](adr/0020-heberger-le-site-en-lecture.md)    |

## En attente

### Note

Reportées après la tranche 2, qui garde la note v1 : elles partent dans un
questionnaire aux admins ([ADR 0022](adr/0022-perimetre-de-la-tranche-2.md)).

**Q2 bis — Quel multiplicateur pour chaque type d'édition ?**
Proposition de départ, à valider : Div 1 ×1,6 · Div 2 ×1,3 · tournoi et LAN
×1,6. Les In House sont hors note (Q3). Les événements externes n'ont pas de
matchs.

**Q4 — Une note Div 1 et une note Div 2 sont-elles comparables ?**
Aujourd'hui, avec le même prestige, un joueur de Div 2 peut dépasser un
joueur de Div 1 au classement général. Q2 bis réduit l'écart sans le
supprimer.

**Q5 — Faut-il garder le plancher à 60 ?**
Il masque les différences en bas du classement (anomalie A2).

### Produit

**Q14 — Peut-on réduire la saisie grâce à l'API de Riot ?** _Reportée en tranche 3._
Aujourd'hui les organisateurs remplissent un fichier Excel après chaque
édition. Récupérer les statistiques des parties auprès de Riot supprimerait
cette saisie. À étudier avant de promettre : il faut savoir comment les
parties sont créées, et si Riot donne accès aux parties personnalisées.

**Q15 — Comment les équipes d'In House sont-elles formées aujourd'hui ?** _Reportée en tranche 3._
Le cas d'usage A12 propose des équipes équilibrées à partir des inscrits. Il
faut d'abord savoir qui les forme, avec quels critères, et ce qui pose
problème.

**Q18 — Quel rôle du serveur Discord d'Arrakis fait un admin ?**
La connexion par Discord et la revérification du rôle à chaque connexion sont
décidées ([ADR 0002](adr/0002-supabase-source-de-verite.md),
[ADR 0008](adr/0008-multi-tenant-et-portabilite.md)). Il manque le nom exact du
rôle, et l'identifiant du serveur. Bloque le ticket de connexion de la tranche 2.
