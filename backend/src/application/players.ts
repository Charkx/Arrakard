/** Ce qu'une commande lit d'un profil de joueur non fusionné. */
export interface PlayerState {
  /** Le compte Discord lié à sa carte, ou null. */
  readonly discordUserId: string | null;
}

/** Ce que la fusion a déplacé. */
export interface MergeResult {
  /** Les performances passées du profil absorbé au profil conservé, brouillons compris. */
  readonly movedPerformances: number;
}

/** Lit et écrit les profils des joueurs d'une organisation. */
export interface PlayerRepository {
  /** Le profil de cette organisation, ou `undefined` s'il n'y est pas ou s'il est fusionné. */
  find(organizationId: string, playerId: string): Promise<PlayerState | undefined>;
  /** Les deux profils ont-ils joué le même match ? Alors ce ne sont pas la même personne. */
  playedTogether(organizationId: string, a: string, b: string): Promise<boolean>;
  /**
   * Fusionne `absorbedId` dans `keptId` (ADR 0034) : ses performances, ses MVP
   * et ses participations passent au profil conservé ; son pseudo et ses alias
   * deviennent des alias du conservé ; son compte Discord le suit ; son passage
   * en cours se termine ce jour-là (AAAA-MM-JJ) ; il renvoie vers le conservé,
   * comme les profils qui renvoyaient vers lui.
   */
  merge(
    organizationId: string,
    absorbedId: string,
    keptId: string,
    on: string,
  ): Promise<MergeResult>;
  /** Le profil non fusionné lié à ce compte Discord, s'il y en a un. */
  discordOwner(organizationId: string, discordUserId: string): Promise<string | undefined>;
  /** Lie la carte à ce compte Discord, ou la délie (null). */
  linkDiscord(
    organizationId: string,
    playerId: string,
    discordUserId: string | null,
  ): Promise<void>;
}
