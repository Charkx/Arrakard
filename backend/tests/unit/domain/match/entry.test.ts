import { describe, expect, it } from 'vitest';
import { matchEntryProblems, type MatchEntry } from '#domain/match/entry.ts';

const side = (playerId: string, champion = 'Ahri') => ({
  playerId,
  champion,
  kills: 1,
  deaths: 1,
  assists: 1,
  gold: 10000,
});

/** Un match complet : A1…A5 contre B1…B5, du TOP au SUP. */
function aMatch(): MatchEntry {
  return {
    durationSeconds: 1930,
    winner: 'A',
    teams: ['Noxus', 'Ionia'],
    lines: (['TOP', 'JGL', 'MID', 'ADC', 'SUP'] as const).map((role, i) => ({
      role,
      sides: [side(`a${String(i)}`), side(`b${String(i)}`)],
    })),
  };
}

describe('matchEntryProblems', () => {
  it('ne trouve rien à redire à un match complet', () => {
    expect(matchEntryProblems(aMatch())).toEqual([]);
  });

  it('signale un joueur saisi deux fois, une seule fois', () => {
    const entry = aMatch();
    const lines = entry.lines.map((line, i) =>
      i === 1 ? { ...line, sides: [side('a0'), side('a0')] as const } : line,
    );

    expect(matchEntryProblems({ ...entry, lines })).toEqual([
      { kind: 'samePlayerTwice', playerId: 'a0' },
    ]);
  });

  it('signale une place sans joueur ou sans champion', () => {
    const entry = aMatch();
    const lines = entry.lines.map((line, i) =>
      i === 2 ? { ...line, sides: [side(''), side('b2', ' ')] as const } : line,
    );

    expect(matchEntryProblems({ ...entry, lines })).toEqual([
      { kind: 'missingPlayer', role: 'MID', side: 'A' },
      { kind: 'missingChampion', role: 'MID', side: 'B' },
    ]);
  });

  it('demande chaque rôle une fois, du TOP au SUP', () => {
    const entry = aMatch();
    const lines = entry.lines.map((line, i) =>
      i === 4 ? { ...line, role: 'TOP' as const } : line,
    );

    expect(matchEntryProblems({ ...entry, lines })).toEqual([{ kind: 'roles' }]);
  });

  it('demande deux noms d’équipe différents, et non vides', () => {
    expect(matchEntryProblems({ ...aMatch(), teams: ['Noxus', ' noxus '] })).toEqual([
      { kind: 'teams' },
    ]);
    expect(matchEntryProblems({ ...aMatch(), teams: ['', 'Ionia'] })).toEqual([{ kind: 'teams' }]);
  });
});
