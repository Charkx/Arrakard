import { computeRating, type RatedPerformance, type RatingResult } from './rating.ts';

/** Explication de note (glossaire) : la note, et le détail du calcul qui y mène. */
export interface RatingBreakdown {
  readonly result: RatingResult;
  readonly games: number;
  /** Les étapes du calcul ; `null` pour un joueur sans partie, qui n'en a aucune. */
  readonly steps: null;
}

export function explainRating(performances: readonly RatedPerformance[]): RatingBreakdown {
  return {
    result: computeRating(performances),
    games: performances.length,
    steps: null,
  };
}
