import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandFailed, type AdminSource } from '#src/data/admin-source.ts';
import type { AuthSource, SignedInUser } from '#src/data/auth-source.ts';
import type { AdminProfile } from '#src/features/admin/profiles.ts';
import { openSite } from '#support/render.tsx';

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

const ADMIN: SignedInUser = { name: 'Kinox', role: 'admin', adminExpired: false };

function authAs(user: SignedInUser | null): AuthSource {
  return {
    currentUser: () => Promise.resolve(user),
    signIn: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
  };
}

const PROFILES: AdminProfile[] = [
  { id: 'p-brise', nickname: 'Brise', discordUserId: null },
  { id: 'p-zephyr', nickname: 'Zéphyr', discordUserId: '123456789012345678' },
];

/** Une source admin en mémoire : ces profils, et les commandes reçues. */
function serving(profiles: AdminProfile[] = PROFILES) {
  const refused = () => Promise.reject(new Error('Hors sujet.'));
  return {
    editions: () => Promise.resolve([]),
    activeSeason: () => Promise.resolve(null),
    openSeason: refused,
    closeSeason: refused,
    rosters: refused,
    createTeam: refused,
    transferPlayer: refused,
    archiveTeam: refused,
    profiles: vi.fn(() => Promise.resolve(profiles)),
    mergePlayers: vi.fn(() => Promise.resolve()),
    linkDiscordAccount: vi.fn(() => Promise.resolve()),
    editionForm: () => Promise.reject(new Error('Hors sujet.')),
    createEdition: () => Promise.reject(new Error('Hors sujet.')),
    updateEdition: () => Promise.reject(new Error('Hors sujet.')),
    archiveEdition: () => Promise.reject(new Error('Hors sujet.')),
    closeEdition: () => Promise.reject(new Error('Hors sujet.')),
    recordMatch: () => Promise.reject(new Error('Hors sujet.')),
  } satisfies AdminSource;
}

describe('la page des profils', () => {
  it('s’ouvre depuis l’espace admin', async () => {
    openSite('/admin', { auth: authAs(ADMIN), admin: serving() });

    fireEvent.click(await screen.findByRole('link', { name: 'Profils et Discord →' }));

    expect(screen.getByTestId('address').textContent).toBe('/admin/profiles');
  });

  it('renvoie un simple membre vers la connexion', async () => {
    openSite('/admin/profiles', {
      auth: authAs({ name: 'Lanterne', role: 'member', adminExpired: false }),
      admin: serving(),
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeTruthy();
  });

  it('dit que les profils n’ont pas pu être chargés', async () => {
    openSite('/admin/profiles', {
      auth: authAs(ADMIN),
      admin: { ...serving(), profiles: () => Promise.reject(new Error('refusé')) },
    });

    expect(await screen.findByText('Impossible de charger les profils.')).toBeTruthy();
  });

  it('fusionne un double après confirmation', async () => {
    const admin = serving();
    openSite('/admin/profiles', { auth: authAs(ADMIN), admin });

    const merge = await screen.findByRole('region', { name: 'Fusionner deux profils' });
    fireEvent.change(within(merge).getByLabelText('Profil en double'), {
      target: { value: 'p-brise' },
    });
    fireEvent.change(within(merge).getByLabelText('Profil conservé'), {
      target: { value: 'p-zephyr' },
    });
    fireEvent.click(within(merge).getByRole('button', { name: 'Fusionner' }));
    expect(within(merge).getByText(/Fusionner Brise dans Zéphyr \?/)).toBeTruthy();
    expect(admin.mergePlayers).not.toHaveBeenCalled();
    fireEvent.click(within(merge).getByRole('button', { name: 'Oui, fusionner' }));

    expect(admin.mergePlayers).toHaveBeenCalledWith('p-brise', 'p-zephyr');
  });

  it('ne propose pas de fusionner un profil avec lui-même', async () => {
    openSite('/admin/profiles', { auth: authAs(ADMIN), admin: serving() });

    const merge = await screen.findByRole('region', { name: 'Fusionner deux profils' });

    expect(
      within(merge).getByRole<HTMLButtonElement>('button', { name: 'Fusionner' }).disabled,
    ).toBe(true);
  });

  it('annule la fusion sans rien envoyer', async () => {
    const admin = serving();
    openSite('/admin/profiles', { auth: authAs(ADMIN), admin });

    const merge = await screen.findByRole('region', { name: 'Fusionner deux profils' });
    fireEvent.change(within(merge).getByLabelText('Profil conservé'), {
      target: { value: 'p-zephyr' },
    });
    fireEvent.click(within(merge).getByRole('button', { name: 'Fusionner' }));
    fireEvent.click(within(merge).getByRole('button', { name: 'Annuler' }));

    expect(within(merge).getByRole('button', { name: 'Fusionner' })).toBeTruthy();
    expect(admin.mergePlayers).not.toHaveBeenCalled();
  });

  it('lie une carte à un compte Discord', async () => {
    const admin = serving();
    openSite('/admin/profiles', { auth: authAs(ADMIN), admin });

    const discord = await screen.findByRole('region', { name: 'Lier une carte à Discord' });
    expect(
      within(discord).getByText('Cette carte n’est liée à aucun compte Discord.'),
    ).toBeTruthy();
    fireEvent.change(within(discord).getByLabelText('Identifiant Discord (17 à 20 chiffres)'), {
      target: { value: ' 876543210987654321 ' },
    });
    fireEvent.click(within(discord).getByRole('button', { name: 'Lier' }));

    expect(admin.linkDiscordAccount).toHaveBeenCalledWith('p-brise', '876543210987654321');
  });

  it('délie une carte liée', async () => {
    const admin = serving();
    openSite('/admin/profiles', { auth: authAs(ADMIN), admin });

    const discord = await screen.findByRole('region', { name: 'Lier une carte à Discord' });
    fireEvent.change(within(discord).getByLabelText('Joueur'), { target: { value: 'p-zephyr' } });
    expect(
      within(discord).getByText('Cette carte est liée au compte Discord 123456789012345678.'),
    ).toBeTruthy();
    fireEvent.click(within(discord).getByRole('button', { name: 'Délier' }));

    expect(admin.linkDiscordAccount).toHaveBeenCalledWith('p-zephyr', null);
  });

  it('dit ce que le serveur a refusé', async () => {
    const admin = {
      ...serving(),
      linkDiscordAccount: () =>
        Promise.reject(new CommandFailed('Ce compte Discord est déjà lié à une autre carte.')),
    };
    openSite('/admin/profiles', { auth: authAs(ADMIN), admin });

    const discord = await screen.findByRole('region', { name: 'Lier une carte à Discord' });
    fireEvent.change(within(discord).getByLabelText('Identifiant Discord (17 à 20 chiffres)'), {
      target: { value: '123456789012345678' },
    });
    fireEvent.click(within(discord).getByRole('button', { name: 'Lier' }));

    expect(
      await screen.findByText(
        'Le serveur a refusé : Ce compte Discord est déjà lié à une autre carte.',
      ),
    ).toBeTruthy();
  });
});
