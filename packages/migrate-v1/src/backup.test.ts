import { describe, expect, it } from 'vitest';
import { downloadTable, type ReadPage } from './backup.ts';

/** Une table v1 de `size` lignes, servie page par page comme le fait l'API REST. */
function tableOf(size: number) {
  const rows = Array.from({ length: size }, (_, i) => ({ id: i + 1 }));
  const reads: { offset: number; limit: number }[] = [];
  const readPage: ReadPage = (_table, offset, limit) => {
    reads.push({ offset, limit });
    return Promise.resolve(rows.slice(offset, offset + limit));
  };
  return { rows, reads, readPage };
}

describe('télécharger une table de la v1', () => {
  it('donne une liste vide pour une table vide', async () => {
    const { readPage } = tableOf(0);

    expect(await downloadTable(readPage, 'teams', 3)).toEqual([]);
  });

  it('lit une seule page quand la table y tient', async () => {
    const { rows, reads, readPage } = tableOf(2);

    expect(await downloadTable(readPage, 'teams', 3)).toEqual(rows);
    expect(reads).toEqual([{ offset: 0, limit: 3 }]);
  });

  it('lit toutes les pages, dans l’ordre, sans perdre ni doubler de ligne', async () => {
    const { rows, readPage } = tableOf(7);

    expect(await downloadTable(readPage, 'match_rows', 3)).toEqual(rows);
  });

  it('s’arrête sur une page vide quand la table remplit pile ses pages', async () => {
    const { rows, reads, readPage } = tableOf(6);

    expect(await downloadTable(readPage, 'match_rows', 3)).toEqual(rows);
    expect(reads.map((read) => read.offset)).toEqual([0, 3, 6]);
  });
});
