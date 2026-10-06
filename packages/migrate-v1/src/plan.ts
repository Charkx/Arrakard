import type { Role } from '@arrakis/domain';
import { playerKey } from './identity.ts';
import type { V1Dump, V1Match, V1MatchRow } from './v1.ts';
import type { V2Match, V2Performance, V2Rows, V2Split } from './v2.ts';

export interface Anomaly {
  readonly code: string;
  readonly message: string;
}

export interface MigrationPlan {
  readonly rows: V2Rows;
  readonly report: readonly Anomaly[];
}

/** Ordre des lignes de rôle dans un match (`performances.line`). */
const ROLE_ORDER: readonly Role[] = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];

/** Transforme une sauvegarde v1 en lignes v2. Fonction pure : rien n'est écrit. */
export function planMigration(dump: V1Dump): MigrationPlan {
  const report: Anomaly[] = [];
  const playerIdByKey = new Map(dump.players.map((p) => [playerKey(p.name), p.id]));
  const playerIdOf = (name: string) => playerIdByKey.get(playerKey(name)) ?? playerKey(name);

  const matchById = new Map(dump.matches.map((m) => [m.id, m]));
  const performances = dump.match_rows.flatMap((row) => {
    const match = matchById.get(row.match_id);
    if (!match) throw new Error(`Ligne ${row.id} : match ${row.match_id} introuvable.`);
    return performancesOf(row, match, playerIdOf, report);
  });

  return {
    rows: {
      seasons: dump.seasons.map(({ id, name, year }) => ({ id, name, year })),
      splits: dump.splits.map((s): V2Split => ({
        id: s.id,
        season_id: s.season_id,
        number: s.number,
        name: s.name,
        start_date: s.start_date,
        end_date: s.end_date,
        status: s.is_active ? 'open' : 'closed',
      })),
      teams: [],
      players: [],
      player_aliases: [],
      team_memberships: [],
      editions: [],
      matches: dump.matches.map(toMatch),
      performances: sortPerformances(performances),
      edition_participants: [],
      card_customizations: [],
      registrations: [],
    },
    report,
  };
}

function toMatch(m: V1Match): V2Match {
  return {
    id: m.id,
    edition_id: m.edition_id,
    match_number: m.match_number,
    winner_team: m.winner,
    duration_seconds: parseDisplayDuration(m.duration_display),
    matchday: m.journee,
    is_final: m.is_final,
  };
}

/** `mm:ss` → secondes. */
function parseDisplayDuration(display: string): number {
  const match = /^(\d+):([0-5]\d)$/.exec(display.trim());
  if (!match) throw new Error(`Durée illisible : « ${display} ».`);
  return Number(match[1]) * 60 + Number(match[2]);
}

function performancesOf(
  row: V1MatchRow,
  match: V1Match,
  playerIdOf: (name: string) => string,
  report: Anomaly[],
): V2Performance[] {
  const line = ROLE_ORDER.indexOf(row.role);
  const emptySides = [row.a_team === '' && 'A', row.b_team === '' && 'B'].filter(Boolean);
  if (emptySides.length > 0) {
    report.push({
      code: 'missing-team',
      message: `Match ${match.id}, ${row.role} : équipe vide ${emptySides.length === 2 ? 'des côtés A et B' : `du côté ${String(emptySides[0])}`}, complétée depuis le match.`,
    });
  }
  return [
    {
      match_id: row.match_id,
      line,
      side: 'A',
      player_id: playerIdOf(row.a_player_name),
      team: row.a_team || match.team_a,
      role: row.role,
      champion: row.a_champion,
      result: row.a_result === 'WIN' ? 'win' : 'loss',
      kills: row.a_kills,
      deaths: row.a_deaths,
      assists: row.a_assists,
      gold: row.a_gold,
    },
    {
      match_id: row.match_id,
      line,
      side: 'B',
      player_id: playerIdOf(row.b_player_name),
      team: row.b_team || match.team_b,
      role: row.role,
      champion: row.b_champion,
      result: row.b_result === 'WIN' ? 'win' : 'loss',
      kills: row.b_kills,
      deaths: row.b_deaths,
      assists: row.b_assists,
      gold: row.b_gold,
    },
  ];
}

/** Ordre stable (match, ligne, côté) : deux exécutions donnent le même résultat. */
function sortPerformances(performances: V2Performance[]): V2Performance[] {
  return performances.sort(
    (a, b) =>
      a.match_id.localeCompare(b.match_id) || a.line - b.line || a.side.localeCompare(b.side),
  );
}
