import { describe, expect, it } from 'vitest';
import { performances } from '../testing/builders';
import { computeRating } from './rating';

describe('computeRating', () => {
  it('un joueur sans partie a une note de 60, des sous-notes à 60 et le palier Bronze', () => {
    const noPerformance = [] as const;

    const result = computeRating(noPerformance);

    expect(result).toEqual({
      rating: 60,
      impact: 60,
      consistency: 60,
      clutch: 60,
      tier: 'bronze',
    });
  });

  it('15 victoires en MID avec un KDA de 3 donnent 60 / 99 / 80, une note de 80 et le palier Or', () => {
    const fifteenWins = performances(15, {
      role: 'MID',
      result: 'win',
      kills: 1,
      deaths: 1,
      assists: 2,
    });

    const result = computeRating(fifteenWins);

    expect(result).toEqual({
      rating: 80,
      impact: 60,
      consistency: 99,
      clutch: 80,
      tier: 'gold',
    });
  });
});
