import { describe, expect, it } from 'vitest';
import { analyzeImport, type ImportContext, type ImportPlayer } from './analyze';
import { planImport, type ImportDecisions } from './plan';
import type { SheetSide, StatsSheet } from './stats-sheet';

const side = (team: string, rawName: string, result: 'win' | 'loss'): SheetSide => ({
  team,
  result,
  rawName,
  champion: 'Ahri',
  kills: 1,
  deaths: 2,
  assists: 3,
  gold: 9000,
});

/** Une feuille d'un match d'une ligne : [équipe A, nom A] contre [équipe B, nom B]. */
const oneLineSheet = (a: [string, string], b: [string, string]): StatsSheet => ({
  warnings: [],
  matches: [
    {
      matchNumber: 1,
      winnerTeam: a[0],
      durationSeconds: 1800,
      lines: [{ role: 'MID', sides: [side(a[0], a[1], 'win'), side(b[0], b[1], 'loss')] }],
    },
  ],
});

const aPlayer = (overrides: Partial<ImportPlayer> & { playerId: string }): ImportPlayer => ({
  aliases: [overrides.playerId],
  teamTag: null,
  archived: false,
  status: 'starter',
  ...overrides,
});

const context: ImportContext = {
  players: [
    aPlayer({ playerId: 'meta', aliases: ['meta'], teamTag: 'ARK' }),
    aPlayer({ playerId: 'zed', aliases: ['zed'], teamTag: 'BLB' }),
  ],
  knownTeamTags: ['ARK', 'BLB'],
  teamsAreRosters: true,
};

const noDecision: ImportDecisions = { names: {}, unknownTeams: {}, transfers: {} };

function plan(sheet: StatsSheet, decisions: ImportDecisions = noDecision, ctx = context) {
  return planImport(sheet, analyzeImport(sheet, ctx), decisions, ctx);
}

