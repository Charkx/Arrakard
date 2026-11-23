import type { NumberedRow } from '#domain/index.ts';

export const ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'] as const;

/**
 * Les cinq lignes d'un match de la feuille LIGUE1_STATS : « Joueur 1 » à
 * « Joueur 5 » pour l'équipe A, « Joueur 6 » à « Joueur 10 » pour l'équipe B,
 * qui gagne. Le fichier a une ligne parasite puis l'en-tête : les données
 * commencent à la ligne 3.
 */
export function sheetMatch(
  matchNumber: number,
  { teams = ['Noxus', 'Ionia'], names = (i: number) => `Joueur ${String(i)}` } = {},
): NumberedRow[] {
  return ROLES.map((role, i) => ({
    line: 3 + (matchNumber - 1) * 5 + i,
    cells: {
      MATCH: matchNumber,
      GAGNANT: teams[1],
      DURÉE: 32.1,
      EQUIPE: teams[0],
      'WIN/LOSE': 'LOSE',
      POSTE: role,
      'NOM DU JOUEUR': names(i + 1),
      CHAMPION: 'Ornn',
      K: i,
      D: 2,
      A: 5,
      GOLD: 9500,
      'EQUIPE.1': teams[1],
      'WIN/LOSE.1': 'WIN',
      'POSTE.1': role,
      'NOM DU JOUEUR.1': names(i + 6),
      'CHAMPION.1': 'Sion',
      'K.1': i + 1,
      'D.1': 2,
      'A.1': 5,
      'GOLD.1': 9500,
    },
  }));
}
