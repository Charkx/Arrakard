// Clôturer une saison (ADR 0014), par la chaîne commune des commandes (ADR 0023).
import { closeSeason } from '../../../backend/src/application/index.ts';
import { closeSeasonRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(closeSeason, closeSeasonRequest, Deno.env.toObject()));
