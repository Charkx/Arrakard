import { project, type Facts, type Projections, type RatingRules } from '@arrakis/domain';

/** Lit tous les faits d'une organisation. */
export interface FactsReader {
  readFacts(organizationId: string): Promise<Facts>;
}

/** Lit la configuration d'une organisation (ADR 0008). */
export interface OrganizationRepository {
  /** Ses règles de note. Refuse une organisation inconnue. */
  ratingRules(organizationId: string): Promise<RatingRules>;
}

/** Remplace toutes les projections d'une organisation. Seul le recalcul s'en sert (ADR 0003). */
export interface ProjectionStore {
  replaceAll(organizationId: string, projections: Projections): Promise<void>;
}

/** Les ports dont le recalcul a besoin, pris dans la même transaction. */
export interface RecomputePorts {
  readonly facts: FactsReader;
  readonly organizations: OrganizationRepository;
  readonly projections: ProjectionStore;
}

/**
 * Recalcule toutes les projections d'une organisation à partir de ses faits,
 * avec ses règles de note, et les remplace (ADR 0003).
 */
export async function recomputeProjections(
  { facts, organizations, projections }: RecomputePorts,
  organizationId: string,
): Promise<void> {
  const rules = await organizations.ratingRules(organizationId);
  const currentFacts = await facts.readFacts(organizationId);
  await projections.replaceAll(organizationId, project(currentFacts, rules));
}
