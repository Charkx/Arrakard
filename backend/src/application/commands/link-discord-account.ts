import { CommandRejected, type Command } from '../command.ts';

export interface LinkDiscordAccountInput {
  readonly playerId: string;
  /** L'identifiant du compte Discord, ou null pour délier la carte. */
  readonly discordUserId: string | null;
}

export interface LinkDiscordAccountOutcome {
  readonly playerId: string;
  readonly discordUserId: string | null;
}

/**
 * Lie une carte à un compte Discord, ou la délie (cas d'usage A6). Un compte
 * n'est lié qu'à une carte de l'organisation.
 */
export const linkDiscordAccount: Command<LinkDiscordAccountInput, LinkDiscordAccountOutcome> = {
  name: 'linkDiscordAccount',
  async run({ players }, { organizationId }, { playerId, discordUserId }) {
    const player = await players.find(organizationId, playerId);
    if (!player) throw new CommandRejected('not_found', `Joueur ${playerId} introuvable.`);
    if (player.discordUserId === discordUserId) {
      throw new CommandRejected('already_done', 'La carte est déjà liée ainsi.');
    }
    if (discordUserId !== null) {
      const owner = await players.discordOwner(organizationId, discordUserId);
      if (owner !== undefined) {
        throw new CommandRejected('conflict', 'Ce compte Discord est déjà lié à une autre carte.');
      }
    }
    await players.linkDiscord(organizationId, playerId, discordUserId);
    return { playerId, discordUserId };
  },
};
