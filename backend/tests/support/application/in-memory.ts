import type { Facts, Projections, RatingRules } from '#domain/index.ts';
import {
  CommandRejected,
  type CommandLogEntry,
  type EditionState,
  type RecomputePorts,
  type TransactionPorts,
  type UnitOfWork,
} from '#application/index.ts';

/** Une organisation telle que la mémoire la garde. */
interface StoredOrganization {
  readonly rules: RatingRules;
  readonly facts: Facts;
  readonly members: Map<string, 'admin' | 'member'>;
  /** Version et clôture de chaque édition, par identifiant. */
  readonly editions: Map<string, EditionState>;
  readonly commandLog: CommandLogEntry[];
  projections?: Projections;
}

/** Les ports en mémoire, pour tester un cas d'usage sans base. */
export interface InMemoryStore extends RecomputePorts {
  /** Crée une organisation avec ses règles et ses faits ; ses éditions sont à la version 1. */
  addOrganization(organizationId: string, rules: RatingRules, facts: Facts): void;
  /** Ajoute un utilisateur à l'organisation, avec ce rôle. */
  addMember(organizationId: string, userId: string, role: 'admin' | 'member'): void;
  /** Ses projections écrites, ou `undefined` si rien n'a été écrit. */
  projectionsOf(organizationId: string): Projections | undefined;
  /** La version et la clôture d'une édition de l'organisation. */
  editionOf(organizationId: string, editionId: string): EditionState | undefined;
  /** Les lignes du journal des commandes de l'organisation. */
  commandLogOf(organizationId: string): readonly CommandLogEntry[];
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
      find: (organizationId, editionId) =>
        Promise.resolve(organizations.get(organizationId)?.editions.get(editionId)),
      close(organizationId, editionId, closedAt, version) {
        return Promise.resolve().then(() => {
          const editions = find(organizationId).editions;
          if (editions.get(editionId)?.version !== version) {
            throw new CommandRejected('conflict', `Édition ${editionId} : version périmée.`);
          }
          editions.set(editionId, { version: version + 1, closedAt });
          return version + 1;
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
        commandLog: [],
      });
    },
    addMember(organizationId, userId, role) {
      find(organizationId).members.set(userId, role);
    },
    projectionsOf: (organizationId) => organizations.get(organizationId)?.projections,
    editionOf: (organizationId, editionId) =>
      organizations.get(organizationId)?.editions.get(editionId),
    commandLogOf: (organizationId) => organizations.get(organizationId)?.commandLog ?? [],
    unitOfWork: { run: (_organizationId, work) => work(transactionPorts) },
  };
}

const EMPTY: Facts = { seasons: [], editions: [], matches: [], performances: [], players: [] };
