import { isExternal } from '../domain/index.ts';
import { CommandRejected, type Repositories } from './command.ts';
import type { EditionDetails } from './editions.ts';

/**
 * Vérifie ce qu'un admin saisit d'une édition (ADR 0035) : sa saison existe et
 * reçoit encore des matchs (ADR 0032), et seul un événement externe a des
 * participants et une victoire saisie ; ses participants qui sont des joueurs non fusionnés de l'organisation.
 */
export async function checkEditionDetails(
  { seasons, players }: Repositories,
  organizationId: string,
  { seasonId, type, participantIds, arrakisWon }: EditionDetails,
): Promise<void> {
  if (seasonId !== null) {
    const season = await seasons.find(organizationId, seasonId);
    if (!season) throw new CommandRejected('not_found', `Saison ${seasonId} introuvable.`);
    if (season.status === 'closed') {
      throw new CommandRejected('season_closed', 'Cette saison est clôturée.');
    }
  }
  if ((participantIds.length > 0 || arrakisWon !== null) && !isExternal(type)) {
    throw new CommandRejected(
      'conflict',
      'Seul un événement externe a des participants et une victoire saisie : les autres ont des matchs.',
    );
  }
  for (const playerId of participantIds) {
    if (!(await players.find(organizationId, playerId))) {
      throw new CommandRejected('not_found', `Joueur ${playerId} introuvable.`);
    }
  }
}

/** Refuse une version qui n'est plus celle de l'édition (ADR 0005). */
export function checkVersion(current: number, version: number): void {
  if (current !== version) {
    throw new CommandRejected(
      'conflict',
      `L’édition a changé depuis votre lecture (version ${current}, et non ${version}).`,
    );
  }
}
