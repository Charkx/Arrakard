import type { LeaderboardPlayer, RecentForm, Tier } from '@arrakis/backend/domain';

/**
 * Un joueur du classement, tel que la base le donne (vue `leaderboard_view`).
 * Le navigateur ne recalcule aucune note : il les range et les affiche.
 */
export interface LeaderboardEntry extends LeaderboardPlayer {
  readonly teamTag: string | null;
  readonly tier: Tier;
  readonly impact: number;
  readonly consistency: number;
  readonly clutch: number;
  readonly recentForm: RecentForm;
  readonly editionsPlayed: number;
}

export interface LeaderboardData {
  /** Nom de la saison en cours ; null s'il n'y en a pas. */
  readonly seasonName: string | null;
  readonly entries: readonly LeaderboardEntry[];
}

/** Ce que la note a gagné (ou perdu) à la dernière édition ; 0 si le joueur la découvrait. */
export function ratingDelta(entry: LeaderboardEntry): number {
  return entry.previousRating === undefined ? 0 : entry.rating - entry.previousRating;
}
