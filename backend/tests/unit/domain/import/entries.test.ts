import { describe, expect, it } from 'vitest';
import { plannedMatchEntries } from '#domain/import/entries.ts';
import type { PlannedMatch, PlannedPerformance } from '#domain/import/plan.ts';

const ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'] as const;

const performance = (
  playerId: string,
  team: string,
  role: PlannedPerformance['role'],
): PlannedPerformance => ({
  player: { kind: 'existing', playerId },
  team,
  role,
  champion: 'Ahri',
  result: team === 'ARK' ? 'win' : 'loss',
  kills: 4,
  deaths: 1,
  assists: 6,
  gold: 11000,
});

/** Un match ARK contre BLB, une ligne par rôle, A puis B, comme le rend `planImport`. */
const aMatch = (overrides: Partial<PlannedMatch> = {}): PlannedMatch => ({
  matchNumber: 1,
  winnerTeam: 'ARK',
  durationSeconds: 1800,
  performances: ROLES.flatMap((role, i) => [
    performance(`a${String(i)}`, 'ARK', role),
    performance(`b${String(i)}`, 'BLB', role),
  ]),
  ...overrides,
});

describe('plannedMatchEntries', () => {
  it('fait d’un match importé la feuille d’une saisie : équipes, vainqueur, une ligne par rôle', () => {
    const result = plannedMatchEntries([aMatch()]);

    if (!result.ok) throw new Error(result.errors.join());
    const [first] = result.entries;
    expect(first?.matchNumber).toBe(1);
    const entry = first?.entry;
    expect(entry).toMatchObject({ durationSeconds: 1800, winner: 'A', teams: ['ARK', 'BLB'] });
    expect(entry?.lines.map((l) => l.role)).toEqual(ROLES);
    expect(entry?.lines[2]).toEqual({
      role: 'MID',
      sides: [
        { playerId: 'a2', champion: 'Ahri', kills: 4, deaths: 1, assists: 6, gold: 11000 },
        { playerId: 'b2', champion: 'Ahri', kills: 4, deaths: 1, assists: 6, gold: 11000 },
      ],
    });
  });

  it('le vainqueur est le côté de l’équipe gagnante, sans tenir compte de la casse', () => {
    const result = plannedMatchEntries([aMatch({ winnerTeam: 'blb' })]);

    if (!result.ok) throw new Error(result.errors.join());
    expect(result.entries[0]?.entry.winner).toBe('B');
  });

  it('refuse un gagnant qui n’est aucune des deux équipes', () => {
    expect(plannedMatchEntries([aMatch({ matchNumber: 3, winnerTeam: 'NKR' })])).toEqual({
      ok: false,
      errors: ['Match 3 : le gagnant « NKR » n’est ni « ARK » ni « BLB ».'],
    });
  });

  it('refuse un match dont un côté change d’équipe d’une ligne à l’autre', () => {
    const match = aMatch();
    const performances = match.performances.map((p, i) => (i === 4 ? { ...p, team: 'NKR' } : p));

    expect(plannedMatchEntries([{ ...match, matchNumber: 2, performances }])).toEqual({
      ok: false,
      errors: ['Match 2 : le côté A change d’équipe d’une ligne à l’autre (ARK, NKR).'],
    });
  });

  it('un nouveau joueur, sans identifiant, ne devient pas une feuille', () => {
    const match = aMatch();
    const performances = match.performances.map((p, i) =>
      i === 0 ? { ...p, player: { kind: 'new', key: 'baited' } as const } : p,
    );

    expect(() => plannedMatchEntries([{ ...match, performances }])).toThrow('baited');
  });
});
