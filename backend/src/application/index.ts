// Point d'entrée public de la couche application (ADR 0023).
export { toFacts } from './facts.ts';
export type {
  EditionRow,
  FactRows,
  MatchRow,
  PerformanceRow,
  PlayerRow,
  SeasonRow,
} from './facts.ts';
export { recomputeProjections } from './recompute.ts';
export type {
  FactsReader,
  OrganizationRepository,
  ProjectionStore,
  RecomputePorts,
} from './recompute.ts';
