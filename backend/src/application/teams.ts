import type { Division } from '../domain/index.ts';

/** Titulaire, remplaçant ou coach. */
export type RosterStatus = 'starter' | 'sub' | 'coach';

/** Une nouvelle équipe. */
export interface NewTeam {
  /** Son tag d'équipe, 2 à 4 majuscules ou chiffres (« ARK »). */
  readonly tag: string;
  readonly name: string;
  /** Ses divisions de ligue, peut-être aucune. */
  readonly divisions: readonly Division[];
}

/** Ce qu'une commande lit d'une équipe. */
export interface TeamState {
  readonly archived: boolean;
}

/** La place d'un joueur dans une équipe : quelle équipe, avec quel statut. */
export interface RosterPlace {
  readonly teamId: string;
  readonly status: RosterStatus;
}

/** Ce qu'une commande lit d'un joueur : son passage en cours, s'il en a un. */
export interface PlayerRoster {
  readonly current: RosterPlace | null;
}

/**
 * Lit et écrit les équipes d'une organisation et leurs passages. Un passage
 * va de l'arrivée d'un joueur dans une équipe à son départ ; l'historique
 * d'équipes est la suite de ses passages (ADR 0033).
 */
export interface TeamRepository {
  /** L'équipe de cette organisation, ou `undefined` si elle n'y est pas. */
  find(organizationId: string, teamId: string): Promise<TeamState | undefined>;
  /** Une équipe de ce tag existe-t-elle déjà, archivée ou non ? */
  tagTaken(organizationId: string, tag: string): Promise<boolean>;
  /** Crée l'équipe et rend son identifiant. */
  create(organizationId: string, team: NewTeam): Promise<string>;
  /**
   * L'archive à cet instant ISO, et termine ce jour-là (AAAA-MM-JJ) les
   * passages en cours de ses joueurs.
   */
  archive(organizationId: string, teamId: string, archivedAt: string, on: string): Promise<void>;
  /** Le joueur de cette organisation et son passage en cours, ou `undefined`. */
  player(organizationId: string, playerId: string): Promise<PlayerRoster | undefined>;
  /**
   * Termine ce jour-là le passage en cours du joueur, s'il en a un, et en
   * commence un nouveau à cette place, sauf si `to` est null.
   */
  transfer(
    organizationId: string,
    playerId: string,
    to: RosterPlace | null,
    on: string,
  ): Promise<void>;
}
