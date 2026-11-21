import { describeRecomputePortsContract } from '@arrakis/application/testing';
import postgres from 'postgres';
import { afterAll } from 'vitest';
import { LOCAL_DATABASE_URL } from './local.ts';
import { RATING_RULES } from './organizations.ts';
import { postgresRecomputePorts } from './ports.ts';
import { clearOrganization } from './tables.ts';
import { writeFacts } from './write.ts';

/**
 * La suite de contrat des ports du recalcul, contre la base locale
 * (`pnpm db:start`). Elle travaille dans une organisation à elle, recréée à
 * chaque test et supprimée à la fin.
 */
const SLUG = 'essai-contrat';
const sql = postgres(LOCAL_DATABASE_URL, { onnotice: () => undefined });

async function removeOrganization(): Promise<void> {
  await sql.begin(async (tx) => {
    const [organization] = await tx<
      { id: string }[]
    >`select id from organizations where slug = ${SLUG}`;
    if (!organization) return;
    await clearOrganization(tx, organization.id);
    await tx`delete from organizations where id = ${organization.id}`;
  });
}

afterAll(async () => {
  await removeOrganization();
  await sql.end();
});

describeRecomputePortsContract('Postgres', () => ({
  ports: postgresRecomputePorts(sql),
  async seed(rules, rows) {
    // Les identifiants du jeu d'essai sont fixes : une seule organisation d'essai à la fois.
    await removeOrganization();
    const ruleName = Object.keys(RATING_RULES).find((name) => RATING_RULES[name] === rules);
    return sql.begin(async (tx) => {
      const [organization] = await tx<{ id: string }[]>`
        insert into organizations (slug, name, rating_rules)
        values (${SLUG}, 'Essai du contrat', ${ruleName ?? 'inconnues'})
        returning id`;
      if (!organization) throw new Error('Organisation d’essai : création impossible.');
      // Les colonnes obligatoires que les faits de jeu ne portent pas.
      await writeFacts(tx, organization.id, {
        seasons: rows.seasons.map((s) => ({ ...s, name: 'Saison d’essai', year: 2026 })),
        teams: [],
        players: rows.players.map((p) => ({ ...p, merged_into: null })),
        player_aliases: [],
        team_memberships: [],
        editions: rows.editions.map((e, i) => ({ ...e, name: `Édition d’essai ${i + 1}` })),
        matches: rows.matches,
        performances: rows.performances,
        edition_participants: [],
        card_customizations: [],
        registrations: [],
      });
      return organization.id;
    });
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
