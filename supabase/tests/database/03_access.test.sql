-- Droits d'accès : lecture publique, aucune écriture directe (ADR 0005),
-- adhésions par organisation (ADR 0008), inscriptions en libre-service.
begin;
select plan(25);

-- ── Données ──────────────────────────────────────────────────────────────────
-- La base peut déjà contenir une organisation chargée : les tests créent les
-- leurs et ne comptent que leurs propres lignes.
insert into organizations (id, slug, name) values
  ('00000000-0000-0000-0000-00000000000a', 'essai-arrakis', 'Arrakis'),
  ('00000000-0000-0000-0000-00000000000b', 'essai-autre', 'Autre structure');
insert into players (organization_id, nickname) values
  ('00000000-0000-0000-0000-00000000000a', 'Meta'),
  ('00000000-0000-0000-0000-00000000000a', 'Zed');
insert into editions (id, organization_id, name, type, date, prestige) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'IH #2', 'inhouse', '2026-11-01', 'normal');
insert into seasons (id, organization_id, name, year, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Saison 3', 2026, 'open');
-- Meta joue chez ARK aujourd'hui, après un passage chez OLD.
insert into teams (id, organization_id, tag, name) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'ARK', 'Arrakis'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'OLD', 'Ancienne équipe');
insert into team_memberships (organization_id, player_id, team_id, status, joined_on, left_on)
select p.organization_id, p.id, t.id, 'starter', m.joined_on, m.left_on
from players p
join (values ('ARK', date '2026-01-10', null::date), ('OLD', date '2025-01-10', date '2026-01-09')) as m (tag, joined_on, left_on) on true
join teams t on t.tag = m.tag and t.organization_id = p.organization_id
where p.nickname = 'Meta' and p.organization_id = '00000000-0000-0000-0000-00000000000a';
-- Meta a joué quatre matchs de l'IH #2 : deux fois Ahri, puis Vi et Ornn.
update editions set season_id = '10000000-0000-0000-0000-000000000001' where id = '20000000-0000-0000-0000-000000000001';
insert into matches (id, organization_id, edition_id, match_number, winner_team, duration_seconds)
select ('40000000-0000-0000-0000-00000000000' || n)::uuid, '00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', n, 'ARK', 1800
from generate_series(1, 4) as n;
insert into performances (organization_id, match_id, line, side, player_id, team, role, champion, result, kills, deaths, assists, gold)
select '00000000-0000-0000-0000-00000000000a', ('40000000-0000-0000-0000-00000000000' || g.n)::uuid, 2, 'A', p.id, 'ARK', 'MID', g.champion, g.result, 3, 1, 4, 10000
from players p
cross join (values (1, 'Ahri', 'win'), (2, 'Ahri', 'loss'), (3, 'Vi', 'win'), (4, 'Ornn', 'win')) as g (n, champion, result)
where p.nickname = 'Meta' and p.organization_id = '00000000-0000-0000-0000-00000000000a';

-- L'autre structure a sa saison, un joueur et sa note, sans équipe.
insert into players (organization_id, nickname) values ('00000000-0000-0000-0000-00000000000b', 'Ailleurs');
insert into seasons (id, organization_id, name, year, status) values
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Saison 1', 2026, 'open');
insert into player_season_ratings (
  organization_id, season_id, player_id, dominant_role, rating, impact, consistency, clutch, tier,
  games, wins, losses, winrate, kda, kills, deaths, assists, avg_gold, avg_gpm, recent_form
)
select organization_id, '10000000-0000-0000-0000-00000000000b', id, 'TOP', 65, 65, 65, 65, 'bronze',
       5, 2, 3, 40, 2.0, 5, 5, 5, 9000, 300, 'stable'
from players where nickname = 'Ailleurs';
insert into player_season_ratings (
  organization_id, season_id, player_id, dominant_role, rating, impact, consistency, clutch, tier,
  games, wins, losses, winrate, kda, kills, deaths, assists, avg_gold, avg_gpm, recent_form
)
select organization_id, '10000000-0000-0000-0000-000000000001', id, 'MID', 78, 80, 75, 70, 'gold',
       10, 6, 4, 60, 3.8, 40, 25, 55, 11000, 380, 'up'
