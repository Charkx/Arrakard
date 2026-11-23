import { isExternal, matchEntryProblems, type MatchEntry } from '../domain/index.ts';
import { CommandRejected, type Repositories } from './command.ts';
import { checkVersion } from './edition-checks.ts';
import type { EditionState } from './editions.ts';

/** Une feuille de match, et comment la nommer si elle est refusée (« La feuille du match 3 »). */
export interface NamedEntry {
  readonly name: string;
  readonly entry: MatchEntry;
}

/**
 * L'édition, si elle reçoit encore des matchs à cette version : elle existe,
 * n'est ni archivée, ni un événement externe, ni dans une saison clôturée
 * (ADR 0032).
 */
export async function editionTakingMatches(
  { editions }: Repositories,
  organizationId: string,
  editionId: string,
  version: number,
): Promise<EditionState> {
  const edition = await editions.find(organizationId, editionId);
  if (!edition) throw new CommandRejected('not_found', `Édition ${editionId} introuvable.`);
  checkVersion(edition.version, version);
  if (edition.archived) {
    throw new CommandRejected(
      'conflict',
      'Cette édition est archivée : elle ne reçoit plus de match.',
    );
  }
  if (isExternal(edition.type)) {
    throw new CommandRejected('conflict', 'Un événement externe n’a pas de match.');
  }
  if (edition.seasonClosed) {
    throw new CommandRejected('season_closed', 'La saison de cette édition est clôturée.');
  }
  return edition;
}

/**
 * Enregistre ces feuilles en brouillon (ADR 0012), dans l'ordre, après les
 * matchs de l'édition. C'est la seule écriture de matchs : la saisie à la main
 * et l'import y passent tous deux (ADR 0022, ADR 0038). Toutes les feuilles
 * sont vérifiées avant la première écriture ; une seule refusée, et rien
 * n'est écrit.
 */
export async function recordDraftMatches(
  { editions, players }: Repositories,
  organizationId: string,
  editionId: string,
  entries: readonly NamedEntry[],
  version: number,
): Promise<{
  readonly matches: readonly { readonly matchId: string; readonly matchNumber: number }[];
  readonly version: number;
}> {
  for (const { name, entry } of entries) {
    const problems = matchEntryProblems(entry);
    if (problems.length > 0) {
      throw new CommandRejected(
        'conflict',
        `${name} est incomplète ou incohérente (${problems.map((p) => p.kind).join(', ')}).`,
      );
    }
  }
  const playerIds = new Set(
    entries.flatMap(({ entry }) =>
      entry.lines.flatMap(({ sides }) => sides.map((s) => s.playerId)),
    ),
  );
  for (const playerId of playerIds) {
    if (!(await players.find(organizationId, playerId))) {
      throw new CommandRejected('not_found', `Joueur ${playerId} introuvable.`);
    }
  }
  const matches: { matchId: string; matchNumber: number }[] = [];
  let current = version;
  for (const { entry } of entries) {
    const recorded = await editions.recordDraftMatch(organizationId, editionId, entry, current);
    matches.push({ matchId: recorded.matchId, matchNumber: recorded.matchNumber });
    current = recorded.version;
  }
  return { matches, version: current };
}
