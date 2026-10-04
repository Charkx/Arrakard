import { describe, expect, it } from 'vitest';
import { tierOf } from './rating.ts';

describe('tierOf', () => {
  it.each([
    [60, 'bronze'],
    [69, 'bronze'],
    [70, 'silver'],
    [79, 'silver'],
    [80, 'gold'],
    [89, 'gold'],
    [90, 'elite'],
    [99, 'elite'],
  ] as const)('une note de %i donne le palier %s', (rating, tier) => {
    expect(tierOf(rating)).toBe(tier);
  });
});
