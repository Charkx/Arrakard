import { V1_RATING_RULES } from '#domain/index.ts';
import { LOCAL_DATABASE_URL } from '#infrastructure/local.ts';
import {
  callFunction,
  signUp as signUpAs,
  type SignedUp,
} from '#support/infrastructure/functions.ts';
import {
  createOrganization,
  removeOrganization,
  removeUsers,
} from '#support/infrastructure/organizations.ts';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * L'Edge Function `sync-discord-role` sur l'API locale (`pnpm db:start`).
 * Discord n'est pas joignable des tests : on vérifie ce qui est refusé avant
 * de l'appeler. L'appel à Discord est testé à part (`discord.test.ts`).
 */
const SLUG = 'essai-fonction-discord';
const WITHOUT_DISCORD_SLUG = 'essai-fonction-sans-discord';
const USERS_DOMAIN = 'fonction-discord.essai.local';
const NO_ROWS = { seasons: [], editions: [], matches: [], performances: [], players: [] };
const sql = postgres(LOCAL_DATABASE_URL, { onnotice: () => undefined });
const sync = (body: unknown, token?: string) => callFunction('sync-discord-role', body, token);

async function reset(): Promise<void> {
  await removeOrganization(sql, SLUG);
  await removeOrganization(sql, WITHOUT_DISCORD_SLUG);
  await removeUsers(sql, USERS_DOMAIN);
}

let organizationId: string;
let withoutDiscordId: string;
let emailUser: SignedUp;

beforeAll(async () => {
  await reset();
  organizationId = await createOrganization(sql, SLUG, V1_RATING_RULES, NO_ROWS);
  withoutDiscordId = await createOrganization(sql, WITHOUT_DISCORD_SLUG, V1_RATING_RULES, NO_ROWS);
  await sql`
    update organizations set discord_guild_id = '1', discord_admin_role_id = '2'
    where id = ${organizationId}`;
  emailUser = await signUpAs(`joueur@${USERS_DOMAIN}`);
});

afterAll(async () => {
  await reset();
  await sql.end();
});

describe('la fonction sync-discord-role', () => {
  it('refuse un visiteur sans connexion', async () => {
    expect((await sync({ organizationId, providerToken: 'jeton' })).status).toBe(401);
  });

  it('refuse une entrée sans jeton Discord', async () => {
    expect((await sync({ organizationId }, emailUser.token)).status).toBe(400);
  });

  it('répond 404 pour une organisation sans serveur Discord', async () => {
    const response = await sync(
      { organizationId: withoutDiscordId, providerToken: 'jeton' },
      emailUser.token,
    );

    expect(response.status).toBe(404);
  });

  it('refuse un compte qui ne s’est pas connecté avec Discord', async () => {
    const response = await sync({ organizationId, providerToken: 'jeton' }, emailUser.token);

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: 'forbidden' });
  });
});
