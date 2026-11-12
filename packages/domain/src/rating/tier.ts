/** Palier de carte (glossaire). */
export type Tier = 'bronze' | 'silver' | 'gold' | 'elite';

/** Palier d'une note : Élite ≥ 90 · Or ≥ 80 · Argent ≥ 70 · Bronze sinon. */
export function tierOf(rating: number): Tier {
  if (rating >= 90) return 'elite';
  if (rating >= 80) return 'gold';
  if (rating >= 70) return 'silver';
  return 'bronze';
}
