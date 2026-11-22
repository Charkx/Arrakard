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
  RejectionReason,
  Repositories,
  TransactionPorts,
  UnitOfWork,
} from './command.ts';
export type { EditionRepository, EditionState, Publication } from './editions.ts';
export { closeEdition } from './commands/close-edition.ts';
export type { CloseEditionInput, CloseEditionOutcome } from './commands/close-edition.ts';
export { publishEdition } from './commands/publish-edition.ts';
export { openSeason } from './commands/open-season.ts';
export type { OpenSeasonInput, OpenSeasonOutcome } from './commands/open-season.ts';
export { closeSeason } from './commands/close-season.ts';
export type { CloseSeasonInput, CloseSeasonOutcome } from './commands/close-season.ts';
export type { NewSeason, SeasonRepository, SeasonState, SeasonStatus } from './seasons.ts';
export type { PublishEditionInput, PublishEditionOutcome } from './commands/publish-edition.ts';
export { toFacts } from './facts.ts';
export type {
  EditionRow,
  FactRows,
  MatchRow,
  PerformanceRow,
  PlayerRow,
  SeasonRow,
} from './facts.ts';
export { syncDiscordRole } from './sync-discord-role.ts';
export type {
  DiscordConfig,
  IdentityRepository,
  MemberRole,
  MembershipRepository,
} from './memberships.ts';
export type {
  DiscordGateway,
  GuildMember,
  SyncDiscordRoleInput,
  SyncDiscordRoleOutcome,
  SyncDiscordRoleServices,
} from './sync-discord-role.ts';
export { recomputeProjections } from './recompute.ts';
export type {
  FactsReader,
  OrganizationRepository,
  ProjectionStore,
  RecomputePorts,
} from './recompute.ts';
