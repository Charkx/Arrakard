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
 * Vérifie ces feuilles avant toute écriture : chacune est cohérente
 * (`matchEntryProblems`) et ne cite que des joueurs non fusionnés de
 * l'organisation. La saisie à la main et l'import y passent tous deux, puis
 * écrivent chaque match par la même écriture (`recordDraftMatch`) : ils
 * produisent les mêmes faits (ADR 0022, ADR 0038).
 */
export async function checkEntries(
  { players }: Repositories,
  organizationId: string,
  entries: readonly NamedEntry[],
): Promise<void> {
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
}
