-- Structure du schéma : ADR 0003 (faits / projections) et ADR 0008 (multi-tenant).
begin;
select plan(17);

-- Faits
select has_table('public', 'organizations', 'organisations');
select has_table('public', 'organization_members', 'adhésions');
select has_table('public', 'seasons', 'saisons');
select has_table('public', 'splits', 'splits');
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
select has_table('public', 'player_split_ratings', 'notes par split');
select has_table('public', 'player_edition_history', 'historique par édition');

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

select * from finish();
rollback;
