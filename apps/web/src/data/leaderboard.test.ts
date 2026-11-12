import { describe, expect, it } from 'vitest';
import { initialsOf } from './leaderboard.ts';

describe('initialsOf', () => {
  it.each([
    ['Lanterne', 'LA'],
    ['Grand Largue', 'GL'],
    ['Shai-Hulud', 'SH'],
    ['écoute', 'ÉC'],
  ])('%s donne %s', (nickname, initials) => {
    expect(initialsOf(nickname)).toBe(initials);
  });
});
