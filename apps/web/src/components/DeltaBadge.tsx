/** Écart de note depuis la dernière édition, repris de la v1. Rien si la note n'a pas bougé. */
export function DeltaBadge({ delta }: { readonly delta: number }) {
  if (delta === 0) return null;
  return (
    <span className={`delta-badge ${delta > 0 ? 'up' : 'down'}`}>
      {delta > 0 ? '+' : ''}
      {delta}
    </span>
  );
}
