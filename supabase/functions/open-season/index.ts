// Ouvrir une saison (ADR 0014), par la chaîne commune des commandes (ADR 0023).
import { openSeason } from '../../../backend/src/application/index.ts';
import { openSeasonRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(openSeason, openSeasonRequest, Deno.env.toObject()));
