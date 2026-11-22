import { V1_RATING_RULES } from '#domain/index.ts';
import { LOCAL_DATABASE_URL } from '#infrastructure/local.ts';
import { FIXTURE_ROWS, ZEPHYR_ID } from '#support/application/fixture.ts';
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

/** Les Edge Functions des éditions, sur l'API locale (`pnpm db:start`). */
const SLUG = 'essai-fonction-editions';
const USERS_DOMAIN = 'fonction-editions.essai.local';
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

const LAN = {
  name: 'Gamers Assembly',
  type: 'external_lan',
  date: '2026-11-28',
  seasonId: null,
  prestige: 'normal',
  location: 'Poitiers',
  url: null,
  description: null,
  arrakisWon: null,
  participantIds: [ZEPHYR_ID],
};

describe('les fonctions des éditions', () => {
  it('refusent un visiteur sans connexion', async () => {
    expect((await callFunction('create-edition', { organizationId, ...LAN })).status).toBe(401);
  });

  it('laissent l’admin créer un événement externe, le modifier, puis l’archiver', async () => {
    const created = await callFunction('create-edition', { organizationId, ...LAN }, admin.token);
    expect(created.status).toBe(200);
    const { editionId } = (await created.json()) as { editionId: string };

    const updated = await callFunction(
      'update-edition',
      { organizationId, editionId, version: 1, ...LAN, arrakisWon: true },
      admin.token,
    );
    expect(updated.status).toBe(200);

    const stale = await callFunction(
      'archive-edition',
      { organizationId, editionId, version: 1 },
      admin.token,
    );
    expect(stale.status).toBe(409);
    const archived = await callFunction(
      'archive-edition',
      { organizationId, editionId, version: 2 },
      admin.token,
    );
    expect(archived.status).toBe(200);

    const [edition] = await sql<{ arrakis_won: boolean; archived: boolean }[]>`
      select arrakis_won, archived_at is not null as archived from editions where id = ${editionId}`;
    expect(edition).toEqual({ arrakis_won: true, archived: true });
  });
});
