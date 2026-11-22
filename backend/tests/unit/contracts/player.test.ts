import { describe, expect, it } from 'vitest';
import { linkDiscordAccountRequest, mergePlayersRequest } from '#contracts/player.ts';

const ORGANIZATION = '00000000-0000-4000-8000-000000000001';
const ID = '00000000-0000-4000-8000-000000000002';

describe('mergePlayersRequest', () => {
  it('refuse un profil qui n’est pas un identifiant', () => {
    expect(
      mergePlayersRequest.safeParse({
        organizationId: ORGANIZATION,
        absorbedId: 'Brise',
        keptId: ID,
      }).success,
    ).toBe(false);
  });
});

describe('linkDiscordAccountRequest', () => {
  it('accepte un identifiant Discord, sans les espaces autour, ou null', () => {
    expect(
      linkDiscordAccountRequest.parse({
        organizationId: ORGANIZATION,
        playerId: ID,
        discordUserId: ' 123456789012345678 ',
      }).discordUserId,
    ).toBe('123456789012345678');
    expect(
      linkDiscordAccountRequest.parse({
        organizationId: ORGANIZATION,
        playerId: ID,
        discordUserId: null,
      }).discordUserId,
    ).toBeNull();
  });

  it.each([
    ['un pseudo', 'zephyr#1234'],
    ['trop court', '1234'],
    ['une chaîne vide', ''],
  ])('refuse %s', (_case, discordUserId) => {
    expect(
      linkDiscordAccountRequest.safeParse({
        organizationId: ORGANIZATION,
        playerId: ID,
        discordUserId,
      }).success,
    ).toBe(false);
  });
});
