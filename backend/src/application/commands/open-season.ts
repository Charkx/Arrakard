import { CommandRejected, type Command } from '../command.ts';
import { dayInParis } from '../seasons.ts';

export interface OpenSeasonInput {
  readonly name: string;
  readonly year: number;
}

export interface OpenSeasonOutcome {
  readonly seasonId: string;
  readonly startDate: string;
}

/**
 * Ouvre une saison : elle devient la saison active, la seule dont les matchs
 * comptent dans la note (ADR 0014). La précédente doit être clôturée d'abord.
 */
export const openSeason: Command<OpenSeasonInput, OpenSeasonOutcome> = {
  name: 'openSeason',
  async run({ seasons }, { organizationId, now }, { name, year }) {
    if ((await seasons.activeSeasonId(organizationId)) !== undefined) {
      throw new CommandRejected(
        'conflict',
        'Une saison est déjà ouverte : clôturez-la avant d’en ouvrir une autre.',
      );
    }
    if (await seasons.nameTaken(organizationId, name)) {
      throw new CommandRejected('conflict', `Une saison s’appelle déjà « ${name} ».`);
    }
    const startDate = dayInParis(now);
    const seasonId = await seasons.open(organizationId, { name, year, startDate });
    return { seasonId, startDate };
  },
};
