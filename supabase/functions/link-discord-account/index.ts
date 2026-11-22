// Lier une carte à un compte Discord (ADR 0034), par la chaîne commune des commandes (ADR 0023).
import { linkDiscordAccount } from '../../../backend/src/application/index.ts';
import { linkDiscordAccountRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(linkDiscordAccount, linkDiscordAccountRequest, Deno.env.toObject()));
