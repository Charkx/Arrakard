import type { CommandLogEntry, CommandServices, Publication } from '#application/index.ts';

/** L'heure que donne l'horloge des tests. */
export const NOW = new Date('2026-11-22T20:00:00.000Z');

/** Ce qu'une organisation d'essai contient, une fois créée par le harnais. */
export interface SeededOrganizations {
  /** L'organisation du jeu d'essai, dont `LEAGUE_ID` est une édition. */
  readonly organizationId: string;
  /** Un admin de cette organisation. */
  readonly adminId: string;
  /** Un simple membre de cette organisation. */
  readonly memberId: string;
  /** Une autre organisation, sans édition, et son admin. */
  readonly otherOrganizationId: string;
  readonly otherAdminId: string;
}

/** Ce qu'une implémentation des ports fournit à la suite de contrat des commandes. */
export interface CommandHarness {
  /** Les services, avec une horloge arrêtée à `NOW`. */
  readonly services: CommandServices;
  /** Crée les organisations d'essai, avec le jeu d'essai, leurs admins et un membre. */
  readonly seed: () => Promise<SeededOrganizations>;
  /** La version et la clôture d'une édition, telles qu'écrites. */
  readonly edition: (
    organizationId: string,
    editionId: string,
  ) => Promise<EditionSnapshot | undefined>;
  /** Les lignes du journal des commandes de l'organisation. */
  readonly commandLog: (organizationId: string) => Promise<readonly CommandLogEntry[]>;
  /** L'organisation a-t-elle des projections écrites ? */
  readonly hasProjections: (organizationId: string) => Promise<boolean>;
  /** Ajoute à l'édition un match en brouillon, Zéphyr contre Sirocco, et rend son identifiant. */
  readonly addDraftMatch: (organizationId: string, editionId: string) => Promise<string>;
  /** Les matchs que lit le recalcul : les publiés seulement. */
  readonly publishedMatchIds: (organizationId: string) => Promise<readonly string[]>;
  /** Les publications de l'organisation. */
  readonly publications: (organizationId: string) => Promise<readonly Publication[]>;
}

/** Une édition telle qu'une commande la laisse : sa version et sa clôture. */
export interface EditionSnapshot {
  readonly version: number;
  readonly closedAt: string | null;
}

/** Le match en brouillon qu'ajoute `addDraftMatch` : le numéro 2 de l'édition. */
export const DRAFT_MATCH_NUMBER = 2;
