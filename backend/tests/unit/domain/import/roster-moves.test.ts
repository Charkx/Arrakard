import { describe, expect, it } from 'vitest';
import type { ImportPlayer } from '#domain/import/analyze.ts';
import type { ImportPlan } from '#domain/import/plan.ts';
import { rosterMoves } from '#domain/import/roster-moves.ts';

const PLAN: ImportPlan = {
  newPlayers: [],
  newAliases: [],
  newTeams: [],
  transfers: [],
  matches: [],
};

const player = (playerId: string, teamTag: string, status: ImportPlayer['status']) => ({
  playerId,
  aliases: [playerId],
  teamTag,
  archived: false,
  status,
});

describe('rosterMoves', () => {
  it('un import sans nouveau joueur ni transfert ne change aucun roster', () => {
    expect(rosterMoves(PLAN, [])).toEqual([]);
  });

  it('un nouveau joueur rattaché à une équipe la rejoint comme titulaire ; sans équipe, il n’en rejoint aucune', () => {
    const plan = {
      ...PLAN,
      newPlayers: [
        { key: 'baited', nickname: 'Baited', teamTag: 'NKR' },
        { key: 'nova', nickname: 'Nova', teamTag: null },
      ],
    };

    expect(rosterMoves(plan, [])).toEqual([
      { player: { kind: 'new', key: 'baited' }, to: { teamTag: 'NKR', status: 'starter' } },
    ]);
  });

  it('un transfert accepté garde le statut du joueur dans son ancienne équipe', () => {
    const plan = {
      ...PLAN,
      transfers: [
        { playerId: 'meta', fromTeamTag: 'ARK', toTeamTag: 'BLB' },
        { playerId: 'zed', fromTeamTag: 'BLB', toTeamTag: 'ARK' },
      ],
    };

    expect(rosterMoves(plan, [player('meta', 'ARK', 'sub'), player('zed', 'BLB', 'starter')])).toEqual([
      { player: { kind: 'existing', playerId: 'meta' }, to: { teamTag: 'BLB', status: 'sub' } },
      { player: { kind: 'existing', playerId: 'zed' }, to: { teamTag: 'ARK', status: 'starter' } },
    ]);
  });
});
