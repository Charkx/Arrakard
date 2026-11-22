import type { EditionPageData } from '../features/edition/edition.ts';
import type { LeaderboardData } from '../features/leaderboard/leaderboard.ts';
import type { MergedPlayer, PlayerPageData } from '../features/player/player.ts';

/** Ce que les pages lisent. Le site lit la base ; les tests, des données en mémoire. */
export interface DataSource {
  loadLeaderboard(): Promise<LeaderboardData>;
  /** Le profil et les matchs d'un joueur, le joueur qui l'a absorbé, ou null s'il n'existe pas. */
  loadPlayer(playerId: string): Promise<PlayerPageData | MergedPlayer | null>;
  /** Une édition : son en-tête, son classement de soirée, ses matchs ; null si elle n'existe pas. */
  loadEdition(editionId: string): Promise<EditionPageData | null>;
}
