import type { MatchResult, Role } from '../performance.ts';

/** Barème du classement de soirée (glossaire : « Barème »). */
export interface ScoringRules {
  readonly win: number;
  readonly loss: number;
  readonly kill: number;
  readonly assist: number;
  readonly death: number;
  /** Bonus unique du MVP de soirée. */
  readonly mvpEvent: number;
  /** Bonus par match où le joueur est MVP. */
  readonly mvpMatch: number;
}

/** Barème officiel du règlement ArrakIn House. */
export const OFFICIAL_SCORING: ScoringRules = {
  win: 5,
  loss: -3,
  kill: 3,
  assist: 2,
  death: -3,
  mvpEvent: 10,
  mvpMatch: 0,
};

/** Performance d'un joueur identifié, dans un match d'une édition. */
export interface MatchPerformance {
  readonly playerId: string;
  /** Équipe du match (équipe IH ou tag d'équipe). */
  readonly team: string;
  readonly role: Role;
  readonly champion: string;
  readonly result: MatchResult;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly gpm: number;
}

export interface EventMatch {
  readonly winnerTeam: string;
  readonly durationMinutes: number;
  readonly mvpPlayerId?: string;
  readonly performances: readonly MatchPerformance[];
}

/** Ce dont le classement de soirée a besoin d'une édition. */
export interface EventFacts {
  readonly matches: readonly EventMatch[];
  readonly eventMvpPlayerId?: string;
  /** Barème propre à l'édition ; absent = barème officiel. */
  readonly scoring?: ScoringRules;
}

export interface EventStandingRow {
  readonly rank: number;
  readonly playerId: string;
  /** Dernière équipe vue dans la soirée. */
  readonly team: string;
  /** Rôle le plus joué (le premier rencontré en cas d'égalité). */
  readonly role: Role;
  /** Champion le plus joué (le premier rencontré en cas d'égalité). */
  readonly champion: string;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly isEventMvp: boolean;
  readonly matchMvpCount: number;
  readonly resultPoints: number;
  readonly statPoints: number;
  readonly mvpPoints: number;
  readonly points: number;
}

const collator = new Intl.Collator('fr', { sensitivity: 'base' });

/**
 * Classement en points d'une édition selon son barème. Départage : points,
 * puis kills, puis pseudo.
 */
export function computeEventStandings(
  event: EventFacts,
  nicknameOf: (playerId: string) => string,
): EventStandingRow[] {
  const scoring = event.scoring ?? OFFICIAL_SCORING;
  const byPlayer = new Map<string, PlayerAccumulator>();

  for (const match of event.matches) {
    for (const performance of match.performances) {
      const acc = byPlayer.get(performance.playerId) ?? newAccumulator(performance);
      byPlayer.set(performance.playerId, acc);
      accumulate(acc, performance, match.mvpPlayerId === performance.playerId);
    }
  }

  const rows = [...byPlayer.values()].map((acc) => {
    const isEventMvp = event.eventMvpPlayerId === acc.playerId;
    const resultPoints = acc.wins * scoring.win + acc.losses * scoring.loss;
    const statPoints =
      acc.kills * scoring.kill + acc.assists * scoring.assist + acc.deaths * scoring.death;
    const mvpPoints = acc.matchMvpCount * scoring.mvpMatch + (isEventMvp ? scoring.mvpEvent : 0);
    return {
      playerId: acc.playerId,
      team: acc.team,
      role: mostFrequent(acc.roles),
      champion: mostFrequent(acc.champions),
      games: acc.wins + acc.losses,
      wins: acc.wins,
      losses: acc.losses,
      kills: acc.kills,
      deaths: acc.deaths,
      assists: acc.assists,
      isEventMvp,
      matchMvpCount: acc.matchMvpCount,
      resultPoints,
      statPoints,
      mvpPoints,
      points: resultPoints + statPoints + mvpPoints,
    };
  });

  return rows
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.kills - a.kills ||
        collator.compare(nicknameOf(a.playerId), nicknameOf(b.playerId)),
    )
    .map((row, index) => ({ rank: index + 1, ...row }));
}

interface PlayerAccumulator {
  playerId: string;
  team: string;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
  matchMvpCount: number;
  roles: Map<Role, number>;
  champions: Map<string, number>;
}

function newAccumulator(performance: MatchPerformance): PlayerAccumulator {
  return {
    playerId: performance.playerId,
    team: performance.team,
    wins: 0,
    losses: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    matchMvpCount: 0,
    roles: new Map(),
    champions: new Map(),
  };
}

function accumulate(acc: PlayerAccumulator, p: MatchPerformance, isMatchMvp: boolean): void {
  acc.team = p.team;
  if (p.result === 'win') acc.wins += 1;
  else acc.losses += 1;
  acc.kills += p.kills;
  acc.deaths += p.deaths;
  acc.assists += p.assists;
  if (isMatchMvp) acc.matchMvpCount += 1;
  acc.roles.set(p.role, (acc.roles.get(p.role) ?? 0) + 1);
  acc.champions.set(p.champion, (acc.champions.get(p.champion) ?? 0) + 1);
}

/** Clé la plus fréquente ; la première insérée en cas d'égalité. La map n'est jamais vide. */
function mostFrequent<K>(counts: ReadonlyMap<K, number>): K {
  return [...counts].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}
