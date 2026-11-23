import type { MatchEntry, RoleLine, Side } from '../match/entry.ts';
import { ROLES } from '../performance.ts';
import type { PlannedMatch, PlannedPerformance } from './plan.ts';

/** La feuille d'un match importé, et son numéro dans le fichier. */
export interface PlannedEntry {
  readonly matchNumber: number;
  readonly entry: MatchEntry;
}

export type PlannedEntriesResult =
  | { readonly ok: true; readonly entries: readonly PlannedEntry[] }
  | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Fait des matchs d'un import les feuilles d'une saisie à la main (ADR 0022) :
 * l'import et la saisie écrivent alors les mêmes faits, par la même écriture.
 * Le côté A est la première équipe de chaque ligne, le côté B la seconde.
 * Les problèmes de la feuille elle-même (rôles, joueurs, champions) se
 * vérifient ensuite comme ceux d'une saisie (`matchEntryProblems`).
 */
export function plannedMatchEntries(matches: readonly PlannedMatch[]): PlannedEntriesResult {
  const errors: string[] = [];
  const entries = matches.flatMap((match) => {
    const entry = entryOf(match, errors);
    return entry ? [{ matchNumber: match.matchNumber, entry }] : [];
  });
  return errors.length > 0 ? { ok: false, errors } : { ok: true, entries };
}

function entryOf(match: PlannedMatch, errors: string[]): MatchEntry | undefined {
  const a = sideTeam(match, 'A', errors);
  const b = sideTeam(match, 'B', errors);
  if (a === undefined || b === undefined) return undefined;
  const teams = [a, b] as const;
  const winner = winnerOf(match.winnerTeam, teams);
  if (winner === undefined) {
    errors.push(
      `Match ${match.matchNumber} : le gagnant « ${match.winnerTeam} » n’est ni « ${a} » ni « ${b} ».`,
    );
    return undefined;
  }
  const lines = ROLES.flatMap((role): RoleLine[] => {
    const [first, second] = match.performances.filter((p) => p.role === role);
    return first && second ? [{ role, sides: [sideOf(first), sideOf(second)] }] : [];
  });
  return { durationSeconds: match.durationSeconds, winner, teams, lines };
}

/** L'équipe d'un côté ; `planImport` range les performances A puis B, ligne par ligne. */
function sideTeam(match: PlannedMatch, side: Side, errors: string[]): string | undefined {
  const parity = side === 'A' ? 0 : 1;
  const teams = [
    ...new Set(match.performances.filter((_, i) => i % 2 === parity).map((p) => p.team)),
  ];
  if (teams.length > 1) {
    errors.push(
      `Match ${match.matchNumber} : le côté ${side} change d’équipe d’une ligne à l’autre (${teams.join(', ')}).`,
    );
    return undefined;
  }
  return teams[0] ?? '';
}

function winnerOf(winnerTeam: string, teams: readonly [string, string]): Side | undefined {
  const same = (team: string) => team.toLowerCase() === winnerTeam.trim().toLowerCase();
  if (same(teams[0])) return 'A';
  if (same(teams[1])) return 'B';
  return undefined;
}

function sideOf({ player, champion, kills, deaths, assists, gold }: PlannedPerformance) {
  // Sans décision de l'admin, `planImport` ne rend que des joueurs existants.
  if (player.kind === 'new') {
    throw new Error(`Le nouveau joueur « ${player.key} » n'a pas encore d'identifiant.`);
  }
  return { playerId: player.playerId, champion, kills, deaths, assists, gold };
}
