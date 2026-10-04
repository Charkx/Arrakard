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
