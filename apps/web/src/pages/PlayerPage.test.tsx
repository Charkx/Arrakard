import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { explainRating } from '@arrakis/domain';
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

    const card = (await screen.findByRole('img', { name: 'Ornn' })).closest('.pch-frame');
    expect(card?.getAttribute('data-rank')).toBe('or');
    expect(card?.querySelector('.pch-ovr')?.textContent).toBe('80');
    expect([...(card?.querySelectorAll('.pch-stat .v') ?? [])].map((v) => v.textContent)).toEqual([
      '93',
      '68',
      '80',
    ]);
    expect(card?.querySelector('.pch-team')?.textContent).toBe('PHA');
    expect(card?.querySelector('.pch-role')?.textContent).toContain('JGL');
    expect(
      [...(card?.querySelectorAll('.pch-champ-img') ?? [])].map((c) => c.getAttribute('alt')),
    ).toEqual(['Ornn', 'Gnar', 'Garen']);
  });

  it('montre les statistiques de la saison et l’évolution de la note', async () => {
    openSite('/player/p-lanterne', { players: { 'p-lanterne': lanterne } });

    expect(await screen.findByText('4 V · 1 D')).toBeDefined();
    expect(screen.getByText('7.88')).toBeDefined();
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

  it('montre les trois premières lettres d’un champion dont l’image ne charge pas', async () => {
    openSite('/player/p-lanterne', { players: { 'p-lanterne': lanterne } });

    fireEvent.error(await screen.findByRole('img', { name: 'Gnar' }));

    expect(screen.getByText('GNA')).toBeDefined();
  });

  it('mène l’ancien lien d’un joueur fusionné vers le joueur qui le remplace', async () => {
    openSite('/player/p-ancien', {
      players: { 'p-lanterne': lanterne },
      merged: { 'p-ancien': 'p-lanterne' },
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Lanterne' })).toBeDefined();
    expect(screen.getByTestId('address').textContent).toBe('/player/p-lanterne');
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
    expect(screen.getByText('4 W · 1 L')).toBeDefined();
  });
});

describe('pourquoi cette note', () => {
  it('dit ce que chaque sous-note apporte, et retrouve la note', async () => {
    openSite('/player/p-lanterne', { players: { 'p-lanterne': lanterne } });

    const section = await screen.findByRole('region', { name: 'Pourquoi cette note' });
    expect(section.textContent).toContain('32,55 points');
    expect(section.textContent).toContain('23,80 points');
    expect(section.textContent).toContain('24,00 points');
    expect(section.textContent).toContain('Ensemble : 80,35, arrondi à 80.');
  });

  it('dit de combien la fiabilité a tiré les statistiques d’un joueur qui a peu de parties', async () => {
    openSite('/player/p-lanterne', { players: { 'p-lanterne': lanterne } });

    const section = await screen.findByRole('region', { name: 'Pourquoi cette note' });
    expect(section.textContent).toContain('KDA 7,9 → 4,6');
    expect(section.textContent).toContain('ses statistiques comptent pour 33 %');
    expect(section.textContent).toContain('ses victoires de 80 % à 60 %');
  });

  it('montre en retrait les règles qui n’ont rien changé', async () => {
    openSite('/player/p-lanterne', { players: { 'p-lanterne': lanterne } });

    await screen.findByRole('region', { name: 'Pourquoi cette note' });
    const off = [...document.querySelectorAll('.why-rule.off .why-rule-title')].map(
      (r) => r.textContent,
    );
    expect(off).toEqual(['Prestige des éditions', 'Plafond du KDA', 'Plancher à 60']);
    const titles = [...document.querySelectorAll('.why-rule-title')].map((r) => r.textContent);
    expect(titles).toEqual([
      'Comparé aux autres junglers',
      'Prestige des éditions',
      'Plafond du KDA',
      'Peu de parties : prudence',
      'Plancher à 60',
    ]);
  });

  it('donne l’écart au palier suivant', async () => {
    openSite('/player/p-lanterne', { players: { 'p-lanterne': lanterne } });

    expect(await screen.findByText('10 points avant le palier Élite')).toBeDefined();
  });

  it('existe aussi en anglais', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB');
    openSite('/player/p-lanterne', { players: { 'p-lanterne': lanterne } });

    const section = await screen.findByRole('region', { name: 'Why this rating' });
    expect(section.textContent).toContain('10 points to reach Elite');
  });

  it('n’apparaît pas pour un joueur sans partie dans la saison', async () => {
    openSite('/player/p-vigie', {
      players: {
        'p-vigie': { profile: aProfile({ nickname: 'Vigie', season: null }), matches: [] },
      },
    });

    await screen.findByText(/Pas encore de partie cette saison/);
    expect(screen.queryByRole('region', { name: 'Pourquoi cette note' })).toBeNull();
  });

  it('explique une note remontée au plancher de 60 (joueur F de la spec)', async () => {
    // 3 parties en JGL, 1 victoire, 17 / 29 / 24 : le calcul donne 56.
    const breakdown = explainRating(
      [0, 1, 2].map((i) => ({
        role: 'JGL' as const,
        result: i === 0 ? ('win' as const) : ('loss' as const),
        kills: i === 0 ? 17 : 0,
        deaths: i === 0 ? 29 : 0,
        assists: i === 0 ? 24 : 0,
        weight: 1,
      })),
    );
    const base = aProfile();
    const season = base.season;
    if (!season) throw new Error('La fiche de test a une saison.');
    openSite('/player/p-f', {
      players: {
        'p-f': {
          profile: { ...base, season: { ...season, rating: 60, tier: 'bronze', breakdown } },
          matches: [],
        },
      },
    });

    const section = await screen.findByRole('region', { name: 'Pourquoi cette note' });
    expect(section.textContent).toContain('arrondi à 56.');
    expect(section.textContent).toContain('Le calcul donnait 56. Aucune carte ne descend sous 60.');
    expect(section.textContent).toContain('10 points avant le palier Argent');
  });
});
