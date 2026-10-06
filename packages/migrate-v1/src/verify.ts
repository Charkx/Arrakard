import { project, V1_RATING_RULES, type Facts, type SplitRating } from '@arrakis/domain';
import type { V1PlayerSplitStats } from './v1.ts';
import type { V2Rows } from './v2.ts';

/** Une différence entre la note v1 affichée et la note recalculée en v2. */
export interface Discrepancy {
  readonly playerId: string;
  readonly splitId: string;
  /** Valeur comparée, ou `presence` si le joueur n'est noté que d'un côté. */
  readonly field: string;
  readonly v1: number | string;
  readonly v2: number | string;
}

/** Les lignes v2 vues comme faits du domaine, pour `project()`. */
export function toFacts(rows: V2Rows): Facts {
  return {
    splits: rows.splits.map((s) => ({ id: s.id, seasonId: s.season_id, number: s.number })),
    editions: rows.editions.map((e) => ({
      id: e.id,
      type: e.type,
      date: e.date,
      splitId: e.split_id,
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

/** Valeurs comparées : nom v1 → lecture dans la projection v2. */
const COMPARED: readonly (readonly [keyof V1PlayerSplitStats, (r: SplitRating) => number])[] = [
  ['rating', (r) => r.rating.rating],
  ['impact', (r) => r.rating.impact],
  ['consistance', (r) => r.rating.consistency],
  ['clutch', (r) => r.rating.clutch],
  ['games', (r) => r.stats.games],
  ['wins', (r) => r.stats.wins],
  ['losses', (r) => r.stats.losses],
];

/**
 * Recalcule les notes avec les règles v1 et les compare à celles que la v1
 * affiche (`player_split_stats`). Les lignes v1 sans partie sont ignorées :
 * la v2 ne note pas un joueur qui n'a pas joué.
 */
export function verifyRatings(rows: V2Rows, v1Stats: readonly V1PlayerSplitStats[]): Discrepancy[] {
  const keyOf = (playerId: string, splitId: string) => `${playerId}|${splitId}`;
  const v2 = new Map(
    project(toFacts(rows), V1_RATING_RULES).splitRatings.map((r) => [
      keyOf(r.playerId, r.splitId),
      r,
    ]),
  );
  const v1 = new Map(
    v1Stats.filter((s) => s.games > 0).map((s) => [keyOf(s.player_id, s.split_id), s]),
  );

  const discrepancies: Discrepancy[] = [];
  for (const [key, before] of v1) {
    const after = v2.get(key);
    const at = { playerId: before.player_id, splitId: before.split_id };
    if (!after) {
      discrepancies.push({ ...at, field: 'presence', v1: 'noté', v2: 'absent' });
      continue;
    }
    for (const [field, read] of COMPARED) {
      if (before[field] !== read(after)) {
        discrepancies.push({ ...at, field, v1: before[field], v2: read(after) });
      }
    }
  }
  for (const [key, after] of v2) {
    if (!v1.has(key)) {
      discrepancies.push({
        playerId: after.playerId,
        splitId: after.splitId,
        field: 'presence',
        v1: 'absent',
        v2: 'noté',
      });
    }
  }
  return discrepancies;
}
