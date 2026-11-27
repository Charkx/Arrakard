-- Les joueurs tels que l'import les voit (ticket #46, ADR 0039) : lisibles
-- par tous, puisque tout y est déjà public ; ni écrits, ni le compte Discord.
begin;
select plan(5);

insert into organizations (id, slug, name) values
  ('00000000-0000-0000-0000-00000000000a', 'essai-arrakis', 'Arrakis');
insert into teams (id, organization_id, tag, name) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'NOX', 'Noxus');
insert into players (id, organization_id, nickname, discord_user_id) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Zéphyr', '123456789012345678'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Brise', null),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'Brize', null);
update players set merged_into = '30000000-0000-0000-0000-000000000002'
  where id = '30000000-0000-0000-0000-000000000003';
insert into player_aliases (organization_id, player_id, alias) values
  ('00000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000001', 'zeph');
insert into team_memberships (organization_id, player_id, team_id, status, joined_on, left_on) values
  ('00000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'sub', '2026-09-01', '2026-10-01'),
  ('00000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'starter', '2026-10-01', null);

select ok(
  not has_table_privilege('anon', 'import_directory', 'INSERT, UPDATE, DELETE')
    and not has_table_privilege('authenticated', 'import_directory', 'INSERT, UPDATE, DELETE'),
  'personne n''y écrit');
select ok(has_table_privilege('anon', 'import_directory', 'SELECT'), 'tout le monde la lit');

set local role anon;
select results_eq(
  $$ select player_id, aliases, team_tag, status from import_directory order by nickname $$,
  $$ values
       ('30000000-0000-0000-0000-000000000002'::uuid, array['Brise'], null::text, null::text),
       ('30000000-0000-0000-0000-000000000001'::uuid, array['Zéphyr', 'zeph'], 'NOX', 'starter') $$,
  'un visiteur lit les joueurs non fusionnés, leur pseudo puis leurs alias, leur place actuelle');
select hasnt_column('import_directory', 'discord_user_id', 'le compte Discord n''y est pas');
set local role authenticated;
select is((select count(*)::int from import_directory), 2, 'un connecté la lit aussi');

select * from finish();
rollback;
