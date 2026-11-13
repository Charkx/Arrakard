import type { BackupTable } from './dump.ts';

/** Une page d'une table v1 : ses lignes, et le nombre total de lignes de la table. */
export interface Page {
  readonly rows: unknown[];
  readonly total: number;
}

/** Lit `limit` lignes d'une table v1 à partir de la ligne `offset`. */
export type ReadPage = (table: BackupTable, offset: number, limit: number) => Promise<Page>;

/**
 * Télécharge une table v1 entière, page par page : l'API REST de Supabase ne
 * rend qu'un nombre limité de lignes par appel (1 000 par défaut). Une page
 * incomplète, ou vide, dit qu'il n'y a plus rien après.
 *
 * Les lignes gardent l'ordre où la v1 les lit (sans tri) : la référence v1
 * en dépend (anomalies A5 et A6). Sans tri, deux pages peuvent se chevaucher :
 * une table avec une ligne en double, ou incomplète, est refusée.
 */
export async function downloadTable(
  readPage: ReadPage,
  table: BackupTable,
  pageSize = 1000,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let page: Page;
  do {
    page = await readPage(table, rows.length, pageSize);
    rows.push(...page.rows);
  } while (page.rows.length === pageSize);
  const { total } = page;
  const duplicates = rows.length - new Set(rows.map((row) => JSON.stringify(row))).size;
  if (duplicates > 0) throw new Error(`${table} : lignes en double (${duplicates})`);
  if (rows.length !== total) throw new Error(`${table} : lignes lues ${rows.length} sur ${total}`);
  return rows;
}
