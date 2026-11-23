import type { MatchFact, PerformanceFact } from '../facts.ts';
import { ROLES, type Role } from '../performance.ts';

/** Le côté d'un match : A, puis B. */
export type Side = PerformanceFact['side'];

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
export interface RoleLine {
  readonly role: Role;
  readonly sides: readonly [EntrySide, EntrySide];
}

/** Un match saisi à la main (cas d'usage A14), du TOP au SUP. */
export interface MatchEntry {
  readonly durationSeconds: number;
  readonly winner: Side;
  /** Le nom de l'équipe du côté A, puis du côté B. */
  readonly teams: readonly [string, string];
  readonly lines: readonly RoleLine[];
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
  const seenTwice = new Set<string>();
  for (const { role, sides } of entry.lines) {
    sides.forEach(({ playerId, champion }, i) => {
      const side: Side = i === 0 ? 'A' : 'B';
      if (playerId === '') problems.push({ kind: 'missingPlayer', role, side });
      else if (seen.has(playerId)) seenTwice.add(playerId);
      else seen.add(playerId);
      if (champion.trim() === '') problems.push({ kind: 'missingChampion', role, side });
    });
  }
  for (const playerId of seenTwice) problems.push({ kind: 'samePlayerTwice', playerId });
  return problems;
}

/**
 * Les faits d'une feuille saisie (ADR 0037) : le match, dont l'équipe gagnante
 * est celle du côté vainqueur, et ses dix performances, ligne par ligne du TOP
 * au SUP, A puis B.
 */
export function matchEntryFacts(
  entry: MatchEntry,
  { matchId, editionId, matchNumber }: { matchId: string; editionId: string; matchNumber: number },
): { readonly match: MatchFact; readonly performances: readonly PerformanceFact[] } {
  const teamOf = (side: Side) => (side === 'A' ? entry.teams[0] : entry.teams[1]);
  return {
    match: {
      id: matchId,
      editionId,
      matchNumber,
      winnerTeam: teamOf(entry.winner),
      durationSeconds: entry.durationSeconds,
    },
    performances: entry.lines.flatMap(({ role, sides }, line) =>
      SIDES.map((side, i) => {
        const { playerId, champion, kills, deaths, assists, gold } = sides[i] ?? sides[0];
        return {
          matchId,
          line,
          side,
          playerId,
          team: teamOf(side),
          role,
          champion,
          result: side === entry.winner ? 'win' : 'loss',
          kills,
          deaths,
          assists,
          gold,
        };
      }),
    ),
  };
}
