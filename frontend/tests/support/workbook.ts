import { utils, write } from 'xlsx';

const HEADER = [
  'MATCH',
  'GAGNANT',
  'DURÉE',
  'EQUIPE',
  'WIN/LOSE',
  'POSTE',
  'NOM DU JOUEUR',
  'CHAMPION',
  'K',
  'D',
  'A',
  'GOLD',
  'EQUIPE',
  'WIN/LOSE',
  'POSTE',
  'NOM DU JOUEUR',
  'CHAMPION',
  'K',
  'D',
  'A',
  'GOLD',
];

/**
 * Un faux fichier d'édition, fabriqué comme les vrais : deux feuilles avant
 * celle des statistiques, une ligne de totaux, l'en-tête où les colonnes de
 * l'équipe B portent les mêmes noms, une ligne vide, puis les données. Les
 * pseudos sont inventés.
 */
export function aWorkbook(statsSheetName = 'LIGUE1_STATS'): ArrayBuffer {
  const book = utils.book_new();
  utils.book_append_sheet(book, utils.aoa_to_sheet([['Accueil']]), 'ACCUEIL');
  utils.book_append_sheet(book, utils.aoa_to_sheet([['Classement']]), 'CLASSEMENT');
  utils.book_append_sheet(
    book,
    utils.aoa_to_sheet([
      ['TOTAUX', null, null, null, null, null, null, null, 42],
      HEADER,
      [
        1,
        'Ionia',
        32.1,
        'Noxus',
        'LOSE',
        'TOP',
        'NOX Zéphyr',
        'Ornn',
        1,
        2,
        5,
        9500,
        'Ionia',
        'WIN',
        'TOP',
        'Sirocco',
        'Sion',
        3,
        1,
        4,
        10200,
      ],
      [],
      [
        1,
        null,
        null,
        'Noxus',
        'LOSE',
        'JGL',
        'Brise',
        'Vi',
        0,
        4,
        6,
        8000,
        'Ionia',
        'WIN',
        'JGL',
        'Mistral',
        'Lee Sin',
        5,
        0,
        9,
        11000,
      ],
    ]),
    statsSheetName,
  );
  return write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
