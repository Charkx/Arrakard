import type { Division } from '@arrakis/backend/domain';

/** Titulaire, remplaçant ou coach. */
export type RosterStatus = 'starter' | 'sub' | 'coach';

export const ROSTER_STATUSES: readonly RosterStatus[] = ['starter', 'sub', 'coach'];

/** Une équipe non archivée. */
export interface AdminTeam {
  readonly id: string;
  readonly tag: string;
  readonly name: string;
  readonly divisions: readonly Division[];
}

/** La place d'un joueur dans une équipe. */
export interface RosterPlace {
  readonly teamId: string;
  readonly status: RosterStatus;
}

/** Un joueur et son passage en cours, s'il en a un. */
export interface RosterPlayer {
  readonly id: string;
  readonly nickname: string;
  readonly place: RosterPlace | null;
}

/** Ce que la page des équipes lit : les équipes et tous les joueurs. */
export interface Rosters {
  readonly teams: readonly AdminTeam[];
  readonly players: readonly RosterPlayer[];
}

/** Un joueur d'une équipe : il y a forcément une place. */
export type RosterMember = RosterPlayer & { readonly place: RosterPlace };

/** Les joueurs d'une équipe : titulaires, remplaçants puis coachs, chacun par pseudo. */
export function rosterOf(teamId: string, players: readonly RosterPlayer[]): RosterMember[] {
  return players
    .filter((p): p is RosterMember => p.place?.teamId === teamId)
    .sort(
      (a, b) =>
        rank(a) - rank(b) || a.nickname.localeCompare(b.nickname, 'fr', { sensitivity: 'base' }),
    );
}

const rank = (p: RosterMember) => ROSTER_STATUSES.indexOf(p.place.status);
