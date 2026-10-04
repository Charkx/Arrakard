import type { MatchResult, Performance } from '../performance';
import { computeRating, type RatingResult } from '../rating/rating';
import type { RatingRules } from '../rating/rules';
import {
  computeEventStandings,
  type EventFacts,
  type EventStandingRow,
} from '../standings/event-standings';
import { computePlayerStats, type PlayerStats } from '../stats/stats';
import type { EditionFact, Facts, MatchFact, PerformanceFact } from './facts';

/** Note et statistiques d'un joueur sur un split. */
export interface SplitRating {
  readonly playerId: string;
  readonly splitId: string;
  readonly rating: RatingResult;
  readonly stats: PlayerStats;
  /** Note avant la dernière édition du split ; null si le joueur la découvrait. */
  readonly previousRating: number | null;
}

/** Ce qu'un joueur a fait lors d'une édition, et sa note de carrière à l'issue. */
export interface EditionHistoryEntry {
  readonly playerId: string;
  readonly editionId: string;
  /** Note cumulée sur toutes les éditions qui comptent, jusqu'à celle-ci incluse. */
  readonly careerRating: number;
  /** Gagnée si plus de la moitié des matchs de l'édition sont gagnés. */
  readonly result: MatchResult;
  readonly stats: PlayerStats;
}

export interface EditionStandings {
  readonly editionId: string;
  readonly rows: readonly EventStandingRow[];
}

/** Projections : tout ce qui se recalcule à partir des faits (ADR 0003). */
export interface Projections {
  readonly splitRatings: readonly SplitRating[];
  readonly editionHistory: readonly EditionHistoryEntry[];
  readonly editionStandings: readonly EditionStandings[];
}

/** Une performance replacée dans son match et son édition. */
interface Played {
  /** Rang chronologique de l'édition. */
  readonly editionRank: number;
  readonly fact: PerformanceFact;
  readonly match: MatchFact;
  readonly edition: EditionFact;
  readonly performance: Performance;
  readonly counts: boolean;
}

/**
 * Recalcule toutes les projections à partir des faits. Fonction pure et
 * déterministe : l'ordre de stockage des faits n'a aucune influence.
 */
export function project(facts: Facts, rules: RatingRules): Projections {
  const editions = [...facts.editions].sort(
    (a, b) => compareStrings(a.date, b.date) || compareStrings(a.id, b.id),
  );
  const played = chronological(facts, editions, rules);

  return {
    splitRatings: projectSplitRatings(played),
    editionHistory: projectEditionHistory(played, editions),
    editionStandings: projectEditionStandings(played, editions, facts),
  };
}

function chronological(
  facts: Facts,
  editions: readonly EditionFact[],
  rules: RatingRules,
): Played[] {
  const editionById = new Map(editions.map((edition, rank) => [edition.id, { edition, rank }]));
  const matchById = new Map(facts.matches.map((m) => [m.id, m]));

  const played = facts.performances.flatMap((fact): Played[] => {
    const match = matchById.get(fact.matchId);
    const ranked = match && editionById.get(match.editionId);
    if (!match || !ranked) return [];
    const { edition, rank } = ranked;
    return [
      {
        editionRank: rank,
        fact,
        match,
        edition,
        counts: rules.countsTowardRating(edition),
        performance: {
          role: fact.role,
          result: fact.result,
          kills: fact.kills,
          deaths: fact.deaths,
          assists: fact.assists,
          gold: fact.gold,
          gpm: goldPerMinute(fact.gold, match.durationSeconds),
          weight: rules.weightOf(edition),
        },
      },
    ];
  });

  return played.sort(
    (a, b) =>
      a.editionRank - b.editionRank ||
      a.match.matchNumber - b.match.matchNumber ||
      compareStrings(a.match.id, b.match.id) ||
      a.fact.line - b.fact.line ||
      compareStrings(a.fact.side, b.fact.side),
  );
}

