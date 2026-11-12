import { describe, expect, it } from 'vitest';
import { performancesFrom } from '../testing/builders.ts';
import { explainRating } from './breakdown.ts';

/** Exemple A de la spec : 5 parties en JGL, 4 victoires, 19 / 8 / 44. */
const exampleA = performancesFrom({
  role: 'JGL',
  games: 5,
  wins: 4,
  kills: 19,
  deaths: 8,
  assists: 44,
});

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

  it('redonne la note et les sous-notes du moteur (exemple A de la spec)', () => {
    const breakdown = explainRating(exampleA);

    expect(breakdown.result).toEqual({
      rating: 80,
      impact: 93,
      consistency: 68,
      clutch: 80,
      tier: 'gold',
    });
    expect(breakdown.games).toBe(5);
  });
});
