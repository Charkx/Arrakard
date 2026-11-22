// Saisir un match à la main (ADR 0037), par la chaîne commune des commandes (ADR 0023).
import { recordMatch } from '../../../backend/src/application/index.ts';
import { recordMatchRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(recordMatch, recordMatchRequest, Deno.env.toObject()));
