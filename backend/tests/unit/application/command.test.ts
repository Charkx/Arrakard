import { V1_RATING_RULES } from '#domain/index.ts';
import { describe, expect, it } from 'vitest';
import { executeCommand, toFacts, type Command } from '#application/index.ts';
import { NOW } from '#support/application/command-harness.ts';
import { FIXTURE_ROWS } from '#support/application/fixture.ts';
import { inMemoryStore } from '#support/application/in-memory.ts';

const ORGANIZATION = '00000000-0000-4000-8000-000000000001';
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const MEMBER = '00000000-0000-4000-8000-0000000000a2';

/** Une commande d'essai, qui note ce qu'elle reçoit et rend son entrée doublée. */
function doubling() {
  const calls: { organizationId: string; actorUserId: string; now: string }[] = [];
  const command: Command<number, number> = {
    name: 'double',
    run: (_repositories, context, input) => {
      calls.push(context);
      return Promise.resolve(input * 2);
    },
  };
  return { command, calls };
}

function setup() {
  const store = inMemoryStore();
  store.addOrganization(ORGANIZATION, V1_RATING_RULES, toFacts(FIXTURE_ROWS));
  store.addMember(ORGANIZATION, ADMIN, 'admin');
  store.addMember(ORGANIZATION, MEMBER, 'member');
  return { store, services: { unitOfWork: store.unitOfWork, clock: { now: () => NOW } } };
}

describe('executeCommand', () => {
  it('exécute la commande d’un admin à l’heure de l’horloge, et rend son résultat', async () => {
    const { services } = setup();
    const { command, calls } = doubling();

    const outcome = await executeCommand(
      services,
      { userId: ADMIN, organizationId: ORGANIZATION },
      command,
      21,
    );

    expect(outcome).toBe(42);
    expect(calls).toEqual([
      { organizationId: ORGANIZATION, actorUserId: ADMIN, now: NOW.toISOString() },
    ]);
  });

  it('n’exécute pas la commande d’un utilisateur qui n’est pas admin', async () => {
    const { services, store } = setup();
    const { command, calls } = doubling();

    await expect(
      executeCommand(services, { userId: MEMBER, organizationId: ORGANIZATION }, command, 21),
    ).rejects.toMatchObject({ reason: 'forbidden' });
    expect(calls).toEqual([]);
    expect(store.commandLogOf(ORGANIZATION)).toEqual([]);
  });

  it('journalise le nom de la commande, son entrée et son résultat, puis recalcule', async () => {
    const { services, store } = setup();

    await executeCommand(
      services,
      { userId: ADMIN, organizationId: ORGANIZATION },
      doubling().command,
      21,
    );

    expect(store.commandLogOf(ORGANIZATION)).toEqual([
      {
        organizationId: ORGANIZATION,
        command: 'double',
        actorUserId: ADMIN,
        input: 21,
        outcome: 42,
        createdAt: NOW.toISOString(),
      },
    ]);
    expect(store.projectionsOf(ORGANIZATION)).toBeDefined();
  });
});
