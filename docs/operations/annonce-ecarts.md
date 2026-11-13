# Annonce des écarts connus avec la v1

Brouillon à publier sur le Discord d'Arrakis à la mise en ligne de la tranche 1
(ticket 16). Il couvre les deux écarts qu'un joueur peut remarquer :
l'anomalie M9 ([migration](../domain/migration-spec.md)) et l'anomalie A6
([note](../domain/rating-spec.md)).

Avant de publier, remplace `NOMBRE` et `NUMBER` par le nombre de joueurs
concernés par A6 dans le rapport de la [mise en ligne](mise-en-ligne.md)
(étape 3 ; un seul le 2026-10-05), et l'adresse si elle a changé.

---

## Français

**Le nouveau site d'Arrakis est en ligne, en lecture seule** : https://arrakard.vercel.app

Vous y trouverez le classement de la saison, votre carte, vos matchs, chaque
édition, et une nouveauté : **« Pourquoi cette note ? »**, qui détaille le
calcul de votre note, étape par étape.

Les résultats se saisissent encore sur l'ancien site : le nouveau est mis à
jour après chaque événement.

Les notes de la saison sont les mêmes sur les deux sites. Deux différences
peuvent vous surprendre :

- **La vue « toutes saisons » de l'ancien site n'existe pas sur le nouveau.**
  Elle lisait des totaux calculés une fois, en juin, et plus jamais mis à
  jour : ses chiffres étaient faux pour beaucoup d'entre vous. Le nouveau site
  montre la saison, recalculée à partir des matchs.
- **Un joueur qui a joué autant de parties à deux rôles** peut voir ses
  sous-notes (impact, clutch) bouger de quelques points, sans que sa note
  change. L'ancien site choisissait son rôle dominant selon l'ordre de
  rangement des données ; le nouveau prend, à égalité, le premier de ces rôles
  joué dans la saison. Cela concerne aujourd'hui NOMBRE joueur(s).

Un doute sur un chiffre ? Écrivez-nous, avec le lien de votre profil.

## English

**The new Arrakis site is live, read-only**: https://arrakard.vercel.app

You will find the season leaderboard, your card, your matches, every event,
and something new: **"Why this rating?"**, which walks through how your rating
is calculated, step by step.

Results are still entered on the old site: the new one is updated after each
event.

Season ratings are the same on both sites. Two differences may surprise you:

- **The old site's "all seasons" view is not on the new one.** It read
  totals computed once, in June, and never updated: its numbers were wrong
  for many of you. The new site shows the season, recomputed from the
  matches.
- **A player who played exactly as many games in two roles** may see their
  sub-scores (impact, clutch) move by a few points, with no change to their
  rating. The old site picked their dominant role from the order the data was
  stored in; the new one takes, on a tie, the first of those roles played in
  the season. This affects NUMBER player(s) today.

Doubt about a number? Message us with the link to your profile.
