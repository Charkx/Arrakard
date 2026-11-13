/** Lit `limit` lignes d'une table v1 à partir de la ligne `offset`. */
export type ReadPage = (table: string, offset: number, limit: number) => Promise<unknown[]>;

/**
 * Télécharge une table v1 entière, page par page : l'API REST de Supabase ne
 * rend qu'un nombre limité de lignes par appel (1 000 par défaut). Une page
 * incomplète, ou vide, dit qu'il n'y a plus rien après.
 */
export async function downloadTable(
  readPage: ReadPage,
  table: string,
  pageSize = 1000,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (;;) {
    const page = await readPage(table, rows.length, pageSize);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