from players where nickname = 'Meta';

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

select is((select count(*)::int from players where organization_id = '00000000-0000-0000-0000-00000000000a'), 2, 'un visiteur lit les joueurs');
select throws_ok(
  $$ insert into players (organization_id, nickname) values ('00000000-0000-0000-0000-00000000000a', 'Pirate') $$,
  '42501', null, 'un visiteur n''écrit pas'
);
select throws_ok(
  $$ select discord_user_id from registrations $$,
  '42501', null, 'l''identifiant Discord des inscrits n''est pas public'
);
select is((select count(*)::int from seasons where organization_id = '00000000-0000-0000-0000-00000000000a'), 1, 'un visiteur lit les saisons');
select is((select count(*)::int from player_season_ratings where organization_id = '00000000-0000-0000-0000-00000000000a'), 1, 'un visiteur lit les notes par saison');
select throws_ok(
  $$ insert into seasons (organization_id, name, year, status)
     values ('00000000-0000-0000-0000-00000000000a', 'Pirate', 2030, 'closed') $$,
  '42501', 'permission denied for table seasons', 'un visiteur ne crée pas de saison'
);
select throws_ok(
  $$ update player_season_ratings set rating = 99 $$,
  '42501', 'permission denied for table player_season_ratings', 'un visiteur ne modifie pas une note'
);
select results_eq(
  $$ select nickname, dominant_role, rating, team_tag, season_status
     from leaderboard_view where organization_id = '00000000-0000-0000-0000-00000000000a' $$,
  $$ values ('Meta', 'MID', 78, 'ARK', 'open') $$,
  'un visiteur lit le classement : la note, le joueur, son rôle et son équipe actuelle'
);
select is(
  (select count(*)::int from leaderboard_view where organization_id = '00000000-0000-0000-0000-00000000000b'), 1,
  'chaque organisation a son classement : l''autre structure n''y voit que son propre joueur'
);
select throws_ok(
  $$ update leaderboard_view set rating = 99 $$,
  '55000', null, 'la vue ne s''écrit pas : elle ne sert qu''à lire'
);

-- Le profil : la note de la saison en cours, l'équipe actuelle, les trois champions les plus joués.
select results_eq(
  $$ select nickname, rating, team_tag, top_champions from player_profile_view
     where organization_id = '00000000-0000-0000-0000-00000000000a' order by nickname $$,
  $$ values ('Meta', 78, 'ARK', array['Ahri', 'Ornn', 'Vi']), ('Zed', null::int, null, '{}'::text[]) $$,
  'un visiteur lit le profil ; un joueur sans partie a un profil sans note'
);
-- L'historique : chaque match du joueur, avec son édition.
select results_eq(
  $$ select edition_name, match_number, champion, result from player_matches_view
     where organization_id = '00000000-0000-0000-0000-00000000000a' and nickname = 'Meta' order by match_number $$,
  $$ values ('IH #2', 1, 'Ahri', 'win'), ('IH #2', 2, 'Ahri', 'loss'), ('IH #2', 3, 'Vi', 'win'), ('IH #2', 4, 'Ornn', 'win') $$,
  'un visiteur lit l''historique des matchs d''un joueur'
);
select throws_ok(
  $$ update player_profile_view set nickname = 'Pirate' $$,
  '55000', null, 'la vue du profil ne s''écrit pas'
);
select throws_ok(
  $$ update player_matches_view set kills = 99 $$,
  '55000', null, 'la vue de l''historique ne s''écrit pas'
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
select throws_ok(
  $$ update seasons set status = 'closed' $$,
  '42501', 'permission denied for table seasons', 'un admin ne clôture pas une saison sans commande (ADR 0005)'
);
select throws_ok(
  $$ update player_season_ratings set rating = 99 $$,
  '42501', 'permission denied for table player_season_ratings', 'seul le recalcul écrit les notes (ADR 0003)'
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
