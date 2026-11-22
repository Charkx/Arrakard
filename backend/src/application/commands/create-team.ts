import { CommandRejected, type Command } from '../command.ts';
import type { NewTeam } from '../teams.ts';

export type CreateTeamInput = NewTeam;

export interface CreateTeamOutcome {
  readonly teamId: string;
}

/** Crée une équipe, sans joueur : ses joueurs y arrivent par des transferts. */
export const createTeam: Command<CreateTeamInput, CreateTeamOutcome> = {
  name: 'createTeam',
  async run({ teams }, { organizationId }, team) {
    if (await teams.tagTaken(organizationId, team.tag)) {
      throw new CommandRejected('conflict', `Une équipe porte déjà le tag ${team.tag}.`);
    }
    return { teamId: await teams.create(organizationId, team) };
  },
};
