import type { MatchEntry } from '../../domain/index.ts';
import type { Command } from '../command.ts';
import { editionTakingMatches, recordDraftMatches } from '../match-recording.ts';

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
  async run(repositories, { organizationId }, { editionId, version, ...entry }) {
    await editionTakingMatches(repositories, organizationId, editionId, version);
    const recorded = await recordDraftMatches(
      repositories,
      organizationId,
      editionId,
      [{ name: 'La feuille de match', entry }],
      version,
    );
    const [match] = recorded.matches;
    // Une feuille donnée, un match écrit.
    if (!match) throw new Error('Aucun match écrit.');
    return { editionId, ...match, version: recorded.version };
  },
};
