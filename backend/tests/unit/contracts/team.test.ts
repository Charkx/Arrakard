import { describe, expect, it } from 'vitest';
import { archiveTeamRequest, createTeamRequest, transferPlayerRequest } from '#contracts/team.ts';

const ORGANIZATION = '00000000-0000-4000-8000-000000000001';
const ID = '00000000-0000-4000-8000-000000000002';

describe('createTeamRequest', () => {
  it('accepte un tag, un nom et des divisions ; met le tag en majuscules', () => {
    expect(
      createTeamRequest.parse({
        organizationId: ORGANIZATION,
        tag: ' ark ',
        name: ' Arrakis ',
        divisions: ['div1'],
      }),
    ).toEqual({ organizationId: ORGANIZATION, tag: 'ARK', name: 'Arrakis', divisions: ['div1'] });
  });

  it.each([
    ['un tag d’une lettre', { tag: 'A', name: 'Arrakis', divisions: [] }],
    ['un tag de cinq lettres', { tag: 'ARRAK', name: 'Arrakis', divisions: [] }],
    ['un tag avec un espace', { tag: 'A K', name: 'Arrakis', divisions: [] }],
    ['un tag avec un chiffre', { tag: 'AR1', name: 'Arrakis', divisions: [] }],
    ['un nom vide', { tag: 'ARK', name: '  ', divisions: [] }],
    ['une division inconnue', { tag: 'ARK', name: 'Arrakis', divisions: ['div3'] }],
    ['une division en double', { tag: 'ARK', name: 'Arrakis', divisions: ['div1', 'div1'] }],
  ])('refuse %s', (_case, body) => {
    expect(createTeamRequest.safeParse({ organizationId: ORGANIZATION, ...body }).success).toBe(
      false,
    );
  });
});

describe('transferPlayerRequest', () => {
  it('accepte une nouvelle place, ou aucune', () => {
    const to = { teamId: ID, status: 'sub' };
    expect(
      transferPlayerRequest.parse({ organizationId: ORGANIZATION, playerId: ID, to }).to,
    ).toEqual(to);
    expect(
      transferPlayerRequest.parse({ organizationId: ORGANIZATION, playerId: ID, to: null }).to,
    ).toBeNull();
  });

  it('refuse un statut de roster inconnu', () => {
    expect(
      transferPlayerRequest.safeParse({
        organizationId: ORGANIZATION,
        playerId: ID,
        to: { teamId: ID, status: 'captain' },
      }).success,
    ).toBe(false);
  });
});

describe('archiveTeamRequest', () => {
  it('refuse une équipe qui n’est pas un identifiant', () => {
    expect(
      archiveTeamRequest.safeParse({ organizationId: ORGANIZATION, teamId: 'ARK' }).success,
    ).toBe(false);
  });
});
