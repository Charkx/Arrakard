import type { Facts, MatchFact, PerformanceFact, Projections, RatingRules } from '#domain/index.ts';
import {
  CommandRejected,
  type CommandLogEntry,
  type RecomputePorts,
  type TransactionPorts,
  type UnitOfWork,
} from '#application/index.ts';
import type { DiscordConfig, MemberRole, Publication, SeasonStatus } from '#application/index.ts';
import type { EditionSnapshot, SeasonRecord, StintRecord, TeamRecord } from './command-harness.ts';

/** Un match en brouillon : enregistré, mais pas encore dans les faits que lit le recalcul. */
interface DraftMatch {
  readonly match: MatchFact;
  readonly performances: readonly PerformanceFact[];
}

/** Une saison telle que la mémoire la garde. */
interface StoredSeason {
  readonly name: string;
  status: SeasonStatus;
  endDate: string | null;
}

/** Une organisation telle que la mémoire la garde. */
interface StoredOrganization {
  readonly rules: RatingRules;
  readonly discord: DiscordConfig | undefined;
  /** Les faits publiés : ce que lit le recalcul. */
  facts: Facts;
  readonly members: Map<string, MemberRole>;
  readonly editions: Map<string, EditionSnapshot>;
  readonly drafts: Map<string, DraftMatch>;
  readonly seasons: Map<string, StoredSeason>;
  readonly teams: Map<string, TeamRecord>;
  /** Les passages, par joueur, du plus ancien au plus récent. */
  readonly stints: Map<string, StintRecord[]>;
  /** Les profils fusionnés : absorbé → conservé. */
  readonly mergedInto: Map<string, string>;
  readonly commandLog: CommandLogEntry[];
  readonly publications: Publication[];
  projections?: Projections;
}

/** Les ports en mémoire, pour tester un cas d'usage sans base. */
export interface InMemoryStore extends RecomputePorts {
  /**
   * Crée une organisation avec ses règles, ses faits et peut-être son serveur
   * Discord ; ses éditions sont à la version 1.
   */
  addOrganization(
    organizationId: string,
    rules: RatingRules,
    facts: Facts,
    discord?: DiscordConfig,
  ): void;
  /** Ajoute un utilisateur à l'organisation, avec ce rôle. */
  addMember(organizationId: string, userId: string, role: MemberRole): void;
  /** Le rôle de l'utilisateur dans l'organisation, ou `undefined` s'il n'en est pas membre. */
  roleOf(organizationId: string, userId: string): MemberRole | undefined;
  /** L'utilisateur s'est connecté avec ce compte Discord. */
  addDiscordIdentity(userId: string, discordUserId: string): void;
  /** L'utilisateur n'a plus de compte Discord lié. */
  removeDiscordIdentity(userId: string): void;
  /** Ajoute un match en brouillon, avec ses performances. */
  addDraftMatch(
    organizationId: string,
    match: MatchFact,
    performances: readonly PerformanceFact[],
  ): void;
  /** Ses projections écrites, ou `undefined` si rien n'a été écrit. */
  projectionsOf(organizationId: string): Projections | undefined;
  /** L'état d'une saison de l'organisation. */
  seasonOf(organizationId: string, seasonId: string): SeasonRecord | undefined;
  /** Une équipe de l'organisation. */
  teamOf(organizationId: string, teamId: string): TeamRecord | undefined;
  /** Marque un profil comme fusionné dans un autre. */
  markMerged(organizationId: string, absorbedId: string, keptId: string): void;
  /** Les passages d'un joueur de l'organisation. */
  stintsOf(organizationId: string, playerId: string): readonly StintRecord[];
  /** La version et la clôture d'une édition de l'organisation. */
  editionOf(organizationId: string, editionId: string): EditionSnapshot | undefined;
  /** Les lignes du journal des commandes de l'organisation. */
  commandLogOf(organizationId: string): readonly CommandLogEntry[];
  /** Les publications de l'organisation. */
  publicationsOf(organizationId: string): readonly Publication[];
  /**
   * L'unité de travail, sans verrou ni annulation : les commandes refusent
   * avant d'écrire, et le verrou se teste sur Postgres. La fraîcheur du rôle
   * admin (ADR 0030) aussi : ici, un admin le reste.
   */
  readonly unitOfWork: UnitOfWork;
}

