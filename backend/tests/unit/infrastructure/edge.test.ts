import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Lit un fichier JSON du dépôt, depuis la racine. */
const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../${path}`, import.meta.url), 'utf8'));

describe('les Edge Functions', () => {
  it('chargent sous Deno les mêmes versions de postgres et de Zod que le back sous Node', () => {
    const { dependencies } = readJson('backend/package.json') as {
      dependencies: Record<string, string>;
    };
    const { imports } = readJson('supabase/functions/deno.json') as {
      imports: Record<string, string>;
    };

    expect(imports).toEqual({
      postgres: `npm:postgres@${dependencies.postgres ?? ''}`,
      zod: `npm:zod@${dependencies.zod ?? ''}`,
    });
  });
});
