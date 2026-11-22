import { PRODUCTION_SLUG } from './rekey.ts';

/** Les organisations qu'on peut charger, et leur nom (ADR 0021). */
const ORGANIZATIONS: Readonly<Record<string, string>> = {
  [PRODUCTION_SLUG]: 'Arrakis',
  'arrakis-essai': 'Arrakis (essai)',
};

export const LOAD_USAGE =
  'Usage : load <dossier de la sauvegarde v1> [--organization=arrakis-essai] [--replace] [--confirm-hosted]';

export interface LoadArgs {
  readonly dir: string;
  readonly organization: { readonly slug: string; readonly name: string };
  readonly replace: boolean;
  readonly confirmHosted: boolean;
}

/** Lit les arguments de `load`, ou rend `undefined` s'ils ne se comprennent pas. */
export function parseLoadArgs(args: readonly string[]): LoadArgs | undefined {
  const positional = args.filter((arg) => !arg.startsWith('--'));
  const slug =
    args.find((arg) => arg.startsWith('--organization='))?.slice('--organization='.length) ??
    PRODUCTION_SLUG;
  const name = ORGANIZATIONS[slug];
  const [dir] = positional;
  // Un seul dossier : `--organization arrakis-essai`, sans `=`, en donnerait deux.
  if (positional.length !== 1 || dir === undefined || name === undefined) return undefined;
  return {
    dir,
    organization: { slug, name },
    replace: args.includes('--replace'),
    confirmHosted: args.includes('--confirm-hosted'),
  };
}
