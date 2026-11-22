import { describe, expect, it } from 'vitest';
import { initialsOf } from '#src/shared/initials.ts';

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
