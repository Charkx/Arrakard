import type {
  CommandLogEntry,
  EditionDetails,
  CommandServices,
  Publication,
  RosterStatus,
  SeasonStatus,
} from '#application/index.ts';
import type { Division, PerformanceFact } from '#domain/index.ts';

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
  /** Ce qu'un admin a saisi d'une édition, et son archivage. */
  readonly editionRecord: (
    organizationId: string,
    editionId: string,
  ) => Promise<EditionRecord | undefined>;
  /** Les lignes du journal des commandes de l'organisation. */
  readonly commandLog: (organizationId: string) => Promise<readonly CommandLogEntry[]>;
  /** L'organisation a-t-elle des projections écrites ? */
  readonly hasProjections: (organizationId: string) => Promise<boolean>;
  /** Ajoute à l'édition un match en brouillon, Zéphyr contre Sirocco, et rend son identifiant. */
  readonly addDraftMatch: (organizationId: string, editionId: string) => Promise<string>;
  /**
   * Ajoute à l'édition un match publié où ce joueur seul gagne, au MID, et
   * rend son identifiant. Rien n'est recalculé.
   */
  readonly addPublishedMatch: (
    organizationId: string,
    editionId: string,
    playerId: string,
  ) => Promise<string>;
  /** Un profil tel qu'écrit : son renvoi, son compte Discord, ses alias triés. */
  readonly profile: (
    organizationId: string,
    playerId: string,
  ) => Promise<ProfileRecord | undefined>;
  /** Les performances du joueur, publiées ou en brouillon : leurs matchs, triés. */
  readonly performanceMatchIds: (
    organizationId: string,
    playerId: string,
  ) => Promise<readonly string[]>;
  /** Crée autant de joueurs, sans match, et rend leurs identifiants. */
  readonly addPlayers: (organizationId: string, count: number) => Promise<readonly string[]>;
  /** Un match tel qu'écrit, brouillon ou publié, ses performances triées par ligne puis côté. */
  readonly recordedMatch: (
    organizationId: string,
    matchId: string,
  ) => Promise<RecordedMatch | undefined>;
  /** Marque le profil `absorbedId` comme fusionné dans `keptId`, sans rien déplacer. */
  readonly markMerged: (
    organizationId: string,
    absorbedId: string,
    keptId: string,
  ) => Promise<void>;
  /** Les matchs que lit le recalcul : les publiés seulement. */
  readonly publishedMatchIds: (organizationId: string) => Promise<readonly string[]>;
  /** Les publications de l'organisation. */
  readonly publications: (organizationId: string) => Promise<readonly Publication[]>;
  /** L'état d'une saison : ouverte ou clôturée, et sa date de fin. */
  readonly season: (organizationId: string, seasonId: string) => Promise<SeasonRecord | undefined>;
  /** Les notes de la saison, par joueur, telles que le recalcul les a écrites. */
  readonly seasonRatings: (
    organizationId: string,
    seasonId: string,
  ) => Promise<ReadonlyMap<string, number>>;
  /** Une équipe telle qu'écrite. */
  readonly team: (organizationId: string, teamId: string) => Promise<TeamRecord | undefined>;
  /** Les passages du joueur dans des équipes, du plus ancien au plus récent. */
  readonly stints: (organizationId: string, playerId: string) => Promise<readonly StintRecord[]>;
}

/** Une édition telle qu'une commande la laisse ; participants triés. */
export interface EditionRecord extends EditionDetails {
  readonly archived: boolean;
}

/** Un match tel qu'une commande le laisse. */
export interface RecordedMatch {
  readonly editionId: string;
  readonly matchNumber: number;
  readonly winnerTeam: string;
  readonly durationSeconds: number;
  readonly draft: boolean;
  readonly performances: readonly Omit<PerformanceFact, 'matchId'>[];
}

/** Un profil de joueur tel qu'une commande le laisse. */
export interface ProfileRecord {
  readonly mergedInto: string | null;
  readonly discordUserId: string | null;
  readonly aliases: readonly string[];
}

/** Le numéro du match qu'ajoute `addPublishedMatch`. */
export const PUBLISHED_MATCH_NUMBER = 3;

/** Une équipe telle qu'une commande la laisse. */
export interface TeamRecord {
  readonly tag: string;
  readonly name: string;
  readonly divisions: readonly Division[];
  /** Instant ISO de son archivage, ou null. */
  readonly archivedAt: string | null;
}

/** Un passage d'un joueur dans une équipe : dates ISO (AAAA-MM-JJ), départ null s'il est en cours. */
export interface StintRecord {
  readonly teamId: string;
  readonly status: RosterStatus;
  readonly joinedOn: string;
  readonly leftOn: string | null;
}

/** Une saison telle qu'une commande la laisse. */
export interface SeasonRecord {
  readonly status: SeasonStatus;
  /** Date ISO (AAAA-MM-JJ) de la clôture, ou null. */
  readonly endDate: string | null;
}

/** Une édition telle qu'une commande la laisse : sa version et sa clôture. */
export interface EditionSnapshot {
  readonly version: number;
  readonly closedAt: string | null;
}

/** Le match en brouillon qu'ajoute `addDraftMatch` : le numéro 2 de l'édition. */
export const DRAFT_MATCH_NUMBER = 2;
