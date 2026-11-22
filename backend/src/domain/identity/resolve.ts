import { normalizeAlias, similarity } from './names.ts';

/** Un joueur connu, tel que la résolution d'import le voit. */
export interface DirectoryPlayer {
  readonly playerId: string;
  /** Graphies déjà rencontrées pour ce joueur (pseudo actuel inclus). */
  readonly aliases: readonly string[];
  readonly teamTag: string | null;
  readonly archived: boolean;
}

export type Resolution =
  | { readonly kind: 'matched'; readonly playerId: string }
  | { readonly kind: 'ambiguous'; readonly candidates: readonly string[] }
  | {
      readonly kind: 'unknown';
      readonly suggestions: readonly { readonly playerId: string; readonly similarity: number }[];
    };

/** Au-delà, une graphie proche est proposée comme correspondance possible. */
export const SUGGESTION_THRESHOLD = 0.8;

/**
 * Rattache un pseudo d'import à un joueur connu (ADR 0004). Les homonymes sont
 * départagés par le tag d'équipe de la ligne, puis par le statut actif ; sinon
 * l'ambiguïté remonte à l'admin.
 */
export function resolvePlayer(
  nickname: string,
  context: { readonly teamTag: string | null },
  directory: readonly DirectoryPlayer[],
): Resolution {
  const alias = normalizeAlias(nickname);
  const candidates = directory.filter((p) => p.aliases.some((a) => normalizeAlias(a) === alias));

  if (candidates.length === 0) {
    return { kind: 'unknown', suggestions: suggest(nickname, directory) };
  }

  const chosen = disambiguate(candidates, context.teamTag);
  return chosen
    ? { kind: 'matched', playerId: chosen.playerId }
    : { kind: 'ambiguous', candidates: candidates.map((p) => p.playerId) };
}

function disambiguate(
  candidates: readonly DirectoryPlayer[],
  teamTag: string | null,
): DirectoryPlayer | undefined {
  const sameTeam = candidates.filter((p) => teamTag !== null && p.teamTag === teamTag);
  for (const pool of [candidates, sameTeam]) {
    if (pool.length === 1) return pool[0];
  }
  for (const pool of [sameTeam, candidates]) {
    const active = pool.filter((p) => !p.archived);
    if (active.length === 1) return active[0];
  }
  return undefined;
}

function suggest(nickname: string, directory: readonly DirectoryPlayer[]) {
  return directory
    .map((p) => ({
      playerId: p.playerId,
      similarity: Math.max(0, ...p.aliases.map((a) => similarity(nickname, a))),
    }))
    .filter((s) => s.similarity > SUGGESTION_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity);
}
