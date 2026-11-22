import { V1_RATING_RULES } from '#domain/index.ts';
import { DRAFT_MATCH_NUMBER } from '#support/application/command-harness.ts';
import { FIXTURE_ROWS, LEAGUE_ID } from '#support/application/fixture.ts';
import { callFunction, signUp, type SignedUp } from '#support/infrastructure/functions.ts';
import {
  createOrganization,
  removeOrganization,
  removeUsers,
} from '#support/infrastructure/organizations.ts';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LOCAL_DATABASE_URL } from '#infrastructure/local.ts';

/**
 * L'Edge Function `publish-edition`, de bout en bout sur l'API locale : un
 * brouillon invisible du public le devient une fois publié (ADR 0012).
 */
const SLUG = 'essai-publication';
const USERS_DOMAIN = 'publication.essai.local';
const sql = postgres(LOCAL_DATABASE_URL, { onnotice: () => undefined });
const publish = (body: unknown, token?: string) => callFunction('publish-edition', body, token);

async function reset(): Promise<void> {
  await removeOrganization(sql, SLUG);
  await removeUsers(sql, USERS_DOMAIN);
}

/** Les matchs de l'édition qu'un visiteur voit, par l'API. */
async function publicMatchCount(): Promise<number> {
  return sql.begin(async (tx) => {
    await tx`set local role anon`;
    const [row] = await tx<{ count: number }[]>`
      select count(*)::int as count from matches where edition_id = ${LEAGUE_ID}`;
    return row?.count ?? 0;
  });
}

let organizationId: string;
let admin: SignedUp;

beforeAll(async () => {
  await reset();
  organizationId = await createOrganization(sql, SLUG, V1_RATING_RULES, FIXTURE_ROWS);
  admin = await signUp(`admin@${USERS_DOMAIN}`);
  await sql`
    insert into organization_members (organization_id, user_id, role)
    values (${organizationId}, ${admin.id}, 'admin')`;
  await sql`
    insert into matches (organization_id, edition_id, match_number, winner_team, duration_seconds, draft)
    values (${organizationId}, ${LEAGUE_ID}, ${DRAFT_MATCH_NUMBER}, 'ARK', 1500, true)`;
});

afterAll(async () => {
  await reset();
  await sql.end();
});

describe('la fonction publish-edition', () => {
  const input = () => ({ organizationId, editionId: LEAGUE_ID, version: 1 });

  it('refuse un visiteur sans connexion', async () => {
    expect((await publish(input())).status).toBe(401);
  });

  it('un brouillon est invisible du public, puis visible une fois publié par l’admin', async () => {
    expect(await publicMatchCount()).toBe(1);

    const response = await publish(input(), admin.token);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ editionId: LEAGUE_ID, version: 2 });
    expect(await publicMatchCount()).toBe(2);
  });

  it('répond 409 quand il ne reste aucun brouillon à publier', async () => {
    const response = await publish({ ...input(), version: 2 }, admin.token);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: 'nothing_to_publish' });
  });
});
