import type { EditionFact, Prestige } from '../projection/facts';

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
