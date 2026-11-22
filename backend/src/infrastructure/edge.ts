import { syncDiscordRole, type Command } from '../application/index.ts';
import { syncDiscordRoleRequest } from '../contracts/index.ts';
import postgres from 'postgres';
import { postgresUnitOfWork, systemClock } from './commands.ts';
import { discordGateway } from './discord.ts';
import { commandHandler, requestHandler, type CommandContract } from './http.ts';
import { supabaseAuthenticator } from './supabase-auth.ts';

/** Les variables d'une Edge Function dont une commande a besoin. */
type Env = Readonly<Record<string, string | undefined>>;

function required(env: Env, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Variable ${name} manquante.`);
  return value;
}

/**
 * Le gestionnaire HTTP d'une commande, branché sur la base et sur Supabase
 * Auth, d'après les variables de l'Edge Function. En local, `COMMAND_DB_URL`
 * remplace `SUPABASE_DB_URL`, dont le nom d'hôte ne se résout pas sous Deno
 * (`supabase/config.toml`).
 */
function database(env: Env) {
  return postgres(env.COMMAND_DB_URL ?? required(env, 'SUPABASE_DB_URL'));
}

function authenticator(env: Env) {
  return supabaseAuthenticator(required(env, 'SUPABASE_URL'), required(env, 'SUPABASE_ANON_KEY'));
}

export function edgeCommandHandler<Input, Outcome>(
  command: Command<Input, Outcome>,
  contract: CommandContract<Input>,
  env: Env,
): (request: Request) => Promise<Response> {
  return commandHandler(
    command,
    contract,
    { unitOfWork: postgresUnitOfWork(database(env)), clock: systemClock },
    authenticator(env),
  );
}

/** Le gestionnaire HTTP de la synchronisation du rôle Discord (ADR 0030). */
export function edgeSyncDiscordRoleHandler(env: Env): (request: Request) => Promise<Response> {
  const services = {
    unitOfWork: postgresUnitOfWork(database(env)),
    clock: systemClock,
    discord: discordGateway(),
  };
  return requestHandler(
    'syncDiscordRole',
    syncDiscordRoleRequest,
    authenticator(env),
    (userId, body) => syncDiscordRole(services, userId, body),
  );
}
