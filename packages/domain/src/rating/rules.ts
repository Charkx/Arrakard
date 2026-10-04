import type { EditionFact, EditionType, Prestige } from '../projection/facts.ts';

/** Règles de note paramétrables (ADR 0007) : la v1 est un jeu de règles parmi d'autres. */
export interface RatingRules {
  /** Multiplicateur des matchs d'une édition dans les sous-notes. */
  readonly weightOf: (edition: EditionFact) => number;
  /** L'édition compte-t-elle dans la note ? */
  readonly countsTowardRating: (edition: EditionFact) => boolean;
}

export const PRESTIGE_MULTIPLIER: Readonly<Record<Prestige, number>> = {
  normal: 1,
  premium: 1.3,
  championship: 1.6,
};

/** Règles de la v1 : prestige saisi sur l'édition, toutes les éditions comptent. */
export const V1_RATING_RULES: RatingRules = {
  weightOf: (edition) => PRESTIGE_MULTIPLIER[edition.prestige],
  countsTowardRating: () => true,
};

/**
 * Multiplicateur par type d'édition (évolution E1). Valeurs proposées, à
 * valider : question ouverte Q2 bis.
 */
export const TYPE_MULTIPLIER: Readonly<Record<EditionType, number>> = {
  league_div1: 1.6,
  league_div2: 1.3,
  tournament: 1.6,
  lan: 1.6,
  inhouse: 1,
  external_lan: 1,
  external_event: 1,
};

/**
 * Évolutions E1 et E2 de l'ADR 0007 : multiplicateur déduit du type (sauf
 * exception justifiée), In House exclus de la note.
 */
export const E1_E2_RATING_RULES: RatingRules = {
  weightOf: (edition) => edition.weightOverride?.multiplier ?? TYPE_MULTIPLIER[edition.type],
  countsTowardRating: (edition) => edition.type !== 'inhouse',
};
