import type { Role } from '../performance.ts';
import type { RatedPerformance, RatingResult } from './rating.ts';
import { nextTierOf, tierOf, type NextTier } from './tier.ts';

/** Explication de note (glossaire) : la note, et le détail du calcul qui y mène. */
export interface RatingBreakdown {
  readonly result: RatingResult;
  readonly games: number;
  /** Les étapes du calcul ; `null` pour un joueur sans partie, qui n'en a aucune. */
  readonly steps: RatingSteps | null;
  /** Le palier au-dessus et les points qui manquent pour l'atteindre ; `null` pour un joueur Élite. */
  readonly nextTier: NextTier | null;
}

/** Les étapes du calcul d'une note, dans l'ordre de la spécification. */
export interface RatingSteps {
  /** Rôle dominant : le plus joué. */
  readonly role: Role;
  /** Médiane de rôle (glossaire) : le KDA et le winrate de référence de ce rôle. */
  readonly roleBaseline: RoleBaseline;
  /** Fiabilité (glossaire) : de 0 à 1, atteint 1 à 15 parties. */
  readonly reliability: number;
  readonly kda: StatSteps & {
    /** Vrai si le KDA pondéré dépassait 8 : il est alors ramené à 8 avant la fiabilité. */
    readonly capped: boolean;
    /** Le KDA pondéré une fois plafonné : c'est de lui que part la fiabilité. */
    readonly afterCap: number;
  };
  readonly winrate: StatSteps;
  /** Scores non arrondis et non bornés, dont sortent les sous-notes (bornées de 0 à 99). */
  readonly scores: { readonly kda: number; readonly winrate: number };
  /** La note avant son plancher de 60. */
  readonly ratingBeforeFloor: number;
}

/** Une statistique à chaque étape du calcul. */
export interface StatSteps {
  /** Sur les totaux bruts : chaque partie compte autant. */
  readonly unweighted: number;
  /** Pondérée par le prestige des éditions. */
  readonly weighted: number;
  /** Après la fiabilité : tirée vers la médiane du rôle sous 15 parties. C'est elle qui est notée. */
  readonly reliable: number;
}

export interface RoleBaseline {
  readonly kda: number;
  readonly winrate: number;
}

/**
 * Calcule la note d'un joueur et garde chaque étape du calcul.
 * Spécification : docs/domain/rating-spec.md
 */
export function explainRating(performances: readonly RatedPerformance[]): RatingBreakdown {
  const games = performances.length;
  const role = dominantRole(performances);
  if (role === undefined) {
    const rating = 60;
    return {
      result: { rating, impact: 60, consistency: 60, clutch: 60, tier: tierOf(rating) },
      games,
      steps: null,
      nextTier: nextTierOf(rating),
    };
  }

  const baseline = ROLE_BASELINES[role];

  // Pondération par le prestige : n'affecte que les sous-notes.
  const weightedGames = sum(performances, (p) => p.weight);
  const weightedWins = sum(performances, (p) => (p.result === 'win' ? p.weight : 0));
  const weightedKills = sum(performances, (p) => p.kills * p.weight);
  const weightedDeaths = sum(performances, (p) => p.deaths * p.weight);
  const weightedAssists = sum(performances, (p) => p.assists * p.weight);

  const weightedKda = (weightedKills + weightedAssists) / Math.max(weightedDeaths, 1);
  const kda = Math.min(weightedKda, KDA_CAP);
  const unweightedKda =
    sum(performances, (p) => p.kills + p.assists) /
    Math.max(
      sum(performances, (p) => p.deaths),
      1,
    );
  const unweightedWinrate = performances.filter((p) => p.result === 'win').length / games;
  const winrate = weightedGames > 0 ? weightedWins / weightedGames : unweightedWinrate;

  // Fiabilité : en dessous de 15 parties, on tire vers la médiane du rôle.
  const reliability = Math.min(games / FULL_RELIABILITY_GAMES, 1);
  const reliableKda = kda * reliability + baseline.kda * (1 - reliability);
  const reliableWinrate = winrate * reliability + baseline.winrate * (1 - reliability);

  const kdaScore = (reliableKda / baseline.kda) * 60;
  const winrateScore = 60 + (reliableWinrate - baseline.winrate) * 78;

  const impact = clamp(Math.round(kdaScore), 0, 99);
  const consistency = clamp(Math.round(winrateScore), 0, 99);
  const clutch = clamp(Math.round(kdaScore * 0.5 + winrateScore * 0.5), 0, 99);
  const ratingBeforeFloor = Math.round(impact * 0.35 + consistency * 0.35 + clutch * 0.3);
  const rating = clamp(ratingBeforeFloor, 60, 99);

  return {
    result: { rating, impact, consistency, clutch, tier: tierOf(rating) },
    games,
    steps: {
      role,
      roleBaseline: baseline,
      reliability,
      kda: {
        unweighted: unweightedKda,
        weighted: weightedKda,
        capped: weightedKda > KDA_CAP,
        afterCap: kda,
        reliable: reliableKda,
      },
      winrate: { unweighted: unweightedWinrate, weighted: winrate, reliable: reliableWinrate },
      scores: { kda: kdaScore, winrate: winrateScore },
      ratingBeforeFloor,
    },
    nextTier: nextTierOf(rating),
  };
}

const FULL_RELIABILITY_GAMES = 15;
/** Au-delà, le KDA n'apporte plus rien aux sous-notes (2 parties à 31 ne font pas un Élite). */
const KDA_CAP = 8;

const ROLE_BASELINES: Record<Role, RoleBaseline> = {
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

function sum<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
