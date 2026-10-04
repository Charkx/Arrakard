// Point d'entrée public du domaine. Chaque module exporte ici son API.
export { ROLES } from './performance';
export type { MatchResult, Performance, Role } from './performance';
export { computeRating, tierOf } from './rating/rating';
export type { RatedPerformance, RatingResult, Tier } from './rating/rating';
