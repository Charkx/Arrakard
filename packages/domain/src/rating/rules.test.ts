import { describe, expect, it } from 'vitest';
import type { EditionFact } from '../projection/facts';
import { E1_E2_RATING_RULES, TYPE_MULTIPLIER, V1_RATING_RULES } from './rules';

const anEdition = (overrides: Partial<EditionFact> = {}): EditionFact => ({
  id: 'e',
  type: 'league_div1',
  date: '2026-01-01',
  splitId: 's',
  prestige: 'normal',
  ...overrides,
});

describe('V1_RATING_RULES', () => {
  it.each([
    ['normal', 1],
    ['premium', 1.3],
    ['championship', 1.6],
  ] as const)('le prestige %s saisi sur l’édition vaut ×%d', (prestige, weight) => {
    expect(V1_RATING_RULES.weightOf(anEdition({ prestige }))).toBe(weight);
  });

  it('toutes les éditions comptent, In House compris', () => {
    expect(V1_RATING_RULES.countsTowardRating(anEdition({ type: 'inhouse' }))).toBe(true);
  });
});

describe('E1_E2_RATING_RULES (ADR 0007)', () => {
  it('E1 : le multiplicateur découle du type, pas du prestige saisi', () => {
    const div2 = anEdition({ type: 'league_div2', prestige: 'championship' });

    expect(E1_E2_RATING_RULES.weightOf(div2)).toBe(TYPE_MULTIPLIER.league_div2);
  });

  it('E1 : une exception justifiée remplace le multiplicateur du type', () => {
    const exception = anEdition({
      weightOverride: { multiplier: 2, reason: 'Finale exceptionnelle' },
    });

    expect(E1_E2_RATING_RULES.weightOf(exception)).toBe(2);
  });

  it('E2 : les In House ne comptent pas dans la note', () => {
    expect(E1_E2_RATING_RULES.countsTowardRating(anEdition({ type: 'inhouse' }))).toBe(false);
    expect(E1_E2_RATING_RULES.countsTowardRating(anEdition({ type: 'league_div2' }))).toBe(true);
  });
});
