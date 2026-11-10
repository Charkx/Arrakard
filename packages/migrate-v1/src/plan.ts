import type { EditionType, Role } from '@arrakis/domain';
import { resolveIdentities, type Sighting } from './identity.ts';
import { cardCustomizations, teamMemberships } from './players.ts';
import type { V1Dump, V1EditionType, V1Match, V1MatchRow, V1PlayerEventEntry } from './v1.ts';
import type { V2Edition, V2Match, V2Performance, V2Rows, V2Split } from './v2.ts';

export interface Anomaly {
  readonly code: string;
  readonly message: string;
}

export interface MigrationPlan {
  readonly rows: V2Rows;
  readonly report: readonly Anomaly[];
  /** Clé de joueur v1 → joueur v2 : relie la référence v1 aux lignes migrées. */
  readonly playerIdByKey: ReadonlyMap<string, string>;
}

/** Types d'édition : seuls les deux types de ligue changent de nom. */
const EDITION_TYPE: Record<V1EditionType, EditionType> = {
  ligue_div1: 'league_div1',
  ligue_div2: 'league_div2',
  inhouse: 'inhouse',
  tournament: 'tournament',
  lan: 'lan',
  external_lan: 'external_lan',
  external_event: 'external_event',
};

/** Ordre des lignes de rôle dans un match (`performances.line`). */
const ROLE_ORDER: readonly Role[] = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];

/** Transforme une sauvegarde v1 en lignes v2. Fonction pure : rien n'est écrit. */
export function planMigration(dump: V1Dump): MigrationPlan {
  const report: Anomaly[] = [];
  const matchById = new Map(dump.matches.map((m) => [m.id, m]));
  const editionById = new Map(dump.editions.map((e) => [e.id, e]));
  const placed = dump.match_rows.map((row) => {
    const match = matchById.get(row.match_id);
    if (!match) throw new Error(`Ligne ${row.id} : match ${row.match_id} introuvable.`);
    const edition = editionById.get(match.edition_id);
    if (!edition) throw new Error(`Match ${match.id} : édition ${match.edition_id} introuvable.`);
    return { row, match, edition };
  });

  const sightings: Sighting[] = placed.flatMap(({ row, match, edition }) => [
    {
      name: row.a_player_name,
      team: row.a_team || match.team_a,
      editionCreatedAt: edition.created_at,
    },
    {
      name: row.b_player_name,
      team: row.b_team || match.team_b,
      editionCreatedAt: edition.created_at,
    },
  ]);
  const identities = resolveIdentities(dump, sightings, report);

  const played = placed.map(({ row, match, edition }) => ({
    date: edition.date,
    performances: performancesOf(row, match, identities.playerIdOf, report),
  }));
  const performances = played.flatMap((p) => p.performances);
  reportOrphanEventResults(dump, editionById, report);

  // Première édition jouée par chaque joueur sous chaque tag (date d'arrivée, M8).
  const firstPlayed = new Map<string, string>();
  for (const { date, performances: rowPerformances } of played) {
    for (const p of rowPerformances) {
      const key = `${p.player_id}|${p.team}`;
      const known = firstPlayed.get(key);
      if (known === undefined || date < known) firstPlayed.set(key, date);
    }
  }

  const performancesByMatch = Map.groupBy(performances, (p) => p.match_id);
  for (const match of dump.matches) {
    checkResults(match, performancesByMatch.get(match.id) ?? [], report);
  }

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
      teams: dump.teams.map(({ id, tag, name, divisions, logo_url, archived_at }) => ({
        id,
        tag,
        name,
        divisions,
        logo_url,
        archived_at,
      })),
      players: identities.players,
      player_aliases: identities.aliases,
      team_memberships: teamMemberships(dump, (playerId, tag) =>
        firstPlayed.get(`${playerId}|${tag}`),
      ),
      editions: dump.editions.map((e): V2Edition => {
        const mvp =
          e.mvp_player_name === null ? null : (identities.find(e.mvp_player_name) ?? null);
        if (e.mvp_player_name !== null && mvp === null) {
          report.push({
            code: 'unknown-mvp',
            message: `Édition ${e.id} : MVP de soirée « ${e.mvp_player_name} » introuvable, laissé vide.`,
          });
        }
        return {
          id: e.id,
          name: e.name,
          type: EDITION_TYPE[e.type],
          date: e.date,
          split_id: e.split_id,
          prestige: e.prestige,
          event_mvp_player_id: mvp,
          display_number: e.display_number,
          location: e.location,
          url: e.url,
          description: e.description,
          arrakis_won: e.arrakis_won,
          source_file_hash: e.source_file_hash,
          created_at: e.created_at,
        };
      }),
      matches: dump.matches.map(toMatch),
      performances: sortPerformances(performances),
      edition_participants: dump.edition_participants.map(({ edition_id, player_id }) => ({
        edition_id,
        player_id,
      })),
      card_customizations: cardCustomizations(dump, report),
      registrations: dump.registrations.map((r) => ({ ...r })),
    },
    report,
    playerIdByKey: identities.playerIdByKey,
  };
}

