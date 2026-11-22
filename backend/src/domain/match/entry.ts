import { ROLES, type Role } from '../performance.ts';

/** Le côté d'un match : A, puis B. */
export type Side = 'A' | 'B';

/** Ce qu'un admin saisit d'un joueur dans un match. */
export interface EntrySide {
  /** Vide tant que l'admin n'a pas choisi le joueur. */
  readonly playerId: string;
  readonly champion: string;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly gold: number;
}

/** Une ligne de rôle saisie : les deux joueurs qui s'y affrontent, A puis B. */
export interface EntryLine {
  readonly role: Role;
  readonly sides: readonly [EntrySide, EntrySide];
}

/** Un match saisi à la main (cas d'usage A14), du TOP au SUP. */
export interface MatchEntry {
  readonly durationSeconds: number;
  readonly winner: Side;
  /** Le nom de l'équipe du côté A, puis du côté B. */
  readonly teams: readonly [string, string];
  readonly lines: readonly EntryLine[];
}

/** Ce qui ne va pas dans une saisie ; le formulaire l'explique, le serveur la refuse. */
export type MatchEntryProblem =
  | { readonly kind: 'roles' }
  | { readonly kind: 'teams' }
  | { readonly kind: 'missingPlayer'; readonly role: Role; readonly side: Side }
  | { readonly kind: 'missingChampion'; readonly role: Role; readonly side: Side }
  | { readonly kind: 'samePlayerTwice'; readonly playerId: string };

const SIDES: readonly Side[] = ['A', 'B'];

/**
 * Les problèmes d'une saisie de match, dans l'ordre du formulaire : chaque
 * rôle une fois du TOP au SUP, deux équipes distinctes, un joueur et un
 * champion à chaque place, un joueur une seule fois.
 */
export function matchEntryProblems(entry: MatchEntry): MatchEntryProblem[] {
  const problems: MatchEntryProblem[] = [];
  const roles = entry.lines.map((line) => line.role);
  if (roles.length !== ROLES.length || roles.some((role, i) => role !== ROLES[i])) {
    problems.push({ kind: 'roles' });
  }
  const [a, b] = entry.teams.map((team) => team.trim().toLowerCase());
  if (!a || !b || a === b) problems.push({ kind: 'teams' });

  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const { role, sides } of entry.lines) {
    sides.forEach(({ playerId, champion }, i) => {
      const side = SIDES[i] ?? 'A';
      if (playerId === '') problems.push({ kind: 'missingPlayer', role, side });
      else if (seen.has(playerId)) twice.add(playerId);
      else seen.add(playerId);
      if (champion.trim() === '') problems.push({ kind: 'missingChampion', role, side });
    });
  }
  for (const playerId of twice) problems.push({ kind: 'samePlayerTwice', playerId });
  return problems;
}
