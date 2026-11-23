// Importer le fichier Excel d'une édition (ADR 0038), par la chaîne commune des commandes (ADR 0023).
import { importEdition } from '../../../backend/src/application/index.ts';
import { importEditionRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(importEdition, importEditionRequest, Deno.env.toObject()));
