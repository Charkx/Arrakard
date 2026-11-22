-- Une édition archivée n'est plus lue, ni par le public, ni dans la liste de
-- l'espace admin (ticket #49, ADR 0035).
begin;
select plan(4);

insert into organizations (id, slug, name) values
  ('00000000-0000-0000-0000-00000000000a', 'essai-arrakis', 'Arrakis');
insert into auth.users (id, email) values
  ('90000000-0000-0000-0000-000000000001', 'admin@essai.local');
insert into organization_members (organization_id, user_id, role, synced_at) values
  ('00000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000001', 'admin', now());
insert into editions (id, organization_id, name, type, date, prestige, archived_at) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'IH #9', 'inhouse', '2026-11-20', 'normal', null),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Erreur', 'external_event', '2026-11-21', 'normal', now());
insert into players (id, organization_id, nickname) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Zéphyr');
insert into edition_participants (organization_id, edition_id, player_id) values
  ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001');

set local role anon;
select results_eq($$ select name from editions where organization_id = '00000000-0000-0000-0000-00000000000a' $$, $$ values ('IH #9'::text) $$,
  'un visiteur ne lit pas l''édition archivée');
select results_eq($$ select name from edition_page_view where organization_id = '00000000-0000-0000-0000-00000000000a' $$, $$ values ('IH #9'::text) $$,
  'la page d''édition ne la montre pas non plus');
select is_empty($$ select * from edition_participants_view where organization_id = '00000000-0000-0000-0000-00000000000a' $$,
  'ni ses participants');

set local role authenticated;
set local request.jwt.claims = '{"sub": "90000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select results_eq(
  $$ select name from admin_editions('00000000-0000-0000-0000-00000000000a') $$,
  $$ values ('IH #9'::text) $$,
  'l''espace admin ne la liste plus');

select * from finish();
rollback;
