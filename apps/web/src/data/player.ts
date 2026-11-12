import type { MatchResult, RecentForm, Role, Tier } from '@arrakis/domain';

/** Ce que le profil sait d'un joueur (vue `player_profile_view`). */
export interface PlayerProfile {
  readonly playerId: string;
  readonly nickname: string;
  readonly teamTag: string | null;
  readonly teamName: string | null;
  readonly seasonName: string | null;
  /** La note de la saison en cours ; null si le joueur n'y a pas encore joué. */
  readonly season: SeasonRatingView | null;
}

export interface SeasonRatingView {
  readonly role: Role;
  readonly rating: number;
  readonly impact: number;
  readonly consistency: number;
  readonly clutch: number;
  readonly tier: Tier;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  readonly winrate: number;
  readonly kda: number;
  readonly recentForm: RecentForm;
  readonly previousRating: number | null;
  readonly editionsPlayed: number;
  /** Les champions les plus joués de la saison, trois au plus. */
  readonly topChampions: readonly string[];
}

/** Un match du joueur (vue `player_matches_view`). */
export interface PlayedMatch {
  readonly matchId: string;
  readonly editionId: string;
  readonly editionName: string;
  /** Date ISO (AAAA-MM-JJ). */
  readonly editionDate: string;
  readonly matchNumber: number;
  readonly matchday: number | null;
  readonly role: Role;
  readonly champion: string;
  readonly result: MatchResult;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
}

export interface PlayerPageData {
  readonly profile: PlayerProfile;
  readonly matches: readonly PlayedMatch[];
}

/** Les matchs du plus récent au plus ancien : par date d'édition, puis par numéro de match. */
export function mostRecentFirst(matches: readonly PlayedMatch[]): PlayedMatch[] {
  return [...matches].sort(
    (a, b) =>
      b.editionDate.localeCompare(a.editionDate) ||
      b.editionId.localeCompare(a.editionId) ||
      b.matchNumber - a.matchNumber,
  );
}

/** Les matchs regroupés par édition, dans l'ordre où ils arrivent. */
export function byEdition(
  matches: readonly PlayedMatch[],
): { readonly editionId: string; readonly matches: readonly PlayedMatch[] }[] {
  const groups: { editionId: string; matches: PlayedMatch[] }[] = [];
  for (const match of matches) {
    const last = groups.at(-1);
    if (last?.editionId === match.editionId) last.matches.push(match);
    else groups.push({ editionId: match.editionId, matches: [match] });
  }
  return groups;
}
