# Questions ouvertes

Décisions **produit** en attente. Elles ne bloquent pas la phase 2 : le
golden master reproduit d'abord la v1 telle quelle. Chaque réponse donne lieu
à un ADR et à des tests.

## Tranchées

| #   | Question                                     | Décision                                                       | Trace                                                  |
| --- | -------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| Q1  | Quelle formule pour la v2 ?                  | v1 à l'identique d'abord, puis évolutions isolées et annoncées | [ADR 0007](adr/0007-evolution-de-la-note.md)           |
| Q2  | Prestige saisi ou déduit du type d'édition ? | Déduit du type ; exception possible, justifiée et enregistrée  | [ADR 0007](adr/0007-evolution-de-la-note.md), évol. E1 |
| Q3  | Les In House comptent-ils dans la note ?     | Non : classement de soirée et badges uniquement                | [ADR 0007](adr/0007-evolution-de-la-note.md), évol. E2 |
| Q8  | Hébergement du dépôt                         | GitHub public ; aucune donnée joueur réelle non anonymisée     | [ADR 0006](adr/0006-tdd-et-golden-master.md)           |

## En attente

### Note

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

**Q6 — Interface bilingue FR/EN ?**
La v1 a un dictionnaire anglais. Le garder coûte de la maintenance sur chaque
texte.

**Q7 — Que deviennent les pages de laboratoire** (Hub Lab, Rating Lab, Stream
Lab, Hub Draft) ? Proposition : un espace admin, absent du site public.

### Migration

Issues du profilage de la sauvegarde v1 ([spécification](domain/migration-spec.md)).
La migration applique la proposition tant que la question est ouverte.

**Q9 — Comment savoir qu'une édition est à venir ?**
La v1 a un statut saisi (`upcoming`, `ongoing`, `completed`), parfois périmé
(M7). La v2 n'en a pas, alors que les inscriptions (J3) et l'accueil (V7) en
ont besoin. Options : une colonne `status` mise à jour par les commandes, ou
un statut déduit (date future → à venir ; matchs importés → terminée).
Proposition : déduit, car il ne peut pas être périmé ; l'admin garde une
commande « clôturer » pour les événements externes sans matchs.

**Q10 — Que faire des résultats de tournoi sans match (M4) ?**
14 résultats individuels (victoire ou défaite, K/D/A) existent sans les
matchs. Options : une table de faits `edition_results` pour ce cas, ou les
abandonner. Proposition : à trancher selon leur importance pour les joueurs ;
la migration les met de côté dans le rapport.

**Q11 — Garder la bio des cartes ?** 9 joueurs en ont une en v1, la v2 n'a
pas de colonne. Proposition : ajouter `bio` (280 caractères maximum).

**Q12 — Où stocker les logos d'équipe ?** En v1, ils sont en base64 dans la
table (2,5 Mo pour 32 équipes), renvoyés à chaque lecture des équipes.
Proposition : Supabase Storage, compatible S3 donc portable (ADR 0008) ; la
table ne garde que l'URL.

**Q13 — Garder la composition des équipes d'In House (`ih_teams`) ?**
Les performances portent déjà le nom d'équipe de chaque joueur.
Proposition : non migré, conservé dans la sauvegarde.
