// Adaptateur Postgres (ADR 0023) : les ports de la couche application, avec postgres.js.
export { postgresUnitOfWork, systemClock } from './commands.ts';
export { discordGateway } from './discord.ts';
export { edgeCommandHandler, edgeSyncDiscordRoleHandler } from './edge.ts';
export { commandHandler, requestHandler } from './http.ts';
export type { Authenticator, CommandContract } from './http.ts';
export { supabaseAuthenticator } from './supabase-auth.ts';
export { LOCAL_DATABASE_URL } from './local.ts';
export { RATING_RULES, upsertOrganization } from './organizations.ts';
export type { OrganizationSettings } from './organizations.ts';
export { postgresRecomputePorts } from './ports.ts';
export { toProjectionRows } from './projections.ts';
export type { ProjectionRows } from './projections.ts';
export { readFacts, readProjectionRows } from './read.ts';
export { clearOrganization, FACT_TABLES, hasFacts, PROJECTION_TABLES } from './tables.ts';
export type { Db } from './tables.ts';
export { writeFacts } from './write.ts';
export type { FactTableRows } from './write.ts';
