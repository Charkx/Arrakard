import type { OrganizationSettings } from '@arrakis/backend/infrastructure';
import { PRODUCTION_SLUG } from './rekey.ts';

/**
 * Le serveur Discord d'Arrakis et son rôle admin (Q18, 2026-11-22). L'organisation
 * d'essai a la même configuration (ADR 0008, ADR 0021).
 */
export const ARRAKIS_DISCORD = {
  guildId: '1031291061936595015',
  adminRoleId: '1514024774131519638',
};

/** Les organisations qu'on peut charger, avec leur nom et leur serveur Discord (ADR 0021). */
const ORGANIZATIONS: Readonly<Record<string, OrganizationSettings>> = {
  [PRODUCTION_SLUG]: { slug: PRODUCTION_SLUG, name: 'Arrakis', discord: ARRAKIS_DISCORD },
  'arrakis-essai': { slug: 'arrakis-essai', name: 'Arrakis (essai)', discord: ARRAKIS_DISCORD },
};

export const LOAD_USAGE =
  'Usage : load <dossier de la sauvegarde v1> [--organization=arrakis-essai] [--replace] [--confirm-hosted]';

export interface LoadArgs {
  readonly dir: string;
  readonly organization: OrganizationSettings;
  readonly replace: boolean;
  readonly confirmHosted: boolean;
}

/** Lit les arguments de `load`, ou rend `undefined` s'ils ne se comprennent pas. */
export function parseLoadArgs(args: readonly string[]): LoadArgs | undefined {
  const positional = args.filter((arg) => !arg.startsWith('--'));
  const slug =
    args.find((arg) => arg.startsWith('--organization='))?.slice('--organization='.length) ??
    PRODUCTION_SLUG;
  const organization = ORGANIZATIONS[slug];
  const [dir] = positional;
  // Un seul dossier : `--organization arrakis-essai`, sans `=`, en donnerait deux.
  if (positional.length !== 1 || dir === undefined || organization === undefined) return undefined;
  return {
    dir,
    organization,
    replace: args.includes('--replace'),
    confirmHosted: args.includes('--confirm-hosted'),
  };
}
