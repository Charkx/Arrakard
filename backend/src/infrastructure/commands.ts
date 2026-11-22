import {
  CommandRejected,
  type Clock,
  type CommandLog,
  type EditionRepository,
  type IdentityRepository,
  type MembershipRepository,
  type PlayerRepository,
  type SeasonRepository,
  type RosterStatus,
  type SeasonStatus,
  type TeamRepository,
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
          teams: postgresTeams(tx),
          players: postgresPlayers(tx),
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
      const [season] = await tx<{ status: SeasonStatus }[]>`
        select status from seasons where organization_id = ${organizationId} and id = ${seasonId}`;
      return season && { status: season.status };
    },
    async activeSeasonId(organizationId) {
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

function postgresTeams(tx: TransactionSql): TeamRepository {
  return {
    async find(organizationId, teamId) {
      const [team] = await tx<{ archived: boolean }[]>`
        select archived_at is not null as archived from teams
        where organization_id = ${organizationId} and id = ${teamId}`;
      return team && { archived: team.archived };
    },
    async tagTaken(organizationId, tag) {
      const [team] = await tx`
        select 1 from teams where organization_id = ${organizationId} and tag = ${tag}`;
      return team !== undefined;
    },
    async create(organizationId, { tag, name, divisions }) {
      const [team] = await tx<{ id: string }[]>`
        insert into teams (organization_id, tag, name, divisions)
        values (${organizationId}, ${tag}, ${name}, ${divisions as string[]}::text[])
        returning id`;
      if (!team) throw new Error(`Équipe ${tag} : écriture impossible.`);
      return team.id;
    },
    async archive(organizationId, teamId, archivedAt, on) {
      await tx`
        update teams set archived_at = ${archivedAt}
        where organization_id = ${organizationId} and id = ${teamId}`;
      await tx`
        update team_memberships set left_on = ${on}
        where organization_id = ${organizationId} and team_id = ${teamId} and left_on is null`;
    },
    async playerPlace(organizationId, playerId) {
      const [player] = await tx<{ team_id: string | null; status: RosterStatus | null }[]>`
        select m.team_id, m.status from players p
        left join team_memberships m on m.player_id = p.id and m.left_on is null
        where p.organization_id = ${organizationId} and p.id = ${playerId} and p.merged_into is null`;
      if (!player) return undefined;
      const { team_id: teamId, status } = player;
      return { place: teamId === null || status === null ? null : { teamId, status } };
    },
    async transfer(organizationId, playerId, to, on) {
      await tx`
        update team_memberships set left_on = ${on}
        where organization_id = ${organizationId} and player_id = ${playerId} and left_on is null`;
      if (to === null) return;
      await tx`
        insert into team_memberships (organization_id, player_id, team_id, status, joined_on)
        values (${organizationId}, ${playerId}, ${to.teamId}, ${to.status}, ${on})`;
    },
  };
}

function postgresPlayers(tx: TransactionSql): PlayerRepository {
  return {
    async find(organizationId, playerId) {
      const [player] = await tx<{ discord_user_id: string | null }[]>`
        select discord_user_id from players
        where organization_id = ${organizationId} and id = ${playerId} and merged_into is null`;
      return player && { discordUserId: player.discord_user_id };
    },
    async playedTogether(organizationId, a, b) {
      const [shared] = await tx`
        select 1 from performances x join performances y on y.match_id = x.match_id
        where x.organization_id = ${organizationId} and x.player_id = ${a} and y.player_id = ${b}
        limit 1`;
      return shared !== undefined;
    },
    async merge(organizationId, absorbedId, keptId, on) {
      const moved = await tx`
        update performances set player_id = ${keptId}
        where organization_id = ${organizationId} and player_id = ${absorbedId}`;
      await tx`
        update matches set mvp_player_id = ${keptId}
        where organization_id = ${organizationId} and mvp_player_id = ${absorbedId}`;
      await tx`
        update editions set event_mvp_player_id = ${keptId}
        where organization_id = ${organizationId} and event_mvp_player_id = ${absorbedId}`;
      await tx`
        insert into edition_participants (organization_id, edition_id, player_id)
        select organization_id, edition_id, ${keptId}::uuid from edition_participants
        where organization_id = ${organizationId} and player_id = ${absorbedId}
        on conflict do nothing`;
      await tx`
        delete from edition_participants
        where organization_id = ${organizationId} and player_id = ${absorbedId}`;
      // Le pseudo et les alias de l'absorbé rattachent les prochains imports au conservé (ADR 0004).
      await tx`
        insert into player_aliases (organization_id, player_id, alias)
        select ${organizationId}::uuid, ${keptId}::uuid, alias from player_aliases
        where organization_id = ${organizationId} and player_id = ${absorbedId}
        union
        select ${organizationId}::uuid, ${keptId}::uuid, lower(nickname) from players
        where organization_id = ${organizationId} and id = ${absorbedId}
        on conflict do nothing`;
      await tx`
        delete from player_aliases
        where organization_id = ${organizationId} and player_id = ${absorbedId}`;
      const ended = await tx<{ team_id: string; status: RosterStatus }[]>`
        update team_memberships set left_on = ${on}
        where organization_id = ${organizationId} and player_id = ${absorbedId} and left_on is null
        returning team_id, status`;
      const [place] = ended;
      if (place) {
        // Le vrai joueur garde sa place, si le conservé n'en a pas (ADR 0034).
        await tx`
          insert into team_memberships (organization_id, player_id, team_id, status, joined_on)
          select ${organizationId}, ${keptId}, ${place.team_id}, ${place.status}, ${on}
          where not exists (
            select 1 from team_memberships
            where player_id = ${keptId} and left_on is null)`;
      }
      const [absorbed] = await tx<{ discord_user_id: string | null }[]>`
        update players p set discord_user_id = null, merged_into = ${keptId}
        from players old
        where old.id = p.id and p.organization_id = ${organizationId} and p.id = ${absorbedId}
        returning old.discord_user_id`;
      if (absorbed?.discord_user_id != null) {
        await tx`
          update players set discord_user_id = ${absorbed.discord_user_id}
          where organization_id = ${organizationId} and id = ${keptId}`;
      }
      await tx`
        update players set merged_into = ${keptId}
        where organization_id = ${organizationId} and merged_into = ${absorbedId}`;
      return { movedPerformances: moved.count };
    },
    async discordOwner(organizationId, discordUserId) {
      const [player] = await tx<{ id: string }[]>`
        select id from players
        where organization_id = ${organizationId} and discord_user_id = ${discordUserId}`;
      return player?.id;
    },
    async linkDiscord(organizationId, playerId, discordUserId) {
      await tx`
        update players set discord_user_id = ${discordUserId}
        where organization_id = ${organizationId} and id = ${playerId}`;
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
