import { describe, expect, it } from 'vitest';
import { recordMatchRequest } from '#contracts/record-match.ts';

const ID = '00000000-0000-4000-8000-000000000002';
const side = { playerId: ID, champion: ' Ornn ', kills: 1, deaths: 2, assists: 3, gold: 9000 };
const MATCH = {
  organizationId: ID,
  editionId: ID,
  version: 1,
  durationSeconds: 1930,
  winner: 'A',
  teams: ['Noxus', 'Ionia'],
  lines: ['TOP', 'JGL', 'MID', 'ADC', 'SUP'].map((role) => ({ role, sides: [side, side] })),
};

describe('recordMatchRequest', () => {
  it('accepte une feuille de cinq lignes, champions sans espaces autour', () => {
    expect(recordMatchRequest.parse(MATCH).lines[0]?.sides[0].champion).toBe('Ornn');
  });

  it.each([
    ['quatre lignes', { lines: MATCH.lines.slice(0, 4) }],
    ['un vainqueur inconnu', { winner: 'C' }],
    ['une durée nulle', { durationSeconds: 0 }],
    [
      'des kills négatifs',
      { lines: [{ role: 'TOP', sides: [{ ...side, kills: -1 }, side] }, ...MATCH.lines.slice(1)] },
    ],
  ])('refuse %s', (_case, change) => {
    expect(recordMatchRequest.safeParse({ ...MATCH, ...change }).success).toBe(false);
  });
});
