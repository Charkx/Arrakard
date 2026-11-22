import { CommandRejected, type Command } from '../command.ts';
import { checkVersion } from './edition-details.ts';

export interface ArchiveEditionInput {
  readonly editionId: string;
  readonly version: number;
}

export interface ArchiveEditionOutcome {
  readonly editionId: string;
  readonly version: number;
}

/**
 * Archive une édition sans match : elle disparaît des pages publiques
 * (ADR 0035). Une édition qui a des matchs ne s'archive pas, sinon ses notes
 * changeraient sans qu'on le voie : on corrige ses matchs à la place.
 */
export const archiveEdition: Command<ArchiveEditionInput, ArchiveEditionOutcome> = {
  name: 'archiveEdition',
  async run({ editions }, { organizationId, now }, { editionId, version }) {
    const edition = await editions.find(organizationId, editionId);
    if (!edition) throw new CommandRejected('not_found', `Édition ${editionId} introuvable.`);
    checkVersion(edition.version, version);
    if (edition.archived) {
      throw new CommandRejected('already_done', 'Cette édition est déjà archivée.');
    }
    if (edition.matchCount > 0) {
      throw new CommandRejected(
        'conflict',
        'Cette édition a des matchs : elle ne s’archive pas, on corrige ses matchs.',
      );
    }
    return { editionId, version: await editions.archive(organizationId, editionId, now, version) };
  },
};
