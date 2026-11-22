import { syncDiscordRole, type DiscordGateway, type GuildMember } from '#application/index.ts';
import { V1_RATING_RULES } from '#domain/index.ts';
import { postgresUnitOfWork } from '#infrastructure/commands.ts';
import { LOCAL_DATABASE_URL } from '#infrastructure/local.ts';
import { NOW } from '#support/application/command-harness.ts';
import {
  createOrganization,
  createUser,
  removeOrganization,
  removeUsers,
} from '#support/infrastructure/organizations.ts';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/**
 * La synchronisation du rôle Discord sur la base locale (`pnpm db:start`) :
 * l'identité Discord lue dans Supabase Auth, l'adhésion écrite ou retirée.
 * Discord, lui, est simulé.
 */
const SLUG = 'essai-discord';
const OTHER_SLUG = 'essai-discord-autre';
const USERS_DOMAIN = 'discord.essai.local';
const DISCORD_USER = '900000000000000001';
const GUILD = '1031291061936595015';
const ADMIN_ROLE = '1514024774131519638';
const NO_ROWS = { seasons: [], editions: [], matches: [], performances: [], players: [] };
const sql = postgres(LOCAL_DATABASE_URL, { onnotice: () => undefined });

let member: GuildMember | undefined;
const discord: DiscordGateway = { guildMember: () => Promise.resolve(member) };
const services = { unitOfWork: postgresUnitOfWork(sql), clock: { now: () => NOW }, discord };

let organizationId: string;
let otherOrganizationId: string;
let userId: string;

async function reset(): Promise<void> {
  await removeOrganization(sql, SLUG);
  await removeOrganization(sql, OTHER_SLUG);
  await removeUsers(sql, USERS_DOMAIN);
}

async function roleIn(organization: string): Promise<string | undefined> {
  const [row] = await sql<{ role: string }[]>`
    select role from organization_members
    where organization_id = ${organization} and user_id = ${userId}`;
  return row?.role;
}

const sync = (organization = organizationId) =>
  syncDiscordRole(services, userId, { organizationId: organization, providerToken: 'jeton' });

beforeAll(async () => {
  await reset();
  organizationId = await createOrganization(sql, SLUG, V1_RATING_RULES, NO_ROWS);
  otherOrganizationId = await createOrganization(sql, OTHER_SLUG, V1_RATING_RULES, NO_ROWS);
  await sql`
    update organizations set discord_guild_id = ${GUILD}, discord_admin_role_id = ${ADMIN_ROLE}
    where id = ${organizationId}`;
  userId = await createUser(sql, `joueur@${USERS_DOMAIN}`);
  await sql`
    insert into auth.identities (provider_id, user_id, identity_data, provider)
    values (${DISCORD_USER}, ${userId}, ${sql.json({ sub: DISCORD_USER })}, 'discord')`;
});

beforeEach(async () => {
  await sql`delete from organization_members where user_id = ${userId}`;
});

afterAll(async () => {
  await reset();
  await sql.end();
});

describe('syncDiscordRole sur Postgres', () => {
  it('fait admin le joueur qui a le rôle, puis le rétrograde quand le rôle disparaît', async () => {
    member = { discordUserId: DISCORD_USER, roles: [ADMIN_ROLE] };
    expect(await sync()).toEqual({ role: 'admin' });
    expect(await roleIn(organizationId)).toBe('admin');

    member = { discordUserId: DISCORD_USER, roles: [] };
    expect(await sync()).toEqual({ role: 'member' });
    expect(await roleIn(organizationId)).toBe('member');
  });

  it('retire l’adhésion du joueur qui a quitté le serveur', async () => {
    member = { discordUserId: DISCORD_USER, roles: [ADMIN_ROLE] };
    await sync();

    member = undefined;
    expect(await sync()).toEqual({ role: null });
    expect(await roleIn(organizationId)).toBeUndefined();
  });

  it('écrit au journal des commandes de l’organisation', async () => {
    member = { discordUserId: DISCORD_USER, roles: [ADMIN_ROLE] };
    await sync();

    const [entry] = await sql<{ input: unknown; outcome: unknown }[]>`
      select input, outcome from command_log
      where organization_id = ${organizationId} and command = 'syncDiscordRole'
      order by created_at desc limit 1`;
    expect(entry).toEqual({ input: { discordUserId: DISCORD_USER }, outcome: { role: 'admin' } });
  });

  it('refuse le jeton Discord d’un autre compte, sans rien écrire', async () => {
    member = { discordUserId: '900000000000000002', roles: [ADMIN_ROLE] };

    await expect(sync()).rejects.toMatchObject({ reason: 'forbidden' });
    expect(await roleIn(organizationId)).toBeUndefined();
  });

  it('refuse une organisation sans serveur Discord, sans toucher aux autres', async () => {
    member = { discordUserId: DISCORD_USER, roles: [ADMIN_ROLE] };

    await expect(sync(otherOrganizationId)).rejects.toMatchObject({ reason: 'not_found' });
    expect(await roleIn(otherOrganizationId)).toBeUndefined();
    expect(await roleIn(organizationId)).toBeUndefined();
  });
});
