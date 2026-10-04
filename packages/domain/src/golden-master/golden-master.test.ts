/**
 * Golden master (ADR 0006) : le moteur v2 doit reproduire EXACTEMENT les
 * notes et statistiques calculées par le code v1, sur les vraies données
 * (anonymisées). Régénérer : `pnpm golden-master:extract` (voir l'outil).
 */
import { describe, expect, it } from 'vitest';
import type { Performance } from '../performance.ts';
import { computeRating } from '../rating/rating.ts';
import { computePlayerStats } from '../stats/stats.ts';
import fixture from './v1.json' with { type: 'json' };

interface GoldenMaster {
  splits: {
    split: string;
    performances: (Performance & { player: string })[];
    expected: Record<string, { rating: unknown; stats: unknown }>;
  }[];
}

const goldenMaster = fixture as unknown as GoldenMaster;

describe('golden master v1', () => {
  it.each(goldenMaster.splits.map((s) => [s.split, s] as const))(
    '%s : chaque joueur a la même note et les mêmes statistiques qu’en v1',
    (_split, { performances, expected }) => {
      const byPlayer = Map.groupBy(performances, (p) => p.player);

      const mismatches = [...byPlayer].flatMap(([player, playerPerformances]) => {
        const actual = {
          rating: computeRating(playerPerformances),
          stats: computePlayerStats(playerPerformances),
        };
        return JSON.stringify(actual) === JSON.stringify(expected[player])
          ? []
          : [{ player, expected: expected[player], actual }];
      });

      expect(byPlayer.size).toBe(Object.keys(expected).length);
      expect(mismatches).toEqual([]);
    },
  );
});
