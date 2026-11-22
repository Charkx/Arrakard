-- La liste des éditions de l'espace admin (ticket #42) : brouillons comptés,
-- lisible par les seuls admins de l'organisation (ADR 0008, ADR 0030).
begin;
select plan(8);

select has_function('public', 'admin_editions', array['uuid'], 'l''espace admin lit ses éditions par une fonction');

insert into organizations (id, slug, name) values
  ('00000000-0000-0000-0000-00000000000a', 'essai-arrakis', 'Arrakis'),
  ('00000000-0000-0000-0000-00000000000b', 'essai-autre', 'Autre structure');
insert into auth.users (id, email) values
  ('70000000-0000-0000-0000-000000000001', 'admin@essai.local'),
  ('70000000-0000-0000-0000-000000000002', 'membre@essai.local'),
  ('70000000-0000-0000-0000-000000000003', 'perime@essai.local');
insert into organization_members (organization_id, user_id, role, synced_at) values
  ('00000000-0000-0000-0000-00000000000a', '70000000-0000-0000-0000-000000000001', 'admin', now()),
  ('00000000-0000-0000-0000-00000000000a', '70000000-0000-0000-0000-000000000002', 'member', now()),
  ('00000000-0000-0000-0000-00000000000a', '70000000-0000-0000-0000-000000000003', 'admin', now() - interval '8 days');
insert into seasons (id, organization_id, name, year, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Saison 3', 2026, 'open');
insert into editions (id, organization_id, name, type, date, prestige, season_id) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'IH #9', 'inhouse', '2026-11-20', 'normal', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Autre', 'inhouse', '2026-11-20', 'normal', null);
insert into matches (id, organization_id, edition_id, match_number, winner_team, duration_seconds, draft) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 1, 'ARK', 1800, false),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 2, 'ARK', 1800, true),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 3, 'ARK', 1800, true);

set local role authenticated;
set local request.jwt.claims = '{"sub": "70000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select results_eq(
  $$ select edition_id, season_name, season_status, has_results, draft_count
     from admin_editions('00000000-0000-0000-0000-00000000000a') $$,
  $$ values ('20000000-0000-0000-0000-000000000001'::uuid, 'Saison 3'::text, 'open'::text, true, 2) $$,
  'un admin voit ses éditions, avec la saison et ses brouillons comptés');
select throws_ok($$ select * from admin_editions('00000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'un admin ne lit pas les éditions d''une autre organisation');

set local request.jwt.claims = '{"sub": "70000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select throws_ok($$ select * from admin_editions('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'un simple membre non plus');

set local request.jwt.claims = '{"sub": "70000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select throws_ok($$ select * from admin_editions('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'ni un admin non revérifié depuis 7 jours');
reset role;

set local role anon;
select throws_ok($$ select * from admin_editions('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'ni un visiteur');
reset role;

-- Les brouillons restent invisibles par ailleurs, même pour l'admin.
set local role authenticated;
set local request.jwt.claims = '{"sub": "70000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select is((select count(*)::int from matches where edition_id = '20000000-0000-0000-0000-000000000001'), 1,
  'l''API des tables ne montre toujours pas les brouillons');
select is((select match_count from edition_page_view where edition_id = '20000000-0000-0000-0000-000000000001'), 1,
  'ni la page publique d''une édition');
reset role;

select * from finish();
rollback;
