import {
  closeEdition,
  executeCommand,
  type Command,
  type CommandLogEntry,
} from '#application/index.ts';
import { V1_RATING_RULES } from '#domain/index.ts';
import { describeCloseEditionContract, NOW } from '#support/application/close-edition-contract.ts';
import { FIXTURE_ROWS, LEAGUE_ID } from '#support/application/fixture.ts';
import {
  createOrganization,
  createUser,
  removeOrganization,
  removeUsers,
} from '#support/infrastructure/organizations.ts';
import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
import { postgresUnitOfWork } from '#infrastructure/commands.ts';
import { LOCAL_DATABASE_URL } from '#infrastructure/local.ts';

/**
 * Les commandes contre la base locale (`pnpm db:start`) : la même suite qu'en
 * mémoire, puis ce que seule une vraie base montre, le verrou (ADR 0009).
 */
const SLUG = 'essai-commandes';
const OTHER_SLUG = 'essai-commandes-autre';
const USERS_DOMAIN = 'commandes.essai.local';
const sql = postgres(LOCAL_DATABASE_URL, { onnotice: () => undefined });
const services = { unitOfWork: postgresUnitOfWork(sql), clock: { now: () => NOW } };

async function reset(): Promise<void> {
  await removeOrganization(sql, SLUG);
  await removeOrganization(sql, OTHER_SLUG);
  await removeUsers(sql, USERS_DOMAIN);
}

async function seed() {
  // Les identifiants du jeu d'essai sont fixes : une seule organisation d'essai à la fois.
  await reset();
  const organizationId = await createOrganization(sql, SLUG, V1_RATING_RULES, FIXTURE_ROWS);
  const otherOrganizationId = await createOrganization(sql, OTHER_SLUG, V1_RATING_RULES, {
    seasons: [],
    editions: [],
    matches: [],
    performances: [],
    players: [],
  });
  const [adminId, memberId, otherAdminId] = [
    await createUser(sql, `admin@${USERS_DOMAIN}`),
    await createUser(sql, `membre@${USERS_DOMAIN}`),
    await createUser(sql, `autre@${USERS_DOMAIN}`),
  ];
  await sql`
    insert into organization_members (organization_id, user_id, role) values
      (${organizationId}, ${adminId}, 'admin'),
      (${organizationId}, ${memberId}, 'member'),
      (${otherOrganizationId}, ${otherAdminId}, 'admin')`;
  return { organizationId, adminId, memberId, otherOrganizationId, otherAdminId };
}

afterAll(async () => {
  await reset();
  await sql.end();
});

describeCloseEditionContract('Postgres', () => ({
  services,
  seed,
  async edition(organizationId, editionId) {
    const [edition] = await sql<{ version: number; closed_at: Date | null }[]>`
      select version, closed_at from editions
      where organization_id = ${organizationId} and id = ${editionId}`;
    return (
      edition && { version: edition.version, closedAt: edition.closed_at?.toISOString() ?? null }
    );
  },
  async commandLog(organizationId) {
    const rows = await sql<
      {
        organization_id: string;
        command: string;
        actor_user_id: string;
        input: unknown;
        outcome: unknown;
        created_at: Date;
      }[]
    >`
      select organization_id, command, actor_user_id, input, outcome, created_at
      from command_log where organization_id = ${organizationId} order by created_at, id`;
    return rows.map((row): CommandLogEntry => ({
      organizationId: row.organization_id,
      command: row.command,
      actorUserId: row.actor_user_id,
      input: row.input,
      outcome: row.outcome,
      createdAt: row.created_at.toISOString(),
    }));
  },
  async hasProjections(organizationId) {
    const [found] = await sql`
      select 1 from player_season_ratings where organization_id = ${organizationId} limit 1`;
    return found !== undefined;
  },
}));

describe('deux commandes en même temps (ADR 0009)', () => {
  it('la seconde attend la première, lit la nouvelle version, et répond par un conflit', async () => {
    const { organizationId, adminId } = await seed();
    const actor = { userId: adminId, organizationId };
    const input = { editionId: LEAGUE_ID, version: 1 };

    const results = await Promise.allSettled([
      executeCommand(services, actor, closeEdition, input),
      executeCommand(services, actor, closeEdition, input),
    ]);

    expect(results.map((r) => r.status).toSorted()).toEqual(['fulfilled', 'rejected']);
    expect(results.find((r) => r.status === 'rejected')?.reason).toMatchObject({
      reason: 'conflict',
    });
    const [log] = await sql<{ count: number }[]>`
      select count(*)::int as count from command_log where organization_id = ${organizationId}`;
    expect(log?.count).toBe(1);
  });
});

describe('une erreur après l’écriture', () => {
  it('annule tout ce que la commande a écrit : ni clôture, ni journal', async () => {
    const { organizationId, adminId } = await seed();
    const closeThenFail: Command<{ editionId: string; version: number }, never> = {
      name: 'closeThenFail',
      async run(repositories, context, input) {
        await closeEdition.run(repositories, context, input);
        throw new Error('panne après l’écriture');
      },
    };

    await expect(
      executeCommand(services, { userId: adminId, organizationId }, closeThenFail, {
        editionId: LEAGUE_ID,
        version: 1,
      }),
    ).rejects.toThrow('panne');

    const [edition] = await sql<{ version: number; closed_at: Date | null }[]>`
      select version, closed_at from editions where id = ${LEAGUE_ID}`;
    expect(edition).toEqual({ version: 1, closed_at: null });
    const [log] = await sql<{ count: number }[]>`
      select count(*)::int as count from command_log where organization_id = ${organizationId}`;
    expect(log?.count).toBe(0);
  });
});
