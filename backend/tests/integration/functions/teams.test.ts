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

/** Les Edge Functions des équipes, sur l'API locale (`pnpm db:start`). */
const SLUG = 'essai-fonction-equipes';
const USERS_DOMAIN = 'fonction-equipes.essai.local';
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

describe('les fonctions des équipes', () => {
  it('refusent un visiteur sans connexion', async () => {
    const response = await callFunction('create-team', {
      organizationId,
      tag: 'ARK',
      name: 'Arrakis',
      divisions: [],
    });

    expect(response.status).toBe(401);
  });

  it('refusent un tag mal formé', async () => {
    const response = await callFunction(
      'create-team',
      { organizationId, tag: 'A', name: 'Arrakis', divisions: [] },
      admin.token,
    );

    expect(response.status).toBe(400);
  });

  it('laissent l’admin créer une équipe, y transférer un joueur, puis l’archiver', async () => {
    const created = await callFunction(
      'create-team',
      { organizationId, tag: 'ark', name: 'Arrakis', divisions: ['div1'] },
      admin.token,
    );
    expect(created.status).toBe(200);
    const { teamId } = (await created.json()) as { teamId: string };

    const transferred = await callFunction(
      'transfer-player',
      { organizationId, playerId: ZEPHYR_ID, to: { teamId, status: 'starter' } },
      admin.token,
    );
    expect(transferred.status).toBe(200);

    const archived = await callFunction('archive-team', { organizationId, teamId }, admin.token);
    expect(archived.status).toBe(200);

    const again = await callFunction('archive-team', { organizationId, teamId }, admin.token);
    expect(again.status).toBe(409);

    const [team] = await sql<{ tag: string; archived: boolean }[]>`
      select tag, archived_at is not null as archived from teams where id = ${teamId}`;
    expect(team).toEqual({ tag: 'ARK', archived: true });
    const stints = await sql<{ left_on: string | null }[]>`
      select left_on::text from team_memberships where player_id = ${ZEPHYR_ID}`;
    expect(stints).toHaveLength(1);
    expect(stints[0]?.left_on).not.toBeNull();
  });
});
