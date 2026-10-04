import type { Role } from '../performance';

export type Division = 'div1' | 'div2';
export type LeaderboardSort = 'rating' | 'kda' | 'winrate' | 'games';

/** Un joueur tel que le classement le voit : ses valeurs du split, déjà calculées. */
export interface LeaderboardPlayer {
  readonly playerId: string;
  readonly nickname: string;
  readonly role: Role;
  /** Divisions de son équipe actuelle ([] = sans équipe de ligue). */
  readonly divisions: readonly Division[];
  readonly rating: number;
  readonly winrate: number;
  readonly kda: number;
  readonly games: number;
  readonly archived: boolean;
}

export interface LeaderboardOptions {
  readonly sort?: LeaderboardSort;
}

export interface LeaderboardRow {
  readonly playerId: string;
  readonly rank: number;
}

type Criterion = (a: LeaderboardPlayer, b: LeaderboardPlayer) => number;

const descending =
  (value: (p: LeaderboardPlayer) => number): Criterion =>
  (a, b) =>
    value(b) - value(a);

const byRating = descending((p) => p.rating);
const byWinrate = descending((p) => p.winrate);
const byKda = descending((p) => p.kda);
const byGames = descending((p) => p.games);

const collator = new Intl.Collator('fr', { sensitivity: 'base' });
const byNickname: Criterion = (a, b) => collator.compare(a.nickname, b.nickname);

/** Critère principal, puis cascade de départage déterministe. */
const CASCADES: Record<LeaderboardSort, readonly Criterion[]> = {
  rating: [byRating, byWinrate, byKda, byGames, byNickname],
  kda: [byKda, byRating, byWinrate, byGames, byNickname],
  winrate: [byWinrate, byRating, byKda, byGames, byNickname],
  games: [byGames, byRating, byWinrate, byKda, byNickname],
};

/** Classement du split : tri par critère, départage en cascade, rangs à partir de 1. */
export function rankLeaderboard(
  players: readonly LeaderboardPlayer[],
  { sort = 'rating' }: LeaderboardOptions = {},
): LeaderboardRow[] {
  const cascade = CASCADES[sort];
  const compare: Criterion = (a, b) => {
    for (const criterion of cascade) {
      const order = criterion(a, b);
      if (order !== 0) return order;
    }
    return 0;
  };

  return [...players]
    .sort(compare)
    .map((player, index) => ({ playerId: player.playerId, rank: index + 1 }));
}
