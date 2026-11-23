import type { EditionType, MatchEntry, Prestige } from '../domain/index.ts';

/** Ce qu'une commande change d'une édition, hors faits de jeu. */
export interface EditionState {
  readonly version: number;
  readonly type: EditionType;
  /** L'édition est archivée : elle n'est plus sur les pages publiques. */
  readonly archived: boolean;
  /** Ses matchs, publiés ou en brouillon. */
  readonly matchCount: number;
  /** Date ISO de la clôture, ou null si l'édition n'est pas clôturée (ADR 0013). */
  readonly closedAt: string | null;
  /** Les matchs de l'édition encore en brouillon (ADR 0012). */
  readonly draftMatchIds: readonly string[];
  /** Sa saison est clôturée : elle ne reçoit plus de match (ADR 0014). */
  readonly seasonClosed: boolean;
}

/** Une publication : quelle édition, quels matchs, quand, par qui (ADR 0012). */
export interface Publication {
  readonly editionId: string;
  readonly matchIds: readonly string[];
  readonly publishedAt: string;
  readonly publishedBy: string;
}

/** Ce qu'un admin saisit d'une édition, à la création comme à la modification. */
export interface EditionDetails {
  readonly name: string;
  readonly type: EditionType;
  /** Date ISO (AAAA-MM-JJ). */
  readonly date: string;
  /** Sa saison, ou null pour une édition hors saison. */
  readonly seasonId: string | null;
  readonly prestige: Prestige;
  readonly location: string | null;
  readonly url: string | null;
  readonly description: string | null;
  /** Pour un événement externe : Arrakis l'a-t-il gagné ? null si on ne sait pas. */
  readonly arrakisWon: boolean | null;
  /** Pour un événement externe : les joueurs qui y ont participé. */
  readonly participantIds: readonly string[];
}

/** Lit et écrit une édition d'une organisation, avec sa version (ADR 0005). */
export interface EditionRepository {
  /** L'édition de cette organisation, ou `undefined` si elle n'y est pas. */
  find(organizationId: string, editionId: string): Promise<EditionState | undefined>;
  /**
   * La clôture, si l'édition est encore à la version `version`. Rend la
   * nouvelle version ; refuse par un conflit si la version a changé.
   */
  close(
    organizationId: string,
    editionId: string,
    closedAt: string,
    version: number,
  ): Promise<number>;
  /**
   * Rend publics ces brouillons et enregistre la publication, si l'édition est
   * encore à la version `version`. Rend l'identifiant de la publication et la
   * nouvelle version ; refuse par un conflit si la version a changé.
   */
  publish(
    organizationId: string,
    publication: Publication,
    version: number,
  ): Promise<{ readonly publicationId: string; readonly version: number }>;
  /**
   * Enregistre ce match en brouillon (ADR 0012), après les autres matchs de
   * l'édition, si elle est encore à `version`. Rend le match, son numéro et la
   * nouvelle version.
   */
  recordDraftMatch(
    organizationId: string,
    editionId: string,
    match: MatchEntry,
    version: number,
  ): Promise<{ readonly matchId: string; readonly matchNumber: number; readonly version: number }>;
  /**
   * L'édition où ce fichier a déjà été importé, s'il l'a été. `readRows` sont
   * les lignes lues du fichier, sérialisées ; l'entrepôt n'en garde qu'une
   * empreinte.
   */
  importOf(organizationId: string, readRows: string): Promise<ImportedIn | undefined>;
  /** Retient que ce fichier a été importé dans cette édition. */
  recordImport(organizationId: string, editionId: string, readRows: string): Promise<void>;
  /** Crée l'édition, à la version 1, et rend son identifiant. */
  create(organizationId: string, edition: EditionDetails): Promise<string>;
  /** Remplace ce qu'un admin saisit, si l'édition est encore à `version` ; rend la nouvelle version. */
  update(
    organizationId: string,
    editionId: string,
    edition: EditionDetails,
    version: number,
  ): Promise<number>;
  /** L'archive à cet instant ISO, si elle est encore à `version` ; rend la nouvelle version. */
  archive(
    organizationId: string,
    editionId: string,
    archivedAt: string,
    version: number,
  ): Promise<number>;
}

/** L'édition où un fichier a été importé. */
export interface ImportedIn {
  readonly editionId: string;
  readonly editionName: string;
}
