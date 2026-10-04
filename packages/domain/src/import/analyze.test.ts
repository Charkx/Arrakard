import { describe, expect, it } from 'vitest';
import { analyzeImport, type ImportPlayer } from './analyze';
import type { SheetMatch, SheetSide, StatsSheet } from './stats-sheet';

const side = (team: string, rawName: string): SheetSide => ({
  team,
  result: 'win',
  rawName,
  champion: 'Ahri',
  kills: 0,
  deaths: 0,
  assists: 0,
  gold: 0,
});

/** Un match dont chaque paire [équipe A, nom A, équipe B, nom B] forme une ligne. */
const aMatch = (matchNumber: number, pairs: [string, string, string, string][]): SheetMatch => ({
  matchNumber,
  winnerTeam: 'ARK',
  durationSeconds: 1800,
  lines: pairs.map(([teamA, nameA, teamB, nameB]) => ({
    role: 'MID',
    sides: [side(teamA, nameA), side(teamB, nameB)],
  })),
});

const sheet = (...matches: SheetMatch[]): StatsSheet => ({ matches, warnings: [] });

const aPlayer = (overrides: Partial<ImportPlayer> & { playerId: string }): ImportPlayer => ({
  aliases: [overrides.playerId],
  teamTag: null,
  archived: false,
  status: 'starter',
  ...overrides,
});

describe('analyzeImport', () => {
  const players = [
    aPlayer({ playerId: 'meta', aliases: ['meta'], teamTag: 'ARK' }),
    aPlayer({ playerId: 'zed', aliases: ['zed'], teamTag: 'BLB' }),
  ];
  const context = { players, knownTeamTags: ['ARK', 'BLB'], teamsAreRosters: true };

  it('rattache chaque nom au joueur connu, tag d’équipe retiré', () => {
    const analysis = analyzeImport(
      sheet(aMatch(1, [['ARK', 'ARK Meta', 'BLB', 'BLB Zed']])),
      context,
    );

    expect(analysis.names).toEqual([
      {
        nickname: 'Meta',
        teamTag: 'ARK',
        appearances: 1,
        resolution: { kind: 'matched', playerId: 'meta' },
      },
      {
        nickname: 'Zed',
        teamTag: 'BLB',
        appearances: 1,
        resolution: { kind: 'matched', playerId: 'zed' },
      },
    ]);
    expect(analysis.unknownTeams).toEqual([]);
    expect(analysis.transfers).toEqual([]);
  });

  it('regroupe les graphies d’un même pseudo et retient l’équipe la plus fréquente', () => {
    const analysis = analyzeImport(
      sheet(
        aMatch(1, [['ARK', 'ARK Méta', 'BLB', 'BLB Zed']]),
        aMatch(2, [['ARK', 'meta', 'BLB', 'BLB Zed']]),
        aMatch(3, [['BLB', 'BLB Meta', 'ARK', 'ARK Zed']]),
      ),
      context,
    );

    expect(analysis.names.find((n) => n.nickname === 'Méta')).toMatchObject({
      teamTag: 'ARK',
      appearances: 3,
    });
  });

  it('signale un pseudo inconnu', () => {
    const analysis = analyzeImport(
      sheet(aMatch(1, [['ARK', 'ARK Newbie', 'BLB', 'BLB Zed']])),
      context,
    );

    expect(analysis.names[0]).toMatchObject({
      nickname: 'Newbie',
      resolution: { kind: 'unknown', suggestions: [] },
    });
  });

  it('liste les équipes inconnues avec leurs joueurs', () => {
    const analysis = analyzeImport(
      sheet(
        aMatch(1, [
          ['ARK', 'ARK Meta', 'NKR', 'Baited'],
          ['ARK', 'ARK Meta', 'NKR', 'Cyblow'],
        ]),
      ),
      context,
    );

    expect(analysis.unknownTeams).toEqual([{ teamTag: 'NKR', nicknames: ['Baited', 'Cyblow'] }]);
  });

  it('détecte un transfert : joueur connu sous une autre équipe que la sienne', () => {
    const analysis = analyzeImport(
      sheet(aMatch(1, [['BLB', 'BLB Meta', 'ARK', 'ARK Zed']])),
      context,
    );

    expect(analysis.transfers).toEqual([
      { playerId: 'meta', fromTeamTag: 'ARK', toTeamTag: 'BLB' },
      { playerId: 'zed', fromTeamTag: 'BLB', toTeamTag: 'ARK' },
    ]);
  });

  it('un joueur sans équipe n’est jamais un transfert', () => {
    const freeAgent = { ...context, players: [aPlayer({ playerId: 'meta', aliases: ['meta'] })] };

    const analysis = analyzeImport(
      sheet(aMatch(1, [['ARK', 'ARK Meta', 'BLB', 'BLB Zed']])),
      freeAgent,
    );

    expect(analysis.transfers).toEqual([]);
  });

  it('indique les équipes qui perdent des titulaires, et combien il leur en reste', () => {
    const roster = {
      ...context,
      players: [
        aPlayer({ playerId: 'meta', aliases: ['meta'], teamTag: 'ARK' }),
        aPlayer({ playerId: 'sub', aliases: ['sub'], teamTag: 'ARK', status: 'sub' }),
        aPlayer({ playerId: 'top', aliases: ['top'], teamTag: 'ARK' }),
        aPlayer({ playerId: 'gone', aliases: ['gone'], teamTag: 'ARK', archived: true }),
      ],
    };

    const analysis = analyzeImport(
      sheet(
        aMatch(1, [
          ['BLB', 'BLB Meta', 'ARK', 'ARK Top'],
          ['BLB', 'BLB Sub', 'ARK', 'ARK Top'],
        ]),
      ),
      roster,
    );

    expect(analysis.affectedRosters).toEqual([
      { teamTag: 'ARK', leavingStarterIds: ['meta'], startersAfter: 1 },
    ]);
  });

  it('en In House, les équipes sont éphémères : ni équipe inconnue ni transfert', () => {
    const inhouse = { ...context, teamsAreRosters: false };

    const analysis = analyzeImport(
      sheet(aMatch(1, [['Demacia', 'Meta', 'Noxus', 'Zed']])),
      inhouse,
    );

    expect(analysis.names.map((n) => [n.nickname, n.teamTag, n.resolution.kind])).toEqual([
      ['Meta', null, 'matched'],
      ['Zed', null, 'matched'],
    ]);
    expect(analysis.unknownTeams).toEqual([]);
    expect(analysis.transfers).toEqual([]);
  });
});
