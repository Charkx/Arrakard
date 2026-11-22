/** Ce qu'une commande lit d'un profil de joueur non fusionné. */
export interface PlayerState {
  /** Le compte Discord lié à sa carte, ou null. */
  readonly discordUserId: string | null;
}

import type { MergeFacts, MergePlan } from '../domain/index.ts';

/** Lit et écrit les profils des joueurs d'une organisation. */
export interface PlayerRepository {
  /** Le profil de cette organisation, ou `undefined` s'il n'y est pas ou s'il est fusionné. */
  find(organizationId: string, playerId: string): Promise<PlayerState | undefined>;
  /**
   * Ce que la fusion de ces deux profils doit savoir des faits (`planMerge`) :
   * les deux profils, leurs performances (brouillons compris), MVP,
   * participations, passages et personnalisations.
   */
  mergeFacts(organizationId: string, absorbedId: string, keptId: string): Promise<MergeFacts>;
  /**
   * Écrit le plan de fusion du domaine (ADR 0034, ADR 0036) : ce qui passe au
   * profil conservé, le passage clos ce jour-là (AAAA-MM-JJ), et le renvoi.
   */
  applyMerge(organizationId: string, plan: MergePlan, on: string): Promise<void>;
  /** Le profil lié à ce compte Discord, s'il y en a un, fusionné ou non (contrainte d'unicité). */
  discordOwner(organizationId: string, discordUserId: string): Promise<string | undefined>;
  /** Lie la carte à ce compte Discord, ou la délie (null). */
  linkDiscord(
    organizationId: string,
    playerId: string,
    discordUserId: string | null,
  ): Promise<void>;
}
