import {
  closeEdition,
  executeCommand,
  publishEdition,
  recomputeProjections,
  type Command,
} from '#application/index.ts';
import { ZEPHYR_ID } from '#support/application/fixture.ts';
import { postgresRecomputePorts } from '#infrastructure/ports.ts';
import { describeCloseEditionContract } from '#support/application/close-edition-contract.ts';
import { LEAGUE_ID } from '#support/application/fixture.ts';
import { describePublishEditionContract } from '#support/application/publish-edition-contract.ts';
import { describeSeasonContract } from '#support/application/season-contract.ts';
import {
  postgresCommandHarness,
  resetPostgresHarness,
} from '#support/infrastructure/postgres-harness.ts';
import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
import { LOCAL_DATABASE_URL } from '#infrastructure/local.ts';

/**
 * Les commandes contre la base locale (`pnpm db:start`) : la même suite qu'en
 * mémoire, puis ce que seule une vraie base montre, le verrou (ADR 0009).
 */
const NAMES = {
  slug: 'essai-commandes',
  otherSlug: 'essai-commandes-autre',
  usersDomain: 'commandes.essai.local',
};
const sql = postgres(LOCAL_DATABASE_URL, { onnotice: () => undefined });
const harness = postgresCommandHarness(sql, NAMES);
const { services, seed } = harness;

afterAll(async () => {
  await resetPostgresHarness(sql, NAMES);
  await sql.end();
});

describeCloseEditionContract('Postgres', () => harness);
describePublishEditionContract('Postgres', () => harness);
describeSeasonContract('Postgres', () => harness);

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

describe('les notes et les brouillons (ADR 0012)', () => {
  /** Les matchs de Zéphyr que compte sa note de saison. */
  async function zephyrGames(organizationId: string): Promise<number | undefined> {
    const [rating] = await sql<{ games: number }[]>`
      select games from player_season_ratings
      where organization_id = ${organizationId} and player_id = ${ZEPHYR_ID}`;
    return rating?.games;
  }

  it('un brouillon ne compte dans aucune note ; publié, il compte', async () => {
    const { organizationId, adminId } = await seed();
    await harness.addDraftMatch(organizationId, LEAGUE_ID);

    await recomputeProjections(postgresRecomputePorts(sql), organizationId);
    expect(await zephyrGames(organizationId)).toBe(1);

    await executeCommand(services, { userId: adminId, organizationId }, publishEdition, {
      editionId: LEAGUE_ID,
      version: 1,
    });
    expect(await zephyrGames(organizationId)).toBe(2);
  });
});
