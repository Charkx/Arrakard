// Transférer un joueur (ADR 0033), par la chaîne commune des commandes (ADR 0023).
import { transferPlayer } from '../../../backend/src/application/index.ts';
import { transferPlayerRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(transferPlayer, transferPlayerRequest, Deno.env.toObject()));
