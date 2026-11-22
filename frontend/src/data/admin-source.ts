import type { AdminEdition } from '../features/admin/admin.ts';

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
  };
}
