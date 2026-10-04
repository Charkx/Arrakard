import type { Performance } from '../performance';

export type RecentForm = 'up' | 'stable' | 'down';

/** Ce dont les statistiques affichées ont besoin d'une performance. */
export type StatPerformance = Pick<
  Performance,
  'result' | 'kills' | 'deaths' | 'assists' | 'gold' | 'gpm'
>;

/** Statistiques brutes affichées sur la carte et le profil (jamais pondérées). */
export interface PlayerStats {
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  /** Pourcentage entier (0–100). */
  readonly winrate: number;
  /** (kills + assists) / max(deaths, 1) sur les totaux, arrondi au centième. */
  readonly kda: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly avgGold: number;
  readonly avgGpm: number;
  readonly recentForm: RecentForm;
}

const RECENT_FORM_WINDOW = 3;

/**
 * Statistiques affichées d'un joueur. Les performances doivent être fournies
 * dans l'ordre chronologique : la forme récente lit les dernières.
 */
export function computePlayerStats(performances: readonly StatPerformance[]): PlayerStats {
  const games = performances.length;
  const wins = count(performances, (p) => p.result === 'win');
  const kills = sum(performances, (p) => p.kills);
  const deaths = sum(performances, (p) => p.deaths);
  const assists = sum(performances, (p) => p.assists);

  return {
    games,
    wins,
    losses: games - wins,
    winrate: games === 0 ? 0 : Math.round((wins / games) * 100),
    kda: games === 0 ? 0 : Math.round(((kills + assists) / Math.max(deaths, 1)) * 100) / 100,
    kills,
    deaths,
    assists,
    avgGold: games === 0 ? 0 : Math.round(sum(performances, (p) => p.gold) / games),
    avgGpm: games === 0 ? 0 : Math.round(sum(performances, (p) => p.gpm) / games),
    recentForm: recentFormOf(performances),
  };
}

/** 2 ou 3 victoires sur les 3 dernières → up ; aucune → down ; sinon stable. */
function recentFormOf(performances: readonly StatPerformance[]): RecentForm {
  if (performances.length === 0) return 'stable';
  const recentWins = count(performances.slice(-RECENT_FORM_WINDOW), (p) => p.result === 'win');
  if (recentWins >= 2) return 'up';
  if (recentWins === 0) return 'down';
  return 'stable';
}

function count<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  return items.filter(predicate).length;
}

function sum<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}
