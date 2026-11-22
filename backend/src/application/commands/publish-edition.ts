import { CommandRejected, type Command } from '../command.ts';

export interface PublishEditionInput {
  readonly editionId: string;
  /** La version de l'édition que l'admin a sous les yeux (ADR 0005). */
  readonly version: number;
}

export interface PublishEditionOutcome {
  readonly editionId: string;
  readonly publicationId: string;
  readonly matchIds: readonly string[];
  readonly publishedAt: string;
  readonly version: number;
}

/**
 * Publie les brouillons d'une édition : ils deviennent visibles du public et
 * comptent dans les notes. La publication est un fait : quelle édition,
 * quels matchs, quand, par qui (ADR 0012).
 */
export const publishEdition: Command<PublishEditionInput, PublishEditionOutcome> = {
  name: 'publishEdition',
  async run({ editions }, { organizationId, actorUserId, now }, { editionId, version }) {
    const edition = await editions.find(organizationId, editionId);
    if (!edition) {
      throw new CommandRejected('not_found', `Édition ${editionId} introuvable.`);
    }
    if (edition.version !== version) {
      throw new CommandRejected(
        'conflict',
        `L’édition a changé depuis votre lecture (version ${edition.version}, et non ${version}).`,
      );
    }
    if (edition.seasonClosed) {
      throw new CommandRejected(
        'season_closed',
        'La saison de cette édition est clôturée : ses notes sont figées.',
      );
    }
    if (edition.draftMatchIds.length === 0) {
      throw new CommandRejected(
        'nothing_to_publish',
        'Cette édition n’a aucun brouillon à publier.',
      );
    }
    const matchIds = edition.draftMatchIds.toSorted();
    const published = await editions.publish(
      organizationId,
      { editionId, matchIds, publishedAt: now, publishedBy: actorUserId },
      version,
    );
    return { editionId, ...published, matchIds, publishedAt: now };
  },
};
