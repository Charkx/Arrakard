import { planMerge } from '../../domain/index.ts';
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
 * 0034, ADR 0036) : la commande lit les faits, le domaine décide (`planMerge`),
 * puis le dépôt écrit le plan. Le recalcul de la chaîne refait les notes.
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
    const facts = await players.mergeFacts(organizationId, absorbedId, keptId);
    const result = planMerge(facts, { keepId: keptId, absorbId: absorbedId });
    if (!result.ok) throw new CommandRejected('conflict', result.error);
    await players.applyMerge(organizationId, result.plan, dayInParis(now));
    const movedPerformances = result.plan.performancesReassigned;
    return { absorbedId, keptId, movedPerformances };
  },
};
