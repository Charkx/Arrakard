-- ════════════════════════════════════════════════════════════════════════════
-- L'explication de la note (cas d'usage V10).
--
-- Chaque note de saison porte son explication (glossaire : explication de
-- note, `RatingBreakdown`), calculée par le domaine en même temps que la note.
-- Le profil la lit : le navigateur ne fait que l'afficher.
-- ════════════════════════════════════════════════════════════════════════════

-- Projection (ADR 0003) : on la vide, elle se recalcule. Sans cela, les lignes
-- existantes n'auraient pas d'explication.
delete from player_season_ratings;

alter table player_season_ratings add column breakdown jsonb not null;

-- Le profil gagne une colonne, à la fin : les colonnes existantes ne bougent pas.
create or replace view player_profile_view with (security_invoker = true) as
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
  ) as top_champions,
  r.breakdown
from players p
left join seasons s on s.organization_id = p.organization_id and s.status = 'open'
left join player_season_ratings r on r.player_id = p.id and r.season_id = s.id
left join team_memberships ms on ms.player_id = p.id and ms.left_on is null
left join teams t on t.id = ms.team_id
where p.merged_into is null;
