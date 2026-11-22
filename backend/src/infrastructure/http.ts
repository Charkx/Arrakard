import {
  CommandRejected,
  executeCommand,
  type Command,
  type CommandServices,
  type RejectionReason,
} from '../application/index.ts';
import type { z } from 'zod';

/** Dit quel utilisateur envoie la requête, d'après son jeton de connexion. */
export interface Authenticator {
  /** L'identifiant de l'utilisateur, ou `undefined` si le jeton manque ou n'est pas valide. */
  userId(request: Request): Promise<string | undefined>;
}

/** Le contrat d'une commande : son entrée, plus l'organisation où l'admin agit. */
export type CommandContract<Input> = z.ZodType<Input & { readonly organizationId: string }>;

/** Le code HTTP de chaque refus métier. */
const STATUS: Readonly<Record<RejectionReason, number>> = {
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  already_done: 409,
  nothing_to_publish: 409,
  season_closed: 409,
};

/** Le site appelle les fonctions depuis un autre domaine : il faut l'y autoriser. */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown): Response =>
  Response.json(body, { status, headers: CORS });

/**
 * Le point d'entrée HTTP d'une action du serveur (ADR 0026) : il identifie
 * l'utilisateur, valide l'entrée par son contrat, appelle `run`, et traduit
 * le résultat en HTTP. Il ne décide de rien d'autre.
 */
export function requestHandler<Body, Outcome>(
  name: string,
  contract: z.ZodType<Body>,
  authenticator: Authenticator,
  run: (userId: string, body: Body) => Promise<Outcome>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });

    const userId = await authenticator.userId(request);
    if (userId === undefined) return json(401, { error: 'unauthenticated' });

    const parsed = contract.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) {
      return json(400, { error: 'invalid_input', issues: parsed.error.issues });
    }

    try {
      return json(200, await run(userId, parsed.data));
    } catch (error) {
      if (error instanceof CommandRejected) {
        return json(STATUS[error.reason], { error: error.reason, message: error.message });
      }
      console.error(name, error);
      return json(500, { error: 'internal' });
    }
  };
}

/** Le point d'entrée HTTP d'une commande (ADR 0023), par `executeCommand`, qui exige un admin. */
export function commandHandler<Input, Outcome>(
  command: Command<Input, Outcome>,
  contract: CommandContract<Input>,
  services: CommandServices,
  authenticator: Authenticator,
): (request: Request) => Promise<Response> {
  return requestHandler(command.name, contract, authenticator, (userId, body) => {
    const { organizationId, ...input } = body;
    return executeCommand(services, { userId, organizationId }, command, input as Input);
  });
}
