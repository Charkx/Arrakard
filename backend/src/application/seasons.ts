/** Ouverte (la saison active) ou clôturée (ADR 0014). */
export type SeasonStatus = 'open' | 'closed';

/** Ce qu'une commande lit d'une saison. */
export interface SeasonState {
  readonly status: SeasonStatus;
}

/** Une nouvelle saison. */
export interface NewSeason {
  readonly name: string;
  readonly year: number;
  /** Date ISO (AAAA-MM-JJ) de son ouverture. */
  readonly startDate: string;
}

/** Lit et écrit les saisons d'une organisation. */
export interface SeasonRepository {
  /** La saison de cette organisation, ou `undefined` si elle n'y est pas. */
  find(organizationId: string, seasonId: string): Promise<SeasonState | undefined>;
  /** La saison active (ouverte) de l'organisation, s'il y en a une. */
  activeSeasonId(organizationId: string): Promise<string | undefined>;
  /** Une saison de ce nom existe-t-elle déjà dans l'organisation ? */
  nameTaken(organizationId: string, name: string): Promise<boolean>;
  /** Crée la saison, ouverte, et rend son identifiant. */
  open(organizationId: string, season: NewSeason): Promise<string>;
  /** La clôture, à cette date ISO (AAAA-MM-JJ). */
  close(organizationId: string, seasonId: string, endDate: string): Promise<void>;
}

/** Le jour qu'il est à Paris (AAAA-MM-JJ) à cet instant ISO : le jour d'Arrakis. */
export function dayInParis(instant: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(instant));
}