export function inMemoryStore(): InMemoryStore {
  const organizations = new Map<string, StoredOrganization>();
  const discordIdentities = new Map<string, string>();
  const find = (organizationId: string): StoredOrganization => {
    const found = organizations.get(organizationId);
    if (!found) throw new Error(`Organisation ${organizationId} introuvable.`);
    return found;
  };
  /** Avance la version d'une édition, si elle est encore à `version` ; sinon, un conflit. */
  const bump = (
    organization: StoredOrganization,
    editionId: string,
    version: number,
    change: Partial<EditionSnapshot> = {},
  ): number => {
    const current = organization.editions.get(editionId);
    if (current?.version !== version) {
      throw new CommandRejected('conflict', `Édition ${editionId} : version périmée.`);
    }
    organization.editions.set(editionId, { ...current, ...change, version: version + 1 });
    return version + 1;
  };

  const recomputePorts: RecomputePorts = {
    facts: {
      readFacts: (organizationId) =>
        Promise.resolve(organizations.get(organizationId)?.facts ?? EMPTY),
    },
    organizations: {
      ratingRules: (organizationId) => Promise.resolve().then(() => find(organizationId).rules),
      discordConfig: (organizationId) =>
        Promise.resolve(organizations.get(organizationId)?.discord),
    },
    projections: {
      replaceAll(organizationId, projections) {
        return Promise.resolve().then(() => {
          find(organizationId).projections = projections;
        });
      },
    },
  };

  const transactionPorts: TransactionPorts = {
    ...recomputePorts,
    memberships: {
      isAdmin: (organizationId, userId) =>
        Promise.resolve(organizations.get(organizationId)?.members.get(userId) === 'admin'),
      setRole(organizationId, userId, role) {
        return Promise.resolve().then(() => {
          const { members } = find(organizationId);
          if (role === null) members.delete(userId);
          else members.set(userId, role);
        });
      },
    },
    editions: {
      find(organizationId, editionId) {
        const organization = organizations.get(organizationId);
        const meta = organization?.editions.get(editionId);
        if (!organization || !meta) return Promise.resolve(undefined);
        const draftMatchIds = [...organization.drafts.values()]
          .filter((d) => d.match.editionId === editionId)
          .map((d) => d.match.id);
        const seasonId = organization.facts.editions.find((e) => e.id === editionId)?.seasonId;
        const seasonClosed =
          seasonId != null && organization.seasons.get(seasonId)?.status === 'closed';
        return Promise.resolve({ ...meta, draftMatchIds, seasonClosed });
      },
      close(organizationId, editionId, closedAt, version) {
        return Promise.resolve().then(() =>
          bump(find(organizationId), editionId, version, { closedAt }),
        );
      },
      publish(organizationId, publication, version) {
        return Promise.resolve().then(() => {
          const organization = find(organizationId);
          const newVersion = bump(organization, publication.editionId, version);
          const published = publication.matchIds.map((id) => {
            const draft = organization.drafts.get(id);
            if (!draft) throw new Error(`Brouillon ${id} introuvable.`);
            organization.drafts.delete(id);
            return draft;
          });
          organization.facts = {
            ...organization.facts,
            matches: [...organization.facts.matches, ...published.map((d) => d.match)],
            performances: [
              ...organization.facts.performances,
              ...published.flatMap((d) => d.performances),
            ],
          };
          organization.publications.push(publication);
          return {
            publicationId: `publication-${String(organization.publications.length)}`,
            version: newVersion,
          };
        });
      },
    },
    identities: {
      discordUserId: (userId) => Promise.resolve(discordIdentities.get(userId)),
    },
    seasons: {
      find(organizationId, seasonId) {
        const season = organizations.get(organizationId)?.seasons.get(seasonId);
        return Promise.resolve(season && { status: season.status });
      },
      activeSeasonId(organizationId) {
        const open = [...find(organizationId).seasons].find(([, s]) => s.status === 'open');
        return Promise.resolve(open?.[0]);
      },
      nameTaken(organizationId, name) {
        return Promise.resolve(
          [...find(organizationId).seasons.values()].some((s) => s.name === name),
        );
      },
      open(organizationId, { name }) {
        const seasonId = crypto.randomUUID();
        find(organizationId).seasons.set(seasonId, { name, status: 'open', endDate: null });
        return Promise.resolve(seasonId);
      },
      close(organizationId, seasonId, endDate) {
        return Promise.resolve().then(() => {
          const season = find(organizationId).seasons.get(seasonId);
          if (!season) throw new Error(`Saison ${seasonId} introuvable.`);
          season.status = 'closed';
          season.endDate = endDate;
        });
      },
    },
    teams: {
      find(organizationId, teamId) {
        const team = organizations.get(organizationId)?.teams.get(teamId);
        return Promise.resolve(team && { archived: team.archivedAt !== null });
      },
      tagTaken(organizationId, tag) {
        return Promise.resolve([...find(organizationId).teams.values()].some((t) => t.tag === tag));
      },
      create(organizationId, { tag, name, divisions }) {
        const teamId = crypto.randomUUID();
        find(organizationId).teams.set(teamId, { tag, name, divisions, archivedAt: null });
        return Promise.resolve(teamId);
      },
      archive(organizationId, teamId, archivedAt, on) {
        return Promise.resolve().then(() => {
          const organization = find(organizationId);
          const team = organization.teams.get(teamId);
          if (!team) throw new Error(`Équipe ${teamId} introuvable.`);
          organization.teams.set(teamId, { ...team, archivedAt });
          for (const stints of organization.stints.values()) {
            const current = stints.at(-1);
            if (current?.teamId === teamId && current.leftOn === null) {
              stints[stints.length - 1] = { ...current, leftOn: on };
            }
          }
        });
      },
      playerPlace(organizationId, playerId) {
        const organization = organizations.get(organizationId);
        if (
          !organization?.facts.players.some((p) => p.id === playerId) ||
          organization.mergedInto.has(playerId)
        ) {
          return Promise.resolve(undefined);
        }
        const current = organization.stints.get(playerId)?.find((s) => s.leftOn === null);
        return Promise.resolve({
          place: current ? { teamId: current.teamId, status: current.status } : null,
        });
      },
      transfer(organizationId, playerId, to, on) {
        return Promise.resolve().then(() => {
          const organization = find(organizationId);
          const stints = organization.stints.get(playerId) ?? [];
          const ended = stints.map((s) => (s.leftOn === null ? { ...s, leftOn: on } : s));
          if (to) ended.push({ ...to, joinedOn: on, leftOn: null });
          organization.stints.set(playerId, ended);
        });
      },
    },
    commandLog: {
      append(entry) {
        return Promise.resolve().then(() => {
          find(entry.organizationId).commandLog.push(entry);
        });
      },
    },
  };

  return {
    ...recomputePorts,
    addOrganization(organizationId, rules, facts, discord) {
      organizations.set(organizationId, {
        rules,
        discord,
        facts,
        members: new Map(),
        editions: new Map(facts.editions.map((e) => [e.id, { version: 1, closedAt: null }])),
        drafts: new Map(),
        seasons: new Map(
          facts.seasons.map((s, i) => [
            s.id,
            { name: `Saison ${String(i + 1)}`, status: 'open', endDate: null },
          ]),
        ),
        teams: new Map(),
        stints: new Map(),
        mergedInto: new Map(),
        commandLog: [],
        publications: [],
      });
    },
    addMember(organizationId, userId, role) {
      find(organizationId).members.set(userId, role);
    },
    roleOf: (organizationId, userId) => organizations.get(organizationId)?.members.get(userId),
    addDiscordIdentity(userId, discordUserId) {
      discordIdentities.set(userId, discordUserId);
    },
    removeDiscordIdentity(userId) {
      discordIdentities.delete(userId);
    },
    addDraftMatch(organizationId, match, performances) {
      find(organizationId).drafts.set(match.id, { match, performances });
    },
    projectionsOf: (organizationId) => organizations.get(organizationId)?.projections,
    seasonOf: (organizationId, seasonId) =>
      organizations.get(organizationId)?.seasons.get(seasonId),
    teamOf: (organizationId, teamId) => organizations.get(organizationId)?.teams.get(teamId),
    markMerged(organizationId, absorbedId, keptId) {
      find(organizationId).mergedInto.set(absorbedId, keptId);
    },
    stintsOf: (organizationId, playerId) =>
      organizations.get(organizationId)?.stints.get(playerId) ?? [],
    editionOf: (organizationId, editionId) =>
      organizations.get(organizationId)?.editions.get(editionId),
    commandLogOf: (organizationId) => organizations.get(organizationId)?.commandLog ?? [],
    publicationsOf: (organizationId) => organizations.get(organizationId)?.publications ?? [],
    unitOfWork: { run: (_organizationId, work) => work(transactionPorts) },
  };
}

const EMPTY: Facts = { seasons: [], editions: [], matches: [], performances: [], players: [] };
