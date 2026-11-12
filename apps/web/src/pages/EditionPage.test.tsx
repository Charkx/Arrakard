import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  toMatches,
  type EditionPageData,
  type MatchPlayerRow,
  type StandingRow,
} from '../data/edition.ts';
import { aMatch, aProfile, openSite } from '../testing/render.tsx';

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

const ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'] as const;

/** Un match complet : cinq lignes de rôle, PHA contre MAR. */
function aFullMatch(
  matchNumber: number,
  overrides: Partial<MatchPlayerRow> = {},
): MatchPlayerRow[] {
  return ROLES.flatMap((role, line) =>
    (['A', 'B'] as const).map((side) => ({
      matchId: `m${String(matchNumber)}`,
      matchNumber,
      matchday: null,
      isFinal: false,
      durationSeconds: 1865,
      winnerTeam: 'PHA',
      mvp: null,
      line,
      side,
      playerId: `p-${side}${String(line)}`,
      nickname: `${side === 'A' ? 'Phare' : 'Marée'} ${role}`,
      team: side === 'A' ? 'PHA' : 'MAR',
      role,
      champion: side === 'A' ? 'Ornn' : 'Gnar',
      result: side === 'A' ? ('win' as const) : ('loss' as const),
      kills: 3,
      deaths: 1,
      assists: 7,
      ...overrides,
    })),
  );
}

function aStanding(overrides: Partial<StandingRow> = {}): StandingRow {
  return {
    playerId: 'p-lanterne',
    nickname: 'Lanterne',
    rank: 1,
    team: 'PHA',
    role: 'TOP',
    champion: 'Ornn',
    wins: 2,
    losses: 0,
    kills: 6,
    deaths: 2,
    assists: 14,
    isEventMvp: false,
    resultPoints: 20,
    statPoints: 12,
    mvpPoints: 0,
    points: 32,
    ...overrides,
  };
}

function anEdition(overrides: Partial<EditionPageData> = {}): EditionPageData {
  return {
    edition: {
      editionId: 'e-1',
      name: 'Ligue D1 #2',
      type: 'league_div1',
      date: '2026-02-09',
      seasonName: 'Saison 3',
      location: null,
      description: null,
      eventMvp: null,
    },
    standings: [],
    matches: [],
    participants: [],
    ...overrides,
  };
}

describe('la page d’une édition', () => {
  it('s’ouvre depuis l’historique d’un joueur', async () => {
    openSite('/player/p-lanterne', {
      players: { 'p-lanterne': { profile: aProfile(), matches: [aMatch({ editionId: 'e-1' })] } },
      editions: { 'e-1': anEdition() },
    });

    fireEvent.click(await screen.findByRole('link', { name: 'Ligue D1 #2' }));

    expect(screen.getByTestId('address').textContent).toBe('/event/e-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Ligue D1 #2' })).toBeDefined();
  });

  it('montre le classement de soirée de la base, avec les points de chaque joueur', async () => {
    openSite('/event/e-1', {
      editions: {
        'e-1': anEdition({
          standings: [
            aStanding({
              playerId: 'a',
              nickname: 'Lanterne',
              rank: 1,
              points: 32,
              isEventMvp: true,
            }),
            aStanding({ playerId: 'b', nickname: 'Boussole', rank: 2, points: 25 }),
          ],
        }),
      },
    });

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(
      rows.map((r) => [
        r.querySelector('.ev-team-link')?.textContent,
        r.querySelector('.ev-soiree-pts')?.textContent,
      ]),
    ).toEqual([
      ['Lanterne', '32'],
      ['Boussole', '25'],
    ]);
    const [first] = rows;
    if (!first) throw new Error('Le classement de soirée est vide.');
    expect(within(first).getByText(/MVP/)).toBeDefined();
  });

  it('montre, pour chaque match, ses cinq lignes de rôle, les champions, les K/D/A et l’équipe gagnante', async () => {
    openSite('/event/e-1', {
      editions: {
        'e-1': anEdition({
          edition: { ...anEdition().edition, type: 'inhouse' },
          matches: toMatches(aFullMatch(1)),
        }),
      },
    });

    expect(await screen.findByText('PHA gagne')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Voir le détail du match 1' }));

    const rows = document.querySelectorAll('.ev-match-row');
    expect([...rows].map((r) => r.querySelector('.ev-role-pill')?.textContent)).toEqual([...ROLES]);
    expect(rows[0]?.textContent).toBe('Phare TOP3/1/7TOPMarée TOP3/1/7');
    expect(screen.getAllByRole('img', { name: 'Ornn' })).toHaveLength(5);
  });

  it('groupe les matchs d’une ligue par journée, dans l’ordre', async () => {
    openSite('/event/e-1', {
      editions: {
        'e-1': anEdition({
          matches: toMatches([
            ...aFullMatch(1, { matchday: 2 }),
            ...aFullMatch(2, { matchday: 1 }),
            ...aFullMatch(3, { matchday: 2, isFinal: true }),
          ]),
        }),
      },
    });

    const days = await screen.findAllByRole('heading', { level: 3 });
    expect(days.map((d) => d.textContent)).toEqual(['Journée 1', 'Journée 2']);
    expect([...document.querySelectorAll('.ev-match-no')].map((m) => m.textContent)).toEqual([
      'Match 2',
      'Match 1',
      'Finale · Match 3',
    ]);
  });

  it('montre les participants d’un événement externe, qui n’a pas de match', async () => {
    openSite('/event/e-lan', {
      editions: {
        'e-lan': anEdition({
          edition: {
            ...anEdition().edition,
            editionId: 'e-lan',
            name: 'LAN de printemps',
            type: 'external_event',
            location: 'Lyon',
          },
          participants: [
            { playerId: 'a', nickname: 'Amarre' },
            { playerId: 's', nickname: 'Sextant' },
          ],
        }),
      },
    });

    expect(await screen.findByText('Participants')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Amarre' })).toBeDefined();
    expect(screen.getByText('Lyon')).toBeDefined();
    expect(screen.queryByText('Matchs')).toBeNull();
  });

  it('dit qu’un lien ne mène à aucune édition', async () => {
    openSite('/event/inconnue', { editions: {} });

    expect(await screen.findByRole('heading', { name: 'Édition introuvable' })).toBeDefined();
  });

  it('dit quand l’édition n’a pas pu être chargée', async () => {
    openSite('/event/e-1', { editions: 'fails' });

    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas pu être chargée');
  });

  it('existe aussi en anglais', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB');
    openSite('/event/e-1', { editions: { 'e-1': anEdition({ standings: [aStanding()] }) } });

    expect(await screen.findByText('Night standings')).toBeDefined();
    expect(screen.getByText('League · Division 1')).toBeDefined();
  });
});
