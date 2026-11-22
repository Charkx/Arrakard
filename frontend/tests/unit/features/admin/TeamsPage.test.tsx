import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandFailed, type AdminSource } from '#src/data/admin-source.ts';
import type { AuthSource, SignedInUser } from '#src/data/auth-source.ts';
import type { Rosters } from '#src/features/admin/teams.ts';
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

const ROSTERS: Rosters = {
  teams: [
    { id: 't-ark', tag: 'ARK', name: 'Arrakis', divisions: ['div1'] },
    { id: 't-vnt', tag: 'VNT', name: 'Vent du Sud', divisions: [] },
  ],
  players: [
    { id: 'p-sirocco', nickname: 'Sirocco', place: { teamId: 't-ark', status: 'sub' } },
    { id: 'p-zephyr', nickname: 'Zéphyr', place: { teamId: 't-ark', status: 'starter' } },
    { id: 'p-libre', nickname: 'Libre', place: null },
  ],
};

/** Une source admin en mémoire : ces rosters, et les commandes reçues. */
function serving(rosters: Rosters = ROSTERS) {
  const refused = () => Promise.reject(new Error('Hors sujet.'));
  return {
    editions: refused,
    activeSeason: refused,
    openSeason: refused,
    closeSeason: refused,
    rosters: vi.fn(() => Promise.resolve(rosters)),
    createTeam: vi.fn(() => Promise.resolve()),
    transferPlayer: vi.fn(() => Promise.resolve()),
    archiveTeam: vi.fn(() => Promise.resolve()),
  } satisfies AdminSource;
}

