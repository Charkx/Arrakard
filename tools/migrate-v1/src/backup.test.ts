import { describe, expect, it } from 'vitest';
import { downloadTable, type ReadPage } from './backup.ts';

/** Une table v1 de `size` lignes, servie page par page comme le fait l'API REST. */
function tableOf(size: number) {
  const rows = Array.from({ length: size }, (_, i) => ({ id: i + 1 }));
  const reads: { offset: number; limit: number }[] = [];
  const readPage: ReadPage = (_table, offset, limit) => {
    reads.push({ offset, limit });
    return Promise.resolve({ rows: rows.slice(offset, offset + limit), total: size });
  };
  return { rows, reads, readPage };
}

describe('télécharger une table de la v1', () => {
  it('donne une liste vide pour une table vide', async () => {
    const { readPage } = tableOf(0);

    const rows = await downloadTable(readPage, 'teams', 3);

    expect(rows).toEqual([]);
  });

  it('lit une seule page quand la table y tient', async () => {
    const { rows, reads, readPage } = tableOf(2);

    const downloaded = await downloadTable(readPage, 'teams', 3);

    expect(downloaded).toEqual(rows);
    expect(reads).toEqual([{ offset: 0, limit: 3 }]);
  });

  it('lit toutes les pages, dans l’ordre où l’API les rend', async () => {
    const { rows, readPage } = tableOf(7);

    const downloaded = await downloadTable(readPage, 'match_rows', 3);

    expect(downloaded).toEqual(rows);
  });

  it('s’arrête sur une page vide quand la table remplit pile ses pages', async () => {
    const { rows, reads, readPage } = tableOf(6);

    const downloaded = await downloadTable(readPage, 'match_rows', 3);

    expect(downloaded).toEqual(rows);
    expect(reads.map((read) => read.offset)).toEqual([0, 3, 6]);
  });

  // Sans ordre fixé, deux pages peuvent se chevaucher : une ligne lue deux fois en cache une autre.
  it('refuse une table dont une ligne revient sur deux pages', async () => {
    const pages = [[{ id: 1 }, { id: 2 }], [{ id: 2 }]];
    const readPage: ReadPage = (_table, offset) =>
      Promise.resolve({ rows: pages[offset / 2] ?? [], total: 3 });

    const download = downloadTable(readPage, 'match_rows', 2);

    await expect(download).rejects.toThrow('match_rows : lignes en double (1)');
  });

  it('refuse une table dont il manque des lignes', async () => {
    const readPage: ReadPage = () => Promise.resolve({ rows: [{ id: 1 }], total: 2 });

    const download = downloadTable(readPage, 'players', 3);

    await expect(download).rejects.toThrow('players : lignes lues 1 sur 2');
  });
});
