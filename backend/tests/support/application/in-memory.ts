import type { Facts, MatchFact, PerformanceFact, Projections, RatingRules } from '#domain/index.ts';
import {
  CommandRejected,
  type CommandLogEntry,
  type RecomputePorts,
  type TransactionPorts,
  type UnitOfWork,
} from '#application/index.ts';
import type { DiscordConfig, MemberRole, Publication, SeasonStatus } from '#application/index.ts';
import type {
  EditionRecord,
  EditionSnapshot,
  ProfileRecord,
  SeasonRecord,
  StintRecord,
  TeamRecord,
} from './command-harness.ts';

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
  /** Ce qu'un admin a saisi des éditions, hors faits de jeu. */
  readonly editionRecords: Map<string, EditionRecord>;
  readonly drafts: Map<string, DraftMatch>;
  readonly seasons: Map<string, StoredSeason>;
  readonly teams: Map<string, TeamRecord>;
  /** Les passages, par joueur, du plus ancien au plus récent. */
  readonly stints: Map<string, StintRecord[]>;
  /** Les profils fusionnés : absorbé → conservé. */
  readonly mergedInto: Map<string, string>;
  /** Les comptes Discord liés : joueur → compte. */
  readonly discordLinks: Map<string, string>;
  /** Les alias, par joueur. */
  readonly aliases: Map<string, Set<string>>;
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
  /** Ajoute un match publié, avec ses performances : le recalcul le lira. */
  addPublishedMatch(
    organizationId: string,
    match: MatchFact,
    performances: readonly PerformanceFact[],
  ): void;
  /** Un profil de l'organisation, ou `undefined`. */
  profileOf(organizationId: string, playerId: string): ProfileRecord | undefined;
  /** Les matchs où le joueur a une performance, publiée ou en brouillon. */
  performanceMatchIdsOf(organizationId: string, playerId: string): readonly string[];
  /** Marque un profil comme fusionné dans un autre. */
  markMerged(organizationId: string, absorbedId: string, keptId: string): void;
  /** Ce qu'un admin a saisi d'une édition de l'organisation. */
  editionRecordOf(organizationId: string, editionId: string): EditionRecord | undefined;
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
        const record = organization.editionRecords.get(editionId);
        if (!record) return Promise.resolve(undefined);
        const matchCount =
          organization.facts.matches.filter((m) => m.editionId === editionId).length +
          draftMatchIds.length;
        return Promise.resolve({
          ...meta,
          draftMatchIds,
          seasonClosed,
          type: record.type,
          archived: record.archived,
          matchCount,
        });
      },
      close(organizationId, editionId, closedAt, version) {
        return Promise.resolve().then(() =>
          bump(find(organizationId), editionId, version, { closedAt }),
        );
      },
      create(organizationId, edition) {
        const organization = find(organizationId);
        const editionId = crypto.randomUUID();
        organization.editions.set(editionId, { version: 1, closedAt: null });
        organization.editionRecords.set(editionId, { ...edition, archived: false });
        setEditionFact(organization, editionId, edition);
        return Promise.resolve(editionId);
      },
      update(organizationId, editionId, edition, version) {
        return Promise.resolve().then(() => {
          const organization = find(organizationId);
          const newVersion = bump(organization, editionId, version);
          organization.editionRecords.set(editionId, { ...edition, archived: false });
          setEditionFact(organization, editionId, edition);
          return newVersion;
        });
      },
      archive(organizationId, editionId, _archivedAt, version) {
        return Promise.resolve().then(() => {
          const organization = find(organizationId);
          const newVersion = bump(organization, editionId, version);
          const record = organization.editionRecords.get(editionId);
          if (record) organization.editionRecords.set(editionId, { ...record, archived: true });
          return newVersion;
        });
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
    players: {
      find(organizationId, playerId) {
        const organization = organizations.get(organizationId);
        if (
          !organization?.facts.players.some((p) => p.id === playerId) ||
          organization.mergedInto.has(playerId)
        ) {
          return Promise.resolve(undefined);
        }
        return Promise.resolve({ discordUserId: organization.discordLinks.get(playerId) ?? null });
      },
      mergeFacts(organizationId, absorbedId, keptId) {
        const organization = find(organizationId);
        const ids = new Set([absorbedId, keptId]);
        const performances = [
          ...organization.facts.performances,
          ...[...organization.drafts.values()].flatMap((d) => d.performances),
        ];
        return Promise.resolve({
          players: organization.facts.players
            .filter((p) => ids.has(p.id))
            .map((p) => ({
              id: p.id,
              nickname: p.nickname,
              aliases: [...(organization.aliases.get(p.id) ?? [])],
              mergedInto: organization.mergedInto.get(p.id) ?? null,
              discordUserId: organization.discordLinks.get(p.id) ?? null,
            })),
          performances: performances
            .filter((p) => ids.has(p.playerId))
            .map((p) => ({ matchId: p.matchId, playerId: p.playerId })),
          eventMvps: organization.facts.editions
            .filter((e) => e.eventMvpPlayerId !== undefined && ids.has(e.eventMvpPlayerId))
            .flatMap((e) =>
              e.eventMvpPlayerId ? [{ editionId: e.id, playerId: e.eventMvpPlayerId }] : [],
            ),
          matchMvps: organization.facts.matches
            .filter((m) => m.mvpPlayerId !== undefined && ids.has(m.mvpPlayerId))
            .flatMap((m) => (m.mvpPlayerId ? [{ matchId: m.id, playerId: m.mvpPlayerId }] : [])),
          participations: [...organization.editionRecords].flatMap(([editionId, record]) =>
            record.participantIds
              .filter((playerId) => ids.has(playerId))
              .map((playerId) => ({ editionId, playerId })),
          ),
          memberships: [...ids].flatMap((playerId) =>
            (organization.stints.get(playerId) ?? []).map((st, i) => ({
              id: `${playerId}:${String(i)}`,
              playerId,
              current: st.leftOn === null,
            })),
          ),
          // La mémoire ne garde pas les personnalisations : leur sort se teste sur Postgres.
          customizedPlayerIds: [],
        });
      },
      applyMerge(organizationId, plan, on) {
        return Promise.resolve().then(() => {
          const { keepId: keptId, absorbId: absorbedId } = plan;
          const organization = find(organizationId);
          const follow = <T extends { playerId: string }>(p: T): T =>
            p.playerId === absorbedId ? { ...p, playerId: keptId } : p;
          organization.facts = {
            ...organization.facts,
            performances: organization.facts.performances.map(follow),
            matches: organization.facts.matches.map((m) =>
              m.mvpPlayerId === absorbedId ? { ...m, mvpPlayerId: keptId } : m,
            ),
            editions: organization.facts.editions.map((e) =>
              e.eventMvpPlayerId === absorbedId ? { ...e, eventMvpPlayerId: keptId } : e,
            ),
          };
          for (const [id, draft] of organization.drafts) {
            organization.drafts.set(id, { ...draft, performances: draft.performances.map(follow) });
          }
          for (const [editionId, record] of organization.editionRecords) {
            if (!record.participantIds.includes(absorbedId)) continue;
            const ids = new Set(
              record.participantIds.map((id) => (id === absorbedId ? keptId : id)),
            );
            organization.editionRecords.set(editionId, { ...record, participantIds: [...ids] });
          }
          const aliases = organization.aliases.get(keptId) ?? new Set<string>();
          for (const alias of plan.aliasesAdded) aliases.add(alias);
          organization.aliases.set(keptId, aliases);
          organization.aliases.delete(absorbedId);
          const absorbedStints = (organization.stints.get(absorbedId) ?? []).map((st, i) =>
            `${absorbedId}:${String(i)}` === plan.membershipClosed ? { ...st, leftOn: on } : st,
          );
          organization.stints.set(keptId, [
            ...(organization.stints.get(keptId) ?? []),
            ...absorbedStints,
          ]);
          organization.stints.delete(absorbedId);
          organization.discordLinks.delete(absorbedId);
          if (plan.discordUserIdTransferred !== null) {
            organization.discordLinks.set(keptId, plan.discordUserIdTransferred);
          }
          for (const [id, into] of organization.mergedInto) {
            if (into === absorbedId) organization.mergedInto.set(id, keptId);
          }
          organization.mergedInto.set(absorbedId, keptId);
        });
      },
      discordOwner(organizationId, discordUserId) {
        const owner = [...find(organizationId).discordLinks].find(([, d]) => d === discordUserId);
        return Promise.resolve(owner?.[0]);
      },
      linkDiscord(organizationId, playerId, discordUserId) {
        return Promise.resolve().then(() => {
          const { discordLinks } = find(organizationId);
          if (discordUserId === null) discordLinks.delete(playerId);
          else discordLinks.set(playerId, discordUserId);
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
        editionRecords: new Map(
          facts.editions.map((e, i) => [
            e.id,
            {
              name: `Édition d’essai ${String(i + 1)}`,
              type: e.type,
              date: e.date,
              seasonId: e.seasonId,
              prestige: e.prestige,
              location: null,
              url: null,
              description: null,
              arrakisWon: null,
              participantIds: [],
              archived: false,
            },
          ]),
        ),
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
        discordLinks: new Map(),
        aliases: new Map(),
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
    addPublishedMatch(organizationId, match, performances) {
      const organization = find(organizationId);
      organization.facts = {
        ...organization.facts,
        matches: [...organization.facts.matches, match],
        performances: [...organization.facts.performances, ...performances],
      };
    },
    profileOf(organizationId, playerId) {
      const organization = organizations.get(organizationId);
      if (!organization?.facts.players.some((p) => p.id === playerId)) return undefined;
      return {
        mergedInto: organization.mergedInto.get(playerId) ?? null,
        discordUserId: organization.discordLinks.get(playerId) ?? null,
        aliases: [...(organization.aliases.get(playerId) ?? [])].sort(),
      };
    },
    performanceMatchIdsOf(organizationId, playerId) {
      const organization = organizations.get(organizationId);
      if (!organization) return [];
      return [
        ...organization.facts.performances,
        ...[...organization.drafts.values()].flatMap((d) => d.performances),
      ]
        .filter((p) => p.playerId === playerId)
        .map((p) => p.matchId)
        .sort();
    },
    editionRecordOf(organizationId, editionId) {
      const record = organizations.get(organizationId)?.editionRecords.get(editionId);
      return record && { ...record, participantIds: [...record.participantIds].sort() };
    },
    markMerged(organizationId, absorbedId, keptId) {
      find(organizationId).mergedInto.set(absorbedId, keptId);
    },
    // Dans l'ordre de la base : par arrivée, le passage en cours en dernier.
    stintsOf: (organizationId, playerId) =>
      [...(organizations.get(organizationId)?.stints.get(playerId) ?? [])].sort(
        (a, b) =>
          a.joinedOn.localeCompare(b.joinedOn) ||
          (a.leftOn ?? '9999-12-31').localeCompare(b.leftOn ?? '9999-12-31'),
      ),
    editionOf: (organizationId, editionId) =>
      organizations.get(organizationId)?.editions.get(editionId),
    commandLogOf: (organizationId) => organizations.get(organizationId)?.commandLog ?? [],
    publicationsOf: (organizationId) => organizations.get(organizationId)?.publications ?? [],
    unitOfWork: { run: (_organizationId, work) => work(transactionPorts) },
  };
}

/** Écrit dans les faits ce que le recalcul lit d'une édition. */
function setEditionFact(
  organization: StoredOrganization,
  editionId: string,
  { type, date, seasonId, prestige }: EditionRecord | Omit<EditionRecord, 'archived'>,
): void {
  const others = organization.facts.editions.filter((e) => e.id !== editionId);
  const previous = organization.facts.editions.find((e) => e.id === editionId);
  organization.facts = {
    ...organization.facts,
    editions: [...others, { ...previous, id: editionId, type, date, seasonId, prestige }],
  };
}

const EMPTY: Facts = { seasons: [], editions: [], matches: [], performances: [], players: [] };
