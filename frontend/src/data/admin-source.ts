import type { Division } from '@arrakis/backend/domain';
import type { AdminEdition } from '../features/admin/admin.ts';
import type { EditionDetails, EditionForm } from '../features/admin/edition-form.ts';
import type { AdminProfile } from '../features/admin/profiles.ts';
import type { RosterPlace, Rosters } from '../features/admin/teams.ts';

/** La saison ouverte de l'organisation (ADR 0014). */
export interface ActiveSeason {
  readonly id: string;
  readonly name: string;
}

/** Une commande refusée par le serveur, avec l'explication qu'il donne (ADR 0026). */
export class CommandFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandFailed';
  }
}

/**
 * Ce que l'espace admin lit et envoie, avec les droits de l'admin connecté :
 * ce que le public ne voit pas (ADR 0031), et les commandes (ADR 0026).
 */
export interface AdminSource {
  /** Les éditions de l'organisation, brouillons comptés. Refusé à qui n'est pas admin. */
  editions(): Promise<AdminEdition[]>;
  /** La saison ouverte, ou null entre deux saisons. */
  activeSeason(): Promise<ActiveSeason | null>;
  /** Ouvre une saison ; refuse (`CommandFailed`) tant qu'une autre est ouverte. */
  openSeason(name: string, year: number): Promise<void>;
  /** Clôture une saison : ses notes sont figées. */
  closeSeason(seasonId: string): Promise<void>;
  /** Les équipes non archivées, et tous les joueurs avec leur passage en cours. */
  rosters(): Promise<Rosters>;
  /** Crée une équipe ; refuse un tag déjà pris. */
  createTeam(tag: string, name: string, divisions: readonly Division[]): Promise<void>;
  /** Transfère un joueur à cette place, ou hors de toute équipe (null). */
  transferPlayer(playerId: string, to: RosterPlace | null): Promise<void>;
  /** Archive une équipe : ses joueurs la quittent. */
  archiveTeam(teamId: string): Promise<void>;
  /** Les profils non fusionnés, par pseudo, avec leur compte Discord. */
  profiles(): Promise<AdminProfile[]>;
  /** Fusionne le profil en double dans celui qui reste. */
  mergePlayers(absorbedId: string, keptId: string): Promise<void>;
  /** Lie la carte à ce compte Discord, ou la délie (null). */
  linkDiscordAccount(playerId: string, discordUserId: string | null): Promise<void>;
  /** Le formulaire d'une édition : elle (ou null pour en créer une), les saisons, les joueurs. */
  editionForm(editionId: string | null): Promise<EditionForm>;
  /** Crée une édition et rend son identifiant. */
  createEdition(details: EditionDetails): Promise<string>;
  /** Modifie une édition, à la version que l'admin a sous les yeux. */
  updateEdition(editionId: string, version: number, details: EditionDetails): Promise<void>;
  /** Archive une édition sans match. */
  archiveEdition(editionId: string, version: number): Promise<void>;
}

/** Une source chargée au premier usage, avec la connexion (ADR 0024). */
export function lazyAdminSource(load: () => Promise<AdminSource>): AdminSource {
  let loaded: Promise<AdminSource> | undefined;
  const source = () => (loaded ??= load());
  return {
    editions: async () => (await source()).editions(),
    activeSeason: async () => (await source()).activeSeason(),
    openSeason: async (name, year) => (await source()).openSeason(name, year),
    closeSeason: async (seasonId) => (await source()).closeSeason(seasonId),
    rosters: async () => (await source()).rosters(),
    createTeam: async (tag, name, divisions) => (await source()).createTeam(tag, name, divisions),
    transferPlayer: async (playerId, to) => (await source()).transferPlayer(playerId, to),
    archiveTeam: async (teamId) => (await source()).archiveTeam(teamId),
    profiles: async () => (await source()).profiles(),
    mergePlayers: async (absorbedId, keptId) => (await source()).mergePlayers(absorbedId, keptId),
    linkDiscordAccount: async (playerId, discordUserId) =>
      (await source()).linkDiscordAccount(playerId, discordUserId),
    editionForm: async (editionId) => (await source()).editionForm(editionId),
    createEdition: async (details) => (await source()).createEdition(details),
    updateEdition: async (editionId, version, details) =>
      (await source()).updateEdition(editionId, version, details),
    archiveEdition: async (editionId, version) =>
      (await source()).archiveEdition(editionId, version),
  };
}
