import { V1_RATING_RULES } from '#domain/index.ts';
import { LOCAL_DATABASE_URL } from '#infrastructure/local.ts';
import { FIXTURE_ROWS, SEASON_ID } from '#support/application/fixture.ts';
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

/** Les Edge Functions `close-season` et `open-season`, sur l'API locale (`pnpm db:start`). */
const SLUG = 'essai-fonction-saisons';
const USERS_DOMAIN = 'fonction-saisons.essai.local';
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

describe('les fonctions des saisons', () => {
  it('refusent un visiteur sans connexion', async () => {
    expect(
      (await callFunction('close-season', { organizationId, seasonId: SEASON_ID })).status,
    ).toBe(401);
  });

  it('refusent d’ouvrir une saison tant que la précédente est ouverte', async () => {
    const response = await callFunction(
      'open-season',
      { organizationId, name: 'Saison 4', year: 2027 },
      admin.token,
    );

    expect(response.status).toBe(409);
  });

  it('laissent l’admin clôturer la saison, puis ouvrir la suivante', async () => {
    const closed = await callFunction(
      'close-season',
      { organizationId, seasonId: SEASON_ID },
      admin.token,
    );
    expect(closed.status).toBe(200);

    const opened = await callFunction(
      'open-season',
      { organizationId, name: 'Saison 4', year: 2027 },
      admin.token,
    );
    expect(opened.status).toBe(200);
    const { seasonId } = (await opened.json()) as { seasonId: string };
    const seasons = await sql<{ id: string; status: string }[]>`
      select id, status from seasons where organization_id = ${organizationId} order by status`;
    expect(seasons).toEqual([
      { id: SEASON_ID, status: 'closed' },
      { id: seasonId, status: 'open' },
    ]);
  });
});
