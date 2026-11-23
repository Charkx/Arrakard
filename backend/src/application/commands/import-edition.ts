import {
  analyzeImport,
  parseNumberedStatsSheet,
  planImport,
  plannedMatchEntries,
  teamsAreRosters,
  type NumberedRow,
} from '../../domain/index.ts';
import { CommandRejected, type Command } from '../command.ts';
import { checkEntries, editionTakingMatches } from '../match-recording.ts';

export interface ImportEditionInput {
  readonly editionId: string;
  readonly version: number;
  /** Les lignes de la feuille, telles que le navigateur les a lues du fichier. */
  readonly rows: readonly NumberedRow[];
}

export interface ImportEditionOutcome {
  readonly editionId: string;
  /** Les matchs écrits en brouillon, dans l'ordre de la feuille. */
  readonly matchIds: readonly string[];
  readonly version: number;
}

/** Les problèmes, un par ligne du message. */
const refuse = (problems: readonly string[]) =>
  new CommandRejected('conflict', `Le fichier est refusé :\n${problems.join('\n')}`);

/**
 * Importe le fichier Excel d'une édition (cas d'usage A1, cas simple ;
 * ADR 0038). Le serveur lit la feuille et rattache chaque pseudo à un joueur
 * connu ; ses matchs sont enregistrés en brouillon par la même écriture
 * qu'une saisie à la main. Un pseudo inconnu ou ambigu, une équipe inconnue ou
 * un transfert refusent l'import : les décider arrive avec la réimportation.
 */
export const importEdition: Command<ImportEditionInput, ImportEditionOutcome> = {
  name: 'importEdition',
  async run(repositories, { organizationId }, { editionId, version, rows }) {
    const edition = await editionTakingMatches(repositories, organizationId, editionId, version);
    if (edition.matchCount > 0) {
      throw new CommandRejected(
        'conflict',
        'Cette édition a déjà des matchs : un import ne les remplace pas.',
      );
    }

    const parsed = parseNumberedStatsSheet(rows);
    if (!parsed.ok) throw refuse([parsed.error]);
    const { sheet } = parsed;
    if (sheet.warnings.length > 0) throw refuse(sheet.warnings);

    const directory = await repositories.players.importDirectory(organizationId);
    const context = {
      players: directory.players,
      knownTeamTags: directory.teamTags,
      teamsAreRosters: teamsAreRosters(edition.type),
    };
    const planned = planImport(sheet, analyzeImport(sheet, context), NO_DECISION, context);
    if (!planned.ok) throw refuse(planned.errors);
    const converted = plannedMatchEntries(planned.plan.matches);
    if (!converted.ok) throw refuse(converted.errors);

    await checkEntries(
      repositories,
      organizationId,
      converted.entries.map(({ matchNumber, entry }) => ({
        name: `La feuille du match ${String(matchNumber)}`,
        entry,
      })),
    );
    const matchIds: string[] = [];
    let current = version;
    for (const { entry } of converted.entries) {
      const recorded = await repositories.editions.recordDraftMatch(
        organizationId,
        editionId,
        entry,
        current,
      );
      matchIds.push(recorded.matchId);
      current = recorded.version;
    }
    return { editionId, matchIds, version: current };
  },
};

/** Le cas simple : l'admin n'a encore rien décidé, tout doit être reconnu. */
const NO_DECISION = { names: {}, unknownTeams: {}, transfers: {} } as const;
