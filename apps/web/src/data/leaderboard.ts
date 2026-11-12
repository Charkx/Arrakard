import type { LeaderboardPlayer, RecentForm, Tier } from '@arrakis/domain';
import type { EditionPageData } from './edition.ts';
import type { MergedPlayer, PlayerPageData } from './player.ts';

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

/** Ce que les pages lisent. Le site lit la base ; les tests, des données en mémoire. */
export interface DataSource {
  loadLeaderboard(): Promise<LeaderboardData>;
  /** Le profil et les matchs d'un joueur, le joueur qui l'a absorbé, ou null s'il n'existe pas. */
  loadPlayer(playerId: string): Promise<PlayerPageData | MergedPlayer | null>;
  /** Une édition : son en-tête, son classement de soirée, ses matchs ; null si elle n'existe pas. */
  loadEdition(editionId: string): Promise<EditionPageData | null>;
}

/** Ce que la note a gagné (ou perdu) à la dernière édition ; 0 si le joueur la découvrait. */
export function ratingDelta(entry: LeaderboardEntry): number {
  return entry.previousRating === undefined ? 0 : entry.rating - entry.previousRating;
}

/** Deux lettres pour l'avatar : les initiales de deux mots, sinon les deux premières lettres. */
export function initialsOf(nickname: string): string {
  const words = nickname.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const letters =
    words.length >= 2 ? `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}` : nickname.slice(0, 2);
  return letters.toUpperCase();
}
