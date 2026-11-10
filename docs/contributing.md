# Contribuer

## Le cycle TDD

1. **Rouge.** Écrire _un_ test qui exprime _un_ comportement attendu, et le
   voir échouer pour la bonne raison : le comportement n'existe pas encore.
   Une fonction qui n'existe pas encore est un échec valable ; une faute de
   frappe dans le test, non.
2. **Vert.** Écrire le code **le plus simple** qui fait passer ce test, même
   s'il paraît naïf.
3. **Refactor.** Nettoyer le code _et_ les tests, tests au vert à chaque étape.
4. Recommencer avec le comportement suivant.

Choisir le prochain test : du cas le plus simple vers le plus riche (aucune
partie → une partie → plusieurs → cas limites). Les exemples chiffrés de la
[spec de note](domain/rating-spec.md) sont des tests tout prêts.

## En binôme : le ping-pong

C'est le mode de travail de la phase 2.

1. **A** écrit un test qui échoue.
2. **B** le fait passer, puis écrit le test suivant qui échoue.
3. **A** le fait passer, et ainsi de suite. Celui qui vient de passer au vert
   propose le refactor.

Règle : celui qui fait passer le test n'a pas le droit d'écrire plus de code
que le test n'en exige. S'il en faut plus, c'est qu'il manque un test.

Seul avec un agent, le ping-pong continue : voir
[Travailler avec un agent](#travailler-avec-un-agent).

## Écrire un bon test

- Le nom décrit un **comportement**, en français :
  `« un joueur sans partie a une note de 60 »`, pas `« test computeRating »`.
- Structure **Préparer / Agir / Vérifier**, séparées par une ligne vide.
- Un test vérifie un comportement. Plusieurs `expect` sont permis s'ils
  décrivent le même résultat.
- Les données de test se construisent avec des fabriques (`aPerformance({ kills: 5 })`)
  pour que chaque test ne montre que ce qui compte pour lui.
- Le domaine ne se mocke pas : c'est du code pur, on l'appelle. On ne
  remplace que ce qui touche l'extérieur (base, réseau, horloge).

## Conventions

- **Langue** : code en anglais, docs et noms de tests en français. Les termes
  métier suivent le [glossaire](domain/glossary.md).
- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/fr/)
  (`feat(domain): …`, `test(rating): …`, `docs(adr): …`).
- **Branches** : `main` toujours déployable ; une branche courte par sujet,
  fusionnée par PR.
- **Décisions** : un choix structurant = un [ADR](adr/README.md) dans la même PR.

## Travailler avec un agent

Le projet se fait seul, avec un agent de code. Les règles que l'agent suit sont
dans [`CLAUDE.md`](../CLAUDE.md). Cette section fixe les **rituels** : ce qu'on
fait à chaque fois, sans le rediscuter.

1. **Partir d'une issue.** Hors petite correction, chaque travail part d'une
   issue GitHub. Sa liste « Done when » sert de critères d'acceptation : chaque
   ligne se vérifie par un test ou une action précise.
2. **Le plan d'abord.** Pour tout ce qui dépasse une petite correction, l'agent
   montre son plan et attend la validation avant de toucher au dépôt.
3. **Une revue sur chaque PR.** Seul, il n'y a pas de relecteur : on lance
   `revue` sur chaque PR, puis on vérifie qu'on peut expliquer chaque ligne. Une
   ligne qu'on ne sait pas expliquer ne se fusionne pas.
4. **Une maquette avant tout changement visuel.** On valide ce qu'on va voir
   avant d'écrire le code qui l'affiche.
5. **Un handoff à la fin de chaque session.** `handoff` note l'état, les
   décisions et la prochaine étape dans `.handoff/`, ignoré par git.
6. **Un debrief à la fin de chaque phase.** Court : ce qui a marché, ce qui a
   gêné, ce qu'on change. Ses conclusions vont dans le dépôt
   (`docs/debriefs/phase-N.md`), pas seulement dans la mémoire locale de l'agent.

### Le ping-pong en solo

Le code qui porte une règle métier ou une règle d'accès (domaine, SQL des
commandes, RLS, tests pgTAP) s'écrit en [ping-pong](#en-binôme--le-ping-pong),
l'agent tenant le rôle de B. Le skill `ping-pong` en fixe le détail : liste de
tests tirée du « Done when », vérification du rouge, indices sur demande, un
commit à chaque vert. L'outillage, la CI, les scripts et la doc sont écrits par
l'agent et relus.

### Les skills

Les skills du projet sont dans [`.claude/skills/`](../.claude/skills/README.md) :
`ping-pong`, `tdd`, `grill-with-docs`, `to-questionnaire`, `to-tickets`, `revue`
et `handoff`. On n'en écrit pas de nouveau à l'avance : seulement quand la même
recette s'est répétée trois fois.

### Les garde-fous

[`.claude/settings.json`](../.claude/settings.json) interdit à l'agent de lire
les fichiers de données réelles et les secrets, de forcer un push et de pousser
sur `main`. Ses commandes shell tournent dans un bac à sable qui applique les
mêmes interdictions de lecture. `main` est protégée : une PR et une CI verte sont
obligatoires, y compris pour l'administrateur du dépôt.

## Définition de « terminé »

Une modification est terminée quand :

- [ ] elle a été écrite en TDD (le domaine), ou couverte par des tests (le reste) ;
- [ ] lint, `tsc --strict` et tests passent en local et en CI ;
- [ ] le glossaire, la spec ou un ADR sont à jour si la modification touche
      au métier ou à l'architecture ;
- [ ] aucune donnée réelle de joueur n'est commitée.
