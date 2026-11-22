import { readFileSync } from 'node:fs';
import { closeEdition } from '#application/index.ts';
import { closeEditionRequest } from '#contracts/index.ts';
import { describe, expect, it } from 'vitest';
import { edgeCommandHandler, edgeSyncDiscordRoleHandler } from '#infrastructure/edge.ts';

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

describe('edgeCommandHandler', () => {
  it('refuse de démarrer sans l’adresse de Supabase', () => {
    expect(() =>
      edgeCommandHandler(closeEdition, closeEditionRequest, {
        SUPABASE_DB_URL: 'postgresql://127.0.0.1:1/aucune',
        SUPABASE_ANON_KEY: 'clé',
      }),
    ).toThrow('Variable SUPABASE_URL manquante.');
  });
});

describe('edgeSyncDiscordRoleHandler', () => {
  it('refuse de démarrer sans la clé publique de Supabase', () => {
    expect(() =>
      edgeSyncDiscordRoleHandler({
        SUPABASE_DB_URL: 'postgresql://127.0.0.1:1/aucune',
        SUPABASE_URL: 'http://127.0.0.1:1',
      }),
    ).toThrow('Variable SUPABASE_ANON_KEY manquante.');
  });
});
