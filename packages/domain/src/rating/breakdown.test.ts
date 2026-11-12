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

  it('dit le rôle dominant et la médiane de rôle qui sert de référence', () => {
    const breakdown = explainRating(exampleA);

    expect(breakdown.steps?.role).toBe('JGL');
    expect(breakdown.steps?.roleBaseline).toEqual({ kda: 3, winrate: 0.5 });
  });

  describe('fiabilité', () => {
    it('à 15 parties, elle vaut 1 : les statistiques ne sont pas tirées vers la médiane', () => {
      const fifteenGames = performancesFrom({
        role: 'MID',
        games: 15,
        wins: 12,
        kills: 30,
        deaths: 10,
        assists: 30,
      });

      const breakdown = explainRating(fifteenGames);

      expect(breakdown.steps?.reliability).toBe(1);
      expect(breakdown.steps?.kda).toMatchObject({ weighted: 6, reliable: 6 });
      expect(breakdown.steps?.winrate).toMatchObject({ weighted: 0.8, reliable: 0.8 });
    });
  });

  describe('fiabilité sous 15 parties (exemple A de la spec)', () => {
    it('vaut le nombre de parties divisé par 15', () => {
      const breakdown = explainRating(exampleA);

      expect(breakdown.steps?.reliability).toBeCloseTo(5 / 15);
    });

    it('tire le KDA vers la médiane du rôle : 7,875 devient 4,625', () => {
      const breakdown = explainRating(exampleA);

      expect(breakdown.steps?.kda.weighted).toBeCloseTo(7.875);
      expect(breakdown.steps?.kda.reliable).toBeCloseTo(4.625);
    });

    it('tire le winrate vers la médiane du rôle : 80 % devient 60 %', () => {
      const breakdown = explainRating(exampleA);

      expect(breakdown.steps?.winrate.weighted).toBeCloseTo(0.8);
      expect(breakdown.steps?.winrate.reliable).toBeCloseTo(0.6);
    });
  });
});
