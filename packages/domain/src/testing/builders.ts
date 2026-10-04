/**
 * Fabriques de données de test. Chaque test ne précise que ce qui compte
 * pour lui ; le reste prend une valeur par défaut neutre.
 */
import type { RatedPerformance } from '../rating/rating';

export function aPerformance(overrides: Partial<RatedPerformance> = {}): RatedPerformance {
  return {
    role: 'MID',
    result: 'win',
    kills: 0,
    deaths: 0,
    assists: 0,
    weight: 1,
    ...overrides,
  };
}

/** `count` performances identiques. */
export function performances(
  count: number,
  overrides: Partial<RatedPerformance> = {},
): RatedPerformance[] {
  return Array.from({ length: count }, () => aPerformance(overrides));
}

/**
 * Performances reconstituées à partir de totaux (exemples de la spec).
 * Les `wins` premières sont des victoires ; tous les K/D/A sont portés par
 * la première performance. Sans effet sur la note, qui travaille sur les
 * totaux.
 */
export function performancesFrom(totals: {
  role: RatedPerformance['role'];
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
}): RatedPerformance[] {
  return Array.from({ length: totals.games }, (_, i) =>
    aPerformance({
      role: totals.role,
      result: i < totals.wins ? 'win' : 'loss',
      kills: i === 0 ? totals.kills : 0,
      deaths: i === 0 ? totals.deaths : 0,
      assists: i === 0 ? totals.assists : 0,
    }),
  );
}
