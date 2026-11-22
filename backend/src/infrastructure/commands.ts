import {
  CommandRejected,
  type Clock,
  type CommandLog,
  type EditionRepository,
  type MembershipRepository,
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
          editions: postgresEditions(tx),
          commandLog: postgresCommandLog(tx),
        });
      })) as Awaited<ReturnType<typeof work>>;
    },
  };
}

function postgresMemberships(tx: TransactionSql): MembershipRepository {
  return {
    async isAdmin(organizationId, userId) {
      const [member] = await tx`
        select 1 from organization_members
        where organization_id = ${organizationId} and user_id = ${userId} and role = 'admin'`;
      return member !== undefined;
    },
    async discordUserId(userId) {
      // L'identité Discord vient de Supabase Auth, pas du site (ADR 0002).
      const [identity] = await tx<{ provider_id: string }[]>`
        select provider_id from auth.identities
        where user_id = ${userId} and provider = 'discord'`;
      return identity?.provider_id;
    },
    async setRole(organizationId, userId, role) {
      if (role === null) {
        await tx`
          delete from organization_members
          where organization_id = ${organizationId} and user_id = ${userId}`;
        return;
      }
      await tx`
        insert into organization_members (organization_id, user_id, role)
        values (${organizationId}, ${userId}, ${role})
        on conflict (organization_id, user_id) do update set role = excluded.role`;
    },
  };
}

function postgresEditions(tx: TransactionSql): EditionRepository {
  return {
    async find(organizationId, editionId) {
      const [edition] = await tx<
        { version: number; closed_at: Date | null; draft_match_ids: string[] }[]
      >`
        select e.version, e.closed_at,
               array(select m.id from matches m where m.edition_id = e.id and m.draft order by m.id)
                 as draft_match_ids
        from editions e
        where e.organization_id = ${organizationId} and e.id = ${editionId}`;
      return (
        edition && {
          version: edition.version,
          closedAt: toIso(edition.closed_at),
          draftMatchIds: edition.draft_match_ids,
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
