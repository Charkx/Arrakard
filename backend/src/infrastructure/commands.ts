import {
  CommandRejected,
  type Clock,
  type CommandLog,
  type EditionRepository,
  type IdentityRepository,
  type MembershipRepository,
  type SeasonRepository,
  type UnitOfWork,
} from '../application/index.ts';
import type { Sql, TransactionSql } from 'postgres';
import { postgresRecomputePorts } from './ports.ts';

/** L'heure du serveur. */
export const systemClock: Clock = { now: () => new Date() };

/**
 * L'unité de travail sur Postgres : une transaction qui commence par
 * verrouiller la ligne de l'organisation (ADR 0009). Une seconde commande de
 * la même organisation attend que la première ait fini.
 */
export function postgresUnitOfWork(sql: Sql): UnitOfWork {
  return {
    async run(organizationId, work) {
      // `begin` rend `UnwrapPromiseArray<T>`, qui vaut T pour un résultat qui n'est pas un tableau de promesses.
      return (await sql.begin(async (tx) => {
        await tx`select 1 from organizations where id = ${organizationId} for update`;
        return work({
          ...postgresRecomputePorts(tx),
          memberships: postgresMemberships(tx),
          identities: postgresIdentities(tx),
          editions: postgresEditions(tx),
          seasons: postgresSeasons(tx),
          commandLog: postgresCommandLog(tx),
        });
      })) as Awaited<ReturnType<typeof work>>;
    },
  };
}

function postgresMemberships(tx: TransactionSql): MembershipRepository {
  return {
    async isAdmin(organizationId, userId) {
      // La même règle que les droits de la base, fraîcheur comprise (ADR 0030).
      const [result] = await tx<{ admin: boolean }[]>`
        select public.is_admin_of(${organizationId}, ${userId}) as admin`;
      return result?.admin === true;
    },
    async setRole(organizationId, userId, role, syncedAt) {
      if (role === null) {
        await tx`
          delete from organization_members
          where organization_id = ${organizationId} and user_id = ${userId}`;
        return;
      }
      await tx`
        insert into organization_members (organization_id, user_id, role, synced_at)
        values (${organizationId}, ${userId}, ${role}, ${syncedAt})
        on conflict (organization_id, user_id)
        do update set role = excluded.role, synced_at = excluded.synced_at`;
    },
  };
}

function postgresIdentities(tx: TransactionSql): IdentityRepository {
  return {
    async discordUserId(userId) {
      // L'identité Discord vient de Supabase Auth, jamais du site (ADR 0002).
      const [identity] = await tx<{ provider_id: string }[]>`
        select provider_id from auth.identities
        where user_id = ${userId} and provider = 'discord'`;
      return identity?.provider_id;
    },
  };
}

function postgresEditions(tx: TransactionSql): EditionRepository {
  return {
    async find(organizationId, editionId) {
      const [edition] = await tx<
        {
          version: number;
          closed_at: Date | null;
          draft_match_ids: string[];
          season_closed: boolean;
        }[]
      >`
        select e.version, e.closed_at,
               array(select m.id from matches m where m.edition_id = e.id and m.draft order by m.id)
                 as draft_match_ids,
               coalesce(s.status = 'closed', false) as season_closed
        from editions e
        left join seasons s on s.id = e.season_id
        where e.organization_id = ${organizationId} and e.id = ${editionId}`;
      return (
        edition && {
          version: edition.version,
          closedAt: toIso(edition.closed_at),
          draftMatchIds: edition.draft_match_ids,
          seasonClosed: edition.season_closed,
        }
      );
    },
    async close(organizationId, editionId, closedAt, version) {
      const newVersion = await bumpVersion(tx, organizationId, editionId, version);
      await tx`
        update editions set closed_at = ${closedAt}
        where organization_id = ${organizationId} and id = ${editionId}`;
      return newVersion;
    },
    async publish(organizationId, { editionId, matchIds, publishedAt, publishedBy }, version) {
      const newVersion = await bumpVersion(tx, organizationId, editionId, version);
      await tx`
        update matches set draft = false
        where organization_id = ${organizationId} and id = any(${matchIds as string[]}::uuid[])`;
      const [publication] = await tx<{ id: string }[]>`
        insert into publications (organization_id, edition_id, published_by, published_at, match_ids)
        values (${organizationId}, ${editionId}, ${publishedBy}, ${publishedAt}, ${matchIds as string[]}::uuid[])
        returning id`;
      if (!publication) throw new Error('Publication : écriture impossible.');
      return { publicationId: publication.id, version: newVersion };
    },
  };
}

/**
 * Augmente la version d'une édition encore à `version` ; sinon, un conflit
 * (ADR 0005). La commande a déjà comparé les versions sous le verrou de
 * l'organisation : la condition reste le garde de la base.
 */
async function bumpVersion(
  tx: TransactionSql,
  organizationId: string,
  editionId: string,
  version: number,
): Promise<number> {
  const [edition] = await tx<{ version: number }[]>`
    update editions set version = version + 1
    where organization_id = ${organizationId} and id = ${editionId} and version = ${version}
    returning version`;
  if (!edition) throw new CommandRejected('conflict', `Édition ${editionId} : version périmée.`);
  return edition.version;
}

function postgresSeasons(tx: TransactionSql): SeasonRepository {
  return {
    async find(organizationId, seasonId) {
      const [season] = await tx<{ status: 'open' | 'closed' }[]>`
        select status from seasons where organization_id = ${organizationId} and id = ${seasonId}`;
      return season && { status: season.status };
    },
    async openSeasonId(organizationId) {
      const [season] = await tx<{ id: string }[]>`
        select id from seasons where organization_id = ${organizationId} and status = 'open'`;
      return season?.id;
    },
    async nameTaken(organizationId, name) {
      const [season] = await tx`
        select 1 from seasons where organization_id = ${organizationId} and name = ${name}`;
      return season !== undefined;
    },
    async open(organizationId, { name, year, startDate }) {
      const [season] = await tx<{ id: string }[]>`
        insert into seasons (organization_id, name, year, start_date, status)
        values (${organizationId}, ${name}, ${year}, ${startDate}, 'open')
        returning id`;
      if (!season) throw new Error(`Saison ${name} : écriture impossible.`);
      return season.id;
    },
    async close(organizationId, seasonId, endDate) {
      await tx`
        update seasons set status = 'closed', end_date = ${endDate}
        where organization_id = ${organizationId} and id = ${seasonId}`;
    },
  };
}

function postgresCommandLog(tx: TransactionSql): CommandLog {
  return {
    async append(entry) {
      await tx`
        insert into command_log (organization_id, command, actor_user_id, input, outcome, created_at)
        values (${entry.organizationId}, ${entry.command}, ${entry.actorUserId},
                ${tx.json(entry.input as never)}, ${tx.json(entry.outcome as never)}, ${entry.createdAt})`;
    },
  };
}

function toIso(date: Date | null): string | null {
  return date === null ? null : date.toISOString();
}
