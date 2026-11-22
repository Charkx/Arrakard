/** Ce qu'une commande change d'une édition, hors faits de jeu. */
export interface EditionState {
  readonly version: number;
  /** Date ISO de la clôture, ou null si l'édition n'est pas clôturée (ADR 0013). */
  readonly closedAt: string | null;
}

/** Lit et écrit une édition d'une organisation, avec sa version (ADR 0005). */
export interface EditionRepository {
  /** L'édition de cette organisation, ou `undefined` si elle n'y est pas. */
  find(organizationId: string, editionId: string): Promise<EditionState | undefined>;
  /**
   * La clôture, si l'édition est encore à la version `version`. Rend la
   * nouvelle version ; refuse par un conflit si la version a changé.
   */
  close(
    organizationId: string,
    editionId: string,
    closedAt: string,
    version: number,
  ): Promise<number>;
}
