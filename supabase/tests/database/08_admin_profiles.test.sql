-- Le compte Discord d'une carte : caché du public, lu par les seuls admins
-- de l'organisation (ticket #52, ADR 0031, ADR 0034).
begin;
select plan(6);

insert into organizations (id, slug, name) values
  ('00000000-0000-0000-0000-00000000000a', 'essai-arrakis', 'Arrakis'),
  ('00000000-0000-0000-0000-00000000000b', 'essai-autre', 'Autre structure');
insert into auth.users (id, email) values
  ('80000000-0000-0000-0000-000000000001', 'admin@essai.local'),
  ('80000000-0000-0000-0000-000000000002', 'membre@essai.local');
insert into organization_members (organization_id, user_id, role, synced_at) values
  ('00000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-000000000001', 'admin', now()),
  ('00000000-0000-0000-0000-00000000000a', '80000000-0000-0000-0000-000000000002', 'member', now());
insert into players (id, organization_id, nickname, discord_user_id) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Zéphyr', '123456789012345678'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Brise', null);
update players set merged_into = '30000000-0000-0000-0000-000000000001'
  where id = '30000000-0000-0000-0000-000000000002';

set local role anon;
select throws_ok($$ select discord_user_id from players $$,
  '42501', null, 'le compte Discord d''une carte n''est pas public');
select is((select nickname from players where id = '30000000-0000-0000-0000-000000000001'),
  'Zéphyr', 'un visiteur lit toujours les joueurs');
select throws_ok($$ select * from admin_profiles('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'un visiteur ne lit pas les profils de l''espace admin');

set local role authenticated;
set local request.jwt.claims = '{"sub": "80000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select results_eq(
  $$ select player_id, nickname, discord_user_id from admin_profiles('00000000-0000-0000-0000-00000000000a') $$,
  $$ values ('30000000-0000-0000-0000-000000000001'::uuid, 'Zéphyr'::text, '123456789012345678'::text) $$,
  'un admin lit les profils non fusionnés et leur compte Discord');
select throws_ok($$ select * from admin_profiles('00000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'un admin ne lit pas les profils d''une autre organisation');

set local request.jwt.claims = '{"sub": "80000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select throws_ok($$ select * from admin_profiles('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'un simple membre ne lit pas les profils de l''espace admin');

select * from finish();
rollback;
