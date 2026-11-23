import type { NumberedRow } from '@arrakis/backend/domain';

/** Le fichier ne contient pas la feuille des statistiques. */
export class MissingSheet extends Error {
  constructor(readonly sheets: readonly string[]) {
    super(`Feuille LIGUE1_STATS introuvable (feuilles : ${sheets.join(', ')}).`);
  }
}

/**
 * Les lignes de la feuille LIGUE1_STATS d'un fichier Excel d'édition, comme
 * les lisait la v1 : la troisième feuille si aucune ne porte ce nom ; une
 * ligne de totaux, puis l'en-tête, puis une ligne par rôle. Le navigateur lit
 * seulement : le serveur interprète les colonnes (ADR 0038). SheetJS n'est
 * chargé qu'au premier import, comme la connexion (ADR 0024).
 */
export async function readStatsSheet(file: ArrayBuffer): Promise<NumberedRow[]> {
  const { read, utils } = await import('xlsx');
  const workbook = read(file, { type: 'array' });
  const name =
    workbook.SheetNames.find((n) => n === 'LIGUE1_STATS') ?? workbook.SheetNames[2] ?? '';
  const sheet = workbook.Sheets[name];
  if (sheet === undefined) throw new MissingSheet(workbook.SheetNames);
  // `range: 1` saute la ligne de totaux ; les en-têtes en double reçoivent « _1 ».
  const rows = utils.sheet_to_json<Record<string, string | number | boolean | null>>(sheet, {
    defval: null,
    range: 1,
  });
  return rows.map((cells) => ({ line: rowNumber(cells) + 1, cells: { ...cells } }));
}

/** SheetJS range sur chaque ligne son rang dans la feuille, à partir de 0. */
function rowNumber(row: object): number {
  const rank: unknown = (row as { __rowNum__?: unknown }).__rowNum__;
  return typeof rank === 'number' ? rank : 0;
}
