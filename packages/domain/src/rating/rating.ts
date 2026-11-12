import type { Performance } from '../performance.ts';
import { explainRating } from './breakdown.ts';
import type { Tier } from './tier.ts';

export { tierOf, type Tier } from './tier.ts';

/** Ce dont la note a besoin d'une performance. */
export type RatedPerformance = Pick<
  Performance,
  'role' | 'result' | 'kills' | 'deaths' | 'assists' | 'weight'
>;

export interface RatingResult {
  readonly rating: number;
  readonly impact: number;
  readonly consistency: number;
  readonly clutch: number;
  readonly tier: Tier;
}

/**
 * Note de carte d'un joueur à partir de ses performances de la saison active.
 * Spécification : docs/domain/rating-spec.md
 *
 * Le calcul vit dans `explainRating` : la note est le résultat de son
 * explication, pour qu'aucune formule n'existe deux fois.
 */
export function computeRating(performances: readonly RatedPerformance[]): RatingResult {
  return explainRating(performances).result;
}
