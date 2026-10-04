// Point d'entrée public du domaine. Chaque module exporte ici son API.
export { ROLES } from './performance';
export type { MatchResult, Performance, Role } from './performance';
export { computeRating, tierOf } from './rating/rating';
export type { RatedPerformance, RatingResult, Tier } from './rating/rating';
export { computePlayerStats } from './stats/stats';
export type { PlayerStats, RecentForm, StatPerformance } from './stats/stats';
export { LEADERBOARD_MIN_GAMES, rankLeaderboard } from './leaderboard/leaderboard';
export type {
  Division,
  LeaderboardOptions,
  LeaderboardPlayer,
  LeaderboardRow,
  LeaderboardSort,
} from './leaderboard/leaderboard';
export { computeEventStandings, OFFICIAL_SCORING } from './standings/event-standings';
export type {
  EventFacts,
  EventMatch,
  EventStandingRow,
  MatchPerformance,
  ScoringRules,
} from './standings/event-standings';
export { rankSeasonMvps } from './standings/season-mvp';
export type { SeasonMvpEvent, SeasonMvpRow } from './standings/season-mvp';
