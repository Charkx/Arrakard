-- Brouillons et publications (ADR 0012, ticket #43) : un match en brouillon
-- est invisible du public, dans les tables comme dans toutes les vues.
begin;
select plan(14);

-- Structure
select has_column('public', 'matches', 'draft', 'un match peut être un brouillon');
select col_default_is('public', 'matches', 'draft', 'false', 'un match est publié par défaut : les données migrées de la v1 le restent');
select has_table('public', 'publications', 'publications');
select columns_are('public', 'publications',
  array['id', 'organization_id', 'edition_id', 'published_by', 'published_at', 'match_ids'],
  'une publication dit quelle édition, quels matchs, quand, par qui');

-- ── Données ──────────────────────────────────────────────────────────────────
-- Une soirée : le match 1 est publié, le match 2 est un brouillon.
insert into organizations (id, slug, name) values
  ('00000000-0000-0000-0000-00000000000a', 'essai-brouillons', 'Arrakis');
insert into players (id, organization_id, nickname) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Zéphyr');
insert into editions (id, organization_id, name, type, date, prestige) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'IH #9', 'inhouse', '2026-11-20', 'normal');
insert into matches (id, organization_id, edition_id, match_number, winner_team, duration_seconds, draft) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 1, 'ARK', 1800, false),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 2, 'ARK', 1800, true);
insert into performances (organization_id, match_id, line, side, player_id, team, role, champion, result, kills, deaths, assists, gold)
select '00000000-0000-0000-0000-00000000000a', m.id, 0, 'A', '30000000-0000-0000-0000-000000000001', 'ARK', 'TOP', 'Ornn', 'win', 3, 1, 4, 10000
from matches m where m.edition_id = '20000000-0000-0000-0000-000000000001';
insert into auth.users (id, email) values ('50000000-0000-0000-0000-000000000001', 'admin@brouillons.local');
insert into publications (organization_id, edition_id, published_by, match_ids) values
  ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000001', array['40000000-0000-0000-0000-000000000001'::uuid]);

-- ── Visiteur ─────────────────────────────────────────────────────────────────
set local role anon;
select is((select count(*)::int from matches where edition_id = '20000000-0000-0000-0000-000000000001'), 1,
  'un visiteur ne voit que le match publié');
select is((select count(*)::int from performances where player_id = '30000000-0000-0000-0000-000000000001'), 1,
  'un visiteur ne voit que les performances du match publié');
select is((select match_count from edition_page_view where edition_id = '20000000-0000-0000-0000-000000000001'), 1,
  'l''en-tête d''une édition ne compte pas le brouillon');
select is((select count(distinct match_id)::int from edition_matches_view where edition_id = '20000000-0000-0000-0000-000000000001'), 1,
  'la liste des matchs d''une édition ne montre pas le brouillon');
select is((select count(distinct match_id)::int from player_matches_view where player_id = '30000000-0000-0000-0000-000000000001'), 1,
  'l''historique d''un joueur ne montre pas le brouillon');
select is((select count(*)::int from publications where edition_id = '20000000-0000-0000-0000-000000000001'), 1,
  'les publications sont publiques');
select throws_ok($$ select published_by from publications $$, '42501', null,
  'l''auteur d''une publication ne se montre pas au public');
select throws_ok(
  $$ update matches set draft = false $$,
  '42501', null, 'personne ne publie directement : seule la commande le fait');
select throws_ok(
  $$ insert into publications (organization_id, edition_id, published_by, match_ids)
     values ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '{}') $$,
  '42501', null, 'personne n''écrit une publication directement');
reset role;

-- ── Connecté ─────────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub": "50000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select is((select count(*)::int from matches where edition_id = '20000000-0000-0000-0000-000000000001'), 1,
  'un utilisateur connecté ne voit pas non plus les brouillons par l''API');
reset role;

select * from finish();
rollback;
