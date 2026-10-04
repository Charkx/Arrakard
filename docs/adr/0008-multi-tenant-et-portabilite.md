# 0008 — Préparer le multi-tenant et la portabilité

- **Statut** : Accepté
- **Date** : 2026-10-05
- **Amende** : [0002](0002-supabase-source-de-verite.md) (le rôle admin n'est plus un claim JWT global)

## Contexte

Arrakis pourrait être proposé à d'autres structures esport, en SaaS
(plusieurs structures sur une même instance) ou, plus rarement, installé chez
un client (on premise). Aucun client n'existe aujourd'hui.

Deux coûts très différents :

- **Isoler les données par organisation** coûte presque rien au premier
  schéma, et très cher après coup (chaque table, requête et politique RLS à
  migrer, avec des données réelles).
- **Construire le produit SaaS** (inscription, facturation, administration des
  organisations) n'a aucune valeur sans client.

Par ailleurs, la v1 posait un claim `role = admin` **global** dans le JWT.
En multi-tenant, on est admin _d'une organisation_, pas du système.

## Décision

**Préparé dès maintenant :**

1. Une table `organizations`. **Chaque table de faits et de projections porte
   un `organization_id` obligatoire**, et les contraintes d'unicité sont
   portées par organisation (deux structures peuvent avoir une équipe « ARK »).
2. Les RLS filtrent par organisation. La lecture publique reste ouverte : le
   site d'une structure est public.
3. **Les droits passent par des adhésions** (`organization_members` : un
   utilisateur, une organisation, un rôle `admin` ou `member`), vérifiées par
   les commandes et par une fonction SQL `is_org_admin(organization_id)`. Le
   claim JWT global de la v1 disparaît.
4. **La configuration propre à une structure vit dans `organizations`**, pas
   dans le code ni dans des variables d'environnement : serveur Discord et
   rôle admin, jeu de règles de note (`v1` ou `e1_e2`, définis dans le
   domaine), barème de soirée par défaut.
5. La v2 démarre avec **une seule organisation**, Arrakis.

**Règles de portabilité** (pour permettre un jour une installation on premise) :

1. Pas de dépendance à une fonctionnalité propre à Supabase hébergé quand une
   alternative standard existe : SQL standard, aucune logique qui ne vivrait
   que dans le tableau de bord.
2. Le fournisseur d'authentification est une configuration (Discord
   aujourd'hui ; comptes locaux ou OIDC possibles demain).
3. Les services externes (Riot Data Dragon, Twitch, webhooks Discord) sont
   optionnels : le site fonctionne sans eux.

Une installation on premise est alors un déploiement à une seule
organisation du même produit, avec Supabase auto-hébergé.

**Pas construit tant qu'aucun client ne le demande :** inscription d'une
structure, facturation, interface d'administration des organisations,
domaines personnalisés, choix de l'organisation par sous-domaine.

## Options écartées

- **Ignorer le multi-tenant** : migration lourde et risquée le jour où un
  client se présente.
- **Un schéma ou une base par organisation** : isolation plus forte, mais
  migrations et exploitation multipliées par le nombre de clients.
  Injustifié avant des dizaines de clients.
- **Garder le claim JWT `role = admin`** : impossible d'être admin d'une
  structure sans l'être de toutes.

## Conséquences

- Chaque requête et chaque politique RLS mentionne l'organisation : un peu
  plus verbeux, mais testé (pgTAP) dès le départ.
- Un test d'isolation est obligatoire : un admin d'une organisation ne peut ni
  lire les données privées ni écrire dans une autre.
- L'Edge Function qui synchronise le rôle Discord lit le serveur et le rôle
  admin dans la configuration de l'organisation.
- Le domaine ne change pas : il ignore déjà tout de l'organisation.
