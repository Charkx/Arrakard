import type { ImportPlayer, MergeFacts, MergePlan } from '../domain/index.ts';

/** Ce qu'une commande lit d'un profil de joueur non fusionné. */
export interface PlayerState {
  /** Le compte Discord lié à sa carte, ou null. */
  readonly discordUserId: string | null;
}

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
  /**
   * Ce que l'import doit savoir pour rattacher les pseudos d'un fichier
   * (`analyzeImport`) : les joueurs non fusionnés, avec leur pseudo et leurs
   * alias, leur équipe et leur statut actuels ; et les tags de toutes les
   * équipes, archivées comprises.
   */
  importDirectory(organizationId: string): Promise<ImportDirectory>;
  /** Crée un joueur de ce pseudo, sans alias ni équipe, et rend son identifiant. */
  create(organizationId: string, nickname: string): Promise<string>;
  /** Ajoute cette graphie, déjà normalisée, aux alias du joueur (ADR 0004). */
  addAlias(organizationId: string, playerId: string, alias: string): Promise<void>;
  /** Le profil lié à ce compte Discord, s'il y en a un, fusionné ou non (contrainte d'unicité). */
  discordOwner(organizationId: string, discordUserId: string): Promise<string | undefined>;
  /** Lie la carte à ce compte Discord, ou la délie (null). */
  linkDiscord(
    organizationId: string,
    playerId: string,
    discordUserId: string | null,
  ): Promise<void>;
}

/** Les joueurs et les équipes connus, tels que l'import les voit. */
export interface ImportDirectory {
  /** Les joueurs non fusionnés ; leurs alias commencent par leur pseudo. */
  readonly players: readonly ImportPlayer[];
  /** Toutes les équipes, archivées comprises. */
  readonly teams: readonly {
    readonly id: string;
    readonly tag: string;
    readonly archived: boolean;
  }[];
}
