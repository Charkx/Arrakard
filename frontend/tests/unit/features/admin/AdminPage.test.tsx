import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  seasonId: 's-3',
  seasonName: 'Saison 3',
  seasonStatus: 'open',
  closedAt: null,
  hasPublishedResults: true,
  hasPublishedFinal: false,
  draftCount: 2,
};

function authAs(user: SignedInUser | null, editions: AdminEdition[] = [LIGUE]): AuthSource {
  return {
    currentUser: () => Promise.resolve(user),
    signIn: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
    adminEditions: () => Promise.resolve(editions),
  };
}

const ADMIN: SignedInUser = { name: 'Kinox', role: 'admin', adminExpired: false };

describe('l’espace admin', () => {
  it('montre à un admin les éditions de la saison, avec leurs brouillons', async () => {
    openSite('/admin', { auth: authAs(ADMIN) });

    const season = await screen.findByRole('region', { name: 'Saison 3 · en cours' });
    const row = within(season).getByRole('row', { name: /Ligue D1 #4/ });
    expect(within(row).getByText('Ligue · Division 1')).toBeTruthy();
    expect(within(row).getByText('09/11/2026')).toBeTruthy();
    expect(within(row).getByText('2 brouillons')).toBeTruthy();
    expect(within(row).getByRole('link', { name: 'Ligue D1 #4' }).getAttribute('href')).toBe(
      '/event/e-ligue',
    );
    expect(screen.getByText('Connecté : Kinox · admin d’Arrakis')).toBeTruthy();
  });

  it('dit qu’il n’y a encore aucune édition', async () => {
    openSite('/admin', { auth: authAs(ADMIN, []) });

    expect(await screen.findByText('Aucune édition pour l’instant.')).toBeTruthy();
  });

  it.each([
    ['un visiteur', null],
    ['un simple membre', { name: 'Lanterne', role: 'member', adminExpired: false }],
    ['un admin non revérifié depuis 7 jours', { name: 'Kinox', role: 'admin', adminExpired: true }],
  ] as const)('renvoie %s vers la connexion', async (_case, user) => {
    openSite('/admin', { auth: authAs(user) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeTruthy();
    expect(screen.getByTestId('address').textContent).toBe('/login');
  });

  it('dit que les éditions n’ont pas pu être chargées', async () => {
    openSite('/admin', {
      auth: { ...authAs(ADMIN), adminEditions: () => Promise.reject(new Error('refusé')) },
    });

    expect(await screen.findByText('Impossible de charger les éditions.')).toBeTruthy();
  });
});
