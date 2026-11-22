import { describe, expect, it } from 'vitest';
import { syncDiscordRoleRequest } from '#contracts/sync-discord-role.ts';

const VALID = { organizationId: '00000000-0000-4000-8000-000000000001', providerToken: 'jeton' };

describe('syncDiscordRoleRequest', () => {
  it('accepte une organisation et un jeton Discord', () => {
    expect(syncDiscordRoleRequest.parse(VALID)).toEqual(VALID);
  });

  it.each([
    ['sans jeton', { organizationId: VALID.organizationId }],
    ['un jeton vide', { ...VALID, providerToken: '' }],
    ['une organisation qui n’est pas un identifiant', { ...VALID, organizationId: 'arrakis' }],
    ['un champ en trop', { ...VALID, role: 'admin' }],
  ])('refuse %s', (_case, body) => {
    expect(syncDiscordRoleRequest.safeParse(body).success).toBe(false);
  });
});
