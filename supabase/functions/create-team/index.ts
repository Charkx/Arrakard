// Créer une équipe (ADR 0033), par la chaîne commune des commandes (ADR 0023).
import { createTeam } from '../../../backend/src/application/index.ts';
import { createTeamRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(createTeam, createTeamRequest, Deno.env.toObject()));
