import { isExternal, matchEntryProblems, type MatchEntry } from '../../domain/index.ts';
import { CommandRejected, type Command } from '../command.ts';
import { checkVersion } from '../edition-checks.ts';

export interface RecordMatchInput extends MatchEntry {
  readonly editionId: string;
  readonly version: number;
}

export interface RecordMatchOutcome {
  readonly editionId: string;
  readonly matchId: string;
  readonly matchNumber: number;
  readonly version: number;
}

/**
 * Saisit un match à la main, quand il n'y a pas de fichier Excel (cas
 * d'usage A14, ADR 0037). Il est enregistré en brouillon : le public ne le voit
 * qu'après la publication (ADR 0012).
 */
export const recordMatch: Command<RecordMatchInput, RecordMatchOutcome> = {
  name: 'recordMatch',
  async run({ editions, players }, { organizationId }, { editionId, version, ...entry }) {
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
    const problems = matchEntryProblems(entry);
    if (problems.length > 0) {
      throw new CommandRejected(
        'conflict',
        `La feuille de match est incomplète ou incohérente (${problems.map((p) => p.kind).join(', ')}).`,
      );
    }
    for (const { sides } of entry.lines) {
      for (const { playerId } of sides) {
        if (!(await players.find(organizationId, playerId))) {
          throw new CommandRejected('not_found', `Joueur ${playerId} introuvable.`);
        }
      }
    }
    const recorded = await editions.recordDraftMatch(organizationId, editionId, entry, version);
    return { editionId, ...recorded };
  },
};
