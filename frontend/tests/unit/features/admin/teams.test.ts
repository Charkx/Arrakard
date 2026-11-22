import { describe, expect, it } from 'vitest';
import { rosterOf, type RosterPlayer } from '#src/features/admin/teams.ts';

const player = (nickname: string, place: RosterPlayer['place']): RosterPlayer => ({
  id: nickname,
  nickname,
  place,
});

describe('rosterOf', () => {
  it('rend les joueurs de l’équipe, titulaires d’abord, puis par pseudo', () => {
    const players = [
      player('Sirocco', { teamId: 'ark', status: 'coach' }),
      player('zéphyr', { teamId: 'ark', status: 'starter' }),
      player('Lanterne', { teamId: 'vnt', status: 'starter' }),
      player('Brise', { teamId: 'ark', status: 'sub' }),
      player('Aube', { teamId: 'ark', status: 'starter' }),
      player('Libre', null),
    ];

    expect(rosterOf('ark', players).map((p) => p.nickname)).toEqual([
      'Aube',
      'zéphyr',
      'Brise',
      'Sirocco',
    ]);
  });
});
