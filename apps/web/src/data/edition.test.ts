import { describe, expect, it } from 'vitest';
import { byMatchday, formatDuration, toMatches, type MatchPlayerRow } from './edition.ts';

function aRow(overrides: Partial<MatchPlayerRow> = {}): MatchPlayerRow {
  return {
    matchId: 'm1',
    matchNumber: 1,
    matchday: null,
    isFinal: false,
    durationSeconds: 1865,
    winnerTeam: 'PHA',
    mvp: null,
    line: 0,
    side: 'A',
    playerId: 'p1',
    nickname: 'Lanterne',
    team: 'PHA',
    role: 'TOP',
    champion: 'Ornn',
    result: 'win',
    kills: 2,
    deaths: 1,
    assists: 8,
    ...overrides,
  };
}

describe('toMatches', () => {
  it('rassemble les joueurs d’un match face à face, ligne de rôle par ligne de rôle', () => {
    const rows = [
      aRow({ line: 1, side: 'B', role: 'JGL', nickname: 'Corvus', team: 'MAR', playerId: 'p4' }),
      aRow({
        line: 0,
        side: 'B',
        role: 'TOP',
        nickname: 'Gouvernail',
        team: 'MAR',
        playerId: 'p3',
      }),
      aRow({ line: 1, side: 'A', role: 'JGL', nickname: 'Boussole', playerId: 'p2' }),
      aRow({ line: 0, side: 'A', role: 'TOP', nickname: 'Lanterne', playerId: 'p1' }),
    ];

    const [match] = toMatches(rows);

    expect(match).toMatchObject({ teamA: 'PHA', teamB: 'MAR', winnerTeam: 'PHA' });
    expect(match?.lines.map((l) => [l.role, l.a?.nickname, l.b?.nickname])).toEqual([
      ['TOP', 'Lanterne', 'Gouvernail'],
      ['JGL', 'Boussole', 'Corvus'],
    ]);
  });

  it('range les matchs par numéro', () => {
    const rows = [
      aRow({ matchId: 'm3', matchNumber: 3 }),
      aRow({ matchId: 'm1', matchNumber: 1 }),
      aRow({ matchId: 'm2', matchNumber: 2 }),
    ];

    expect(toMatches(rows).map((m) => m.matchNumber)).toEqual([1, 2, 3]);
  });
});

describe('byMatchday', () => {
  it('groupe les matchs d’une ligue par journée, dans l’ordre', () => {
    const matches = toMatches([
      aRow({ matchId: 'm1', matchNumber: 1, matchday: 2 }),
      aRow({ matchId: 'm2', matchNumber: 2, matchday: 1 }),
      aRow({ matchId: 'm3', matchNumber: 3, matchday: 2 }),
    ]);

    const days = byMatchday(matches);

    expect(days.map((d) => [d.matchday, d.matches.map((m) => m.matchNumber)])).toEqual([
      [1, [2]],
      [2, [1, 3]],
    ]);
  });
});

describe('formatDuration', () => {
  it.each([
    [1865, '31:05'],
    [600, '10:00'],
  ])('%i secondes donnent %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});