describe('planImport', () => {
  it('tout est reconnu : chaque performance référence un joueur existant', () => {
    const result = plan(oneLineSheet(['ARK', 'ARK Meta'], ['BLB', 'BLB Zed']));

    expect(result).toEqual({
      ok: true,
      plan: {
        newPlayers: [],
        newAliases: [],
        newTeams: [],
        transfers: [],
        matches: [
          {
            matchNumber: 1,
            winnerTeam: 'ARK',
            durationSeconds: 1800,
            performances: [
              {
                player: { kind: 'existing', playerId: 'meta' },
                team: 'ARK',
                role: 'MID',
                champion: 'Ahri',
                result: 'win',
                kills: 1,
                deaths: 2,
                assists: 3,
                gold: 9000,
              },
              expect.objectContaining({
                player: { kind: 'existing', playerId: 'zed' },
                result: 'loss',
              }),
            ],
          },
        ],
      },
    });
  });

  describe('pseudos non reconnus', () => {
    const sheet = oneLineSheet(['ARK', 'ARK Newbie'], ['BLB', 'BLB Zed']);

    it('exigent une décision', () => {
      expect(plan(sheet)).toEqual({
        ok: false,
        errors: ['Décision manquante pour le joueur « Newbie ».'],
      });
    });

    it('« nouveau joueur » crée un joueur, rattaché à l’équipe de la feuille', () => {
      const result = plan(sheet, { ...noDecision, names: { newbie: { kind: 'new' } } });

      if (!result.ok) throw new Error(result.errors.join());
      expect(result.plan.newPlayers).toEqual([
        { key: 'newbie', nickname: 'Newbie', teamTag: 'ARK' },
      ]);
      expect(result.plan.matches[0]?.performances[0]?.player).toEqual({
        kind: 'new',
        key: 'newbie',
      });
    });

    it('« joueur existant » rattache les performances et enregistre la nouvelle graphie', () => {
      const result = plan(sheet, {
        ...noDecision,
        names: { newbie: { kind: 'existing', playerId: 'meta' } },
      });

      if (!result.ok) throw new Error(result.errors.join());
      expect(result.plan.matches[0]?.performances[0]?.player).toEqual({
        kind: 'existing',
        playerId: 'meta',
      });
      expect(result.plan.newAliases).toEqual([{ playerId: 'meta', alias: 'newbie' }]);
    });

    it('refusent un joueur existant introuvable', () => {
      const result = plan(sheet, {
        ...noDecision,
        names: { newbie: { kind: 'existing', playerId: 'ghost' } },
      });

      expect(result).toEqual({
        ok: false,
        errors: ['Le joueur « ghost » n’existe pas (pour « Newbie »).'],
      });
    });
  });

  it('un homonyme ambigu exige aussi une décision', () => {
    const ctx = {
      ...context,
      players: [
        aPlayer({ playerId: 'meta-1', aliases: ['meta'], teamTag: 'BLB' }),
        aPlayer({ playerId: 'meta-2', aliases: ['meta'], teamTag: 'BLB' }),
        aPlayer({ playerId: 'zed', aliases: ['zed'], teamTag: 'BLB' }),
      ],
    };
    const sheet = oneLineSheet(['ARK', 'ARK Meta'], ['BLB', 'BLB Zed']);

    expect(plan(sheet, noDecision, ctx)).toMatchObject({ ok: false });
    expect(
      plan(
        sheet,
        { ...noDecision, names: { meta: { kind: 'existing', playerId: 'meta-2' } } },
        ctx,
      ),
    ).toMatchObject({
      ok: true,
    });
  });

  describe('équipes inconnues', () => {
    const sheet = oneLineSheet(['ARK', 'ARK Meta'], ['NKR', 'NKR Baited']);
    const names = { baited: { kind: 'new' } } as const;

    it('exigent une décision', () => {
      expect(plan(sheet, { ...noDecision, names })).toEqual({
        ok: false,
        errors: ['Décision manquante pour l’équipe « NKR ».'],
      });
    });

    it('« créer » ajoute l’équipe et y rattache ses nouveaux joueurs', () => {
      const result = plan(sheet, { ...noDecision, names, unknownTeams: { NKR: 'create' } });

      if (!result.ok) throw new Error(result.errors.join());
      expect(result.plan.newTeams).toEqual(['NKR']);
      expect(result.plan.newPlayers).toEqual([
        { key: 'baited', nickname: 'Baited', teamTag: 'NKR' },
      ]);
    });

    it('« ignorer » ne crée pas l’équipe ; ses nouveaux joueurs restent sans équipe', () => {
      const result = plan(sheet, { ...noDecision, names, unknownTeams: { NKR: 'ignore' } });

      if (!result.ok) throw new Error(result.errors.join());
      expect(result.plan.newTeams).toEqual([]);
      expect(result.plan.newPlayers).toEqual([
        { key: 'baited', nickname: 'Baited', teamTag: null },
      ]);
    });
  });

  describe('transferts', () => {
    const sheet = oneLineSheet(['BLB', 'BLB Meta'], ['ARK', 'ARK Zed']);

    it('exigent une décision', () => {
      expect(plan(sheet)).toEqual({
        ok: false,
        errors: [
          'Décision manquante pour le transfert de « meta ».',
          'Décision manquante pour le transfert de « zed ».',
        ],
      });
    });

    it('seuls les transferts acceptés sont appliqués', () => {
      const result = plan(sheet, { ...noDecision, transfers: { meta: 'apply', zed: 'ignore' } });

      if (!result.ok) throw new Error(result.errors.join());
      expect(result.plan.transfers).toEqual([
        { playerId: 'meta', fromTeamTag: 'ARK', toTeamTag: 'BLB' },
      ]);
    });
  });

  it('une décision peut corriger un rattachement automatique', () => {
    const sheet = oneLineSheet(['ARK', 'ARK Meta'], ['BLB', 'BLB Zed']);

    const result = plan(sheet, { ...noDecision, names: { meta: { kind: 'new' } } });

    if (!result.ok) throw new Error(result.errors.join());
    expect(result.plan.newPlayers.map((p) => p.key)).toEqual(['meta']);
  });
});
