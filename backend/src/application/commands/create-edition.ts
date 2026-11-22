import type { Command } from '../command.ts';
import type { EditionDetails } from '../editions.ts';
import { checkEditionDetails } from './edition-details.ts';

export type CreateEditionInput = EditionDetails;

export interface CreateEditionOutcome {
  readonly editionId: string;
  readonly version: number;
}

/**
 * Crée une édition, sans match (cas d'usage A3, ADR 0035) : ses matchs
 * viendront par l'import ou la saisie, ses participants s'il s'agit d'un
 * événement externe.
 */
export const createEdition: Command<CreateEditionInput, CreateEditionOutcome> = {
  name: 'createEdition',
  async run(repositories, { organizationId }, edition) {
    await checkEditionDetails(repositories, organizationId, edition);
    return { editionId: await repositories.editions.create(organizationId, edition), version: 1 };
  },
};
