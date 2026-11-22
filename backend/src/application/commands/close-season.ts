import { CommandRejected, type Command } from '../command.ts';
import { dayInParis } from '../seasons.ts';

export interface CloseSeasonInput {
  readonly seasonId: string;
}

export interface CloseSeasonOutcome {
  readonly seasonId: string;
  readonly endDate: string;
}

/**
 * Clôture une saison : elle ne reçoit plus de match, donc ses notes ne
 * bougent plus (ADR 0014, docs/architecture/overview.md). Il n'y a plus de
 * saison active jusqu'à l'ouverture de la suivante.
 */
export const closeSeason: Command<CloseSeasonInput, CloseSeasonOutcome> = {
  name: 'closeSeason',
  async run({ seasons }, { organizationId, now }, { seasonId }) {
    const season = await seasons.find(organizationId, seasonId);
    if (!season) throw new CommandRejected('not_found', `Saison ${seasonId} introuvable.`);
    if (season.status === 'closed') {
      throw new CommandRejected('already_done', 'Cette saison est déjà clôturée.');
    }
    const endDate = dayInParis(now);
    await seasons.close(organizationId, seasonId, endDate);
    return { seasonId, endDate };
  },
};
