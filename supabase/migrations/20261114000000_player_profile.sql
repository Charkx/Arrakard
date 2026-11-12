-- ════════════════════════════════════════════════════════════════════════════
-- Le profil d'un joueur : ce que la page lit (cas d'usage V2).
--
-- Deux vues, lues avec les droits du visiteur (security_invoker) :
--   - player_profile_view : le joueur, son équipe actuelle et sa note de la
--     saison en cours, avec ses trois champions les plus joués ;
--   - player_matches_view : chacun de ses matchs, avec son édition.
-- ════════════════════════════════════════════════════════════════════════════

create view player_profile_view with (security_invoker = true) as
select
  p.organization_id,
  p.id as player_id,
  p.nickname,
  p.archived,
  t.tag as team_tag,
  t.name as team_name,
  coalesce(t.divisions, '{}') as divisions,
  s.id as season_id,
  s.name as season_name,
  -- La note de la saison en cours ; vide si le joueur n'y a pas joué.
  r.dominant_role,
  r.rating,
  r.impact,
  r.consistency,
  r.clutch,
  r.tier,
  r.games,
  r.wins,
  r.losses,
  r.winrate,
  r.kda,
  r.recent_form,
  r.previous_rating,
  (select count(*)::int
   from player_edition_history h join editions e on e.id = h.edition_id
   where h.player_id = p.id and e.season_id = s.id) as editions_played,
  -- Les trois champions les plus joués de la saison ; à égalité, par ordre alphabétique.
  coalesce(
    (select array_agg(c.champion order by c.games desc, c.champion)
     from (
       select f.champion, count(*) as games
       from performances f
       join matches m on m.id = f.match_id
       join editions e on e.id = m.edition_id
       where f.player_id = p.id and e.season_id = s.id
       group by f.champion
       order by count(*) desc, f.champion
       limit 3
     ) c),
    '{}'
  ) as top_champions
from players p
-- La saison en cours de l'organisation : il y en a au plus une.
left join seasons s on s.organization_id = p.organization_id and s.status = 'open'
left join player_season_ratings r on r.player_id = p.id and r.season_id = s.id
left join team_memberships ms on ms.player_id = p.id and ms.left_on is null
left join teams t on t.id = ms.team_id
-- Un joueur fusionné dans un autre n'a plus de profil à lui.
where p.merged_into is null;

create view player_matches_view with (security_invoker = true) as
select
  f.organization_id,
  f.player_id,
  p.nickname,
  e.id as edition_id,
  e.name as edition_name,
  e.type as edition_type,
  e.date as edition_date,
  e.season_id,
  m.id as match_id,
  m.match_number,
  m.matchday,
  m.duration_seconds,
  f.team,
  f.role,
  f.champion,
  f.result,
  f.kills,
  f.deaths,
  f.assists,
  f.gold
from performances f
join players p on p.id = f.player_id
join matches m on m.id = f.match_id
join editions e on e.id = m.edition_id;

-- Supabase accorde tout par défaut à une nouvelle vue : on repart de zéro,
-- puis on n'ouvre que la lecture.
revoke all on player_profile_view, player_matches_view from anon, authenticated;
grant select on player_profile_view, player_matches_view to anon, authenticated;
