// Archiver une équipe (ADR 0033), par la chaîne commune des commandes (ADR 0023).
import { archiveTeam } from '../../../backend/src/application/index.ts';
import { archiveTeamRequest } from '../../../backend/src/contracts/index.ts';
import { edgeCommandHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeCommandHandler(archiveTeam, archiveTeamRequest, Deno.env.toObject()));
