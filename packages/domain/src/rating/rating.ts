/** Palier de carte (glossaire). */
export type Tier = 'bronze' | 'silver' | 'gold' | 'elite';

export interface RatingResult {
  readonly rating: number;
  readonly impact: number;
  readonly consistency: number;
  readonly clutch: number;
  readonly tier: Tier;
}

/**
 * Note de carte d'un joueur à partir de ses performances du split actif.
 * Spécification : docs/domain/rating-spec.md
 *
 * `never[]` : aucun test n'a encore exigé de décrire une performance.
 * Le type `Performance` naîtra du premier test qui en a besoin.
 */
export function computeRating(_performances: readonly never[]): RatingResult {
  return { rating: 60, impact: 60, consistency: 60, clutch: 60, tier: 'bronze' };
}
