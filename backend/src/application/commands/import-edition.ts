import {
  analyzeImport,
  NO_DECISION,
  parseNumberedStatsSheet,
  planImport,
  plannedMatchEntries,
  rosterMoves,
  teamsAreRosters,
  type ImportDecisions,
  type ImportPlan,
  type NumberedRow,
  type NewPlayerIds,
} from '../../domain/index.ts';
import { CommandRejected, type Command, type Repositories } from '../command.ts';
import { checkEntries, editionTakingMatches } from '../match-recording.ts';
import type { ImportDirectory } from '../players.ts';
import type { RosterPlace } from '../teams.ts';
import { dayInParis } from '../seasons.ts';

export interface ImportEditionInput {
  readonly editionId: string;
  readonly version: number;
  /** Les lignes de la feuille, telles que le navigateur les a lues du fichier. */
  readonly rows: readonly NumberedRow[];
  /** Ce que l'admin a décidé des cas que l'import ne reconnaît pas seul (ADR 0039). */
  readonly decisions?: ImportDecisions | undefined;
}

export interface ImportEditionOutcome {
  readonly editionId: string;
  /** Les matchs écrits en brouillon, dans l'ordre de la feuille. */
  readonly matchIds: readonly string[];
  readonly version: number;
  /** Les joueurs et les équipes que l'import a créés, et les joueurs transférés. */
  readonly createdPlayerIds: readonly string[];
  readonly createdTeamIds: readonly string[];
  readonly transferredPlayerIds: readonly string[];
}

/** Les problèmes, un par ligne du message. */
const refuse = (problems: readonly string[]) =>
  new CommandRejected('conflict', `Le fichier est refusé :\n${problems.join('\n')}`);

/**
 * Importe le fichier Excel d'une édition (cas d'usage A1 ; ADR 0038,
 * ADR 0039). Le serveur lit la feuille, rattache chaque pseudo et applique les
 * décisions de l'admin : nouveaux joueurs, alias, nouvelles équipes,
 * transferts. Les matchs sont enregistrés en brouillon par la même écriture
 * qu'une saisie à la main. Un fichier déjà importé n'est pas réimporté. Tout
 * est écrit dans la transaction de la commande, ou rien.
 */
export const importEdition: Command<ImportEditionInput, ImportEditionOutcome> = {
  name: 'importEdition',
  async run(repositories, context, { editionId, version, rows, decisions = NO_DECISION }) {
    const { organizationId } = context;
    const edition = await editionTakingMatches(repositories, organizationId, editionId, version);
    // Les lignes lues identifient le fichier : le même fichier donne les mêmes lignes.
    const readRows = JSON.stringify(rows);
    const earlier = await repositories.editions.importOf(organizationId, readRows);
    if (earlier) {
      throw new CommandRejected(
        'already_done',
        `Ce fichier a déjà été importé, dans l’édition « ${earlier.editionName} ».`,
      );
    }
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
    const analysisContext = {
      players: directory.players,
      knownTeamTags: directory.teams.map((t) => t.tag),
      teamsAreRosters: teamsAreRosters(edition.type),
    };
    const planned = planImport(
      sheet,
      analyzeImport(sheet, analysisContext),
      decisions,
      analysisContext,
    );
    if (!planned.ok) throw refuse(planned.errors);
    const { plan } = planned;

    const created = await writeIdentities(repositories, organizationId, plan);
    const transferredPlayerIds: string[] = [];
    for (const { playerId, place, transfer } of placesOf(plan, directory, created)) {
      await repositories.teams.transfer(organizationId, playerId, place, dayInParis(context.now));
      if (transfer) transferredPlayerIds.push(playerId);
    }

    const converted = plannedMatchEntries(plan.matches, created.playerIds);
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
    await repositories.editions.recordImport(organizationId, editionId, readRows);
    return {
      editionId,
      matchIds,
      version: current,
      createdPlayerIds: Object.values(created.playerIds),
      createdTeamIds: Object.values(created.teamIds),
      transferredPlayerIds,
    };
  },
};

/** Ce que l'import a créé : les identifiants des joueurs, par clé de nom, et des équipes, par tag. */
interface Created {
  readonly playerIds: NewPlayerIds;
  readonly teamIds: Readonly<Record<string, string>>;
}

/** Crée les nouvelles équipes et les nouveaux joueurs, et ajoute les alias. */
async function writeIdentities(
  { players, teams }: Repositories,
  organizationId: string,
  plan: ImportPlan,
): Promise<Created> {
  const teamIds: Record<string, string> = {};
  for (const tag of plan.newTeams) {
    // Une équipe créée par l'import porte son tag pour nom ; l'admin le change ensuite.
    teamIds[tag] = await teams.create(organizationId, { tag, name: tag, divisions: [] });
  }
  const playerIds: Record<string, string> = {};
  for (const { key, nickname } of plan.newPlayers) {
    playerIds[key] = await players.create(organizationId, nickname);
  }
  for (const { playerId, alias } of plan.newAliases) {
    await players.addAlias(organizationId, playerId, alias);
  }
  return { playerIds, teamIds };
}

/**
 * Les places où l'import envoie des joueurs (`rosterMoves`), avec leurs
 * identifiants ; `transfer` dit s'il s'agit d'un joueur existant.
 */
function placesOf(
  plan: ImportPlan,
  directory: ImportDirectory,
  created: Created,
): { playerId: string; place: RosterPlace; transfer: boolean }[] {
  return rosterMoves(plan, directory.players).map(({ player, to }) => {
    const known = directory.teams.find((t) => t.tag === to.teamTag);
    if (known?.archived) {
      throw refuse([`L’équipe « ${to.teamTag} » est archivée : elle ne recrute plus.`]);
    }
    const teamId = known?.id ?? created.teamIds[to.teamTag];
    const playerId = player.kind === 'existing' ? player.playerId : created.playerIds[player.key];
    // Le plan ne cite que des équipes connues ou créées, et des joueurs existants ou créés.
    if (teamId === undefined || playerId === undefined) {
      throw new Error(`Changement de roster impossible vers « ${to.teamTag} ».`);
    }
    return { playerId, place: { teamId, status: to.status }, transfer: player.kind === 'existing' };
  });
}
