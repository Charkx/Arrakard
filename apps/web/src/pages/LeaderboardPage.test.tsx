import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anEntry, openSite } from '../testing/render.tsx';

/** Les noms du tableau, dans l'ordre affiché. */
async function namesInTable() {
  const table = await screen.findByRole('table');
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.querySelector('.lb-name')?.textContent);
}

const season = (entries: ReturnType<typeof anEntry>[]) => ({ seasonName: 'Saison 3', entries });

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('la page Classement', () => {
  it('range les joueurs comme le domaine : note, puis victoires pour départager', async () => {
    openSite(
      '/leaderboard',
      season([
        anEntry({ playerId: 'a', nickname: 'Amarre', rating: 70, winrate: 50 }),
        anEntry({ playerId: 'b', nickname: 'Boussole', rating: 88, winrate: 50 }),
        anEntry({ playerId: 'c', nickname: 'Cabestan', rating: 70, winrate: 65 }),
      ]),
    );

    expect(await namesInTable()).toEqual(['Boussole', 'Cabestan', 'Amarre']);
  });

  it('n’affiche ni les joueurs archivés, ni ceux qui ont moins de 5 parties', async () => {
    openSite(
      '/leaderboard',
      season([
        anEntry({ playerId: 'a', nickname: 'Amarre' }),
        anEntry({ playerId: 'e', nickname: 'Épave', archived: true }),
        anEntry({ playerId: 'v', nickname: 'Vigie', games: 4 }),
      ]),
    );

    expect(await namesInTable()).toEqual(['Amarre']);
  });

  it('dit le nom de la saison en cours', async () => {
    openSite('/leaderboard', season([anEntry()]));

    expect(await screen.findByText('Saison 3 · en cours')).toBeDefined();
  });

  it('montre la note, le palier, le rôle et l’équipe de chaque joueur', async () => {
    openSite(
      '/leaderboard',
      season([anEntry({ rating: 84, tier: 'gold', role: 'ADC', teamTag: 'MAR' })]),
    );

    const row = (await screen.findAllByRole('row'))[1];
    expect(row?.textContent).toContain('84');
    expect(row?.textContent).toContain('Or');
    expect(row?.textContent).toContain('MAR · ADC');
  });

  it('montre de combien de places un joueur a bougé depuis la dernière édition', async () => {
    openSite(
      '/leaderboard',
      season([
        anEntry({ playerId: 'a', nickname: 'Amarre', rating: 80, previousRating: 70 }),
        anEntry({ playerId: 'b', nickname: 'Boussole', rating: 75, previousRating: 78 }),
      ]),
    );

    expect(await screen.findByTitle('Gagne 1 place(s)')).toBeDefined();
    expect(screen.getByTitle('Perd 1 place(s)')).toBeDefined();
  });

  it('met les trois premiers sur le podium, avec leur carte', async () => {
    openSite(
      '/leaderboard',
      season([
        anEntry({ playerId: 'a', nickname: 'Amarre', rating: 90, tier: 'elite' }),
        anEntry({ playerId: 'b', nickname: 'Boussole', rating: 85 }),
        anEntry({ playerId: 'c', nickname: 'Cabestan', rating: 80 }),
        anEntry({ playerId: 'd', nickname: 'Drisse', rating: 70 }),
      ]),
    );

    const podium = (await screen.findByRole('heading', { name: 'Podium' })).parentElement;
    const cards = podium?.querySelectorAll('.pch-nm');
    expect([...(cards ?? [])].map((c) => c.textContent).sort()).toEqual([
      'Amarre',
      'Boussole',
      'Cabestan',
    ]);
  });
});

describe('les filtres du classement', () => {
  const players = season([
    anEntry({ playerId: 'a', nickname: 'Amarre', role: 'SUP', divisions: ['div1'] }),
    anEntry({ playerId: 'b', nickname: 'Boussole', role: 'MID', divisions: ['div2'] }),
    anEntry({ playerId: 'c', nickname: 'Cabestan', role: 'SUP', divisions: ['div2'] }),
  ]);

  it('le filtre de rôle réduit la liste et s’inscrit dans l’adresse', async () => {
    openSite('/leaderboard', players);
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: 'SUP' }));

    expect(await namesInTable()).toEqual(['Amarre', 'Cabestan']);
    expect(screen.getByTestId('address').textContent).toBe('/leaderboard?role=SUP');
  });

  it('le filtre de division réduit la liste et s’inscrit dans l’adresse', async () => {
    openSite('/leaderboard', players);
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: 'Div 2' }));

    expect(await namesInTable()).toEqual(['Boussole', 'Cabestan']);
    expect(screen.getByTestId('address').textContent).toBe('/leaderboard?div=div2');
  });

  it('une adresse partagée rouvre la page avec ses filtres', async () => {
    openSite('/leaderboard?div=div2&role=SUP', players);

    expect(await namesInTable()).toEqual(['Cabestan']);
    expect(screen.getByRole('button', { name: 'SUP' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('dit quand aucun joueur ne correspond aux filtres', async () => {
    openSite('/leaderboard?role=TOP', players);

    expect(await screen.findByText(/Aucun joueur ne correspond aux filtres/)).toBeDefined();
  });

  it('trier par KDA s’inscrit dans l’adresse', async () => {
    openSite('/leaderboard', players);
    await screen.findByRole('table');

    fireEvent.click(screen.getByRole('button', { name: /KDA/ }));

    expect(screen.getByTestId('address').textContent).toBe('/leaderboard?sort=kda');
  });
});

describe('les autres états de la page', () => {
  it('ouvre le profil d’un joueur, à l’adresse de la v1', async () => {
    openSite('/leaderboard', season([anEntry({ playerId: 'p-1', nickname: 'Amarre' })]));

    fireEvent.click(await screen.findByRole('row', { name: 'Voir le profil de Amarre' }));

    expect(screen.getByTestId('address').textContent).toBe('/player/p-1');
  });

  it('dit quand la saison n’a encore aucun joueur classé', async () => {
    openSite('/leaderboard', season([]));

    expect(await screen.findByText(/Il faut 5 parties pour apparaître/)).toBeDefined();
  });

  it('dit quand aucune saison n’est en cours', async () => {
    openSite('/leaderboard', { seasonName: null, entries: [] });

    expect(await screen.findByText('Aucune saison en cours')).toBeDefined();
  });

  it('dit quand le classement n’a pas pu être chargé', async () => {
    openSite('/leaderboard', 'fails');

    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas pu être chargé');
  });
});
