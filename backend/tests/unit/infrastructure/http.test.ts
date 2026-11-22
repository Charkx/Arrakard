import { closeEdition, toFacts } from '#application/index.ts';
import { closeEditionRequest } from '#contracts/index.ts';
import { V1_RATING_RULES } from '#domain/index.ts';
import { NOW } from '#support/application/close-edition-contract.ts';
import { FIXTURE_ROWS, LEAGUE_ID } from '#support/application/fixture.ts';
import { inMemoryStore } from '#support/application/in-memory.ts';
import { describe, expect, it, vi } from 'vitest';
import { commandHandler, type Authenticator } from '#infrastructure/http.ts';

const ORGANIZATION = '00000000-0000-4000-8000-000000000001';
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const MEMBER = '00000000-0000-4000-8000-0000000000a2';

/** Le jeton « Bearer <identifiant> » désigne cet utilisateur ; sans jeton, personne. */
const byToken: Authenticator = {
  userId: (request) =>
    Promise.resolve(request.headers.get('Authorization')?.slice('Bearer '.length)),
};

function setup() {
  const store = inMemoryStore();
  store.addOrganization(ORGANIZATION, V1_RATING_RULES, toFacts(FIXTURE_ROWS));
  store.addMember(ORGANIZATION, ADMIN, 'admin');
  store.addMember(ORGANIZATION, MEMBER, 'member');
  const services = { unitOfWork: store.unitOfWork, clock: { now: () => NOW } };
  return { store, handle: commandHandler(closeEdition, closeEditionRequest, services, byToken) };
}

function post(body: unknown, userId?: string): Request {
  return new Request('http://localhost/close-edition', {
    method: 'POST',
    headers: userId === undefined ? {} : { Authorization: `Bearer ${userId}` },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const VALID = { organizationId: ORGANIZATION, editionId: LEAGUE_ID, version: 1 };

describe('commandHandler', () => {
  it('exécute la commande pour l’utilisateur du jeton, et rend son résultat', async () => {
    const { handle, store } = setup();

    const response = await handle(post(VALID, ADMIN));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      editionId: LEAGUE_ID,
      closedAt: NOW.toISOString(),
      version: 2,
    });
    expect(store.commandLogOf(ORGANIZATION)[0]).toMatchObject({
      actorUserId: ADMIN,
      input: { editionId: LEAGUE_ID, version: 1 },
    });
  });

  it('répond 401 sans jeton valide, sans rien exécuter', async () => {
    const { handle, store } = setup();

    const response = await handle(post(VALID));

    expect(response.status).toBe(401);
    expect(store.commandLogOf(ORGANIZATION)).toEqual([]);
  });

  it.each([
    ['un corps qui n’est pas du JSON', 'pas du json'],
    ['une entrée que le contrat refuse', { ...VALID, version: 0 }],
  ])('répond 400 à %s', async (_case, body) => {
    const response = await setup().handle(post(body, ADMIN));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'invalid_input' });
  });

  it.each([
    ['403 à un membre qui n’est pas admin', MEMBER, VALID, 403, 'forbidden'],
    [
      '404 à une édition inconnue',
      ADMIN,
      { ...VALID, editionId: '00000000-0000-4000-8000-00000000b0ff' },
      404,
      'not_found',
    ],
    ['409 à une version périmée', ADMIN, { ...VALID, version: 7 }, 409, 'conflict'],
  ])('répond %s', async (_case, userId, body, status, error) => {
    const response = await setup().handle(post(body, userId));

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error });
  });

  it('répond 500 à une erreur imprévue, sans en dévoiler le détail', async () => {
    const { handle, store } = setup();
    vi.spyOn(store.unitOfWork, 'run').mockRejectedValueOnce(new Error('connexion perdue'));
    const log = vi.spyOn(console, 'error').mockImplementationOnce(() => undefined);

    const response = await handle(post(VALID, ADMIN));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'internal' });
    expect(log).toHaveBeenCalled();
  });

  it('autorise le site à appeler depuis un autre domaine', async () => {
    const response = await setup().handle(
      new Request('http://localhost/close-edition', { method: 'OPTIONS' }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('refuse une autre méthode que POST', async () => {
    const response = await setup().handle(new Request('http://localhost/close-edition'));

    expect(response.status).toBe(405);
  });
});
