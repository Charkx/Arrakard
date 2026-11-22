import { V1_RATING_RULES } from '#domain/index.ts';
import { LOCAL_DATABASE_URL } from '#infrastructure/local.ts';
import { BRISE_ID, FIXTURE_ROWS, ZEPHYR_ID } from '#support/application/fixture.ts';
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

/** Les Edge Functions des profils, sur l'API locale (`pnpm db:start`). */
const SLUG = 'essai-fonction-profils';
const USERS_DOMAIN = 'fonction-profils.essai.local';
const sql = postgres(LOCAL_DATABASE_URL, { onnotice: () => undefined });

async function reset(): Promise<void> {
  await removeOrganization(sql, SLUG);
  await removeUsers(sql, USERS_DOMAIN);
}

let organizationId: string;
let admin: SignedUp;

beforeAll(async () => {
  await reset();
  organizationId = await createOrganization(sql, SLUG, V1_RATING_RULES, FIXTURE_ROWS);
  admin = await signUpAs(`admin@${USERS_DOMAIN}`);
  await sql`
    insert into organization_members (organization_id, user_id, role)
    values (${organizationId}, ${admin.id}, 'admin')`;
});

afterAll(async () => {
  await reset();
  await sql.end();
});

describe('les fonctions des profils', () => {
  it('refusent un visiteur sans connexion', async () => {
    const response = await callFunction('merge-players', {
      organizationId,
      absorbedId: BRISE_ID,
      keptId: ZEPHYR_ID,
    });

    expect(response.status).toBe(401);
  });

  it('refusent un identifiant Discord mal formé', async () => {
    const response = await callFunction(
      'link-discord-account',
      { organizationId, playerId: BRISE_ID, discordUserId: 'brise#0001' },
      admin.token,
    );

    expect(response.status).toBe(400);
  });

  it('laissent l’admin lier la carte du double, puis le fusionner : le compte suit', async () => {
    const linked = await callFunction(
      'link-discord-account',
      { organizationId, playerId: BRISE_ID, discordUserId: '123456789012345678' },
      admin.token,
    );
    expect(linked.status).toBe(200);

    const merged = await callFunction(
      'merge-players',
      { organizationId, absorbedId: BRISE_ID, keptId: ZEPHYR_ID },
      admin.token,
    );
    expect(merged.status).toBe(200);

    const again = await callFunction(
      'merge-players',
      { organizationId, absorbedId: BRISE_ID, keptId: ZEPHYR_ID },
      admin.token,
    );
    expect(again.status).toBe(404);
    const players = await sql<
      { id: string; merged_into: string | null; discord_user_id: string | null }[]
    >`
      select id, merged_into, discord_user_id from players
      where organization_id = ${organizationId} and id in (${BRISE_ID}, ${ZEPHYR_ID}) order by nickname`;
    expect(players).toEqual([
      { id: BRISE_ID, merged_into: ZEPHYR_ID, discord_user_id: null },
      { id: ZEPHYR_ID, merged_into: null, discord_user_id: '123456789012345678' },
    ]);
  });
});
