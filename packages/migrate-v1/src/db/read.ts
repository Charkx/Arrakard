import type { Facts } from '@arrakis/domain';
import type { Sql, TransactionSql } from 'postgres';
import type { V2Edition, V2Match, V2Performance, V2Player, V2Season } from '../v2.ts';
import { toFacts } from '../verify.ts';
import type { ProjectionRows } from './projection-rows.ts';

type Db = Sql | TransactionSql;

/** Les faits d'une organisation, tels que la base les rend, pour `project()`. */
export async function readFacts(db: Db, organizationId: string): Promise<Facts> {
  const seasons = await db<Pick<V2Season, 'id'>[]>`
    select id from seasons where organization_id = ${organizationId}`;
  const editions = await db<
    Pick<V2Edition, 'id' | 'type' | 'date' | 'season_id' | 'prestige' | 'event_mvp_player_id'>[]
  >`
    select id, type, date::text, season_id, prestige, event_mvp_player_id
    from editions where organization_id = ${organizationId}`;
  const matches = await db<
    Pick<V2Match, 'id' | 'edition_id' | 'match_number' | 'winner_team' | 'duration_seconds'>[]
  >`
    select id, edition_id, match_number, winner_team, duration_seconds
    from matches where organization_id = ${organizationId}`;
  const performances = await db<V2Performance[]>`
    select match_id, line, side, player_id, team, role, champion, result, kills, deaths, assists, gold
    from performances where organization_id = ${organizationId}`;
  const players = await db<Pick<V2Player, 'id' | 'nickname'>[]>`
    select id, nickname from players where organization_id = ${organizationId}`;

  return toFacts({ seasons, editions, matches, performances, players });
}

/** Les projections écrites pour une organisation, triées comme le domaine les produit. */
export async function readProjectionRows(db: Db, organizationId: string): Promise<ProjectionRows> {
  const ratings = await db<ProjectionRows['player_season_ratings'][number][]>`
    select season_id, player_id, rating, impact, consistency, clutch, tier, games, wins, losses,
           winrate, kda::float8 as kda, kills, deaths, assists, avg_gold, avg_gpm, recent_form,
           previous_rating
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
