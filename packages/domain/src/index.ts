// Point d'entrée public du domaine. Chaque module exporte ici son API.
export { ROLES } from './performance.ts';
export type { MatchResult, Performance, Role } from './performance.ts';
export { computeRating, tierOf } from './rating/rating.ts';
export type { RatedPerformance, RatingResult, Tier } from './rating/rating.ts';
export { computePlayerStats } from './stats/stats.ts';
export type { PlayerStats, RecentForm, StatPerformance } from './stats/stats.ts';
export { LEADERBOARD_MIN_GAMES, rankLeaderboard } from './leaderboard/leaderboard.ts';
export type {
  Division,
  LeaderboardOptions,
  LeaderboardPlayer,
  LeaderboardRow,
  LeaderboardSort,
} from './leaderboard/leaderboard.ts';
export { computeEventStandings, OFFICIAL_SCORING } from './standings/event-standings.ts';
export type {
  EventFacts,
  EventMatch,
  EventStandingRow,
  MatchPerformance,
  ScoringRules,
} from './standings/event-standings.ts';
export { rankSeasonMvps } from './standings/season-mvp.ts';
export type { SeasonMvpEvent, SeasonMvpRow } from './standings/season-mvp.ts';
export { normalizeAlias, similarity, splitTeamTag } from './identity/names.ts';
export { resolvePlayer, SUGGESTION_THRESHOLD } from './identity/resolve.ts';
export type { DirectoryPlayer, Resolution } from './identity/resolve.ts';
export { parseDuration, parseStatsSheet } from './import/stats-sheet.ts';
export type {
  SheetLine,
  SheetMatch,
  SheetParseResult,
  SheetRow,
  SheetSide,
  StatsSheet,
} from './import/stats-sheet.ts';
export { analyzeImport } from './import/analyze.ts';
export type {
  ImportAnalysis,
  ImportContext,
  ImportName,
  ImportPlayer,
  RosterStatus,
} from './import/analyze.ts';
export { nameOf } from './import/analyze.ts';
export { planImport } from './import/plan.ts';
export type {
  ImportDecisions,
  ImportPlan,
  ImportPlanResult,
  NameDecision,
  PlannedMatch,
  PlannedPerformance,
  PlayerRef,
} from './import/plan.ts';
export type {
  EditionFact,
  EditionType,
  Facts,
  MatchFact,
  PerformanceFact,
  PlayerFact,
  Prestige,
  SplitFact,
} from './facts.ts';
export { project } from './projection/project.ts';
export type {
  EditionHistoryEntry,
  EditionStandings,
  Projections,
  SplitRating,
} from './projection/project.ts';
export {
  E1_E2_RATING_RULES,
  PRESTIGE_MULTIPLIER,
  TYPE_MULTIPLIER,
  V1_RATING_RULES,
} from './rating/rules.ts';
export type { RatingRules } from './rating/rules.ts';
export { planMerge } from './identity/merge.ts';
export type {
  AbsorbedCustomization,
  MergeFacts,
  MergeMembership,
  MergePlan,
  MergePlanResult,
  MergePlayer,
} from './identity/merge.ts';
