import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSource, SignedInUser } from '#src/data/auth-source.ts';
import { openSite } from '#support/render.tsx';

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

/** Une connexion simulée : cet utilisateur est connecté, ou personne. */
function fakeAuth(user: SignedInUser | null | 'fails') {
  const auth = {
    currentUser: vi.fn(() =>
      user === 'fails' ? Promise.reject(new Error('Discord injoignable')) : Promise.resolve(user),
    ),
    signIn: vi.fn(() => Promise.resolve()),
    signOut: vi.fn(() => Promise.resolve()),
  } satisfies AuthSource;
  return auth;
}

describe('la page de connexion', () => {
  it('propose de se connecter avec Discord à un visiteur', async () => {
    const auth = fakeAuth(null);
    openSite('/login', { auth });

    fireEvent.click(await screen.findByRole('button', { name: 'Se connecter avec Discord' }));

    expect(auth.signIn).toHaveBeenCalledOnce();
  });

  it('dit à un admin qu’il est admin de l’organisation', async () => {
    openSite('/login', { auth: fakeAuth({ name: 'Kinox', role: 'admin', adminExpired: false }) });

    expect(await screen.findByText('Connecté en tant que Kinox.')).toBeTruthy();
    expect(screen.getByText('Tu es admin d’Arrakis.')).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Ouvrir l’espace admin' }));
    expect(screen.getByTestId('address').textContent).toBe('/admin');
  });

  it('dit à un joueur du serveur qu’il est membre, sans droits d’admin', async () => {
    openSite('/login', {
      auth: fakeAuth({ name: 'Lanterne', role: 'member', adminExpired: false }),
    });

    expect(await screen.findByText('Tu es membre d’Arrakis, sans droits d’admin.')).toBeTruthy();
  });

  it('dit à un compte hors du serveur Discord qu’il n’est pas membre', async () => {
    openSite('/login', { auth: fakeAuth({ name: 'Visiteur', role: null, adminExpired: false }) });

    expect(await screen.findByText(/pas sur le serveur Discord d’Arrakis/)).toBeTruthy();
  });

  it('demande à un admin non revérifié depuis 7 jours de se reconnecter', async () => {
    const auth = fakeAuth({ name: 'Kinox', role: 'admin', adminExpired: true });
    openSite('/login', { auth });

    expect(await screen.findByText(/pas été revérifiés depuis 7 jours/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter avec Discord' }));
    expect(auth.signIn).toHaveBeenCalledOnce();
  });

  it('déconnecte, puis propose de se reconnecter', async () => {
    const auth = fakeAuth({ name: 'Kinox', role: 'admin', adminExpired: false });
    openSite('/login', { auth });

    fireEvent.click(await screen.findByRole('button', { name: 'Se déconnecter' }));

    expect(await screen.findByRole('button', { name: 'Se connecter avec Discord' })).toBeTruthy();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it('dit que la connexion a échoué, et propose de réessayer ou de se déconnecter', async () => {
    const auth = fakeAuth('fails');
    openSite('/login', { auth });

    expect(await screen.findByText('La connexion a échoué.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter avec Discord' }));
    expect(auth.signIn).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it('est accessible depuis la barre de navigation', async () => {
    openSite('/leaderboard', { auth: fakeAuth(null) });

    fireEvent.click(screen.getByRole('link', { name: 'Connexion' }));

    expect(screen.getByTestId('address').textContent).toBe('/login');
    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeTruthy();
  });
});
