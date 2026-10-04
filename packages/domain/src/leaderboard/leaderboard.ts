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
  /** Note du split avant sa dernière édition ; absente si le joueur n'y avait pas joué. */
  readonly previousRating?: number;
}

export interface LeaderboardOptions {
  readonly sort?: LeaderboardSort;
  readonly role?: Role;
  readonly division?: Division;
}

/** En dessous, la note n'est pas assez significative pour figurer au classement. */
export const LEADERBOARD_MIN_GAMES = 5;

export interface LeaderboardRow {
  readonly playerId: string;
  readonly rank: number;
  /** Rang avant la dernière édition ; null si nouveau ou si le tri n'est pas la note. */
  readonly previousRank: number | null;
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

/**
 * Classement du split : joueurs éligibles, tri par critère, départage en
 * cascade, rangs à partir de 1.
 */
export function rankLeaderboard(
  players: readonly LeaderboardPlayer[],
  { sort = 'rating', role, division }: LeaderboardOptions = {},
): LeaderboardRow[] {
  const eligible = players.filter(
    (p) =>
      !p.archived &&
      p.games >= LEADERBOARD_MIN_GAMES &&
      (role === undefined || p.role === role) &&
      (division === undefined || p.divisions.includes(division)),
  );

  const cascade = CASCADES[sort];
  const compare: Criterion = (a, b) => {
    for (const criterion of cascade) {
      const order = criterion(a, b);
      if (order !== 0) return order;
    }
    return 0;
  };

  const previousRanks =
    sort === 'rating' ? rankByPreviousRating(eligible) : new Map<string, number>();

  return eligible.sort(compare).map((player, index) => ({
    playerId: player.playerId,
    rank: index + 1,
    previousRank: previousRanks.get(player.playerId) ?? null,
  }));
}

/** Ancien classement : joueurs ayant une note précédente, triés par celle-ci puis par pseudo. */
function rankByPreviousRating(players: readonly LeaderboardPlayer[]): Map<string, number> {
  const ranked = players
    .flatMap((p) => (p.previousRating === undefined ? [] : [{ p, previous: p.previousRating }]))
    .sort((a, b) => b.previous - a.previous || byNickname(a.p, b.p));
  return new Map(ranked.map(({ p }, index) => [p.playerId, index + 1]));
}
