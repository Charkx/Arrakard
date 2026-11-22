import type { AdminEdition } from '../features/admin/admin.ts';

/**
 * Ce que l'espace admin lit, avec les droits de l'admin connecté : ce que le
 * public ne voit pas, comme les brouillons (ADR 0031).
 */
export interface AdminSource {
  /** Les éditions de l'organisation, brouillons comptés. Refusé à qui n'est pas admin. */
  editions(): Promise<AdminEdition[]>;
}

/** Une source chargée au premier usage, avec la connexion (ADR 0024). */
export function lazyAdminSource(load: () => Promise<AdminSource>): AdminSource {
  let loaded: Promise<AdminSource> | undefined;
  return {
    editions: async () => (await (loaded ??= load())).editions(),
  };
}
