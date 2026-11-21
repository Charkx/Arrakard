import { describe, expect, it } from 'vitest';
import { aPerformance, performances } from '../testing/builders.ts';
import { computePlayerStats } from './stats.ts';

describe('computePlayerStats', () => {
  it('un joueur sans partie a des statistiques nulles et une forme stable', () => {
    const noPerformance = [] as const;

    const stats = computePlayerStats(noPerformance);

    expect(stats).toEqual({
      games: 0,
      wins: 0,
      losses: 0,
      winrate: 0,
      kda: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      avgGold: 0,
      avgGpm: 0,
      recentForm: 'stable',
    });
  });

  it('les statistiques affichées ne sont pas pondérées par le prestige', () => {
    const mixedPrestige = [
      aPerformance({ result: 'win', kills: 4, deaths: 2, assists: 6, weight: 1.6 }),
      aPerformance({ result: 'win', kills: 2, deaths: 1, assists: 3, weight: 1 }),
      aPerformance({ result: 'loss', kills: 0, deaths: 3, assists: 1, weight: 1 }),
    ];

    const stats = computePlayerStats(mixedPrestige);

    expect(stats).toMatchObject({
      games: 3,
      wins: 2,
      losses: 1,
      winrate: 67,
      kills: 6,
      deaths: 6,
      assists: 10,
      kda: 2.67,
    });
  });

  it('le KDA affiché est calculé sur les totaux, arrondi au centième et sans plafond', () => {
    const stomp = [aPerformance({ kills: 150, deaths: 0, assists: 1 })];

    const stats = computePlayerStats(stomp);

    expect(stats.kda).toBe(151);
  });

  it("l'or et l'or par minute sont des moyennes arrondies", () => {
    const games = [
      aPerformance({ gold: 10_000, gpm: 350 }),
      aPerformance({ gold: 11_001, gpm: 401 }),
    ];

    const stats = computePlayerStats(games);

    expect(stats).toMatchObject({ avgGold: 10_501, avgGpm: 376 });
  });

  describe('forme récente : sur les 3 dernières performances', () => {
    it.each([
      ['2 victoires sur 3', ['loss', 'loss', 'win', 'loss', 'win'], 'up'],
      ['3 victoires sur 3', ['loss', 'win', 'win', 'win'], 'up'],
      ['1 victoire sur 3', ['win', 'win', 'win', 'loss', 'loss'], 'stable'],
      ['aucune victoire', ['win', 'loss', 'loss', 'loss'], 'down'],
      ['une seule partie, gagnée', ['win'], 'stable'],
    ] as const)('%s → %s', (_label, results, form) => {
      const history = results.map((result) => aPerformance({ result }));

      const stats = computePlayerStats(history);

      expect(stats.recentForm).toBe(form);
    });
  });

  it('les performances sont prises dans l’ordre fourni (anomalie A5)', () => {
    const history = [...performances(3, { result: 'loss' }), ...performances(3, { result: 'win' })];

    const stats = computePlayerStats(history);

    expect(stats.recentForm).toBe('up');
  });
});
