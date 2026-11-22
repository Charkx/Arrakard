import { CommandRejected, type Command } from '../command.ts';
import { dayInParis } from '../seasons.ts';
import type { RosterPlace } from '../teams.ts';

export interface TransferPlayerInput {
  readonly playerId: string;
  /** Sa nouvelle place, ou null s'il quitte son équipe sans en rejoindre une autre. */
  readonly to: RosterPlace | null;
}

export interface TransferPlayerOutcome {
  readonly playerId: string;
  readonly from: RosterPlace | null;
  readonly to: RosterPlace | null;
  /** Date ISO (AAAA-MM-JJ) du transfert. */
  readonly date: string;
}

/**
 * Transfère un joueur : son passage en cours se termine aujourd'hui et un
 * nouveau commence, dans une autre équipe ou avec un autre statut. Le passage
 * terminé reste dans son historique (ADR 0033).
 */
export const transferPlayer: Command<TransferPlayerInput, TransferPlayerOutcome> = {
  name: 'transferPlayer',
  async run({ teams }, { organizationId, now }, { playerId, to }) {
    const player = await teams.player(organizationId, playerId);
    if (!player) throw new CommandRejected('not_found', `Joueur ${playerId} introuvable.`);
    if (to !== null) {
      const team = await teams.find(organizationId, to.teamId);
      if (!team) throw new CommandRejected('not_found', `Équipe ${to.teamId} introuvable.`);
      if (team.archived) {
        throw new CommandRejected('conflict', 'Cette équipe est archivée : elle ne recrute plus.');
      }
    }
    const from = player.current;
    if (samePlace(from, to)) {
      throw new CommandRejected('already_done', 'Le joueur est déjà à cette place.');
    }
    const date = dayInParis(now);
    await teams.transfer(organizationId, playerId, to, date);
    return { playerId, from, to, date };
  },
};

function samePlace(a: RosterPlace | null, b: RosterPlace | null): boolean {
  return a?.teamId === b?.teamId && a?.status === b?.status;
}
