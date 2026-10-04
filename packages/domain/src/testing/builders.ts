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
