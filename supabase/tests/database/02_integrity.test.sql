-- Intégrité : isolation entre organisations et règles métier portées par la base.
begin;
select plan(13);

insert into organizations (id, slug, name) values
  ('00000000-0000-0000-0000-00000000000a', 'arrakis', 'Arrakis'),
  ('00000000-0000-0000-0000-00000000000b', 'autre', 'Autre structure');

insert into seasons (id, organization_id, name, year, status) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Saison 3', 2026, 'open');

insert into editions (id, organization_id, name, type, date, prestige) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Ligue #7', 'league_div1', '2026-02-09', 'championship');

insert into players (id, organization_id, nickname) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Meta'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Zed');

-- Un match ne peut pas appartenir à une organisation et référencer l'édition d'une autre.
select throws_ok(
  $$ insert into matches (organization_id, edition_id, match_number, winner_team, duration_seconds)
     values ('00000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001', 1, 'ARK', 1800) $$,
  '23503', null, 'pas de match rattaché à l''édition d''une autre organisation'
);

-- Le même tag d'équipe peut exister dans deux organisations, pas deux fois dans la même.
select lives_ok(
  $$ insert into teams (organization_id, tag, name) values
       ('00000000-0000-0000-0000-00000000000a', 'ARK', 'Arrakis'),
       ('00000000-0000-0000-0000-00000000000b', 'ARK', 'Arkham') $$,
  'un même tag dans deux organisations'
);
select throws_ok(
  $$ insert into teams (organization_id, tag, name) values ('00000000-0000-0000-0000-00000000000a', 'ARK', 'Doublon') $$,
  '23505', null, 'tag unique dans une organisation'
);

-- Une seule saison ouverte par organisation : c'est la saison active (ADR 0014).
select throws_ok(
  $$ insert into seasons (organization_id, name, year, status) values
       ('00000000-0000-0000-0000-00000000000a', 'Saison 4', 2027, 'open') $$,
  '23505', null, 'une seule saison ouverte par organisation'
);
select lives_ok(
  $$ insert into seasons (organization_id, name, year, status) values
       ('00000000-0000-0000-0000-00000000000a', 'Saison 2', 2025, 'closed'),
       ('00000000-0000-0000-0000-00000000000b', 'Saison 1', 2026, 'open') $$,
  'des saisons clôturées à volonté, et une saison ouverte dans chaque organisation'
);

-- Une édition se rattache à une saison de son organisation, ou à aucune.
select lives_ok(
  $$ update editions set season_id = '10000000-0000-0000-0000-000000000001'
     where id = '20000000-0000-0000-0000-000000000001' $$,
  'une édition se rattache à une saison de son organisation'
);
select throws_ok(
  $$ insert into editions (organization_id, name, type, date, season_id) values
       ('00000000-0000-0000-0000-00000000000b', 'IH #1', 'inhouse', '2026-03-01', '10000000-0000-0000-0000-000000000001') $$,
  '23503', null, 'pas d''édition rattachée à la saison d''une autre organisation'
);
select lives_ok(
  $$ insert into editions (organization_id, name, type, date, season_id) values
       ('00000000-0000-0000-0000-00000000000a', 'LAN d''été', 'external_lan', '2026-07-04', null) $$,
  'une édition peut rester hors saison'
);

-- Une note par saison se rattache à une saison de l'organisation du joueur.
select throws_ok(
  $$ insert into player_season_ratings (
       organization_id, season_id, player_id, rating, impact, consistency, clutch, tier,
       games, wins, losses, winrate, kda, kills, deaths, assists, avg_gold, avg_gpm, recent_form)
     select '00000000-0000-0000-0000-00000000000a', s.id, '30000000-0000-0000-0000-000000000001',
            78, 80, 75, 70, 'gold', 10, 6, 4, 60, 3.8, 40, 25, 55, 11000, 380, 'up'
     from seasons s where s.organization_id = '00000000-0000-0000-0000-00000000000b' $$,
  '23503', null, 'pas de note rattachée à la saison d''une autre organisation'
);

-- Un joueur n'apparaît qu'une fois par match (cohérent avec la règle de fusion).
insert into matches (id, organization_id, edition_id, match_number, winner_team, duration_seconds) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 1, 'ARK', 1800);
insert into performances (organization_id, match_id, line, side, player_id, team, role, champion, result, kills, deaths, assists, gold) values
  ('00000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-000000000001', 0, 'A', '30000000-0000-0000-0000-000000000001', 'ARK', 'TOP', 'Ornn', 'win', 1, 2, 3, 9000);
select throws_ok(
  $$ insert into performances (organization_id, match_id, line, side, player_id, team, role, champion, result, kills, deaths, assists, gold) values
       ('00000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-000000000001', 1, 'B', '30000000-0000-0000-0000-000000000001', 'BLB', 'JGL', 'Vi', 'loss', 0, 0, 0, 0) $$,
  '23505', null, 'un joueur une seule fois par match'
);

-- Les valeurs métier sont contraintes.
select throws_ok(
  $$ insert into performances (organization_id, match_id, line, side, player_id, team, role, champion, result, kills, deaths, assists, gold) values
       ('00000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-000000000001', 1, 'A', '30000000-0000-0000-0000-000000000002', 'ARK', 'JUNGLE', 'Vi', 'win', 0, 0, 0, 0) $$,
  '23514', null, 'rôle limité à TOP, JGL, MID, ADC, SUP'
);
select throws_ok(
  $$ update editions set weight_override = 2 where id = '20000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'une exception de multiplicateur exige une justification (E1)'
);
select lives_ok(
  $$ update editions set weight_override = 2, weight_override_reason = 'Finale' where id = '20000000-0000-0000-0000-000000000001' $$,
  'exception de multiplicateur justifiée'
);

select * from finish();
rollback;
