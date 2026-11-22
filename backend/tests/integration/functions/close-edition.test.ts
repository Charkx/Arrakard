import { V1_RATING_RULES } from '#domain/index.ts';
import { FIXTURE_ROWS, LEAGUE_ID } from '#support/application/fixture.ts';
import {
  createOrganization,
  removeOrganization,
  removeUsers,
} from '#support/infrastructure/organizations.ts';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LOCAL_DATABASE_URL } from '#infrastructure/local.ts';

/**
 * L'Edge Function `close-edition`, de bout en bout sur l'API locale
 * (`pnpm db:start`) : vraie connexion, vraie fonction, vraie base.
 */
const API = 'http://127.0.0.1:54321';
/** La clé publique de l'API locale (voir `frontend/src/data/supabase-source.ts`). */
const LOCAL_KEY = 'sb_publishable_local';
const SLUG = 'essai-fonction';
const OTHER_SLUG = 'essai-fonction-autre';
const USERS_DOMAIN = 'fonction.essai.local';
const sql = postgres(LOCAL_DATABASE_URL, { onnotice: () => undefined });

/** Crée un compte par l'API de connexion, et rend son identifiant et son jeton. */
async function signUp(name: string): Promise<{ id: string; token: string }> {
  const response = await fetch(`${API}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: LOCAL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${name}@${USERS_DOMAIN}`, password: 'mot-de-passe-d-essai' }),
  });
  const body = (await response.json()) as { access_token?: string; user?: { id: string } };
  if (!body.access_token || !body.user) {
    throw new Error(`Inscription de ${name} impossible : ${JSON.stringify(body)}`);
  }
  return { id: body.user.id, token: body.access_token };
}

function closeEdition(body: unknown, token?: string): Promise<Response> {
  return fetch(`${API}/functions/v1/close-edition`, {
    method: 'POST',
    headers: {
      apikey: LOCAL_KEY,
      'Content-Type': 'application/json',
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
}

async function reset(): Promise<void> {
  await removeOrganization(sql, SLUG);
  await removeOrganization(sql, OTHER_SLUG);
  await removeUsers(sql, USERS_DOMAIN);
}

let organizationId: string;
let admin: { id: string; token: string };
let otherAdmin: { id: string; token: string };
let outsider: { id: string; token: string };

beforeAll(async () => {
  await reset();
  organizationId = await createOrganization(sql, SLUG, V1_RATING_RULES, FIXTURE_ROWS);
  const otherOrganizationId = await createOrganization(sql, OTHER_SLUG, V1_RATING_RULES, {
    seasons: [],
    editions: [],
    matches: [],
    performances: [],
    players: [],
  });
  admin = await signUp('admin');
  otherAdmin = await signUp('autre');
  outsider = await signUp('visiteur');
  await sql`
    insert into organization_members (organization_id, user_id, role) values
      (${organizationId}, ${admin.id}, 'admin'),
      (${otherOrganizationId}, ${otherAdmin.id}, 'admin')`;
});

afterAll(async () => {
  await reset();
  await sql.end();
});

describe('la fonction close-edition', () => {
  const input = () => ({ organizationId, editionId: LEAGUE_ID, version: 1 });

  it('refuse un visiteur sans connexion', async () => {
    expect((await closeEdition(input())).status).toBe(401);
  });

  it('refuse un joueur connecté qui n’est membre d’aucune organisation', async () => {
    expect((await closeEdition(input(), outsider.token)).status).toBe(403);
  });

  it('refuse l’admin d’une autre organisation', async () => {
    expect((await closeEdition(input(), otherAdmin.token)).status).toBe(403);
  });

  it('laisse l’admin de l’organisation clôturer l’édition, une fois', async () => {
    const response = await closeEdition(input(), admin.token);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ editionId: LEAGUE_ID, version: 2 });
    const [edition] = await sql<{ closed_at: Date | null }[]>`
      select closed_at from editions where id = ${LEAGUE_ID}`;
    expect(edition?.closed_at).toBeInstanceOf(Date);
  });

  it('répond 409 à une version périmée', async () => {
    const response = await closeEdition(input(), admin.token);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: 'conflict' });
  });
});
