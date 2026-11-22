// Modifier une édition (ADR 0035), par la chaîne commune des commandes (ADR 0023).
import { updateEdition } from '../../../backend/src/application/index.ts';
import { updateEditionRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(updateEdition, updateEditionRequest, Deno.env.toObject()));
