import type { Performance, Role } from '../performance';

/** Palier de carte (glossaire). */
export type Tier = 'bronze' | 'silver' | 'gold' | 'elite';

/** Ce dont la note a besoin d'une performance. */
export type RatedPerformance = Pick<
  Performance,
  'role' | 'result' | 'kills' | 'deaths' | 'assists' | 'weight'
>;

export interface RatingResult {
  readonly rating: number;
  readonly impact: number;
  readonly consistency: number;
  readonly clutch: number;
  readonly tier: Tier;
}

/**
 * Note de carte d'un joueur à partir de ses performances du split actif.
 * Spécification : docs/domain/rating-spec.md
 */
export function computeRating(performances: readonly RatedPerformance[]): RatingResult {
  const role = dominantRole(performances);
  if (role === undefined) {
    const rating = 60;
    return { rating, impact: 60, consistency: 60, clutch: 60, tier: tierOf(rating) };
  }

  const baseline = ROLE_BASELINES[role];
  const games = performances.length;

  // Pondération par le prestige : n'affecte que les sous-notes.
  const weightedGames = sum(performances, (p) => p.weight);
  const weightedWins = sum(performances, (p) => (p.result === 'win' ? p.weight : 0));
  const weightedKills = sum(performances, (p) => p.kills * p.weight);
  const weightedDeaths = sum(performances, (p) => p.deaths * p.weight);
  const weightedAssists = sum(performances, (p) => p.assists * p.weight);

  const kda = Math.min((weightedKills + weightedAssists) / Math.max(weightedDeaths, 1), KDA_CAP);
  const winrate =
    weightedGames > 0
      ? weightedWins / weightedGames
      : performances.filter((p) => p.result === 'win').length / games;

  // Fiabilité : en dessous de 15 parties, on tire vers la médiane du rôle.
  const reliability = Math.min(games / FULL_RELIABILITY_GAMES, 1);
  const reliableKda = kda * reliability + baseline.kda * (1 - reliability);
  const reliableWinrate = winrate * reliability + baseline.winrate * (1 - reliability);

  const kdaScore = (reliableKda / baseline.kda) * 60;
  const winrateScore = 60 + (reliableWinrate - baseline.winrate) * 78;

  const impact = clamp(Math.round(kdaScore), 0, 99);
  const consistency = clamp(Math.round(winrateScore), 0, 99);
  const clutch = clamp(Math.round(kdaScore * 0.5 + winrateScore * 0.5), 0, 99);
  const rating = clamp(Math.round(impact * 0.35 + consistency * 0.35 + clutch * 0.3), 60, 99);

  return { rating, impact, consistency, clutch, tier: tierOf(rating) };
}

const FULL_RELIABILITY_GAMES = 15;
/** Au-delà, le KDA n'apporte plus rien aux sous-notes (2 parties à 31 ne font pas un Élite). */
const KDA_CAP = 8;

const ROLE_BASELINES: Record<Role, { kda: number; winrate: number }> = {
  TOP: { kda: 2.5, winrate: 0.5 },
  JGL: { kda: 3.0, winrate: 0.5 },
  MID: { kda: 3.0, winrate: 0.5 },
  ADC: { kda: 3.0, winrate: 0.5 },
  SUP: { kda: 4.0, winrate: 0.5 },
};

/** Rôle le plus joué ; en cas d'égalité, le premier rencontré (anomalie A6). */
function dominantRole(performances: readonly RatedPerformance[]): Role | undefined {
  const counts = new Map<Role, number>();
  for (const { role } of performances) counts.set(role, (counts.get(role) ?? 0) + 1);

  let best: Role | undefined;
  let bestCount = 0;
  for (const [role, count] of counts) {
    if (count > bestCount) {
      best = role;
      bestCount = count;
    }
  }
  return best;
}

/** Palier d'une note : Élite ≥ 90 · Or ≥ 80 · Argent ≥ 70 · Bronze sinon. */
export function tierOf(rating: number): Tier {
  if (rating >= 90) return 'elite';
  if (rating >= 80) return 'gold';
  if (rating >= 70) return 'silver';
  return 'bronze';
}

function sum<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
