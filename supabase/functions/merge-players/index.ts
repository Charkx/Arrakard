// Fusionner deux profils (ADR 0034), par la chaîne commune des commandes (ADR 0023).
import { mergePlayers } from '../../../backend/src/application/index.ts';
import { mergePlayersRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(mergePlayers, mergePlayersRequest, Deno.env.toObject()));
