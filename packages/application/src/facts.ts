import type { EditionType, Facts, Prestige, Role } from '@arrakis/domain';

/**
 * Les faits tels qu'une base les range : une propriété par colonne SQL, et
 * seulement les colonnes qui portent un fait de jeu, celles que `project()` lit.
 */
export interface FactRows {
  readonly seasons: readonly SeasonRow[];
  readonly editions: readonly EditionRow[];
  readonly matches: readonly MatchRow[];
  readonly performances: readonly PerformanceRow[];
  readonly players: readonly PlayerRow[];
}

export interface SeasonRow {
  readonly id: string;
}

export interface EditionRow {
  readonly id: string;
  readonly type: EditionType;
  readonly date: string;
  /** null : édition hors saison, qui ne compte dans aucune note de saison. */
  readonly season_id: string | null;
  readonly prestige: Prestige;
  readonly event_mvp_player_id: string | null;
}

export interface MatchRow {
  readonly id: string;
  readonly edition_id: string;
  readonly match_number: number;
  readonly winner_team: string;
  readonly duration_seconds: number;
}

export interface PerformanceRow {
  readonly match_id: string;
  readonly line: number;
  readonly side: 'A' | 'B';
  readonly player_id: string;
  readonly team: string;
  readonly role: Role;
  readonly champion: string;
  readonly result: 'win' | 'loss';
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly gold: number;
}

export interface PlayerRow {
  readonly id: string;
  readonly nickname: string;
}

/** Les lignes vues comme faits du domaine, pour `project()`. */
export function toFacts(rows: FactRows): Facts {
  return {
    seasons: rows.seasons.map((s) => ({ id: s.id })),
    editions: rows.editions.map((e) => ({
      id: e.id,
      type: e.type,
      date: e.date,
      seasonId: e.season_id,
      prestige: e.prestige,
      ...(e.event_mvp_player_id === null ? {} : { eventMvpPlayerId: e.event_mvp_player_id }),
    })),
    matches: rows.matches.map((m) => ({
      id: m.id,
      editionId: m.edition_id,
      matchNumber: m.match_number,
      winnerTeam: m.winner_team,
      durationSeconds: m.duration_seconds,
    })),
    performances: rows.performances.map((p) => ({
      matchId: p.match_id,
      line: p.line,
      side: p.side,
      playerId: p.player_id,
      team: p.team,
      role: p.role,
      champion: p.champion,
      result: p.result,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      gold: p.gold,
    })),
    players: rows.players.map((p) => ({ id: p.id, nickname: p.nickname })),
  };
}
