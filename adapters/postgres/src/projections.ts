import type { Projections } from '@arrakis/domain';

/**
 * Les projections du domaine, mises à plat : une propriété par colonne SQL
 * des tables de projection (`supabase/migrations`). `organization_id` est
 * ajouté à l'écriture.
 */
export interface ProjectionRows {
  readonly player_season_ratings: readonly Record<string, unknown>[];
  readonly player_edition_history: readonly Record<string, string | number | null>[];
  readonly edition_standings: readonly Record<string, string | number | boolean | null>[];
}

export function toProjectionRows(projections: Projections): ProjectionRows {
  return {
    player_season_ratings: projections.seasonRatings.map((r) => ({
      season_id: r.seasonId,
      player_id: r.playerId,
      dominant_role: r.dominantRole,
      rating: r.rating.rating,
      impact: r.rating.impact,
      consistency: r.rating.consistency,
      clutch: r.rating.clutch,
      tier: r.rating.tier,
      games: r.stats.games,
      wins: r.stats.wins,
      losses: r.stats.losses,
      winrate: r.stats.winrate,
      kda: r.stats.kda,
      kills: r.stats.kills,
      deaths: r.stats.deaths,
      assists: r.stats.assists,
      avg_gold: r.stats.avgGold,
      avg_gpm: r.stats.avgGpm,
      recent_form: r.stats.recentForm,
      previous_rating: r.previousRating,
      breakdown: r.breakdown,
    })),
    player_edition_history: projections.editionHistory.map((h) => ({
      edition_id: h.editionId,
      player_id: h.playerId,
      career_rating: h.careerRating,
      result: h.result,
      games: h.stats.games,
      wins: h.stats.wins,
      kda: h.stats.kda,
      kills: h.stats.kills,
      deaths: h.stats.deaths,
      assists: h.stats.assists,
    })),
    edition_standings: projections.editionStandings.flatMap((standings) =>
      standings.rows.map((row) => ({
        edition_id: standings.editionId,
        player_id: row.playerId,
        rank: row.rank,
        team: row.team,
        role: row.role,
        champion: row.champion,
        games: row.games,
        wins: row.wins,
        losses: row.losses,
        kills: row.kills,
        deaths: row.deaths,
        assists: row.assists,
        is_event_mvp: row.isEventMvp,
        match_mvp_count: row.matchMvpCount,
        result_points: row.resultPoints,
        stat_points: row.statPoints,
        mvp_points: row.mvpPoints,
        points: row.points,
      })),
    ),
  };
}
