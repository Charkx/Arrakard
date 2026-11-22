// Créer une édition (ADR 0035), par la chaîne commune des commandes (ADR 0023).
import { createEdition } from '../../../backend/src/application/index.ts';
import { createEditionRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(createEdition, createEditionRequest, Deno.env.toObject()));
