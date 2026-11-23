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
export type { EditionDetails, EditionRepository, EditionState, Publication } from './editions.ts';
export { recordMatch } from './commands/record-match.ts';
export type { RecordMatchInput, RecordMatchOutcome } from './commands/record-match.ts';
export { createEdition } from './commands/create-edition.ts';
export type { CreateEditionInput, CreateEditionOutcome } from './commands/create-edition.ts';
export { updateEdition } from './commands/update-edition.ts';
export type { UpdateEditionInput, UpdateEditionOutcome } from './commands/update-edition.ts';
export { archiveEdition } from './commands/archive-edition.ts';
export type { ArchiveEditionInput, ArchiveEditionOutcome } from './commands/archive-edition.ts';
export { closeEdition } from './commands/close-edition.ts';
export type { CloseEditionInput, CloseEditionOutcome } from './commands/close-edition.ts';
export { publishEdition } from './commands/publish-edition.ts';
export { openSeason } from './commands/open-season.ts';
export type { OpenSeasonInput, OpenSeasonOutcome } from './commands/open-season.ts';
export { closeSeason } from './commands/close-season.ts';
export type { CloseSeasonInput, CloseSeasonOutcome } from './commands/close-season.ts';
export { mergePlayers } from './commands/merge-players.ts';
export type { MergePlayersInput, MergePlayersOutcome } from './commands/merge-players.ts';
export { linkDiscordAccount } from './commands/link-discord-account.ts';
export type {
  LinkDiscordAccountInput,
  LinkDiscordAccountOutcome,
} from './commands/link-discord-account.ts';
export type { PlayerRepository, PlayerState } from './players.ts';
export { createTeam } from './commands/create-team.ts';
export type { CreateTeamInput, CreateTeamOutcome } from './commands/create-team.ts';
export { transferPlayer } from './commands/transfer-player.ts';
export type { TransferPlayerInput, TransferPlayerOutcome } from './commands/transfer-player.ts';
export { archiveTeam } from './commands/archive-team.ts';
export type { ArchiveTeamInput, ArchiveTeamOutcome } from './commands/archive-team.ts';
export type {
  NewTeam,
  PlayerPlace,
  RosterPlace,
  RosterStatus,
  TeamRepository,
  TeamState,
} from './teams.ts';
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
