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

C'était le mode de travail de la phase 2.

1. **A** écrit un test qui échoue.
2. **B** le fait passer, puis écrit le test suivant qui échoue.
3. **A** le fait passer, et ainsi de suite. Celui qui vient de passer au vert
   propose le refactor.

Règle : celui qui fait passer le test n'a pas le droit d'écrire plus de code
que le test n'en exige. S'il en faut plus, c'est qu'il manque un test.

Seul avec un agent, le ping-pong sert au premier exemplaire de chaque famille de
code : voir [Travailler avec un agent](#travailler-avec-un-agent).

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
  (`feat(domain): …`, `test(rating): …`, `docs(adr): …`), rédigés en français
  comme les PR.
- **Branches** : `main` toujours déployable ; une branche courte par sujet,
  fusionnée par PR.
- **Décisions** : un choix structurant = un [ADR](adr/README.md) dans la même PR.

## Travailler avec un agent

Le projet se fait seul, avec un agent de code. Les règles que l'agent suit sont
dans [`CLAUDE.md`](../CLAUDE.md). Cette section fixe la méthode : ce qu'on fait
à chaque fois, sans le rediscuter. Son pourquoi est dans
l'[ADR 0010](adr/0010-travailler-avec-un-agent.md).

### Trois portes

L'agent va vite. Ce qui garde le contrôle, ce sont trois décisions qui
reviennent toujours à Charly, hors petite correction. Les rituels plus bas en
donnent le détail.

1. **Le ticket** : quoi construire.
2. **Le plan** : comment le construire.
3. **La fusion** : oui ou non, sur une PR dont la CI est verte.

Entre deux portes, le travail avance sans nouvelle validation, sur une branche
et jamais sur `main` : à deux en mode Ensemble, l'agent seul dans les autres
modes.

### Trois modes

Chaque ticket porte son mode, fixé au découpage.

| Mode          | Pour quoi                                   | Qui écrit                                        |
| ------------- | ------------------------------------------- | ------------------------------------------------ |
| **Ensemble**  | Le premier exemplaire d'une famille de code | À deux, en [ping-pong](#en-binôme--le-ping-pong) |
| **Délégué**   | Les suivants de la même famille             | L'agent seul, en TDD                             |
| **Outillage** | CI, scripts, configuration, documentation   | L'agent seul                                     |

Une famille de code est un modèle qui se répète : une commande, une vue SQL, une
règle d'accès, un module du domaine. Un ticket ne passe en Délégué que si un
exemple de sa famille a déjà été écrit Ensemble. Un code métier qui ne ressemble
à aucun exemple existant est donc le premier de sa famille, et s'écrit Ensemble.

En ping-pong, l'agent tient le rôle de B, et le skill `ping-pong` fixe le
détail. Si une PR déléguée n'est pas comprise, sa famille repasse en Ensemble.

### Les rituels

1. **Partir d'un ticket.** Hors petite correction, chaque travail part d'un
   ticket : une issue GitHub dont la liste « Done when » sert de critères
   d'acceptation. Chaque ligne se vérifie par un test ou une action précise.
2. **Le plan d'abord.** Pour tout ce qui dépasse une petite correction, l'agent
   montre son plan et attend la validation avant de toucher au dépôt.
3. **Une revue avant chaque fusion.** Seul, il n'y a pas de relecteur : l'agent
   lance `revue` sur chaque PR avant de la présenter, joint les deux rapports et
   corrige ce qui doit l'être. Avant de fusionner, on vérifie qu'on comprend :
   chaque ligne en mode Ensemble, ce que fait la PR et pourquoi dans les deux
   autres modes.
4. **Une maquette avant tout changement visuel.** On valide ce qu'on va voir
   avant d'écrire le code qui l'affiche.
5. **Un handoff à la fin de chaque session.** `handoff` note l'état, les
   décisions et la prochaine étape dans `.handoff/`, ignoré par git.
6. **Un debrief à la fin de chaque tranche.** Court : ce qui a marché, ce qui
   a gêné, ce qu'on change. Ses conclusions vont dans le dépôt
   (`docs/debriefs/tranche-N.md`), pas seulement dans la mémoire locale de
   l'agent. Les tranches ont remplacé les phases
   ([ADR 0011](adr/0011-livrer-par-tranches.md)).

### Une PR écrite par l'agent seul

En mode Délégué comme en mode Outillage, pour que la fusion se décide vite et
sans risque, l'agent livre :

- une PR petite : un ticket, une branche ;
- une description en mots simples : ce que ça fait, le « Done when » coché avec
  sa preuve, où regarder en priorité, ce qui n'a pas pu être vérifié ;
- `pnpm check` et `supabase test db` verts en local, et la CI verte ;
- les deux rapports de `revue`, corrections faites ;
- l'explication de n'importe quelle ligne, sur demande.

### Quand l'agent s'arrête

Il demande avant de continuer quand :

- aucun exemple de cette famille de code n'a été écrit Ensemble ;
- un choix structurant se présente (donc un ADR), une nouvelle dépendance, ou un
  terme absent du glossaire ;
- le diff dépasse nettement la taille annoncée dans le plan ;
- le travail touche aux données réelles, à un environnement hébergé ou à la
  production.

### Les skills

Les skills du projet sont dans [`.claude/skills/`](../.claude/skills/README.md) :
`ping-pong`, `tdd`, `grill-with-docs`, `to-questionnaire`, `to-tickets`, `revue`
et `handoff`. On n'en écrit pas de nouveau à l'avance : seulement quand la même
recette s'est répétée trois fois.

### Les garde-fous

[`.claude/settings.json`](../.claude/settings.json) pose trois protections, de
la plus solide à la plus fragile :

- **Le bac à sable.** Les commandes shell de l'agent ne peuvent pas lire les
  secrets ni les fichiers de données réelles, quel que soit l'outil (`grep`,
  script…). Trois commandes tournent en dehors : `supabase` et `docker`, qui en
  sont exclues, et `gh`, qui n'y fonctionne pas et que l'agent relance hors du
  bac à sable, avec validation.
- **Les lectures interdites.** L'outil de lecture de l'agent refuse ces mêmes
  fichiers.
- **Les commandes interdites.** Le push forcé, le push sur `main` et
  `git diff --no-index` sont refusés d'après le texte de la commande. Ce filtre
  se contourne : il évite les erreurs, il ne protège pas `main`.

La vraie barrière pour `main` est sa protection sur GitHub : une PR et une CI
verte obligatoires, y compris pour l'administrateur du dépôt. Elle n'existe que
si l'administrateur l'a activée dans les réglages du dépôt. Pour le vérifier :

```bash
curl -s https://api.github.com/repos/Charkx/Arrakard/branches/main | jq .protected
```

Tant que la réponse n'est pas `true`, seul le filtre ci-dessus retient un push
direct sur `main`.

## Définition de « terminé »

Une modification est terminée quand :

- [ ] elle a été écrite en TDD (le domaine), ou couverte par des tests (le reste) ;
- [ ] lint, `tsc --strict` et tests passent en local et en CI ;
- [ ] le glossaire, la spec ou un ADR sont à jour si la modification touche
      au métier ou à l'architecture ;
- [ ] aucune donnée réelle de joueur n'est commitée.
