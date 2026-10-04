import { describe, expect, it } from 'vitest';
import { parseDuration, parseStatsSheet, type SheetRow } from './stats-sheet';

/** Une ligne de rôle de la feuille LIGUE1_STATS (côté A, puis côté B en « .1 »). */
function aSheetRow(overrides: Partial<Record<string, unknown>> = {}): SheetRow {
  return {
    MATCH: 1,
    GAGNANT: 'ARK',
    DURÉE: 30.0,
    EQUIPE: 'ARK',
    'WIN/LOSE': 'WIN',
    POSTE: 'MID',
    'NOM DU JOUEUR': 'ARK Meta',
    CHAMPION: 'Ahri',
    K: 5,
    D: 2,
    A: 7,
    GOLD: 12000,
    'EQUIPE.1': 'BLB',
    'WIN/LOSE.1': 'LOSE',
    'POSTE.1': 'MID',
    'NOM DU JOUEUR.1': 'BLB Zed',
    'CHAMPION.1': 'Syndra',
    'K.1': 1,
    'D.1': 4,
    'A.1': 2,
    'GOLD.1': 9000,
    ...overrides,
  };
}

const ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
const aMatch = (match: number) =>
  ROLES.map((role) => aSheetRow({ MATCH: match, POSTE: role, 'POSTE.1': role }));

describe('parseDuration', () => {
  it.each([
    [33.11, 33 * 60 + 11],
    [33.05, 33 * 60 + 5],
    [33.5, 33 * 60 + 50],
    [30, 30 * 60],
    [0, 0],
  ])('%d (minutes.secondes) → %i s', (raw, seconds) => {
    expect(parseDuration(raw)).toBe(seconds);
  });
});

describe('parseStatsSheet', () => {
  describe('validation de la feuille', () => {
    it('refuse une feuille vide', () => {
      expect(parseStatsSheet([])).toEqual({
        ok: false,
        error: expect.stringContaining('vide') as string,
      });
    });

    it('liste les colonnes obligatoires manquantes', () => {
      const { GOLD, CHAMPION, ...incomplete } = aSheetRow();

      const result = parseStatsSheet([incomplete]);

      expect(result).toEqual({
        ok: false,
        error: expect.stringContaining('CHAMPION, GOLD') as string,
      });
    });

    it('exige les colonnes de l’équipe B', () => {
      const teamAOnly = Object.fromEntries(
        Object.entries(aSheetRow()).filter(([k]) => !k.endsWith('.1')),
      );

      const result = parseStatsSheet([teamAOnly]);

      expect(result).toEqual({ ok: false, error: expect.stringContaining('équipe B') as string });
    });

    it('refuse une feuille sans aucun match exploitable', () => {
      const result = parseStatsSheet([aSheetRow({ MATCH: null })]);

      expect(result).toEqual({
        ok: false,
        error: expect.stringContaining('Aucun match') as string,
      });
    });
  });

  it('lit un match complet : équipes, vainqueur, durée et les deux performances de chaque ligne', () => {
    const result = parseStatsSheet(aMatch(1));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [match] = result.sheet.matches;
    expect(match).toMatchObject({ matchNumber: 1, winnerTeam: 'ARK', durationSeconds: 1800 });
    expect(match?.lines).toHaveLength(5);
    expect(match?.lines[2]).toEqual({
      role: 'MID',
      sides: [
        {
          team: 'ARK',
          result: 'win',
          rawName: 'ARK Meta',
          champion: 'Ahri',
          kills: 5,
          deaths: 2,
          assists: 7,
          gold: 12000,
        },
        {
          team: 'BLB',
          result: 'loss',
          rawName: 'BLB Zed',
          champion: 'Syndra',
          kills: 1,
          deaths: 4,
          assists: 2,
          gold: 9000,
        },
      ],
    });
    expect(result.sheet.warnings).toEqual([]);
  });

  it('regroupe les lignes par numéro de match et trie matchs et rôles', () => {
    const shuffled = [...aMatch(2), ...aMatch(1)].reverse();

    const result = parseStatsSheet(shuffled);

    if (!result.ok) throw new Error(result.error);
    expect(result.sheet.matches.map((m) => m.matchNumber)).toEqual([1, 2]);
    expect(result.sheet.matches[0]?.lines.map((l) => l.role)).toEqual(ROLES);
  });

  it('ignore les lignes de totaux (sans numéro de match ou sans joueur A)', () => {
    const rows = [
      ...aMatch(1),
      aSheetRow({ MATCH: null }),
      aSheetRow({ MATCH: 1, 'NOM DU JOUEUR': '  ' }),
    ];

    const result = parseStatsSheet(rows);

    if (!result.ok) throw new Error(result.error);
    expect(result.sheet.matches[0]?.lines).toHaveLength(5);
  });

  it('accepte les colonnes de l’équipe B suffixées « _1 »', () => {
    const rows = aMatch(1).map((row) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/\.1$/, '_1'), v])),
    );

    const result = parseStatsSheet(rows);

    if (!result.ok) throw new Error(result.error);
    expect(result.sheet.matches[0]?.lines[0]?.sides[1].rawName).toBe('BLB Zed');
  });

  it.each([
    ['JUNGLE', 'JGL'],
    ['middle', 'MID'],
    ['BOT', 'ADC'],
    ['SUPPORT', 'SUP'],
    ['SUPP', 'SUP'],
  ])('reconnaît le poste « %s » comme %s', (raw, role) => {
    const result = parseStatsSheet([aSheetRow({ POSTE: raw })]);

    if (!result.ok) throw new Error(result.error);
    expect(result.sheet.matches[0]?.lines[0]?.role).toBe(role);
  });

  it('avertit pour un poste inconnu et ignore la ligne', () => {
    const rows = [...aMatch(1).slice(0, 4), aSheetRow({ POSTE: 'COACH' })];

    const result = parseStatsSheet(rows);

    if (!result.ok) throw new Error(result.error);
    expect(result.sheet.matches[0]?.lines).toHaveLength(4);
    expect(result.sheet.warnings).toEqual([
      'Match 1 : poste « COACH » inconnu, ligne ignorée.',
      'Match 1 : 4 ligne(s) au lieu de 5.',
    ]);
  });

  it.each([null, 'abc'])('une durée %s vaut 0, sans faire échouer la lecture', (duration) => {
    const result = parseStatsSheet([aSheetRow({ DURÉE: duration, GAGNANT: null })]);

    if (!result.ok) throw new Error(result.error);
    expect(result.sheet.matches[0]).toMatchObject({ durationSeconds: 0, winnerTeam: '' });
  });

  it('tout résultat autre que WIN est une défaite', () => {
    const result = parseStatsSheet([aSheetRow({ 'WIN/LOSE': 'win ', 'WIN/LOSE.1': '' })]);

    if (!result.ok) throw new Error(result.error);
    expect(result.sheet.matches[0]?.lines[0]?.sides.map((s) => s.result)).toEqual(['win', 'loss']);
  });

  it('tronque les champs anormalement longs et arrondit les nombres', () => {
    const result = parseStatsSheet([
      aSheetRow({ EQUIPE: 'X'.repeat(40), 'NOM DU JOUEUR': 'N'.repeat(200), K: 4.6, GOLD: null }),
    ]);

    if (!result.ok) throw new Error(result.error);
    const side = result.sheet.matches[0]?.lines[0]?.sides[0];
    expect(side?.team).toHaveLength(16);
    expect(side?.rawName).toHaveLength(80);
    expect(side?.kills).toBe(5);
    expect(side?.gold).toBe(0);
  });
});
