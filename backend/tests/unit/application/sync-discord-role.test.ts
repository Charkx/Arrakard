import { syncDiscordRole, toFacts, type DiscordGateway } from '#application/index.ts';
import { V1_RATING_RULES } from '#domain/index.ts';
import { NOW } from '#support/application/command-harness.ts';
import { FIXTURE_ROWS } from '#support/application/fixture.ts';
import { inMemoryStore } from '#support/application/in-memory.ts';
import { describe, expect, it } from 'vitest';

const ORGANIZATION = 'arrakis';
const OTHER_ORGANIZATION = 'autre';
const USER = 'utilisateur';
const DISCORD_USER = 'discord-123';
const GUILD = 'serveur-arrakis';
const ADMIN_ROLE = 'role-admin';
const TOKEN = 'jeton-discord';

/** Un Discord simulé : ce jeton appartient à ce membre du serveur, ou à personne du serveur. */
function discordWith(member: { discordUserId: string; roles: string[] } | undefined) {
  const calls: { token: string; guildId: string }[] = [];
  const gateway: DiscordGateway = {
    guildMember(token, guildId) {
      calls.push({ token, guildId });
      return Promise.resolve(member);
    },
  };
  return { gateway, calls };
}

function setup(member: { discordUserId: string; roles: string[] } | undefined) {
  const store = inMemoryStore();
  store.addOrganization(ORGANIZATION, V1_RATING_RULES, toFacts(FIXTURE_ROWS), {
    guildId: GUILD,
    adminRoleId: ADMIN_ROLE,
  });
  store.addDiscordIdentity(USER, DISCORD_USER);
  const discord = discordWith(member);
  const services = {
    unitOfWork: store.unitOfWork,
    clock: { now: () => NOW },
    discord: discord.gateway,
  };
  const sync = (organizationId = ORGANIZATION) =>
    syncDiscordRole(services, USER, { organizationId, providerToken: TOKEN });
  return { store, sync, calls: discord.calls };
}

describe('syncDiscordRole', () => {
  it('fait admin le joueur qui a le rôle admin sur le serveur de l’organisation', async () => {
    const { store, sync, calls } = setup({
      discordUserId: DISCORD_USER,
      roles: ['autre-role', ADMIN_ROLE],
    });

    expect(await sync()).toEqual({ role: 'admin' });
    expect(store.roleOf(ORGANIZATION, USER)).toBe('admin');
    expect(calls).toEqual([{ token: TOKEN, guildId: GUILD }]);
  });

  it('fait simple membre le joueur du serveur sans le rôle admin', async () => {
    const { store, sync } = setup({ discordUserId: DISCORD_USER, roles: ['autre-role'] });

    expect(await sync()).toEqual({ role: 'member' });
    expect(store.roleOf(ORGANIZATION, USER)).toBe('member');
  });

  it('retire le rôle admin quand le rôle Discord a disparu', async () => {
    const { store, sync } = setup({ discordUserId: DISCORD_USER, roles: [] });
    store.addMember(ORGANIZATION, USER, 'admin');

    await sync();

    expect(store.roleOf(ORGANIZATION, USER)).toBe('member');
  });

  it('retire l’adhésion du joueur qui a quitté le serveur', async () => {
    const { store, sync } = setup(undefined);
    store.addMember(ORGANIZATION, USER, 'admin');

    expect(await sync()).toEqual({ role: null });
    expect(store.roleOf(ORGANIZATION, USER)).toBeUndefined();
  });

  it('ne touche qu’à l’organisation demandée', async () => {
    const { store, sync } = setup({ discordUserId: DISCORD_USER, roles: [ADMIN_ROLE] });
    store.addOrganization(OTHER_ORGANIZATION, V1_RATING_RULES, toFacts(FIXTURE_ROWS), {
      guildId: 'autre-serveur',
      adminRoleId: 'autre-role-admin',
    });

    await sync();

    expect(store.roleOf(OTHER_ORGANIZATION, USER)).toBeUndefined();
  });

  it('écrit la synchronisation au journal, sans le jeton Discord', async () => {
    const { store, sync } = setup({ discordUserId: DISCORD_USER, roles: [ADMIN_ROLE] });

    await sync();

    const log = store.commandLogOf(ORGANIZATION);
    expect(log).toEqual([
      {
        organizationId: ORGANIZATION,
        command: 'syncDiscordRole',
        actorUserId: USER,
        input: { discordUserId: DISCORD_USER },
        outcome: { role: 'admin' },
        createdAt: NOW.toISOString(),
      },
    ]);
    expect(JSON.stringify(log)).not.toContain(TOKEN);
  });

  it('refuse un jeton Discord qui appartient à un autre compte que celui connecté', async () => {
    const { store, sync } = setup({ discordUserId: 'discord-autre', roles: [ADMIN_ROLE] });

    await expect(sync()).rejects.toMatchObject({ reason: 'forbidden' });
    expect(store.roleOf(ORGANIZATION, USER)).toBeUndefined();
  });

  it('refuse un utilisateur qui ne s’est pas connecté avec Discord, sans appeler Discord', async () => {
    const { store, sync, calls } = setup({ discordUserId: DISCORD_USER, roles: [ADMIN_ROLE] });
    store.removeDiscordIdentity(USER);

    await expect(sync()).rejects.toMatchObject({ reason: 'forbidden' });
    expect(calls).toEqual([]);
  });

  it('refuse une organisation sans serveur Discord configuré', async () => {
    const { store, sync } = setup({ discordUserId: DISCORD_USER, roles: [ADMIN_ROLE] });
    store.addOrganization(OTHER_ORGANIZATION, V1_RATING_RULES, toFacts(FIXTURE_ROWS));

    await expect(sync(OTHER_ORGANIZATION)).rejects.toMatchObject({ reason: 'not_found' });
  });
});
