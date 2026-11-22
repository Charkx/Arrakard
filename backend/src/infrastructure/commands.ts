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
  };
}

function postgresEditions(tx: TransactionSql): EditionRepository {
  return {
    async find(organizationId, editionId) {
      const [edition] = await tx<{ version: number; closed_at: Date | null }[]>`
        select version, closed_at from editions
        where organization_id = ${organizationId} and id = ${editionId}`;
      return edition && { version: edition.version, closedAt: toIso(edition.closed_at) };
    },
    async close(organizationId, editionId, closedAt, version) {
      // La commande a déjà comparé les versions, sous le verrou de l'organisation.
      // La condition `version = …` reste le garde de la base, si un jour une
      // écriture passait sans ce verrou.
      const [edition] = await tx<{ version: number }[]>`
        update editions set closed_at = ${closedAt}, version = version + 1
        where organization_id = ${organizationId} and id = ${editionId} and version = ${version}
        returning version`;
      if (!edition) {
        throw new CommandRejected('conflict', `Édition ${editionId} : version périmée.`);
      }
      return edition.version;
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
