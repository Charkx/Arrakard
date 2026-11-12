import type { EditionType, MatchResult, Role } from '@arrakis/domain';

/** L'en-tête d'une édition (vue `edition_page_view`). */
export interface EditionHeader {
  readonly editionId: string;
  readonly name: string;
  readonly type: EditionType;
  /** Date ISO (AAAA-MM-JJ). */
  readonly date: string;
  readonly seasonName: string | null;
  readonly location: string | null;
  readonly description: string | null;
  readonly eventMvp: string | null;
}

/** Une ligne du classement de soirée (vue `edition_standings_view`), calculée par la base. */
export interface StandingRow {
  readonly playerId: string;
  readonly nickname: string;
  readonly rank: number;
  readonly team: string;
  readonly role: Role;
  readonly champion: string;
  readonly wins: number;
  readonly losses: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly isEventMvp: boolean;
  readonly resultPoints: number;
  readonly statPoints: number;
  readonly mvpPoints: number;
  readonly points: number;
}

/** Un joueur dans un match (une ligne de la vue `edition_matches_view`). */
export interface MatchPlayerRow {
  readonly matchId: string;
  readonly matchNumber: number;
  readonly matchday: number | null;
  readonly isFinal: boolean;
  readonly durationSeconds: number;
  readonly winnerTeam: string;
  readonly mvp: string | null;
  readonly line: number;
  readonly side: 'A' | 'B';
  readonly playerId: string;
  readonly nickname: string;
  readonly team: string;
  readonly role: Role;
  readonly champion: string;
  readonly result: MatchResult;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
}

export type MatchPlayer = Pick<
  MatchPlayerRow,
  'playerId' | 'nickname' | 'champion' | 'result' | 'kills' | 'deaths' | 'assists'
>;

/** Un match : ses deux équipes et ses lignes de rôle, de TOP à SUP. */
export interface EditionMatch {
  readonly matchId: string;
  readonly matchNumber: number;
  readonly matchday: number | null;
  readonly isFinal: boolean;
  readonly durationSeconds: number;
  readonly winnerTeam: string;
  readonly mvp: string | null;
  readonly teamA: string;
  readonly teamB: string;
  readonly lines: readonly {
    readonly role: Role;
    readonly a: MatchPlayer | null;
    readonly b: MatchPlayer | null;
  }[];
}

export interface EditionPageData {
  readonly edition: EditionHeader;
  readonly standings: readonly StandingRow[];
  readonly matches: readonly EditionMatch[];
  readonly participants: readonly { readonly playerId: string; readonly nickname: string }[];
}

/** Rassemble les lignes de la vue en matchs, dans l'ordre des numéros, chaque ligne de rôle dans l'ordre. */
export function toMatches(rows: readonly MatchPlayerRow[]): EditionMatch[] {
  return [...Map.groupBy(rows, (r) => r.matchId).values()]
    .map((players): EditionMatch => {
      const [first] = players as [MatchPlayerRow, ...MatchPlayerRow[]];
      const byLine = Map.groupBy(players, (p) => p.line);
      const lines = [...byLine.keys()]
        .sort((x, y) => x - y)
        .map((line) => {
          const pair = byLine.get(line) ?? [];
          const a = pair.find((p) => p.side === 'A') ?? null;
          const b = pair.find((p) => p.side === 'B') ?? null;
          // Une ligne de rôle a au moins un joueur : celui qui donne son rôle.
          const [someone = first] = pair;
          return { role: someone.role, a: a && player(a), b: b && player(b) };
        });
      return {
        matchId: first.matchId,
        matchNumber: first.matchNumber,
        matchday: first.matchday,
        isFinal: first.isFinal,
        durationSeconds: first.durationSeconds,
        winnerTeam: first.winnerTeam,
        mvp: first.mvp,
        teamA: players.find((p) => p.side === 'A')?.team ?? '',
        teamB: players.find((p) => p.side === 'B')?.team ?? '',
        lines,
      };
    })
    .sort((x, y) => x.matchNumber - y.matchNumber);
}

function player(row: MatchPlayerRow): MatchPlayer {
  const { playerId, nickname, champion, result, kills, deaths, assists } = row;
  return { playerId, nickname, champion, result, kills, deaths, assists };
}

/** Les matchs d'une ligue, groupés par journée dans l'ordre ; null pour les matchs sans journée. */
export function byMatchday(
  matches: readonly EditionMatch[],
): { readonly matchday: number | null; readonly matches: readonly EditionMatch[] }[] {
  return [...Map.groupBy(matches, (m) => m.matchday)]
    .sort(([x], [y]) => (x ?? Infinity) - (y ?? Infinity))
    .map(([matchday, grouped]) => ({ matchday, matches: grouped }));
}

/** Durée d'un match, comme dans les feuilles de résultats : 31:05. */
export function formatDuration(seconds: number): string {
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`;
}
