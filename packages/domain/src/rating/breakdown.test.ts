import { describe, expect, it } from 'vitest';
import { explainRating } from './breakdown.ts';

describe('explainRating', () => {
  it('un joueur sans partie a une explication vide : note 60, aucune étape de calcul', () => {
    const noPerformance = [] as const;

    const breakdown = explainRating(noPerformance);

    expect(breakdown.result).toEqual({
      rating: 60,
      impact: 60,
      consistency: 60,
      clutch: 60,
      tier: 'bronze',
    });
    expect(breakdown.games).toBe(0);
    expect(breakdown.steps).toBeNull();
  });
});
