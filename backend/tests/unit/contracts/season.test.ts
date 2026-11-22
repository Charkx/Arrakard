import { describe, expect, it } from 'vitest';
import { closeSeasonRequest, openSeasonRequest } from '#contracts/season.ts';

const ORGANIZATION = '00000000-0000-4000-8000-000000000001';

describe('openSeasonRequest', () => {
  it('accepte un nom et une année, sans les espaces autour du nom', () => {
    expect(
      openSeasonRequest.parse({ organizationId: ORGANIZATION, name: ' Saison 4 ', year: 2027 }),
    ).toEqual({ organizationId: ORGANIZATION, name: 'Saison 4', year: 2027 });
  });

  it.each([
    ['un nom vide', { name: '   ', year: 2027 }],
    ['une année décimale', { name: 'Saison 4', year: 2027.5 }],
    ['une année absurde', { name: 'Saison 4', year: 27 }],
    ['sans année', { name: 'Saison 4' }],
  ])('refuse %s', (_case, body) => {
    expect(openSeasonRequest.safeParse({ organizationId: ORGANIZATION, ...body }).success).toBe(
      false,
    );
  });
});

describe('closeSeasonRequest', () => {
  it('refuse une saison qui n’est pas un identifiant', () => {
    expect(
      closeSeasonRequest.safeParse({ organizationId: ORGANIZATION, seasonId: 'Saison 3' }).success,
    ).toBe(false);
  });
});
