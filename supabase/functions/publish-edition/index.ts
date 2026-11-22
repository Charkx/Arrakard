// Publier les brouillons d'une édition (ADR 0012), par la chaîne commune des commandes (ADR 0023).
import { publishEdition } from '../../../backend/src/application/index.ts';
import { publishEditionRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(publishEdition, publishEditionRequest, Deno.env.toObject()));
