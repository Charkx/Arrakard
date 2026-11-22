// Clôturer une édition (ADR 0013), par la chaîne commune des commandes (ADR 0023).
import { closeEdition } from '../../../backend/src/application/index.ts';
import { closeEditionRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(closeEdition, closeEditionRequest, Deno.env.toObject()));
