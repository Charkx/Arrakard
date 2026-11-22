import type { EditionType } from '../facts.ts';

/** À venir, en cours ou terminée : jamais saisi, toujours déduit des faits (ADR 0013). */
export type EditionStatus = 'upcoming' | 'ongoing' | 'completed';

/** Les faits d'une édition dont son statut dépend. */
export interface EditionStatusFacts {
  readonly type: EditionType;
  /** Date ISO (AAAA-MM-JJ). */
  readonly date: string;
  /** Date de la clôture par un admin, ou null. */
  readonly closedAt: string | null;
  /** Au moins un match publié. */
  readonly hasPublishedResults: boolean;
  /** Son match final (`isFinal`) est publié. */
  readonly hasPublishedFinal: boolean;
}

/** Un événement externe n'a pas de match enregistré, seulement des participants (glossaire). */
export const isExternal = (type: EditionType): boolean =>
  type === 'external_event' || type === 'external_lan';

/** Le statut d'une édition au jour `today` (AAAA-MM-JJ), selon la règle de l'ADR 0013. */
export function editionStatus(edition: EditionStatusFacts, today: string): EditionStatus {
  const isPast = edition.date < today;
  if (
    edition.closedAt !== null ||
    edition.hasPublishedFinal ||
    (edition.type === 'inhouse' && edition.hasPublishedResults && isPast) ||
    (isExternal(edition.type) && isPast)
  ) {
    return 'completed';
  }
  if (edition.date > today && !edition.hasPublishedResults) return 'upcoming';
  return 'ongoing';
}
