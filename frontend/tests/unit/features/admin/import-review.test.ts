import { describe, expect, it } from 'vitest';
import type { NumberedRow } from '@arrakis/backend/domain';
import { NO_DECISION } from '@arrakis/backend/domain';
import {
  everythingDecided,
  reviewImport,
  transfersOf,
  type DirectoryEntry,
} from '#src/features/admin/import-review.ts';

const ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];

/** Un match NOX contre ION : `names[i]` côté A, `names[i + 5]` côté B. */
function aMatch(names: readonly string[]): NumberedRow[] {
  return ROLES.map((role, i) => ({
    line: 3 + i,
    cells: {
      MATCH: 1,
      GAGNANT: 'ION',
      DURÉE: 30,
      EQUIPE: 'NOX',
      'WIN/LOSE': 'LOSE',
      POSTE: role,
      'NOM DU JOUEUR': names[i] ?? '',
      CHAMPION: 'Ornn',
      K: 1,
      D: 1,
      A: 1,
      GOLD: 9000,
      'EQUIPE.1': 'ION',
      'WIN/LOSE.1': 'WIN',
      'POSTE.1': role,
      'NOM DU JOUEUR.1': names[i + 5] ?? '',
      'CHAMPION.1': 'Sion',
      'K.1': 1,
      'D.1': 1,
      'A.1': 1,
      'GOLD.1': 9000,
    },
  }));
}

const known = (nickname: string, teamTag: string | null = null): DirectoryEntry => ({
  playerId: `p-${nickname}`,
  nickname,
  aliases: [nickname],
  teamTag,
  archived: false,
  status: teamTag === null ? null : 'starter',
});

const NAMES = [
  'Zéphyr',
  'Brise',
  'Mistral',
  'Sirocco',
  'Foehn',
  'Alizé',
  'Bora',
  'Noroît',
  'Autan',
  'Zephir',
];
const DIRECTORY = {
  players: [...NAMES.slice(0, 9).map((n) => known(n)), known('Sirocco2')].map((p) =>
    p.nickname === 'Sirocco' ? { ...p, teamTag: 'VNT', status: 'sub' as const } : p,
  ),
  teamTags: ['NOX', 'VNT'],
};

describe('reviewImport', () => {
  it('montre les problèmes du fichier, comme le serveur les dira', () => {
    const rows = aMatch(NAMES).map((r) =>
      r.line === 4 ? { ...r, cells: { ...r.cells, K: 'x' } } : r,
    );

    expect(reviewImport(rows, DIRECTORY, 'inhouse')).toEqual({
      kind: 'refused',
      problems: ['Ligne 4 (match 1) : « x » n’est pas un nombre (colonne K).'],
    });
  });

  it('liste les pseudos non reconnus, les équipes inconnues et les transferts', () => {
    const review = reviewImport(aMatch(NAMES), DIRECTORY, 'league_div1');

    if (review.kind !== 'ready') throw new Error('refusé');
    expect(review.matchCount).toBe(1);
    expect(review.recognized).toBe(9);
    expect(review.names.map((n) => [n.nickname, n.key, n.resolution.kind])).toEqual([
      ['Zephir', 'zephir', 'unknown'],
    ]);
    expect(review.unknownTeams.map((t) => t.teamTag)).toEqual(['ION']);
    expect(transfersOf(review, NO_DECISION)).toEqual([
      { playerId: 'p-Sirocco', fromTeamTag: 'VNT', toTeamTag: 'NOX' },
    ]);
  });

  it('dans une In House, les équipes ne sont pas des rosters : ni équipe inconnue, ni transfert', () => {
    const review = reviewImport(aMatch(NAMES), DIRECTORY, 'inhouse');

    if (review.kind !== 'ready') throw new Error('refusé');
    expect(review.unknownTeams).toEqual([]);
    expect(transfersOf(review, NO_DECISION)).toEqual([]);
  });
});

describe('everythingDecided', () => {
  it('attend une décision pour chaque cas', () => {
    const review = reviewImport(aMatch(NAMES), DIRECTORY, 'league_div1');
    if (review.kind !== 'ready') throw new Error('refusé');

    expect(everythingDecided(review, NO_DECISION)).toBe(false);
    expect(
      everythingDecided(review, {
        names: { zephir: { kind: 'existing', playerId: 'p-Zéphyr' } },
        unknownTeams: { ION: 'create' },
        transfers: { 'p-Sirocco': 'apply' },
      }),
    ).toBe(true);
  });
});
