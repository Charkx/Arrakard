import type { Facts, Projections, RatingRules } from '../../domain/index.ts';
import type { RecomputePorts } from '../recompute.ts';

/** Une organisation telle que la mémoire la garde. */
interface StoredOrganization {
  readonly rules: RatingRules;
  readonly facts: Facts;
  projections?: Projections;
}

/** Les ports en mémoire, pour tester un cas d'usage sans base. */
export interface InMemoryStore extends RecomputePorts {
  /** Crée une organisation avec ses règles et ses faits. */
  addOrganization(organizationId: string, rules: RatingRules, facts: Facts): void;
  /** Ses projections écrites, ou `undefined` si rien n'a été écrit. */
  projectionsOf(organizationId: string): Projections | undefined;
}

export function inMemoryStore(): InMemoryStore {
  const organizations = new Map<string, StoredOrganization>();
  const find = (organizationId: string): StoredOrganization => {
    const found = organizations.get(organizationId);
    if (!found) throw new Error(`Organisation ${organizationId} introuvable.`);
    return found;
  };

  return {
    addOrganization(organizationId, rules, facts) {
      organizations.set(organizationId, { rules, facts });
    },
    projectionsOf: (organizationId) => organizations.get(organizationId)?.projections,
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
}

const EMPTY: Facts = { seasons: [], editions: [], matches: [], performances: [], players: [] };
