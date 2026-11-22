-- Les adhésions viennent de Discord (ADR 0030) : un rôle admin compte s'il a
-- été revérifié il y a moins de 7 jours, et seulement dans son organisation.
begin;
select plan(9);

select has_column('public', 'organization_members', 'synced_at', 'une adhésion porte la date de sa dernière vérification');
select col_not_null('public', 'organization_members', 'synced_at', 'toute adhésion est datée');
select has_function('public', 'is_admin_of', array['uuid', 'uuid'], 'la règle d''admin est écrite une seule fois');

insert into organizations (id, slug, name) values
  ('00000000-0000-0000-0000-00000000000a', 'essai-arrakis', 'Arrakis'),
  ('00000000-0000-0000-0000-00000000000b', 'essai-autre', 'Autre structure');
insert into auth.users (id, email) values
  ('60000000-0000-0000-0000-000000000001', 'frais@essai.local'),
  ('60000000-0000-0000-0000-000000000002', 'ancien@essai.local');
insert into organization_members (organization_id, user_id, role, synced_at) values
  ('00000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-000000000001', 'admin', now() - interval '6 days'),
  ('00000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-000000000002', 'admin', now() - interval '8 days');

select ok(is_admin_of('00000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-000000000001'),
  'un admin vérifié il y a 6 jours est admin');
select ok(not is_admin_of('00000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-000000000002'),
  'un admin vérifié il y a 8 jours ne l''est plus');
select ok(not is_admin_of('00000000-0000-0000-0000-00000000000b', '60000000-0000-0000-0000-000000000001'),
  'un admin ne l''est pas d''une autre organisation');

-- Les droits de la base appliquent la même règle à l'utilisateur connecté.
set local role authenticated;
set local request.jwt.claims to '{"sub": "60000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select ok(not is_org_admin('00000000-0000-0000-0000-00000000000a'), 'is_org_admin refuse un rôle admin périmé');
select throws_ok(
  $$ select is_admin_of('00000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'un utilisateur ne sonde pas qui est admin');
reset role;

set local role anon;
select throws_ok(
  $$ select is_admin_of('00000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'un visiteur non plus');
reset role;

select * from finish();
rollback;