function toMatch(m: V1Match): V2Match {
  return {
    id: m.id,
    edition_id: m.edition_id,
    match_number: m.match_number,
    winner_team: m.winner,
    duration_seconds: parseDisplayDuration(m),
    matchday: m.journee,
    is_final: m.is_final,
  };
}

/** `mm:ss` → secondes. */
function parseDisplayDuration({ id, duration_display }: V1Match): number {
  const parts = /^(\d+):([0-5]\d)$/.exec(duration_display.trim());
  if (!parts) throw new Error(`Match ${id} : durée illisible « ${duration_display} ».`);
  return Number(parts[1]) * 60 + Number(parts[2]);
}

/**
 * M3 : un match est contradictoire si son vainqueur n'est aucune des deux
 * équipes, ou si une ligne donne le même résultat aux deux côtés. Il est
 * migré tel quel (parité des notes) et signalé.
 */
function checkResults(match: V1Match, performances: readonly V2Performance[], report: Anomaly[]) {
  if (performances.length === 0) {
    report.push({
      code: 'empty-match',
      message: `Match ${match.id} (${match.team_a} contre ${match.team_b}) : aucune ligne de match.`,
    });
    return;
  }
  const resultsOf = (side: 'A' | 'B') =>
    [...new Set(performances.filter((p) => p.side === side).map((p) => p.result))].join(',');
  const a = resultsOf('A');
  const b = resultsOf('B');
  const winnerPlayed = match.winner === match.team_a || match.winner === match.team_b;
  const sidesDisagree = (a === 'win' && b === 'loss') || (a === 'loss' && b === 'win');
  if (winnerPlayed && sidesDisagree) return;
  report.push({
    code: 'contradictory-result',
    message: `Match ${match.id} (${match.team_a} contre ${match.team_b}) : vainqueur enregistré « ${match.winner} », résultats des lignes A ${a} / B ${b}. Migré tel quel, à corriger après la bascule.`,
  });
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

/**
 * M4 : résultats d'événement (`player_event_entries`) d'un autre type que leur
 * édition. Ce sont des faits sans match, que la v2 ne sait pas représenter (Q10).
 */
function reportOrphanEventResults(
  dump: V1Dump,
  editionById: ReadonlyMap<string, { readonly type: V1EditionType }>,
  report: Anomaly[],
) {
  const orphans = dump.player_event_entries.filter(
    (e) => e.event_type !== editionById.get(e.edition_id)?.type,
  );
  const groups = new Map<string, { entry: V1PlayerEventEntry; count: number }>();
  for (const entry of orphans) {
    const key = `${entry.edition_id}|${entry.event_name}`;
    const group = groups.get(key);
    if (group) group.count += 1;
    else groups.set(key, { entry, count: 1 });
  }
  for (const { entry, count } of groups.values()) {
    report.push({
      code: 'orphan-event-results',
      message: `${count} résultats « ${entry.event_name} » (${entry.event_type}, ${entry.date}) rattachés à l’édition ${entry.edition_id} (${String(editionById.get(entry.edition_id)?.type)}), sans match : non migrés (Q10).`,
    });
  }
}
