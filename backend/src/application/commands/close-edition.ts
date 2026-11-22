import { CommandRejected, type Command } from '../command.ts';
import { checkVersion } from './edition-details.ts';

export interface CloseEditionInput {
  readonly editionId: string;
  /** La version de l'édition que l'admin a sous les yeux (ADR 0005). */
  readonly version: number;
}

export interface CloseEditionOutcome {
  readonly editionId: string;
  readonly closedAt: string;
  readonly version: number;
}

/**
 * Clôture une édition que les faits ne suffisent pas à terminer : une ligue
 * sans finale, un tournoi interrompu. La clôture est un fait daté (ADR 0013).
 */
export const closeEdition: Command<CloseEditionInput, CloseEditionOutcome> = {
  name: 'closeEdition',
  async run({ editions }, { organizationId, now }, { editionId, version }) {
    const edition = await editions.find(organizationId, editionId);
    if (!edition) {
      throw new CommandRejected('not_found', `Édition ${editionId} introuvable.`);
    }
    checkVersion(edition.version, version);
    if (edition.closedAt !== null) {
      throw new CommandRejected('already_done', 'Cette édition est déjà clôturée.');
    }
    const newVersion = await editions.close(organizationId, editionId, now, version);
    return { editionId, closedAt: now, version: newVersion };
  },
};