describe('la page des équipes', () => {
  it('montre chaque équipe et son roster, titulaires d’abord', async () => {
    openSite('/admin/teams', { auth: authAs(ADMIN), admin: serving() });

    const ark = await screen.findByRole('region', { name: 'ARK · Arrakis' });
    expect(
      within(ark)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['ZéphyrTitulaire', 'SiroccoRemplaçant']);
    const vnt = screen.getByRole('region', { name: 'VNT · Vent du Sud' });
    expect(within(vnt).getByText('Aucun joueur.')).toBeTruthy();
  });

  it('s’ouvre depuis l’espace admin', async () => {
    const admin = {
      ...serving(),
      editions: () => Promise.resolve([]),
      activeSeason: () => Promise.resolve(null),
    };
    openSite('/admin', { auth: authAs(ADMIN), admin });

    fireEvent.click(await screen.findByRole('link', { name: 'Équipes et rosters →' }));

    expect(screen.getByTestId('address').textContent).toBe('/admin/teams');
  });

  it('renvoie un simple membre vers la connexion', async () => {
    openSite('/admin/teams', {
      auth: authAs({ name: 'Lanterne', role: 'member', adminExpired: false }),
      admin: serving(),
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeTruthy();
  });

  it('dit que les équipes n’ont pas pu être chargées', async () => {
    openSite('/admin/teams', {
      auth: authAs(ADMIN),
      admin: { ...serving(), rosters: () => Promise.reject(new Error('refusé')) },
    });

    expect(await screen.findByText('Impossible de charger les équipes.')).toBeTruthy();
  });

  it('dit qu’il n’y a encore aucune équipe', async () => {
    openSite('/admin/teams', { auth: authAs(ADMIN), admin: serving({ teams: [], players: [] }) });

    expect(await screen.findByText('Aucune équipe pour l’instant.')).toBeTruthy();
  });

  it('crée une équipe avec son tag, son nom et ses divisions, puis recharge', async () => {
    const admin = serving();
    openSite('/admin/teams', { auth: authAs(ADMIN), admin });

    fireEvent.change(await screen.findByLabelText('Tag (2 à 4 lettres)'), {
      target: { value: 'blb' },
    });
    fireEvent.change(screen.getByLabelText('Nom de l’équipe'), { target: { value: 'Les Blés' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Div 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’équipe' }));

    expect(admin.createTeam).toHaveBeenCalledWith('BLB', 'Les Blés', ['div2']);
    await vi.waitFor(() => {
      expect(admin.rosters).toHaveBeenCalledTimes(2);
    });
  });

  it('transfère un joueur vers une équipe, avec son statut', async () => {
    const admin = serving();
    openSite('/admin/teams', { auth: authAs(ADMIN), admin });

    fireEvent.change(await screen.findByLabelText('Joueur'), { target: { value: 'p-libre' } });
    fireEvent.change(screen.getByLabelText('Vers'), { target: { value: 't-vnt' } });
    fireEvent.change(screen.getByLabelText('Statut'), { target: { value: 'coach' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transférer' }));

    expect(admin.transferPlayer).toHaveBeenCalledWith('p-libre', {
      teamId: 't-vnt',
      status: 'coach',
    });
  });

  it('montre l’équipe actuelle de chaque joueur dans la liste', async () => {
    openSite('/admin/teams', { auth: authAs(ADMIN), admin: serving() });

    const players = within(await screen.findByLabelText('Joueur'));
    expect(players.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Sirocco (ARK · Remplaçant)',
      'Zéphyr (ARK · Titulaire)',
      'Libre (Sans équipe)',
    ]);
  });

  it('fait quitter son équipe à un joueur, sans statut', async () => {
    const admin = serving();
    openSite('/admin/teams', { auth: authAs(ADMIN), admin });

    fireEvent.change(await screen.findByLabelText('Joueur'), { target: { value: 'p-zephyr' } });
    fireEvent.change(screen.getByLabelText('Vers'), { target: { value: 'none' } });
    expect(screen.getByLabelText<HTMLSelectElement>('Statut').disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Transférer' }));

    expect(admin.transferPlayer).toHaveBeenCalledWith('p-zephyr', null);
  });

  it('dit ce que le serveur a refusé', async () => {
    const admin = {
      ...serving(),
      transferPlayer: () => Promise.reject(new CommandFailed('Le joueur est déjà à cette place.')),
    };
    openSite('/admin/teams', { auth: authAs(ADMIN), admin });

    fireEvent.click(await screen.findByRole('button', { name: 'Transférer' }));

    expect(
      await screen.findByText('Le serveur a refusé : Le joueur est déjà à cette place.'),
    ).toBeTruthy();
  });

  it('archive une équipe après confirmation', async () => {
    const admin = serving();
    openSite('/admin/teams', { auth: authAs(ADMIN), admin });

    const ark = await screen.findByRole('region', { name: 'ARK · Arrakis' });
    fireEvent.click(within(ark).getByRole('button', { name: 'Archiver' }));
    expect(
      within(ark).getByText(/Archiver ARK \? Ses joueurs la quittent aujourd’hui/),
    ).toBeTruthy();
    expect(admin.archiveTeam).not.toHaveBeenCalled();
    fireEvent.click(within(ark).getByRole('button', { name: 'Oui, archiver' }));

    expect(admin.archiveTeam).toHaveBeenCalledWith('t-ark');
  });

  it('après un archivage, ne propose plus de transférer vers l’équipe archivée', async () => {
    const admin = serving();
    admin.rosters
      .mockResolvedValueOnce(ROSTERS)
      .mockResolvedValue({ ...ROSTERS, teams: ROSTERS.teams.slice(1) });
    openSite('/admin/teams', { auth: authAs(ADMIN), admin });

    fireEvent.change(await screen.findByLabelText('Vers'), { target: { value: 't-ark' } });
    const ark = screen.getByRole('region', { name: 'ARK · Arrakis' });
    fireEvent.click(within(ark).getByRole('button', { name: 'Archiver' }));
    fireEvent.click(within(ark).getByRole('button', { name: 'Oui, archiver' }));
    await vi.waitFor(() => {
      expect(screen.queryByRole('region', { name: 'ARK · Arrakis' })).toBeNull();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Transférer' }));

    expect(admin.transferPlayer).toHaveBeenCalledWith('p-sirocco', {
      teamId: 't-vnt',
      status: 'starter',
    });
  });

  it('annule l’archivage sans rien envoyer', async () => {
    const admin = serving();
    openSite('/admin/teams', { auth: authAs(ADMIN), admin });

    const ark = await screen.findByRole('region', { name: 'ARK · Arrakis' });
    fireEvent.click(within(ark).getByRole('button', { name: 'Archiver' }));
    fireEvent.click(within(ark).getByRole('button', { name: 'Annuler' }));

    expect(within(ark).getByRole('button', { name: 'Archiver' })).toBeTruthy();
    expect(admin.archiveTeam).not.toHaveBeenCalled();
  });
});
