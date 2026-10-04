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

## Définition de « terminé »

Une modification est terminée quand :

- [ ] elle a été écrite en TDD (le domaine), ou couverte par des tests (le reste) ;
- [ ] lint, `tsc --strict` et tests passent en local et en CI ;
- [ ] le glossaire, la spec ou un ADR sont à jour si la modification touche
      au métier ou à l'architecture ;
- [ ] aucune donnée réelle de joueur n'est commitée.
