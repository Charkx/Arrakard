import { describe, expect, it } from 'vitest';
import { computeRating } from './rating';

describe('computeRating', () => {
  it('un joueur sans partie a une note de 60, des sous-notes à 60 et le palier Bronze', () => {
    const performances = [] as const;

    const result = computeRating(performances);

    expect(result).toEqual({
      rating: 60,
      impact: 60,
      consistency: 60,
      clutch: 60,
      tier: 'bronze',
    });
  });
});