function projectSplitRatings(played: readonly Played[]): SplitRating[] {
  const bySplit = new Map<string, Played[]>();
  for (const p of played) {
    const { splitId } = p.edition;
    if (!p.counts || splitId === null) continue;
    bySplit.set(splitId, [...(bySplit.get(splitId) ?? []), p]);
  }

  return [...bySplit]
    .sort(([a], [b]) => compareStrings(a, b))
    .flatMap(([splitId, splitPlayed]) => {
      const lastEditionId = splitPlayed.at(-1)?.edition.id;
      return [...Map.groupBy(splitPlayed, (p) => p.fact.playerId)]
        .sort(([a], [b]) => compareStrings(a, b))
        .map(([playerId, own]) => {
          const performances = own.map((p) => p.performance);
          const before = own
            .filter((p) => p.edition.id !== lastEditionId)
            .map((p) => p.performance);
          return {
            playerId,
            splitId,
            rating: computeRating(performances),
            stats: computePlayerStats(performances),
            previousRating: before.length > 0 ? computeRating(before).rating : null,
          };
        });
    });
}

function projectEditionHistory(
  played: readonly Played[],
  editions: readonly EditionFact[],
): EditionHistoryEntry[] {
  const career = new Map<string, Performance[]>();
  const byEdition = Map.groupBy(played, (p) => p.edition.id);

  return editions.flatMap((edition) => {
    const editionPlayed = byEdition.get(edition.id) ?? [];
    const byPlayer = Map.groupBy(editionPlayed, (p) => p.fact.playerId);
    return [...byPlayer]
      .sort(([a], [b]) => compareStrings(a, b))
      .map(([playerId, own]) => {
        const sofar = [
          ...(career.get(playerId) ?? []),
          ...own.filter((p) => p.counts).map((p) => p.performance),
        ];
        career.set(playerId, sofar);
        const stats = computePlayerStats(own.map((p) => p.performance));
        return {
          playerId,
          editionId: edition.id,
          careerRating: computeRating(sofar).rating,
          result: stats.wins > stats.games / 2 ? ('win' as const) : ('loss' as const),
          stats,
        };
      });
  });
}

function projectEditionStandings(
  played: readonly Played[],
  editions: readonly EditionFact[],
  facts: Facts,
): EditionStandings[] {
  const nicknames = new Map(facts.players.map((p) => [p.id, p.nickname]));
  const nicknameOf = (playerId: string) => nicknames.get(playerId) ?? playerId;
  const byEdition = Map.groupBy(played, (p) => p.edition.id);

  return editions.flatMap((edition) => {
    const editionPlayed = byEdition.get(edition.id);
    if (!editionPlayed) return [];
    // Les objets MatchFact sont partagés : on peut regrouper par référence.
    const byMatch = Map.groupBy(editionPlayed, (p) => p.match);
    const event: EventFacts = {
      matches: [...byMatch].map(([match, matchPlayed]) => {
        return {
          winnerTeam: match.winnerTeam,
          durationMinutes: match.durationSeconds / 60,
          ...(match.mvpPlayerId !== undefined && { mvpPlayerId: match.mvpPlayerId }),
          performances: matchPlayed.map(({ fact, performance }) => ({
            playerId: fact.playerId,
            team: fact.team,
            role: fact.role,
            champion: fact.champion,
            result: fact.result,
            kills: fact.kills,
            deaths: fact.deaths,
            assists: fact.assists,
            gpm: performance.gpm,
          })),
        };
      }),
      ...(edition.eventMvpPlayerId !== undefined && { eventMvpPlayerId: edition.eventMvpPlayerId }),
      ...(edition.scoring !== undefined && { scoring: edition.scoring }),
    };
    return [{ editionId: edition.id, rows: computeEventStandings(event, nicknameOf) }];
  });
}

/** Or par minute, arrondi au dixième (règle v1) ; 0 si la durée est inconnue. */
function goldPerMinute(gold: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  return Math.round((gold / (durationSeconds / 60)) * 10) / 10;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
