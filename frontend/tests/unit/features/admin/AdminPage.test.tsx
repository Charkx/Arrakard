import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandFailed, type ActiveSeason, type AdminSource } from '#src/data/admin-source.ts';
import type { AuthSource, SignedInUser } from '#src/data/auth-source.ts';
import type { AdminEdition } from '#src/features/admin/admin.ts';
import { openSite } from '#support/render.tsx';

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

const LIGUE: AdminEdition = {
  editionId: 'e-ligue',
  name: 'Ligue D1 #4',
  type: 'league_div1',
  date: '2026-11-09',
  season: { id: 's-3', name: 'Saison 3', status: 'open' },
  closedAt: null,
  hasPublishedResults: true,
  hasPublishedFinal: false,
  draftCount: 2,
};

function authAs(user: SignedInUser | null): AuthSource {
  return {
    currentUser: () => Promise.resolve(user),
    signIn: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
  };
}

/** Une source admin en mémoire : ses éditions, sa saison active, et les commandes reçues. */
function serving(
  editions: AdminEdition[] = [LIGUE],
  active: ActiveSeason | null = { id: 's-3', name: 'Saison 3' },
) {
  let season = active;
  return {
    editions: vi.fn(() => Promise.resolve(editions)),
    activeSeason: vi.fn(() => Promise.resolve(season)),
    openSeason: vi.fn((name: string) => {
      season = { id: 's-new', name: name.trim() };
      return Promise.resolve();
    }),
    closeSeason: vi.fn(() => {
      season = null;
      return Promise.resolve();
    }),
    rosters: () => Promise.resolve({ teams: [], players: [] }),
    createTeam: () => Promise.resolve(),
    transferPlayer: () => Promise.resolve(),
    archiveTeam: () => Promise.resolve(),
    profiles: () => Promise.resolve([]),
    mergePlayers: () => Promise.resolve(),
    linkDiscordAccount: () => Promise.resolve(),
  } satisfies AdminSource;
}

const ADMIN: SignedInUser = { name: 'Kinox', role: 'admin', adminExpired: false };

describe('l’espace admin', () => {
  it('montre à un admin les éditions de la saison, avec leurs brouillons', async () => {
    openSite('/admin', { auth: authAs(ADMIN), admin: serving() });

    const season = await screen.findByRole('region', { name: 'Saison 3 · en cours' });
    const row = within(season).getByRole('row', { name: /Ligue D1 #4/ });
    expect(within(row).getByRole('cell', { name: 'Ligue · Division 1' })).toBeTruthy();
    expect(within(row).getByText('09/11/2026')).toBeTruthy();
    expect(within(row).getByText('2 brouillons')).toBeTruthy();
    expect(within(row).getByRole('link', { name: 'Ligue D1 #4' }).getAttribute('href')).toBe(
      '/event/e-ligue',
    );
    expect(screen.getByText('Connecté : Kinox · admin d’Arrakis')).toBeTruthy();
  });

  it('dit qu’il n’y a encore aucune édition', async () => {
    openSite('/admin', { auth: authAs(ADMIN), admin: serving([]) });

    expect(await screen.findByText('Aucune édition pour l’instant.')).toBeTruthy();
  });

  it.each([
    ['un visiteur', null],
    ['un simple membre', { name: 'Lanterne', role: 'member', adminExpired: false }],
    ['un admin non revérifié depuis 7 jours', { name: 'Kinox', role: 'admin', adminExpired: true }],
  ] as const)('renvoie %s vers la connexion', async (_case, user) => {
    openSite('/admin', { auth: authAs(user), admin: serving() });

    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeTruthy();
    expect(screen.getByTestId('address').textContent).toBe('/login');
  });

  it('dit que les éditions n’ont pas pu être chargées', async () => {
    openSite('/admin', {
      auth: authAs(ADMIN),
      admin: { ...serving(), editions: () => Promise.reject(new Error('refusé')) },
    });

    expect(await screen.findByText('Impossible de charger les éditions.')).toBeTruthy();
  });

  it('clôture la saison active après confirmation, puis propose d’ouvrir la suivante', async () => {
    const admin = serving();
    openSite('/admin', { auth: authAs(ADMIN), admin });

    fireEvent.click(await screen.findByRole('button', { name: 'Clôturer la saison' }));
    expect(screen.getByText(/Clôturer Saison 3 \? Ses notes seront figées/)).toBeTruthy();
    expect(admin.closeSeason).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Oui, clôturer' }));

    expect(await screen.findByText(/Aucune saison n’est ouverte/)).toBeTruthy();
    expect(admin.closeSeason).toHaveBeenCalledWith('s-3');
  });

  it('annule la clôture sans rien envoyer', async () => {
    const admin = serving();
    openSite('/admin', { auth: authAs(ADMIN), admin });

    fireEvent.click(await screen.findByRole('button', { name: 'Clôturer la saison' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.getByText('Saison 3 est la saison active.')).toBeTruthy();
    expect(admin.closeSeason).not.toHaveBeenCalled();
  });

  it('ouvre une saison quand aucune ne l’est', async () => {
    const admin = serving([LIGUE], null);
    openSite('/admin', { auth: authAs(ADMIN), admin });

    fireEvent.change(await screen.findByLabelText('Nom de la saison'), {
      target: { value: ' Saison 4 ' },
    });
    fireEvent.change(screen.getByLabelText('Année'), { target: { value: '2027' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la saison' }));

    expect(await screen.findByText('Saison 4 est la saison active.')).toBeTruthy();
    // Le serveur retire les espaces autour du nom (contrat `openSeasonRequest`).
    expect(admin.openSeason).toHaveBeenCalledWith(' Saison 4 ', 2027);
  });

  it('dit ce que le serveur a refusé', async () => {
    const admin = {
      ...serving([LIGUE], null),
      openSeason: () =>
        Promise.reject(new CommandFailed('Une saison s’appelle déjà « Saison 3 ».')),
    };
    openSite('/admin', { auth: authAs(ADMIN), admin });

    fireEvent.change(await screen.findByLabelText('Nom de la saison'), {
      target: { value: 'Saison 3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la saison' }));

    expect(
      await screen.findByText('Le serveur a refusé : Une saison s’appelle déjà « Saison 3 ».'),
    ).toBeTruthy();
  });
});
