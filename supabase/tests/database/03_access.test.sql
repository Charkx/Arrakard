-- Droits d'accès : lecture publique, aucune écriture directe (ADR 0005),
-- adhésions par organisation (ADR 0008), inscriptions en libre-service.
begin;
select plan(12);

-- ── Données ──────────────────────────────────────────────────────────────────
insert into organizations (id, slug, name) values
  ('00000000-0000-0000-0000-00000000000a', 'arrakis', 'Arrakis'),
  ('00000000-0000-0000-0000-00000000000b', 'autre', 'Autre structure');
insert into players (organization_id, nickname) values
  ('00000000-0000-0000-0000-00000000000a', 'Meta'),
  ('00000000-0000-0000-0000-00000000000a', 'Zed');
insert into editions (id, organization_id, name, type, date, prestige) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'IH #2', 'inhouse', '2026-11-01', 'normal');

-- Deux utilisateurs connectés via Discord ; « admin » est admin d'Arrakis seulement.
insert into auth.users (id, email) values
  ('50000000-0000-0000-0000-000000000001', 'admin@example.com'),
  ('50000000-0000-0000-0000-000000000002', 'joueur@example.com');
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('111', '50000000-0000-0000-0000-000000000001', '{"sub": "111", "provider_id": "111"}', 'discord', now(), now(), now()),
  ('222', '50000000-0000-0000-0000-000000000002', '{"sub": "222", "provider_id": "222"}', 'discord', now(), now(), now());
insert into organization_members (organization_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', '50000000-0000-0000-0000-000000000002', 'member');

-- ── Visiteur anonyme ─────────────────────────────────────────────────────────
set local role anon;

select is((select count(*)::int from players), 2, 'un visiteur lit les joueurs');
select throws_ok(
  $$ insert into players (organization_id, nickname) values ('00000000-0000-0000-0000-00000000000a', 'Pirate') $$,
  '42501', null, 'un visiteur n''écrit pas'
);
select throws_ok(
  $$ select discord_user_id from registrations $$,
  '42501', null, 'l''identifiant Discord des inscrits n''est pas public'
);

-- ── Admin d'Arrakis ──────────────────────────────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "50000000-0000-0000-0000-000000000001", "role": "authenticated"}';

select ok(is_org_admin('00000000-0000-0000-0000-00000000000a'), 'admin de son organisation');
select ok(not is_org_admin('00000000-0000-0000-0000-00000000000b'), 'pas admin d''une autre organisation');
select throws_ok(
  $$ insert into players (organization_id, nickname) values ('00000000-0000-0000-0000-00000000000a', 'Direct') $$,
  '42501', null, 'même un admin passe par les commandes (ADR 0005)'
);
select is(
  (select count(*)::int from organization_members), 1,
  'un utilisateur ne voit que ses propres adhésions'
);

-- ── Joueur connecté (Discord 222) ────────────────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "50000000-0000-0000-0000-000000000002", "role": "authenticated"}';

select is(auth_discord_user_id(), '222', 'identité Discord lue depuis auth.identities');
select lives_ok(
  $$ insert into registrations (organization_id, edition_id, discord_user_id, pseudo, role)
     values ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', '222', 'Zed', 'MID') $$,
  'un joueur s''inscrit lui-même'
);
select throws_ok(
  $$ insert into registrations (organization_id, edition_id, discord_user_id, pseudo, role)
     values ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', '111', 'Usurpateur', 'TOP') $$,
  '42501', null, 'impossible d''inscrire quelqu''un d''autre'
);
select lives_ok(
  $$ update registrations set rank = 'Diamant II' where pseudo = 'Zed' $$,
  'un joueur modifie sa propre inscription'
);

-- Un autre utilisateur ne peut pas modifier cette inscription.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "50000000-0000-0000-0000-000000000001", "role": "authenticated"}';
update registrations set rank = 'Fer IV' where pseudo = 'Zed';
reset role;
select is(
  (select rank from registrations where pseudo = 'Zed'), 'Diamant II',
  'personne d''autre ne modifie une inscription'
);

select * from finish();
rollback;
