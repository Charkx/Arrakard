/** Ce qu'une commande change d'une édition, hors faits de jeu. */
export interface EditionState {
  readonly version: number;
  /** Date ISO de la clôture, ou null si l'édition n'est pas clôturée (ADR 0013). */
  readonly closedAt: string | null;
  /** Les matchs de l'édition encore en brouillon (ADR 0012). */
  readonly draftMatchIds: readonly string[];
  /** Sa saison est clôturée : elle ne reçoit plus de match (ADR 0014). */
  readonly seasonClosed: boolean;
}

/** Une publication : quelle édition, quels matchs, quand, par qui (ADR 0012). */
export interface Publication {
  readonly editionId: string;
  readonly matchIds: readonly string[];
  readonly publishedAt: string;
  readonly publishedBy: string;
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
  /**
   * Rend publics ces brouillons et enregistre la publication, si l'édition est
   * encore à la version `version`. Rend l'identifiant de la publication et la
   * nouvelle version ; refuse par un conflit si la version a changé.
   */
  publish(
    organizationId: string,
    publication: Publication,
    version: number,
  ): Promise<{ readonly publicationId: string; readonly version: number }>;
}
