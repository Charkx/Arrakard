import { CommandRejected, type Command } from '../command.ts';
import { EXTERNAL_TYPES, type EditionDetails } from '../editions.ts';
import { checkEditionDetails, checkVersion } from './edition-details.ts';

export interface UpdateEditionInput extends EditionDetails {
  readonly editionId: string;
  readonly version: number;
}

export interface UpdateEditionOutcome {
  readonly editionId: string;
  readonly version: number;
}

/**
 * Modifie ce qu'un admin saisit d'une édition (ADR 0035). Une édition d'une
 * saison clôturée ne change plus, car son type, sa date ou son prestige
 * changeraient ses notes (ADR 0032).
 */
export const updateEdition: Command<UpdateEditionInput, UpdateEditionOutcome> = {
  name: 'updateEdition',
  async run(repositories, { organizationId }, { editionId, version, ...details }) {
    const edition = await repositories.editions.find(organizationId, editionId);
    if (!edition) throw new CommandRejected('not_found', `Édition ${editionId} introuvable.`);
    checkVersion(edition.version, version);
    if (edition.archived) {
      throw new CommandRejected('conflict', 'Cette édition est archivée : elle ne change plus.');
    }
    if (edition.seasonClosed) {
      throw new CommandRejected('season_closed', 'La saison de cette édition est clôturée.');
    }
    if (edition.matchCount > 0 && EXTERNAL_TYPES.includes(details.type)) {
      throw new CommandRejected(
        'conflict',
        'Cette édition a des matchs : elle ne devient pas un événement externe.',
      );
    }
    await checkEditionDetails(repositories, organizationId, details);
    const newVersion = await repositories.editions.update(
      organizationId,
      editionId,
      details,
      version,
    );
    return { editionId, version: newVersion };
  },
};
