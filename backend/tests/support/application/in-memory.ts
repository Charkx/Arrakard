import type { Facts, MatchFact, PerformanceFact, Projections, RatingRules } from '#domain/index.ts';
import {
  CommandRejected,
  type CommandLogEntry,
  type RecomputePorts,
  type TransactionPorts,
  type UnitOfWork,
} from '#application/index.ts';
import type { Publication } from '#application/index.ts';
import type { EditionSnapshot } from './command-harness.ts';

/** Un match en brouillon : enregistré, mais pas encore dans les faits que lit le recalcul. */
interface DraftMatch {
  readonly match: MatchFact;
  readonly performances: readonly PerformanceFact[];
}

/** Une organisation telle que la mémoire la garde. */
interface StoredOrganization {
  readonly rules: RatingRules;
  /** Les faits publiés : ce que lit le recalcul. */
  facts: Facts;
  readonly members: Map<string, 'admin' | 'member'>;
  readonly editions: Map<string, EditionSnapshot>;
  readonly drafts: Map<string, DraftMatch>;
  readonly commandLog: CommandLogEntry[];
  readonly publications: Publication[];
  projections?: Projections;
}

/** Les ports en mémoire, pour tester un cas d'usage sans base. */
export interface InMemoryStore extends RecomputePorts {
  /** Crée une organisation avec ses règles et ses faits ; ses éditions sont à la version 1. */
  addOrganization(organizationId: string, rules: RatingRules, facts: Facts): void;
  /** Ajoute un utilisateur à l'organisation, avec ce rôle. */
  addMember(organizationId: string, userId: string, role: 'admin' | 'member'): void;
  /** Ajoute un match en brouillon, avec ses performances. */
  addDraftMatch(
    organizationId: string,
    match: MatchFact,
    performances: readonly PerformanceFact[],
  ): void;
  /** Ses projections écrites, ou `undefined` si rien n'a été écrit. */
  projectionsOf(organizationId: string): Projections | undefined;
  /** La version et la clôture d'une édition de l'organisation. */
  editionOf(organizationId: string, editionId: string): EditionSnapshot | undefined;
  /** Les lignes du journal des commandes de l'organisation. */
  commandLogOf(organizationId: string): readonly CommandLogEntry[];
  /** Les publications de l'organisation. */
  publicationsOf(organizationId: string): readonly Publication[];
  /**
   * L'unité de travail, sans verrou ni annulation : les commandes refusent
   * avant d'écrire, et le verrou se teste sur Postgres.
   */
  readonly unitOfWork: UnitOfWork;
}

export function inMemoryStore(): InMemoryStore {
  const organizations = new Map<string, StoredOrganization>();
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
    },
    editions: {
      find(organizationId, editionId) {
        const organization = organizations.get(organizationId);
        const meta = organization?.editions.get(editionId);
        if (!organization || !meta) return Promise.resolve(undefined);
        const draftMatchIds = [...organization.drafts.values()]
          .filter((d) => d.match.editionId === editionId)
          .map((d) => d.match.id);
        return Promise.resolve({ ...meta, draftMatchIds });
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
    addOrganization(organizationId, rules, facts) {
      organizations.set(organizationId, {
        rules,
        facts,
        members: new Map(),
        editions: new Map(facts.editions.map((e) => [e.id, { version: 1, closedAt: null }])),
        drafts: new Map(),
        commandLog: [],
        publications: [],
      });
    },
    addMember(organizationId, userId, role) {
      find(organizationId).members.set(userId, role);
    },
    addDraftMatch(organizationId, match, performances) {
      find(organizationId).drafts.set(match.id, { match, performances });
    },
    projectionsOf: (organizationId) => organizations.get(organizationId)?.projections,
    editionOf: (organizationId, editionId) =>
      organizations.get(organizationId)?.editions.get(editionId),
    commandLogOf: (organizationId) => organizations.get(organizationId)?.commandLog ?? [],
    publicationsOf: (organizationId) => organizations.get(organizationId)?.publications ?? [],
    unitOfWork: { run: (_organizationId, work) => work(transactionPorts) },
  };
}

const EMPTY: Facts = { seasons: [], editions: [], matches: [], performances: [], players: [] };
