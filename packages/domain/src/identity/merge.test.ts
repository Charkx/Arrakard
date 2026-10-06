import { describe, expect, it } from 'vitest';
import { planMerge, type MergeFacts, type MergePlayer } from './merge.ts';

const aPlayer = (id: string, overrides: Partial<MergePlayer> = {}): MergePlayer => ({
  id,
  nickname: id,
  aliases: [id],
  mergedInto: null,
  discordUserId: null,
  ...overrides,
});

const base: MergeFacts = {
  players: [aPlayer('choco', { aliases: ['choco', 'chocolat'] }), aPlayer('maxrai')],
  performances: [
    { matchId: 'm1', playerId: 'choco' },
    { matchId: 'm2', playerId: 'maxrai' },
    { matchId: 'm3', playerId: 'maxrai' },
    { matchId: 'm3', playerId: 'zed' },
  ],
  eventMvps: [{ editionId: 'e1', playerId: 'maxrai' }],
  matchMvps: [{ matchId: 'm2', playerId: 'maxrai' }],
  participations: [],
  memberships: [],
  customizedPlayerIds: [],
};

describe('planMerge', () => {
  it('réattribue au joueur conservé les performances, MVP et graphies du joueur absorbé', () => {
    expect(planMerge(base, { keepId: 'choco', absorbId: 'maxrai' })).toEqual({
      ok: true,
      plan: {
        keepId: 'choco',
        absorbId: 'maxrai',
        performancesReassigned: 2,
        matchesTouched: 2,
        eventMvpsReassigned: 1,
        matchMvpsReassigned: 1,
        aliasesAdded: ['maxrai'],
        discordUserIdTransferred: null,
        participationsReassigned: 0,
        participationsDropped: 0,
        membershipsReassigned: 0,
        membershipClosed: null,
        absorbedCustomization: 'none',
      },
    });
  });

  it('n’ajoute pas une graphie que le joueur conservé a déjà', () => {
    const facts = {
      ...base,
      players: [aPlayer('choco'), aPlayer('maxrai', { aliases: ['Choco', 'max rai'] })],
    };

    const result = planMerge(facts, { keepId: 'choco', absorbId: 'maxrai' });

    expect(result.ok && result.plan.aliasesAdded).toEqual(['maxrai', 'max rai']);
  });

  it('transfère le compte Discord du joueur absorbé si le joueur conservé n’en a pas', () => {
    const facts = {
      ...base,
      players: [aPlayer('choco'), aPlayer('maxrai', { discordUserId: '42' })],
    };

    const result = planMerge(facts, { keepId: 'choco', absorbId: 'maxrai' });

    expect(result.ok && result.plan.discordUserIdTransferred).toBe('42');
  });

  it.each([
    [
      'un joueur avec lui-même',
      { keepId: 'choco', absorbId: 'choco' },
      base,
      'Impossible de fusionner un joueur avec lui-même.',
    ],
    [
      'un joueur inconnu',
      { keepId: 'choco', absorbId: 'ghost' },
      base,
      'Joueur introuvable : « ghost ».',
    ],
    [
      'un joueur déjà fusionné',
      { keepId: 'choco', absorbId: 'maxrai' },
      { ...base, players: [aPlayer('choco'), aPlayer('maxrai', { mergedInto: 'other' })] },
      '« maxrai » a déjà été fusionné.',
    ],
    [
      'deux joueurs présents dans un même match',
      { keepId: 'maxrai', absorbId: 'zed' },
      { ...base, players: [aPlayer('maxrai'), aPlayer('zed')] },
      '« maxrai » et « zed » ont joué le même match : ce sont deux personnes différentes.',
    ],
    [
      'deux comptes Discord différents',
      { keepId: 'choco', absorbId: 'maxrai' },
      {
        ...base,
        players: [
          aPlayer('choco', { discordUserId: '1' }),
          aPlayer('maxrai', { discordUserId: '2' }),
        ],
      },
      'Les deux profils sont liés à des comptes Discord différents : délie l’un des deux d’abord.',
    ],
  ] as const)('refuse de fusionner %s', (_label, request, facts, error) => {
    expect(planMerge(facts, request)).toEqual({ ok: false, error });
  });

  describe('les données rattachées au joueur absorbé', () => {
    const merge = (overrides: Partial<MergeFacts>) => {
      const result = planMerge({ ...base, ...overrides }, { keepId: 'choco', absorbId: 'maxrai' });
      if (!result.ok) throw new Error(result.error);
      return result.plan;
    };

    it('réattribue ses participations, sans doublon si les deux joueurs étaient à la même édition', () => {
      const plan = merge({
        participations: [
          { editionId: 'e1', playerId: 'choco' },
          { editionId: 'e1', playerId: 'maxrai' },
          { editionId: 'e2', playerId: 'maxrai' },
        ],
      });

      expect(plan).toMatchObject({ participationsReassigned: 1, participationsDropped: 1 });
    });

    it('réattribue son historique d’équipes et clôt son passage en cours si le joueur conservé en a un', () => {
      const plan = merge({
        memberships: [
          { id: 't1', playerId: 'choco', current: true },
          { id: 't2', playerId: 'maxrai', current: false },
          { id: 't3', playerId: 'maxrai', current: true },
        ],
      });

      expect(plan).toMatchObject({ membershipsReassigned: 2, membershipClosed: 't3' });
    });

    it('garde son passage en cours si le joueur conservé n’en a pas', () => {
      const plan = merge({
        memberships: [
          { id: 't1', playerId: 'choco', current: false },
          { id: 't3', playerId: 'maxrai', current: true },
        ],
      });

      expect(plan).toMatchObject({ membershipsReassigned: 1, membershipClosed: null });
    });

    it.each([
      ['n’en a pas', [], 'none'],
      ['est le seul à en avoir une', ['maxrai'], 'transferred'],
      ['et le joueur conservé en ont une', ['choco', 'maxrai'], 'dropped'],
      ['n’en a pas, mais le joueur conservé si', ['choco'], 'none'],
    ] as const)(
      'personnalisation de carte, quand le joueur absorbé %s',
      (_label, customizedPlayerIds, expected) => {
        expect(merge({ customizedPlayerIds }).absorbedCustomization).toBe(expected);
      },
    );
  });
});
