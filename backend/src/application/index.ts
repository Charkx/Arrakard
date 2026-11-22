// Point d'entrée public de la couche application (ADR 0023).
export { CommandRejected, executeCommand } from './command.ts';
export type {
  Actor,
  Clock,
  Command,
  CommandContext,
  CommandLog,
  CommandLogEntry,
  CommandServices,
  EditionRepository,
  EditionState,
  MembershipRepository,
  RejectionReason,
  Repositories,
  TransactionPorts,
  UnitOfWork,
} from './command.ts';
export { closeEdition } from './commands/close-edition.ts';
export type { CloseEditionInput, CloseEditionOutcome } from './commands/close-edition.ts';
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
