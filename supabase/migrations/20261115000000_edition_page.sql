-- ════════════════════════════════════════════════════════════════════════════
-- La page d'une édition : ce qu'elle lit (cas d'usage V4).
--
-- Quatre vues, lues avec les droits du visiteur (security_invoker) : l'en-tête
-- de l'édition, son classement de soirée, ses matchs (une ligne par joueur) et,
-- pour un événement externe, ses participants.
-- ════════════════════════════════════════════════════════════════════════════

create view edition_page_view with (security_invoker = true) as
select
  e.organization_id,
  e.id as edition_id,
  e.name,
  e.type,
  e.date,
  e.display_number,
  e.location,
  e.url,
  e.description,
  e.arrakis_won,
  e.season_id,
  s.name as season_name,
  mvp.nickname as event_mvp_nickname,
  (select count(*)::int from matches m where m.edition_id = e.id) as match_count
from editions e
left join seasons s on s.id = e.season_id
left join players mvp on mvp.id = e.event_mvp_player_id;

create view edition_standings_view with (security_invoker = true) as
select
  st.organization_id,
  st.edition_id,
  st.player_id,
  p.nickname,
  st.rank,
  st.team,
  st.role,
  st.champion,
  st.games,
  st.wins,
  st.losses,
  st.kills,
  st.deaths,
  st.assists,
  st.is_event_mvp,
  st.match_mvp_count,
  st.result_points,
  st.stat_points,
  st.mvp_points,
  st.points
from edition_standings st
join players p on p.id = st.player_id;

create view edition_matches_view with (security_invoker = true) as
select
  m.organization_id,
  m.edition_id,
  m.id as match_id,
  m.match_number,
  m.matchday,
  m.is_final,
  m.duration_seconds,
  m.winner_team,
  mvp.nickname as mvp_nickname,
  f.line,
  f.side,
  f.player_id,
  p.nickname,
  f.team,
  f.role,
  f.champion,
  f.result,
  f.kills,
  f.deaths,
  f.assists
from matches m
join performances f on f.match_id = m.id
join players p on p.id = f.player_id
left join players mvp on mvp.id = m.mvp_player_id;

create view edition_participants_view with (security_invoker = true) as
select ep.organization_id, ep.edition_id, ep.player_id, p.nickname
from edition_participants ep
join players p on p.id = ep.player_id;

-- Supabase accorde tout par défaut à une nouvelle vue : on repart de zéro,
-- puis on n'ouvre que la lecture.
revoke all on edition_page_view, edition_standings_view, edition_matches_view, edition_participants_view
  from anon, authenticated;
grant select on edition_page_view, edition_standings_view, edition_matches_view, edition_participants_view
  to anon, authenticated;
