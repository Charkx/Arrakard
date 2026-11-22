import {
  CommandRejected,
  type Clock,
  type CommandLog,
  type EditionDetails,
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
import type { EditionType } from '../domain/index.ts';
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
          type: EditionType;
          archived: boolean;
          match_count: number;
        }[]
      >`
        select e.version, e.closed_at, e.type, e.archived_at is not null as archived,
               array(select m.id from matches m where m.edition_id = e.id and m.draft order by m.id)
                 as draft_match_ids,
               (select count(*)::int from matches m where m.edition_id = e.id) as match_count,
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
          type: edition.type,
          archived: edition.archived,
          matchCount: edition.match_count,
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
    async create(organizationId, edition) {
      const [created] = await tx<{ id: string }[]>`
        insert into editions ${tx(editionColumns(organizationId, edition))}
        returning id`;
      if (!created) throw new Error(`Édition ${edition.name} : écriture impossible.`);
      await setParticipants(tx, organizationId, created.id, edition.participantIds);
      return created.id;
    },
    async update(organizationId, editionId, edition, version) {
      const newVersion = await bumpVersion(tx, organizationId, editionId, version);
      await tx`
        update editions set ${tx(editionColumns(organizationId, edition))}
        where organization_id = ${organizationId} and id = ${editionId}`;
      await setParticipants(tx, organizationId, editionId, edition.participantIds);
      return newVersion;
    },
    async archive(organizationId, editionId, archivedAt, version) {
      const newVersion = await bumpVersion(tx, organizationId, editionId, version);
      await tx`
        update editions set archived_at = ${archivedAt}
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

/** Les colonnes d'une édition que saisit un admin. */
function editionColumns(
  organizationId: string,
  e: EditionDetails,
): Record<string, string | boolean | null> {
  return {
    organization_id: organizationId,
    name: e.name,
    type: e.type,
    date: e.date,
    season_id: e.seasonId,
    prestige: e.prestige,
    location: e.location,
    url: e.url,
    description: e.description,
    arrakis_won: e.arrakisWon,
  };
}

/** Remplace les participants d'une édition. */
async function setParticipants(
  tx: TransactionSql,
  organizationId: string,
  editionId: string,
  playerIds: readonly string[],
): Promise<void> {
  await tx`delete from edition_participants where edition_id = ${editionId}`;
  if (playerIds.length === 0) return;
  await tx`
    insert into edition_participants ${tx(
      playerIds.map((playerId) => ({
        organization_id: organizationId,
        edition_id: editionId,
        player_id: playerId,
      })),
    )}`;
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
    async mergeFacts(organizationId, absorbedId, keptId) {
      const ids = [absorbedId, keptId];
      const players = await tx<
        {
          id: string;
          nickname: string;
          aliases: string[];
          merged_into: string | null;
          discord_user_id: string | null;
        }[]
      >`
        select p.id, p.nickname, p.merged_into, p.discord_user_id,
               array(select alias from player_aliases a where a.player_id = p.id) as aliases
        from players p
        where p.organization_id = ${organizationId} and p.id = any(${ids}::uuid[])`;
      const performances = await tx<{ match_id: string; player_id: string }[]>`
        select match_id, player_id from performances
        where organization_id = ${organizationId} and player_id = any(${ids}::uuid[])`;
      const eventMvps = await tx<{ id: string; event_mvp_player_id: string }[]>`
        select id, event_mvp_player_id from editions
        where organization_id = ${organizationId} and event_mvp_player_id = any(${ids}::uuid[])`;
      const matchMvps = await tx<{ id: string; mvp_player_id: string }[]>`
        select id, mvp_player_id from matches
        where organization_id = ${organizationId} and mvp_player_id = any(${ids}::uuid[])`;
      const participations = await tx<{ edition_id: string; player_id: string }[]>`
        select edition_id, player_id from edition_participants
        where organization_id = ${organizationId} and player_id = any(${ids}::uuid[])`;
      const memberships = await tx<{ id: string; player_id: string; current: boolean }[]>`
        select id, player_id, left_on is null as current from team_memberships
        where organization_id = ${organizationId} and player_id = any(${ids}::uuid[])`;
      const customized = await tx<{ player_id: string }[]>`
        select player_id from card_customizations
        where organization_id = ${organizationId} and player_id = any(${ids}::uuid[])`;
      return {
        players: players.map((p) => ({
          id: p.id,
          nickname: p.nickname,
          aliases: p.aliases,
          mergedInto: p.merged_into,
          discordUserId: p.discord_user_id,
        })),
        performances: performances.map((p) => ({ matchId: p.match_id, playerId: p.player_id })),
        eventMvps: eventMvps.map((e) => ({ editionId: e.id, playerId: e.event_mvp_player_id })),
        matchMvps: matchMvps.map((m) => ({ matchId: m.id, playerId: m.mvp_player_id })),
        participations: participations.map((p) => ({
          editionId: p.edition_id,
          playerId: p.player_id,
        })),
        memberships: memberships.map((m) => ({
          id: m.id,
          playerId: m.player_id,
          current: m.current,
        })),
        customizedPlayerIds: customized.map((c) => c.player_id),
      };
    },
    async applyMerge(organizationId, plan, on) {
      const { keepId, absorbId } = plan;
      await tx`
        update performances set player_id = ${keepId}
        where organization_id = ${organizationId} and player_id = ${absorbId}`;
      await tx`
        update matches set mvp_player_id = ${keepId}
        where organization_id = ${organizationId} and mvp_player_id = ${absorbId}`;
      await tx`
        update editions set event_mvp_player_id = ${keepId}
        where organization_id = ${organizationId} and event_mvp_player_id = ${absorbId}`;
      // Une participation que le conservé avait déjà tombe (`participationsDropped`).
      await tx`
        insert into edition_participants (organization_id, edition_id, player_id)
        select organization_id, edition_id, ${keepId}::uuid from edition_participants
        where organization_id = ${organizationId} and player_id = ${absorbId}
        on conflict do nothing`;
      await tx`
        delete from edition_participants
        where organization_id = ${organizationId} and player_id = ${absorbId}`;
      if (plan.aliasesAdded.length > 0) {
        await tx`
          insert into player_aliases ${tx(
            plan.aliasesAdded.map((alias) => ({
              organization_id: organizationId,
              player_id: keepId,
              alias,
            })),
          )}
          on conflict do nothing`;
      }
      if (plan.membershipClosed !== null) {
        await tx`update team_memberships set left_on = ${on} where id = ${plan.membershipClosed}`;
      }
      await tx`
        update team_memberships set player_id = ${keepId}
        where organization_id = ${organizationId} and player_id = ${absorbId}`;
      if (plan.absorbedCustomization === 'transferred') {
        await tx`
          update card_customizations set player_id = ${keepId}
          where organization_id = ${organizationId} and player_id = ${absorbId}`;
      } else if (plan.absorbedCustomization === 'dropped') {
        await tx`
          delete from card_customizations
          where organization_id = ${organizationId} and player_id = ${absorbId}`;
      }
      // Le compte Discord passe au conservé : il faut d'abord le retirer à l'absorbé (unicité).
      await tx`
        update players set merged_into = ${keepId}, discord_user_id = null
        where organization_id = ${organizationId} and id = ${absorbId}`;
      if (plan.discordUserIdTransferred !== null) {
        await tx`
          update players set discord_user_id = ${plan.discordUserIdTransferred}
          where organization_id = ${organizationId} and id = ${keepId}`;
      }
      await tx`
        update players set merged_into = ${keepId}
        where organization_id = ${organizationId} and merged_into = ${absorbId}`;
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
