import type { CommandLogEntry, RosterStatus, SeasonStatus } from '#application/index.ts';
import type { Division } from '#domain/index.ts';
import { V1_RATING_RULES } from '#domain/index.ts';
import { postgresUnitOfWork } from '#infrastructure/commands.ts';
import { readFacts } from '#infrastructure/read.ts';
import type { Sql } from 'postgres';
import {
  DRAFT_MATCH_NUMBER,
  NOW,
  PUBLISHED_MATCH_NUMBER,
  type CommandHarness,
} from '../application/command-harness.ts';
import { FIXTURE_ROWS, SIROCCO_ID, ZEPHYR_ID } from '../application/fixture.ts';
import {
  createOrganization,
  createUser,
  removeOrganization,
  removeUsers,
} from './organizations.ts';

/** Les organisations et utilisateurs d'essai d'un fichier de tests, à leurs noms à lui. */
export interface PostgresHarnessNames {
  readonly slug: string;
  readonly otherSlug: string;
  readonly usersDomain: string;
}

/** Supprime les organisations et les utilisateurs d'essai. */
export async function resetPostgresHarness(sql: Sql, names: PostgresHarnessNames): Promise<void> {
  await removeOrganization(sql, names.slug);
  await removeOrganization(sql, names.otherSlug);
  await removeUsers(sql, names.usersDomain);
}

/**
 * Le harnais des suites de contrat des commandes, sur la base locale. Les
 * identifiants du jeu d'essai sont fixes : une seule organisation d'essai à
 * la fois, recréée par `seed`.
 */
export function postgresCommandHarness(sql: Sql, names: PostgresHarnessNames): CommandHarness {
  return {
    services: { unitOfWork: postgresUnitOfWork(sql), clock: { now: () => NOW } },
    async seed() {
      await resetPostgresHarness(sql, names);
      const organizationId = await createOrganization(
        sql,
        names.slug,
        V1_RATING_RULES,
        FIXTURE_ROWS,
      );
      const otherOrganizationId = await createOrganization(sql, names.otherSlug, V1_RATING_RULES, {
        seasons: [],
        editions: [],
        matches: [],
        performances: [],
        players: [],
      });
      const adminId = await createUser(sql, `admin@${names.usersDomain}`);
      const memberId = await createUser(sql, `membre@${names.usersDomain}`);
      const otherAdminId = await createUser(sql, `autre@${names.usersDomain}`);
      await sql`
        insert into organization_members (organization_id, user_id, role) values
          (${organizationId}, ${adminId}, 'admin'),
          (${organizationId}, ${memberId}, 'member'),
          (${otherOrganizationId}, ${otherAdminId}, 'admin')`;
      return { organizationId, adminId, memberId, otherOrganizationId, otherAdminId };
    },
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
    async addDraftMatch(organizationId, editionId) {
      const [match] = await sql<{ id: string }[]>`
        insert into matches (organization_id, edition_id, match_number, winner_team, duration_seconds, draft)
        values (${organizationId}, ${editionId}, ${DRAFT_MATCH_NUMBER}, 'ARK', 1500, true)
        returning id`;
      if (!match) throw new Error('Brouillon : écriture impossible.');
      const performances = FIXTURE_ROWS.performances
        .filter((p) => p.player_id === ZEPHYR_ID || p.player_id === SIROCCO_ID)
        .map((p) => ({ ...p, match_id: match.id, organization_id: organizationId }));
      await sql`insert into performances ${sql(performances)}`;
      return match.id;
    },
    publishedMatchIds: async (organizationId) =>
      (await readFacts(sql, organizationId)).matches.map((m) => m.id),
    async season(organizationId, seasonId) {
      const [season] = await sql<{ status: SeasonStatus; end_date: string | null }[]>`
        select status, end_date::text from seasons
        where organization_id = ${organizationId} and id = ${seasonId}`;
      return season && { status: season.status, endDate: season.end_date };
    },
    async addPublishedMatch(organizationId, editionId, playerId) {
      const [match] = await sql<{ id: string }[]>`
        insert into matches (organization_id, edition_id, match_number, winner_team, duration_seconds)
        values (${organizationId}, ${editionId}, ${PUBLISHED_MATCH_NUMBER}, 'ARK', 1600)
        returning id`;
      if (!match) throw new Error('Match : écriture impossible.');
      await sql`
        insert into performances (organization_id, match_id, line, side, player_id, team, role,
                                  champion, result, kills, deaths, assists, gold)
        values (${organizationId}, ${match.id}, 2, 'A', ${playerId}, 'ARK', 'MID',
                'Ahri', 'win', 5, 2, 6, 11000)`;
      return match.id;
    },
    async profile(organizationId, playerId) {
      const [player] = await sql<
        { merged_into: string | null; discord_user_id: string | null; aliases: string[] }[]
      >`
        select merged_into, discord_user_id,
               array(select alias from player_aliases a
                     where a.player_id = p.id order by alias) as aliases
        from players p where organization_id = ${organizationId} and id = ${playerId}`;
      return (
        player && {
          mergedInto: player.merged_into,
          discordUserId: player.discord_user_id,
          aliases: player.aliases,
        }
      );
    },
    async performanceMatchIds(organizationId, playerId) {
      const rows = await sql<{ match_id: string }[]>`
        select match_id from performances
        where organization_id = ${organizationId} and player_id = ${playerId}
        order by match_id`;
      return rows.map((r) => r.match_id);
    },
    async markMerged(organizationId, absorbedId, keptId) {
      await sql`
        update players set merged_into = ${keptId}
        where organization_id = ${organizationId} and id = ${absorbedId}`;
    },
    async team(organizationId, teamId) {
      const [team] = await sql<
        { tag: string; name: string; divisions: Division[]; archived_at: Date | null }[]
      >`
        select tag, name, divisions, archived_at from teams
        where organization_id = ${organizationId} and id = ${teamId}`;
      return (
        team && {
          tag: team.tag,
          name: team.name,
          divisions: team.divisions,
          archivedAt: team.archived_at?.toISOString() ?? null,
        }
      );
    },
    async stints(organizationId, playerId) {
      const rows = await sql<
        { team_id: string; status: RosterStatus; joined_on: string; left_on: string | null }[]
      >`
        select team_id, status, joined_on::text, left_on::text from team_memberships
        where organization_id = ${organizationId} and player_id = ${playerId}
        order by joined_on, left_on nulls last, id`;
      return rows.map((r) => ({
        teamId: r.team_id,
        status: r.status,
        joinedOn: r.joined_on,
        leftOn: r.left_on,
      }));
    },
    async seasonRatings(organizationId, seasonId) {
      const rows = await sql<{ player_id: string; rating: number }[]>`
        select player_id, rating from player_season_ratings
        where organization_id = ${organizationId} and season_id = ${seasonId}`;
      return new Map(rows.map((r) => [r.player_id, r.rating]));
    },
    async publications(organizationId) {
      const rows = await sql<
        { edition_id: string; match_ids: string[]; published_at: Date; published_by: string }[]
      >`
        select edition_id, match_ids, published_at, published_by from publications
        where organization_id = ${organizationId} order by published_at, id`;
      return rows.map((row) => ({
        editionId: row.edition_id,
        matchIds: row.match_ids,
        publishedAt: row.published_at.toISOString(),
        publishedBy: row.published_by,
      }));
    },
  };
}
