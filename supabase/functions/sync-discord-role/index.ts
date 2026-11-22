// Accorder ou retirer l'adhésion d'après le rôle Discord, à chaque connexion (ADR 0030).
import { edgeSyncDiscordRoleHandler } from '../../../backend/src/infrastructure/index.ts';

Deno.serve(edgeSyncDiscordRoleHandler(Deno.env.toObject()));
