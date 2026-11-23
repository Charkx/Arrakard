import { describe, expect, it } from 'vitest';
import { blankMatch, parseClock } from '#src/features/admin/match-entry.ts';

describe('parseClock', () => {
  it('lit des minutes et des secondes', () => {
    expect(parseClock(' 32:10 ')).toBe(1930);
  });

  it.each(['32', '32:7', '32:60', '0:00', 'abc', ''])('refuse « %s »', (text) => {
    expect(parseClock(text)).toBeNull();
  });
});

describe('blankMatch', () => {
  it('a cinq lignes vides, du TOP au SUP', () => {
    const match = blankMatch();

    expect(match.lines.map((l) => l.role)).toEqual(['TOP', 'JGL', 'MID', 'ADC', 'SUP']);
    expect(match.lines[0]?.sides[1].playerId).toBe('');
  });
});
