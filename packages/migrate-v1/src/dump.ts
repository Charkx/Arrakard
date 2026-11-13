import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { V1Dump } from './v1.ts';

/** Les tables d'une sauvegarde v1, un fichier `<table>.json` chacune. */
export const TABLES = [
  'seasons',
  'splits',
  'teams',
  'players',
  'editions',
  'matches',
  'match_rows',
  'edition_participants',
  'registrations',
  'player_event_entries',
] as const satisfies readonly (keyof V1Dump)[];

/** Lit une sauvegarde v1 : un dossier avec un fichier JSON par table (export REST). */
export function readDump(dir: string): V1Dump {
  return Object.fromEntries(
    TABLES.map((table) => [table, JSON.parse(readFileSync(join(dir, `${table}.json`), 'utf8'))]),
  ) as unknown as V1Dump;
}
