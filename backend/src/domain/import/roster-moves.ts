import type { ImportPlayer, RosterStatus } from './analyze.ts';
import type { ImportPlan, PlayerRef } from './plan.ts';

/** Où un import envoie un joueur : une équipe, par son tag, et un statut. */
export interface RosterMove {
  readonly player: PlayerRef;
  readonly to: { readonly teamTag: string; readonly status: RosterStatus };
}

/**
 * Les changements de roster d'un import (ADR 0039) : un nouveau joueur
 * rattaché à une équipe la rejoint comme titulaire, puisqu'il a joué pour
 * elle ; un transfert accepté garde le statut que le joueur avait dans son
 * ancienne équipe.
 */
export function rosterMoves(plan: ImportPlan, players: readonly ImportPlayer[]): RosterMove[] {
  const joining = plan.newPlayers.flatMap(({ key, teamTag }): RosterMove[] =>
    teamTag === null ? [] : [{ player: { kind: 'new', key }, to: { teamTag, status: 'starter' } }],
  );
  const transferred = plan.transfers.map(({ playerId, toTeamTag }): RosterMove => {
    const status = players.find((p) => p.playerId === playerId)?.status ?? 'starter';
    return { player: { kind: 'existing', playerId }, to: { teamTag: toTeamTag, status } };
  });
  return [...joining, ...transferred];
}
