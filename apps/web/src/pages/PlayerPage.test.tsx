import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aMatch, aProfile, anEntry, openSite } from '../testing/render.tsx';

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

const lanterne = { profile: aProfile(), matches: [aMatch()] };

describe('le profil d’un joueur', () => {
  it('s’ouvre depuis le classement, à l’adresse de la v1', async () => {
    openSite('/leaderboard', {
      leaderboard: { seasonName: 'Saison 3', entries: [anEntry({ playerId: 'p-lanterne' })] },
      players: { 'p-lanterne': lanterne },
    });

    fireEvent.click(await screen.findByRole('link', { name: 'Lanterne' }));

    expect(screen.getByTestId('address').textContent).toBe('/player/p-lanterne');
    expect(await screen.findByRole('heading', { level: 1, name: 'Lanterne' })).toBeDefined();
  });

  it('montre sur la carte la note, les sous-notes, le palier, le rôle, l’équipe et les champions', async () => {
    openSite('/player/p-lanterne', { players: { 'p-lanterne': lanterne } });

    const card = (await screen.findByText('ORN')).closest('.pch-frame');
    expect(card?.getAttribute('data-rank')).toBe('or');
    expect(card?.querySelector('.pch-ovr')?.textContent).toBe('86');
    expect([...(card?.querySelectorAll('.pch-stat .v') ?? [])].map((v) => v.textContent)).toEqual([
      '91',
      '79',
      '85',
    ]);
    expect(card?.querySelector('.pch-team')?.textContent).toBe('PHA');
    expect(card?.querySelector('.pch-role')?.textContent).toContain('TOP');
    expect([...(card?.querySelectorAll('.pch-champ-fb') ?? [])].map((c) => c.textContent)).toEqual([
      'ORN',
      'GNA',
      'GAR',
    ]);
  });

  it('montre les statistiques de la saison et l’évolution de la note', async () => {
    openSite('/player/p-lanterne', { players: { 'p-lanterne': lanterne } });

    expect(await screen.findByText('15 V · 7 D')).toBeDefined();
    expect(screen.getByText('4.55')).toBeDefined();
    expect(screen.getByText(/\+3 depuis la dernière édition/)).toBeDefined();
  });

  it('liste les matchs du plus récent au plus ancien, regroupés par édition', async () => {
    openSite('/player/p-lanterne', {
      players: {
        'p-lanterne': {
          profile: aProfile(),
          matches: [
            aMatch({
              matchId: 'a',
              editionId: 'e-old',
              editionName: 'Ligue D1 #1',
              editionDate: '2025-03-10',
              champion: 'Gnar',
            }),
            aMatch({
              matchId: 'b',
              editionId: 'e-new',
              editionName: 'In House #1',
              editionDate: '2026-03-01',
              matchNumber: 1,
              champion: 'Ornn',
            }),
            aMatch({
              matchId: 'c',
              editionId: 'e-new',
              editionName: 'In House #1',
              editionDate: '2026-03-01',
              matchNumber: 2,
              champion: 'Garen',
              result: 'loss',
              kills: 1,
              deaths: 6,
              assists: 2,
            }),
          ],
        },
      },
    });

    await screen.findByText('Historique des matchs');
    const editions = screen
      .getAllByRole('link')
      .filter((l) => l.classList.contains('history-entry-name'));
    expect(editions.map((e) => e.textContent)).toEqual(['In House #1', 'Ligue D1 #1']);
    const games = [...document.querySelectorAll('.history-game')].map((row) => row.textContent);
    expect(games).toEqual([
      'Match 2GarenTOP1/6/2Défaite',
      'Match 1OrnnTOP3/1/7Victoire',
      'Match 1GnarTOP3/1/7Victoire',
    ]);
  });

  it('dit qu’un joueur n’a pas encore joué cette saison, sans erreur', async () => {
    openSite('/player/p-vigie', {
      players: {
        'p-vigie': { profile: aProfile({ nickname: 'Vigie', season: null }), matches: [] },
      },
    });

    expect(await screen.findByText(/Pas encore de partie cette saison/)).toBeDefined();
    expect(screen.getByText('Aucun match enregistré pour ce joueur.')).toBeDefined();
    expect(document.querySelector('.pch-frame')).toBeNull();
  });

  it('dit qu’un lien ne mène à aucun joueur', async () => {
    openSite('/player/inconnu', { players: {} });

    expect(await screen.findByRole('heading', { name: 'Joueur introuvable' })).toBeDefined();
  });

  it('dit quand le profil n’a pas pu être chargé', async () => {
    openSite('/player/p-lanterne', { players: 'fails' });

    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas pu être chargé');
  });

  it('existe aussi en anglais', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB');
    openSite('/player/p-lanterne', { players: { 'p-lanterne': lanterne } });

    expect(await screen.findByText('Match history')).toBeDefined();
    expect(screen.getByText('15 W · 7 L')).toBeDefined();
  });
});
