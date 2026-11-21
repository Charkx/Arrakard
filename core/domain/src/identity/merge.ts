import { normalizeAlias } from './names.ts';

export interface MergePlayer {
  readonly id: string;
  readonly nickname: string;
  readonly aliases: readonly string[];
  readonly mergedInto: string | null;
  readonly discordUserId: string | null;
}

/** Ce dont la fusion a besoin des faits. */
export interface MergeFacts {
  readonly players: readonly MergePlayer[];
  readonly performances: readonly { readonly matchId: string; readonly playerId: string }[];
  readonly eventMvps: readonly { readonly editionId: string; readonly playerId: string }[];
  readonly matchMvps: readonly { readonly matchId: string; readonly playerId: string }[];
  /** Participations aux événements externes. */
  readonly participations: readonly { readonly editionId: string; readonly playerId: string }[];
  /** Passages en équipe ; `current` : sans date de départ. */
  readonly memberships: readonly MergeMembership[];
  /** Joueurs qui ont personnalisé leur carte. */
  readonly customizedPlayerIds: readonly string[];
}

export interface MergeMembership {
  readonly id: string;
  readonly playerId: string;
  readonly current: boolean;
}

/** Ce que devient la personnalisation de carte du joueur absorbé. */
export type AbsorbedCustomization = 'none' | 'transferred' | 'dropped';

/** Ce que la commande de fusion doit écrire. Les projections se recalculent ensuite. */
export interface MergePlan {
  readonly keepId: string;
  readonly absorbId: string;
  readonly performancesReassigned: number;
  readonly matchesTouched: number;
  readonly eventMvpsReassigned: number;
  readonly matchMvpsReassigned: number;
  /** Graphies du joueur absorbé que le joueur conservé n'avait pas (normalisées). */
  readonly aliasesAdded: readonly string[];
  readonly discordUserIdTransferred: string | null;
  readonly participationsReassigned: number;
  /** Participations à une édition où le joueur conservé figurait déjà. */
  readonly participationsDropped: number;
  readonly membershipsReassigned: number;
  /** Passage en cours du joueur absorbé, clos car le joueur conservé en a déjà un. */
  readonly membershipClosed: string | null;
  /** Celle du joueur conservé l'emporte toujours. */
  readonly absorbedCustomization: AbsorbedCustomization;
}

export type MergePlanResult =
  { readonly ok: true; readonly plan: MergePlan } | { readonly ok: false; readonly error: string };

/**
 * Déclare que deux profils sont la même personne (cas d'usage A5). Le joueur
 * absorbé devient un alias du joueur conservé (ADR 0004).
 */
export function planMerge(
  facts: MergeFacts,
  { keepId, absorbId }: { readonly keepId: string; readonly absorbId: string },
): MergePlanResult {
  if (keepId === absorbId) {
    return { ok: false, error: 'Impossible de fusionner un joueur avec lui-même.' };
  }
  const keep = facts.players.find((p) => p.id === keepId);
  const absorb = facts.players.find((p) => p.id === absorbId);
  if (!keep || !absorb) {
    return { ok: false, error: `Joueur introuvable : « ${keep ? absorbId : keepId} ».` };
  }
  const alreadyMerged = [keep, absorb].find((p) => p.mergedInto !== null);
  if (alreadyMerged) {
    return { ok: false, error: `« ${alreadyMerged.id} » a déjà été fusionné.` };
  }

  const matchesOf = (playerId: string) =>
    new Set(facts.performances.filter((p) => p.playerId === playerId).map((p) => p.matchId));
  const keepMatches = matchesOf(keepId);
  const absorbMatches = matchesOf(absorbId);
  if ([...absorbMatches].some((m) => keepMatches.has(m))) {
    return {
      ok: false,
      error: `« ${keepId} » et « ${absorbId} » ont joué le même match : ce sont deux personnes différentes.`,
    };
  }
  if (keep.discordUserId && absorb.discordUserId && keep.discordUserId !== absorb.discordUserId) {
    return {
      ok: false,
      error:
        'Les deux profils sont liés à des comptes Discord différents : délie l’un des deux d’abord.',
    };
  }

  const known = new Set([keep.nickname, ...keep.aliases].map(normalizeAlias));
  const aliasesAdded = [
    ...new Set([absorb.nickname, ...absorb.aliases].map(normalizeAlias)),
  ].filter((alias) => !known.has(alias));

  const keepEditions = new Set(
    facts.participations.filter((p) => p.playerId === keepId).map((p) => p.editionId),
  );
  const absorbParticipations = facts.participations.filter((p) => p.playerId === absorbId);
  const participationsDropped = absorbParticipations.filter((p) =>
    keepEditions.has(p.editionId),
  ).length;

  const absorbMemberships = facts.memberships.filter((m) => m.playerId === absorbId);
  const keepIsInATeam = facts.memberships.some((m) => m.playerId === keepId && m.current);
  const absorbCurrent = absorbMemberships.find((m) => m.current);

  const customized = new Set(facts.customizedPlayerIds);
  const absorbedCustomization: AbsorbedCustomization = !customized.has(absorbId)
    ? 'none'
    : customized.has(keepId)
      ? 'dropped'
      : 'transferred';

  return {
    ok: true,
    plan: {
      keepId,
      absorbId,
      performancesReassigned: facts.performances.filter((p) => p.playerId === absorbId).length,
      matchesTouched: absorbMatches.size,
      eventMvpsReassigned: facts.eventMvps.filter((m) => m.playerId === absorbId).length,
      matchMvpsReassigned: facts.matchMvps.filter((m) => m.playerId === absorbId).length,
      aliasesAdded,
      discordUserIdTransferred: keep.discordUserId ? null : absorb.discordUserId,
      participationsReassigned: absorbParticipations.length - participationsDropped,
      participationsDropped,
      membershipsReassigned: absorbMemberships.length,
      membershipClosed: keepIsInATeam && absorbCurrent ? absorbCurrent.id : null,
      absorbedCustomization,
    },
  };
}
