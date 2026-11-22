import { describeRecomputePortsContract } from '#support/application/index.ts';
import { createOrganization, removeOrganization } from '#support/infrastructure/organizations.ts';
import postgres from 'postgres';
import { afterAll } from 'vitest';
import { LOCAL_DATABASE_URL } from '#infrastructure/local.ts';
import { postgresRecomputePorts } from '#infrastructure/ports.ts';

/**
 * La suite de contrat des ports du recalcul, contre la base locale
 * (`pnpm db:start`). Elle travaille dans une organisation à elle, recréée à
 * chaque test et supprimée à la fin.
 */
const SLUG = 'essai-contrat';
const sql = postgres(LOCAL_DATABASE_URL, { onnotice: () => undefined });

afterAll(async () => {
  await removeOrganization(sql, SLUG);
  await sql.end();
});

describeRecomputePortsContract('Postgres', () => ({
  ports: postgresRecomputePorts(sql),
  async seed(rules, rows) {
    // Les identifiants du jeu d'essai sont fixes : une seule organisation d'essai à la fois.
    await removeOrganization(sql, SLUG);
    return createOrganization(sql, SLUG, rules, rows);
  },
  async countProjections(organizationId) {
    const [counts] = await sql<
      { seasonRatings: number; editionHistory: number; editionStandings: number }[]
    >`
      select
        (select count(*)::int from player_season_ratings where organization_id = ${organizationId}) as "seasonRatings",
        (select count(*)::int from player_edition_history where organization_id = ${organizationId}) as "editionHistory",
        (select count(*)::int from edition_standings where organization_id = ${organizationId}) as "editionStandings"`;
    if (!counts) throw new Error('Comptage impossible.');
    return counts;
  },
}));
