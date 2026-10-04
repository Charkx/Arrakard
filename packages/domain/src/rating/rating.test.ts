import { describe, expect, it } from 'vitest';
import { aPerformance, performances, performancesFrom } from '../testing/builders';
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

  describe('fiabilité : en dessous de 15 parties, les stats sont tirées vers la médiane du rôle', () => {
    it('exemple A de la spec : 5 parties en JGL à KDA 7,9 donnent une note Or, pas Élite', () => {
      const fiveGames = performancesFrom({
        role: 'JGL',
        games: 5,
        wins: 4,
        kills: 19,
        deaths: 8,
        assists: 44,
      });

      const result = computeRating(fiveGames);

      expect(result).toEqual({
        rating: 80,
        impact: 93,
        consistency: 68,
        clutch: 80,
        tier: 'gold',
      });
    });
  });

  describe('exemples réels de la spec (S3 Split 1, anonymisés)', () => {
    it.each([
      ['B — impact plafonné à 99', 'JGL', 24, 19, 165, 74, 219, [92, 99, 83, 93, 'elite']],
      ['C — médiane TOP à 2,5', 'TOP', 25, 18, 115, 61, 173, [90, 99, 77, 95, 'elite']],
      ['D — médiane SUP à 4,0', 'SUP', 20, 11, 29, 54, 305, [78, 93, 64, 78, 'silver']],
      ['E — peu de parties, KDA moyen', 'JGL', 5, 4, 23, 22, 56, [66, 64, 68, 66, 'bronze']],
      ['F — note ramenée au plancher de 60', 'JGL', 3, 1, 17, 29, 24, [60, 54, 57, 56, 'bronze']],
    ] as const)(
      'joueur %s',
      (
        _label,
        role,
        games,
        wins,
        kills,
        deaths,
        assists,
        [rating, impact, consistency, clutch, tier],
      ) => {
        const playerPerformances = performancesFrom({ role, games, wins, kills, deaths, assists });

        const result = computeRating(playerPerformances);

        expect(result).toEqual({ rating, impact, consistency, clutch, tier });
      },
    );
  });

  describe('rôle dominant : la médiane de référence est celle du rôle le plus joué', () => {
    it('2 MID puis 4 SUP : jugé comme SUP', () => {
      const mostlySupport = [
        ...performances(2, { role: 'MID', result: 'win' }),
        ...performances(3, { role: 'SUP', result: 'win' }),
        aPerformance({ role: 'SUP', result: 'win', deaths: 5, assists: 20 }),
      ];

      const result = computeRating(mostlySupport);

      // KDA 4 = médiane SUP → impact 60 (avec la médiane MID, il serait de 68).
      expect(result.impact).toBe(60);
    });

    it.each([
      ['MID puis SUP', 'MID', 'SUP', 65],
      ['SUP puis MID', 'SUP', 'MID', 60],
    ] as const)(
      'égalité %s : le premier rôle rencontré l’emporte',
      (_label, first, second, impact) => {
        const tied = [
          aPerformance({ role: first, deaths: 4, assists: 16 }),
          aPerformance({ role: first }),
          ...performances(2, { role: second }),
        ];

        const result = computeRating(tied);

        expect(result.impact).toBe(impact);
      },
    );
  });
});
