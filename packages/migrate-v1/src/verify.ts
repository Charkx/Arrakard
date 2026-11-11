import { project, V1_RATING_RULES, type Facts, type SeasonRating } from '@arrakis/domain';
import type { MigrationPlan } from './plan.ts';
import type { V2Rows } from './v2.ts';

/** Une différence entre la note v1 affichée et la note recalculée en v2. */
export interface Discrepancy {
  readonly playerId: string;
  readonly seasonId: string;
  /** Valeur comparée, ou `presence` si le joueur n'est noté que d'un côté. */
  readonly field: string;
  readonly v1: number | string;
  readonly v2: number | string;
}

/** Les lignes v2 vues comme faits du domaine, pour `project()`. */
export function toFacts(rows: V2Rows): Facts {
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

/**
 * Notes calculées par le CODE v1 sur la sauvegarde (extracteur du golden
 * master, option V1_REFERENCE). Les caches v1 (`players`,
 * `player_split_stats`) ne servent pas de référence : ils sont périmés (M9).
 * La référence garde le vocabulaire de la v1, qui note par split.
 */
export interface V1Reference {
  readonly splits: readonly {
    readonly splitId: string;
    readonly players: readonly V1ReferencePlayer[];
  }[];
}

export interface V1ReferencePlayer {
  /** Clé de joueur v1 (`playerKey`). */
  readonly key: string;
  readonly rating: number;
  readonly impact: number;
  readonly consistency: number;
  readonly clutch: number;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
}

/** Valeurs comparées : nom dans la référence → lecture dans la projection v2. */
const COMPARED: readonly (readonly [
  Exclude<keyof V1ReferencePlayer, 'key'>,
  (r: SeasonRating) => number,
])[] = [
  ['rating', (r) => r.rating.rating],
  ['impact', (r) => r.rating.impact],
  ['consistency', (r) => r.rating.consistency],
  ['clutch', (r) => r.rating.clutch],
  ['games', (r) => r.stats.games],
  ['wins', (r) => r.stats.wins],
  ['losses', (r) => r.stats.losses],
];

/**
 * Recalcule les notes des lignes migrées avec les règles v1, et les compare,
 * saison par saison et joueur par joueur, à celles du code v1. Chaque split de
 * la référence est rattaché à la saison qui le contenait.
 */
export function verifyRatings(plan: MigrationPlan, reference: V1Reference): Discrepancy[] {
  const keyOf = (playerId: string, seasonId: string) => `${playerId}|${seasonId}`;
  const v2 = new Map(
    project(toFacts(plan.rows), V1_RATING_RULES).seasonRatings.map((r) => [
      keyOf(r.playerId, r.seasonId),
      r,
    ]),
  );
  const v1 = new Map(
    reference.splits.flatMap(({ splitId, players }) => {
      const seasonId = plan.seasonIdBySplitId.get(splitId);
      if (seasonId === undefined) {
        throw new Error(`Référence v1 : split ${splitId} inconnu de la sauvegarde.`);
      }
      return players.map((p) => {
        const playerId = plan.playerIdByKey.get(p.key) ?? p.key;
        return [keyOf(playerId, seasonId), { playerId, seasonId, values: p }] as const;
      });
    }),
  );

  const discrepancies: Discrepancy[] = [];
  for (const [key, { playerId, seasonId, values }] of v1) {
    const after = v2.get(key);
    if (!after) {
      discrepancies.push({ playerId, seasonId, field: 'presence', v1: 'noté', v2: 'absent' });
      continue;
    }
    for (const [field, read] of COMPARED) {
      if (values[field] !== read(after)) {
        discrepancies.push({ playerId, seasonId, field, v1: values[field], v2: read(after) });
      }
    }
  }
  for (const [key, after] of v2) {
    if (!v1.has(key)) {
      discrepancies.push({
        playerId: after.playerId,
        seasonId: after.seasonId,
        field: 'presence',
        v1: 'absent',
        v2: 'noté',
      });
    }
  }
  return discrepancies;
}
