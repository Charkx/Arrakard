import { CommandRejected, type Command } from '../command.ts';
import { dayInParis } from '../seasons.ts';

export interface ArchiveTeamInput {
  readonly teamId: string;
}

export interface ArchiveTeamOutcome {
  readonly teamId: string;
  /** Date ISO (AAAA-MM-JJ) où se terminent les passages de ses joueurs. */
  readonly date: string;
}

/**
 * Archive une équipe : elle disparaît des pages publiques, ses joueurs la
 * quittent aujourd'hui, et son historique reste (ADR 0033).
 */
export const archiveTeam: Command<ArchiveTeamInput, ArchiveTeamOutcome> = {
  name: 'archiveTeam',
  async run({ teams }, { organizationId, now }, { teamId }) {
    const team = await teams.find(organizationId, teamId);
    if (!team) throw new CommandRejected('not_found', `Équipe ${teamId} introuvable.`);
    if (team.archived) throw new CommandRejected('already_done', 'Cette équipe est déjà archivée.');
    const date = dayInParis(now);
    await teams.archive(organizationId, teamId, now, date);
    return { teamId, date };
  },
};
