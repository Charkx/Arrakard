import { describe, expect, it } from 'vitest';
import { utils, write } from 'xlsx';
import { parseStatsSheet } from '@arrakis/backend/domain';
import { MissingSheet, readStatsSheet } from '#src/features/admin/excel.ts';
import { aWorkbook } from '#support/workbook.ts';

describe('readStatsSheet', () => {
  it('lit les lignes de LIGUE1_STATS avec leur numéro de ligne Excel', async () => {
    const rows = await readStatsSheet(aWorkbook());

    expect(rows.map((r) => r.line)).toEqual([3, 5]);
    expect(rows[0]?.cells).toMatchObject({
      MATCH: 1,
      GAGNANT: 'Ionia',
      DURÉE: 32.1,
      'NOM DU JOUEUR': 'NOX Zéphyr',
      'NOM DU JOUEUR_1': 'Sirocco',
      K_1: 3,
    });
    expect(rows[1]?.cells.GAGNANT).toBeNull();
  });

  it('donne au serveur des lignes que le domaine sait lire : un match, ses deux côtés', async () => {
    const rows = await readStatsSheet(aWorkbook());

    const parsed = parseStatsSheet(
      rows.map((r) => r.cells),
      rows.map((r) => r.line),
    );

    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.sheet.warnings).toEqual(['Match 1 : 2 ligne(s) au lieu de 5.']);
    const [match] = parsed.sheet.matches;
    expect(match).toMatchObject({ matchNumber: 1, winnerTeam: 'Ionia', durationSeconds: 1930 });
    expect(match?.lines[1]?.sides.map((s) => [s.team, s.rawName, s.result, s.kills])).toEqual([
      ['Noxus', 'Brise', 'loss', 0],
      ['Ionia', 'Mistral', 'win', 5],
    ]);
  });

  it('prend la troisième feuille si aucune ne s’appelle LIGUE1_STATS', async () => {
    const rows = await readStatsSheet(aWorkbook('STATS'));

    expect(rows[1]?.cells.CHAMPION_1).toBe('Lee Sin');
  });

  it('refuse un fichier sans feuille de statistiques, en nommant ses feuilles', async () => {
    const book = utils.book_new();
    utils.book_append_sheet(book, utils.aoa_to_sheet([['x']]), 'SEULE');
    const file = write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    await expect(readStatsSheet(file)).rejects.toThrow(MissingSheet);
    await expect(readStatsSheet(file)).rejects.toThrow('SEULE');
  });
});
