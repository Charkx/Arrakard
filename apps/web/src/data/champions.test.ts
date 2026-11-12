import { describe, expect, it } from 'vitest';
import { championImageId } from './champions.ts';

describe('championImageId', () => {
  it.each([
    ['Ornn', 'Ornn'],
    ["Kai'Sa", 'Kaisa'],
    ['Lee Sin', 'LeeSin'],
    ['Wukong', 'MonkeyKing'],
    ['Dr. Mundo', 'DrMundo'],
    ['Twisted Fate', 'TwistedFate'],
    ['ahri', 'Ahri'],
  ])('%s → %s', (name, id) => {
    expect(championImageId(name)).toBe(id);
  });
});
