/** Palier de carte (glossaire). */
export type Tier = 'bronze' | 'silver' | 'gold' | 'elite';

/** Le palier au-dessus d'une note, et les points qui manquent pour l'atteindre. */
export interface NextTier {
  readonly tier: Tier;
  readonly pointsMissing: number;
}

/** Notes à partir desquelles on change de palier, de la plus haute à la plus basse. */
const THRESHOLDS = [
  { from: 90, tier: 'elite' },
  { from: 80, tier: 'gold' },
  { from: 70, tier: 'silver' },
] as const;

/** Palier d'une note : Élite ≥ 90 · Or ≥ 80 · Argent ≥ 70 · Bronze sinon. */
export function tierOf(rating: number): Tier {
  return THRESHOLDS.find((t) => rating >= t.from)?.tier ?? 'bronze';
}

/** Le palier juste au-dessus d'une note ; `null` pour une note Élite. */
export function nextTierOf(rating: number): NextTier | null {
  const next = THRESHOLDS.findLast((t) => rating < t.from);
  return next ? { tier: next.tier, pointsMissing: next.from - rating } : null;
}
