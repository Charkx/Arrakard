-- ════════════════════════════════════════════════════════════════════════════
-- Le classement : ce que la page lit (cas d'usage V1).
--
-- La note de saison porte le rôle dominant du joueur. Une vue rassemble ce que
-- la page affiche : la note, le joueur, son rôle et son équipe actuelle.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── La note de saison porte le rôle dominant ───────────────────────────────
-- Projection (ADR 0003) : on la vide, elle se recalcule. Sans cela, les lignes
-- existantes n'auraient pas de rôle.

delete from player_season_ratings;

alter table player_season_ratings
  add column dominant_role text not null check (dominant_role in ('TOP', 'JGL', 'MID', 'ADC', 'SUP'));

-- ─── La vue du classement ───────────────────────────────────────────────────
-- Une ligne par joueur et par saison. La page filtre sur l'organisation et la
-- saison ; le rang se calcule à l'affichage, avec la règle du domaine.
--
-- security_invoker : la vue lit avec les droits de celui qui l'interroge, donc
-- avec les règles d'accès des tables qu'elle rassemble.

create view leaderboard_view with (security_invoker = true) as
select
  r.organization_id,
  r.season_id,
  s.status as season_status,
  r.player_id,
  p.nickname,
  p.archived,
  r.dominant_role,
  t.tag as team_tag,
  coalesce(t.divisions, '{}') as divisions,
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
  r.previous_rating
from player_season_ratings r
join seasons s on s.id = r.season_id
join players p on p.id = r.player_id
-- L'équipe actuelle : le passage sans date de départ, s'il y en a un.
left join team_memberships m on m.player_id = r.player_id and m.left_on is null
left join teams t on t.id = m.team_id;

-- Supabase accorde tout par défaut à une nouvelle vue : on repart de zéro,
-- puis on n'ouvre que la lecture.
revoke all on leaderboard_view from anon, authenticated;
grant select on leaderboard_view to anon, authenticated;
