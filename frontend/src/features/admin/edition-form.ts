import type { EditionType, Prestige } from '@arrakis/backend/domain';
import type { SeasonStatus } from './admin.ts';

export const EDITION_TYPES: readonly EditionType[] = [
  'league_div1',
  'league_div2',
  'inhouse',
  'tournament',
  'lan',
  'external_lan',
  'external_event',
];

export const PRESTIGES: readonly Prestige[] = ['normal', 'premium', 'championship'];

/** Les types sans match : seulement des participants (glossaire, « Événement externe »). */
export const isExternal = (type: EditionType): boolean =>
  type === 'external_lan' || type === 'external_event';

/** Ce qu'un admin saisit d'une édition (contrat `createEditionRequest`). */
export interface EditionDetails {
  readonly name: string;
  readonly type: EditionType;
  readonly date: string;
  readonly seasonId: string | null;
  readonly prestige: Prestige;
  readonly location: string | null;
  readonly url: string | null;
  readonly description: string | null;
  readonly arrakisWon: boolean | null;
  readonly participantIds: readonly string[];
}

/** Ce que lit le formulaire : l'édition à modifier (ou null), les saisons et les joueurs. */
export interface EditionForm {
  readonly edition:
    | (EditionDetails & {
        readonly version: number;
        /** Instant ISO de sa clôture (ADR 0013), ou null. */
        readonly closedAt: string | null;
      })
    | null;
  readonly seasons: readonly {
    readonly id: string;
    readonly name: string;
    readonly status: SeasonStatus;
  }[];
  readonly players: readonly { readonly id: string; readonly nickname: string }[];
}

/** Une édition vide, datée de ce jour, dans la saison ouverte s'il y en a une. */
export function blankEdition(today: string, form: EditionForm): EditionDetails {
  return {
    name: '',
    type: 'inhouse',
    date: today,
    seasonId: form.seasons.find((s) => s.status === 'open')?.id ?? null,
    prestige: 'normal',
    location: null,
    url: null,
    description: null,
    arrakisWon: null,
    participantIds: [],
  };
}

/**
 * Ce qui part au serveur : un événement externe garde ses participants et sa
 * victoire ; les autres n'en ont pas.
 */
export function toSend(details: EditionDetails): EditionDetails {
  return isExternal(details.type) ? details : { ...details, participantIds: [], arrakisWon: null };
}
