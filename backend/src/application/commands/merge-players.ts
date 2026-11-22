import { CommandRejected, type Command } from '../command.ts';
import { dayInParis } from '../seasons.ts';

export interface MergePlayersInput {
  /** Le profil en double, qui ne sera plus qu'un renvoi. */
  readonly absorbedId: string;
  /** Le profil qui reste. */
  readonly keptId: string;
}

export interface MergePlayersOutcome {
  readonly absorbedId: string;
  readonly keptId: string;
  readonly movedPerformances: number;
}

/**
 * Fusionne deux profils qui désignent le même joueur (cas d'usage A5, ADR
 * 0034). Ses performances suivent, l'ancien profil renvoie vers le conservé,
 * et le recalcul de la chaîne des commandes refait les notes.
 */
export const mergePlayers: Command<MergePlayersInput, MergePlayersOutcome> = {
  name: 'mergePlayers',
  async run({ players }, { organizationId, now }, { absorbedId, keptId }) {
    if (absorbedId === keptId) {
      throw new CommandRejected('conflict', 'Un profil ne se fusionne pas avec lui-même.');
    }
    const [absorbed, kept] = await Promise.all([
      players.find(organizationId, absorbedId),
      players.find(organizationId, keptId),
    ]);
    if (!absorbed) throw new CommandRejected('not_found', `Joueur ${absorbedId} introuvable.`);
    if (!kept) throw new CommandRejected('not_found', `Joueur ${keptId} introuvable.`);
    if (absorbed.discordUserId !== null && kept.discordUserId !== null) {
      throw new CommandRejected(
        'conflict',
        'Les deux cartes sont liées à deux comptes Discord différents : déliez-en une d’abord.',
      );
    }
    if (await players.playedTogether(organizationId, absorbedId, keptId)) {
      throw new CommandRejected(
        'conflict',
        'Ces deux profils ont joué le même match : ce sont deux joueurs.',
      );
    }
    const { movedPerformances } = await players.merge(
      organizationId,
      absorbedId,
      keptId,
      dayInParis(now),
    );
    return { absorbedId, keptId, movedPerformances };
  },
};
