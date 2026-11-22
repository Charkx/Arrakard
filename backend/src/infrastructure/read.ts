import {
  toFacts,
  type EditionRow,
  type MatchRow,
  type PerformanceRow,
  type PlayerRow,
  type SeasonRow,
} from '../application/index.ts';
import type { Facts } from '../domain/index.ts';
import type { ProjectionRows } from './projections.ts';
import type { Db } from './tables.ts';

/** Les faits d'une organisation, tels que la base les rend, pour `project()`. */
export async function readFacts(db: Db, organizationId: string): Promise<Facts> {
  const seasons = await db<SeasonRow[]>`
    select id from seasons where organization_id = ${organizationId}`;
  const editions = await db<EditionRow[]>`
    select id, type, date::text, season_id, prestige, event_mvp_player_id
    from editions where organization_id = ${organizationId}`;
  const matches = await db<MatchRow[]>`
    select id, edition_id, match_number, winner_team, duration_seconds
    from matches where organization_id = ${organizationId}`;
  const performances = await db<PerformanceRow[]>`
    select match_id, line, side, player_id, team, role, champion, result, kills, deaths, assists, gold
    from performances where organization_id = ${organizationId}`;
  const players = await db<PlayerRow[]>`
    select id, nickname from players where organization_id = ${organizationId}`;

  return toFacts({ seasons, editions, matches, performances, players });
}

/** Les projections écrites pour une organisation, triées comme le domaine les produit. */
export async function readProjectionRows(db: Db, organizationId: string): Promise<ProjectionRows> {
  const ratings = await db<ProjectionRows['player_season_ratings'][number][]>`
    select season_id, player_id, dominant_role, rating, impact, consistency, clutch, tier, games, wins, losses,
           winrate, kda::float8 as kda, kills, deaths, assists, avg_gold, avg_gpm, recent_form,
           previous_rating, breakdown
    from player_season_ratings where organization_id = ${organizationId}
    order by season_id, player_id`;
  const history = await db<ProjectionRows['player_edition_history'][number][]>`
    select h.edition_id, h.player_id, h.career_rating, h.result, h.games, h.wins,
           h.kda::float8 as kda, h.kills, h.deaths, h.assists
    from player_edition_history h join editions e on e.id = h.edition_id
    where h.organization_id = ${organizationId}
    order by e.date, e.id, h.player_id`;
  const standings = await db<ProjectionRows['edition_standings'][number][]>`
    select s.edition_id, s.player_id, s.rank, s.team, s.role, s.champion, s.games, s.wins,
           s.losses, s.kills, s.deaths, s.assists, s.is_event_mvp, s.match_mvp_count,
           s.result_points, s.stat_points, s.mvp_points, s.points
    from edition_standings s join editions e on e.id = s.edition_id
    where s.organization_id = ${organizationId}
    order by e.date, e.id, s.rank, s.player_id`;

  return {
    player_season_ratings: [...ratings],
    player_edition_history: [...history],
    edition_standings: [...standings],
  };
}
