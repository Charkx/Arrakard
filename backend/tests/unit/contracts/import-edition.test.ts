import { describe, expect, it } from 'vitest';
import { importEditionRequest } from '#contracts/import-edition.ts';

const ID = '00000000-0000-4000-8000-000000000002';
const IMPORT = {
  organizationId: ID,
  editionId: ID,
  version: 1,
  rows: [{ line: 3, cells: { MATCH: 1, 'NOM DU JOUEUR': 'Zéphyr', CHAMPION: null, WIN: true } }],
};

describe('importEditionRequest', () => {
  it('accepte des lignes numérotées, aux cellules texte, nombre, booléen ou vides', () => {
    expect(importEditionRequest.parse(IMPORT).rows[0]?.cells['NOM DU JOUEUR']).toBe('Zéphyr');
  });

  it('accepte les décisions de l’admin', () => {
    const decided = importEditionRequest.parse({
      ...IMPORT,
      decisions: {
        names: { zephir: { kind: 'existing', playerId: ID }, baited: { kind: 'new' } },
        unknownTeams: { NKR: 'create' },
        transfers: { [ID]: 'ignore' },
      },
    });

    expect(decided.decisions?.names.baited).toEqual({ kind: 'new' });
  });

  it.each([
    [
      'une décision inconnue',
      { decisions: { names: {}, unknownTeams: { NKR: 'peut-être' }, transfers: {} } },
    ],
    ['aucune ligne', { rows: [] }],
    ['un numéro de ligne nul', { rows: [{ line: 0, cells: {} }] }],
    ['une cellule objet', { rows: [{ line: 3, cells: { MATCH: { x: 1 } } }] }],
    [
      'une cellule de plus de 200 caractères',
      { rows: [{ line: 3, cells: { A: 'x'.repeat(201) } }] },
    ],
    [
      'une ligne de plus de 64 colonnes',
      {
        rows: [
          {
            line: 3,
            cells: Object.fromEntries(Array.from({ length: 65 }, (_, i) => [`C${String(i)}`, 1])),
          },
        ],
      },
    ],
    ['plus de 2000 lignes', { rows: Array.from({ length: 2001 }, () => ({ line: 3, cells: {} })) }],
  ])('refuse %s', (_case, change) => {
    expect(importEditionRequest.safeParse({ ...IMPORT, ...change }).success).toBe(false);
  });
});
