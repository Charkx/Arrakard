-- Structure du schéma : ADR 0003 (faits / projections) et ADR 0008 (multi-tenant).
begin;
select plan(30);

-- Faits
select has_table('public', 'organizations', 'organisations');
select has_table('public', 'organization_members', 'adhésions');
select has_table('public', 'seasons', 'saisons');
select has_table('public', 'teams', 'équipes');
select has_table('public', 'players', 'joueurs');
select has_table('public', 'player_aliases', 'alias de joueurs');
select has_table('public', 'team_memberships', 'appartenances aux équipes');
select has_table('public', 'editions', 'éditions');
select has_table('public', 'matches', 'matchs');
select has_table('public', 'performances', 'performances');
select has_table('public', 'card_customizations', 'personnalisations de carte');
select has_table('public', 'registrations', 'inscriptions');

-- Projections
select has_table('public', 'player_season_ratings', 'notes par saison');
select has_table('public', 'player_edition_history', 'historique par édition');

-- Vues de lecture : une par besoin de page.
select has_view('public', 'leaderboard_view', 'vue du classement');
select has_view('public', 'player_profile_view', 'vue du profil d''un joueur');
select has_view('public', 'player_matches_view', 'vue de l''historique des matchs');
select has_view('public', 'edition_page_view', 'vue de l''en-tête d''une édition');
select has_view('public', 'edition_standings_view', 'vue du classement de soirée');
select has_view('public', 'edition_matches_view', 'vue des matchs d''une édition');
select has_view('public', 'edition_participants_view', 'vue des participants d''un événement externe');
select has_column('public', 'player_season_ratings', 'dominant_role', 'une note de saison porte le rôle dominant');
select has_column('public', 'player_season_ratings', 'breakdown', 'une note de saison porte son explication');
select has_column('public', 'player_profile_view', 'breakdown', 'le profil donne l''explication de la note');

-- Un seul niveau de période, la saison (ADR 0014) : plus rien ne parle de split.
select hasnt_table('public', 'splits', 'plus de table des splits');
select hasnt_table('public', 'player_split_ratings', 'plus de notes par split');
select hasnt_column('public', 'editions', 'split_id', 'une édition ne cite plus de split');

-- Toutes les tables ont la RLS activée.
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$,
  'RLS activée sur toutes les tables publiques'
);

-- Toutes les tables (sauf organizations) portent un organization_id obligatoire.
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'organizations'
       and not exists (
         select 1 from pg_attribute a
         where a.attrelid = c.oid and a.attname = 'organization_id' and a.attnotnull
       ) $$,
  'organization_id obligatoire partout (ADR 0008)'
);

-- Aucune écriture directe (ADR 0005). Supabase accorde tout par défaut à chaque
-- nouvelle table : une migration qui en crée une doit retirer ces droits.
-- Seule exception : les inscriptions, en libre-service (mais jamais vidées).
select is_empty(
  $$ select c.relname, r.rolname, p.privilege
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join (values ('anon'), ('authenticated')) as r (rolname)
     cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) as p (privilege)
     where n.nspname = 'public' and c.relkind in ('r', 'v')
       and not (c.relname = 'registrations' and p.privilege <> 'TRUNCATE')
       and case
             -- INSERT et UPDATE peuvent aussi s'accorder colonne par colonne.
             when p.privilege in ('INSERT', 'UPDATE') then has_any_column_privilege(r.rolname, c.oid, p.privilege)
             else has_table_privilege(r.rolname, c.oid, p.privilege)
           end $$,
  'aucune écriture directe hors inscriptions (ADR 0005)'
);

select * from finish();
rollback;
