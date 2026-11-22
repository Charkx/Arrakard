# 0031 — L'espace admin lit par des fonctions réservées

- **Statut** : Accepté
- **Date** : 2026-11-22

## Contexte

L'espace admin (ticket #42) doit montrer ce que le public ne voit pas : les
brouillons d'une édition (ADR 0028), plus tard l'aperçu d'une publication. Les
droits de la base cachent les brouillons à tous, par une politique sur
`matches`, et les vues publiques en héritent (`security_invoker`). Le site lit
la base par l'API, avec le jeton de l'utilisateur connecté (ADR 0024).

## Décision

**Une lecture d'admin est une fonction SQL aux droits de son propriétaire**
(`security definer`), appelée par l'API (`rpc`). Elle commence par vérifier
`is_org_admin(org)`, fraîcheur du rôle comprise (ADR 0030), et refuse sinon
avec l'erreur `42501`. Elle n'est exécutable que par les utilisateurs
connectés. La première est `admin_editions(org)` : les éditions, leur saison,
et leurs brouillons comptés.

Les tables et les vues gardent leurs droits : les brouillons y restent
invisibles, pour tout le monde.

Ce qui est déjà public, comme la saison active, se lit par l'API habituelle,
sans fonction : seule une lecture de ce que le public ne voit pas en exige une.

Côté site, ces lectures passent par une source à part, `AdminSource`, à côté
de `DataSource` (les pages publiques) et d'`AuthSource` (la connexion). Elle
est chargée à la demande avec la connexion, dont elle partage la session.

## Options écartées

- **Une politique qui montre les brouillons aux admins** : toutes les vues
  publiques, lues avec le jeton d'un admin, montreraient alors des brouillons
  comme s'ils étaient publiés, et chaque vue devrait les filtrer à nouveau.
- **Lire par une Edge Function** : une couche de plus, sans gain, pour une
  lecture que la base sait déjà protéger.

## Conséquences

- Les droits d'une lecture d'admin sont dans la fonction, testés par pgTAP :
  un admin lit son organisation, et ni un membre, ni un admin d'une autre
  organisation, ni un admin périmé, ni un visiteur.
- Une fonction `security definer` contourne les droits des tables : elle doit
  toujours commencer par la vérification, et fixer `search_path = ''`.
