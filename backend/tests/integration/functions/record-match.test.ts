import { V1_RATING_RULES } from '#domain/index.ts';
import { LOCAL_DATABASE_URL } from '#infrastructure/local.ts';
import { FIXTURE_ROWS, OFF_SEASON_ID } from '#support/application/fixture.ts';
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

/** L'Edge Function `record-match`, sur l'API locale (`pnpm db:start`). */
const SLUG = 'essai-fonction-saisie';
const USERS_DOMAIN = 'fonction-saisie.essai.local';
const sql = postgres(LOCAL_DATABASE_URL, { onnotice: () => undefined });

async function reset(): Promise<void> {
  await removeOrganization(sql, SLUG);
  await removeUsers(sql, USERS_DOMAIN);
}

let organizationId: string;
let admin: SignedUp;
let ids: string[];

beforeAll(async () => {
  await reset();
  organizationId = await createOrganization(sql, SLUG, V1_RATING_RULES, FIXTURE_ROWS);
  admin = await signUpAs(`admin@${USERS_DOMAIN}`);
  await sql`
    insert into organization_members (organization_id, user_id, role)
    values (${organizationId}, ${admin.id}, 'admin')`;
  const rows = await sql<{ id: string }[]>`
    insert into players ${sql(
      Array.from({ length: 10 }, (_, i) => ({
        organization_id: organizationId,
        nickname: `Joueur ${String(i + 1)}`,
      })),
    )}
    returning id`;
  ids = rows.map((r) => r.id);
});

afterAll(async () => {
  await reset();
  await sql.end();
});

const body = (players: readonly string[]) => ({
  organizationId,
  editionId: OFF_SEASON_ID,
  version: 1,
  durationSeconds: 1930,
  winner: 'A',
  teams: ['Noxus', 'Ionia'],
  lines: ['TOP', 'JGL', 'MID', 'ADC', 'SUP'].map((role, i) => ({
    role,
    sides: [0, 5].map((offset) => ({
      playerId: players[i + offset],
      champion: 'Ornn',
      kills: 1,
      deaths: 1,
      assists: 1,
      gold: 9000,
    })),
  })),
});

describe('la fonction de saisie d’un match', () => {
  it('refuse un visiteur sans connexion', async () => {
    expect((await callFunction('record-match', body(ids))).status).toBe(401);
  });

  it('refuse une feuille où un joueur est saisi deux fois', async () => {
    const twice = [...ids.slice(0, 9), ids[0] ?? ''];

    expect((await callFunction('record-match', body(twice), admin.token)).status).toBe(409);
  });

  it('laisse l’admin saisir un match, en brouillon, invisible du public', async () => {
    const response = await callFunction('record-match', body(ids), admin.token);

    expect(response.status).toBe(200);
    const { matchId } = (await response.json()) as { matchId: string };
    const [match] = await sql<{ draft: boolean; winner_team: string }[]>`
      select draft, winner_team from matches where id = ${matchId}`;
    expect(match).toEqual({ draft: true, winner_team: 'Noxus' });
  });
});
