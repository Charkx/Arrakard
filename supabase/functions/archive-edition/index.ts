// Archiver une édition (ADR 0035), par la chaîne commune des commandes (ADR 0023).
import { archiveEdition } from '../../../backend/src/application/index.ts';
import { archiveEditionRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(archiveEdition, archiveEditionRequest, Deno.env.toObject()));
