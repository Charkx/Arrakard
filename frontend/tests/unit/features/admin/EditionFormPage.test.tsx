import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandFailed, type AdminSource } from '#src/data/admin-source.ts';
import type { AuthSource, SignedInUser } from '#src/data/auth-source.ts';
import type { EditionForm } from '#src/features/admin/edition-form.ts';
import { openSite } from '#support/render.tsx';

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-23T12:00:00Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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

const FORM: EditionForm = {
  edition: null,
  seasons: [
    { id: 's-3', name: 'Saison 3', status: 'open' },
    { id: 's-2', name: 'Saison 2', status: 'closed' },
  ],
  players: [
    { id: 'p-zephyr', nickname: 'Zéphyr' },
    { id: 'p-sirocco', nickname: 'Sirocco' },
  ],
};

const LAN: NonNullable<EditionForm['edition']> = {
  name: 'Gamers Assembly',
  type: 'external_lan',
  date: '2026-11-28',
  seasonId: null,
  prestige: 'normal',
  location: 'Poitiers',
  url: null,
  description: null,
  arrakisWon: null,
  participantIds: ['p-zephyr'],
  version: 4,
  closedAt: null,
};

/** Une source admin en mémoire : ce formulaire, et les commandes reçues. */
function serving(form: EditionForm = FORM) {
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
    profiles: refused,
    mergePlayers: refused,
    linkDiscordAccount: refused,
    editionForm: vi.fn(() => Promise.resolve(form)),
    createEdition: vi.fn(() => Promise.resolve('e-new')),
    updateEdition: vi.fn(() => Promise.resolve()),
    archiveEdition: vi.fn(() => Promise.resolve()),
    closeEdition: vi.fn(() => Promise.resolve()),
  } satisfies AdminSource;
}

describe('le formulaire d’édition', () => {
  it('s’ouvre depuis l’espace admin', async () => {
    openSite('/admin', { auth: authAs(ADMIN), admin: serving() });

    fireEvent.click(await screen.findByRole('link', { name: '+ Nouvelle édition' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Nouvelle édition' })).toBeTruthy();
  });

  it('crée une In House du jour dans la saison ouverte, puis ouvre sa page de modification', async () => {
    const admin = serving();
    openSite('/admin/editions/new', { auth: authAs(ADMIN), admin });

    fireEvent.change(await screen.findByLabelText('Nom'), { target: { value: 'IH #10' } });
    expect(screen.getByLabelText<HTMLInputElement>('Date').value).toBe('2026-11-23');
    expect(screen.queryByText('Participants')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’édition' }));

    await vi.waitFor(() => {
      expect(screen.getByTestId('address').textContent).toBe('/admin/editions/e-new');
    });
    expect(admin.createEdition).toHaveBeenCalledWith({
      name: 'IH #10',
      type: 'inhouse',
      date: '2026-11-23',
      seasonId: 's-3',
      prestige: 'normal',
      location: null,
      url: null,
      description: null,
      arrakisWon: null,
      participantIds: [],
    });
  });

  it('ne propose pas une saison clôturée', async () => {
    openSite('/admin/editions/new', { auth: authAs(ADMIN), admin: serving() });

    const closed = await screen.findByRole<HTMLOptionElement>('option', { name: 'Saison 2' });

    expect(closed.disabled).toBe(true);
  });

  it('ajoute les participants d’un événement externe, trouvés par leur pseudo', async () => {
    const admin = serving();
    openSite('/admin/editions/new', { auth: authAs(ADMIN), admin });

    fireEvent.change(await screen.findByLabelText('Nom'), { target: { value: 'Gamers Assembly' } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'external_lan' } });
    fireEvent.change(screen.getByLabelText('Chercher un joueur'), { target: { value: 'siro' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sirocco' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Arrakis a gagné' }));
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’édition' }));

    expect(admin.createEdition).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'external_lan',
        participantIds: ['p-sirocco'],
        arrakisWon: true,
      }),
    );
  });

  it('modifie une édition à la version lue', async () => {
    const admin = serving({ ...FORM, edition: LAN });
    openSite('/admin/editions/e-lan', { auth: authAs(ADMIN), admin });

    expect(await screen.findByRole('checkbox', { name: 'Zéphyr' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Lieu'), { target: { value: 'Futuroscope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(admin.editionForm).toHaveBeenCalledWith('e-lan');
    const { version: _version, closedAt: _closedAt, ...details } = LAN;
    expect(admin.updateEdition).toHaveBeenCalledWith('e-lan', 4, {
      ...details,
      location: 'Futuroscope',
    });
  });

  it('archive l’édition après confirmation, puis revient à l’espace admin', async () => {
    const admin = serving({ ...FORM, edition: LAN });
    openSite('/admin/editions/e-lan', { auth: authAs(ADMIN), admin });

    fireEvent.click(await screen.findByRole('button', { name: 'Archiver l’édition' }));
    expect(admin.archiveEdition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Oui, archiver' }));

    await vi.waitFor(() => {
      expect(screen.getByTestId('address').textContent).toBe('/admin');
    });
    expect(admin.archiveEdition).toHaveBeenCalledWith('e-lan', 4);
  });

  it('clôture l’édition après confirmation', async () => {
    const admin = serving({ ...FORM, edition: { ...LAN, type: 'tournament', participantIds: [] } });
    openSite('/admin/editions/e-tournoi', { auth: authAs(ADMIN), admin });

    fireEvent.click(await screen.findByRole('button', { name: 'Clôturer l’édition' }));
    expect(admin.closeEdition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Oui, clôturer' }));

    expect(admin.closeEdition).toHaveBeenCalledWith('e-tournoi', 4);
  });

  it('dit qu’une édition est clôturée, sans proposer de la clôturer encore', async () => {
    openSite('/admin/editions/e-tournoi', {
      auth: authAs(ADMIN),
      admin: serving({ ...FORM, edition: { ...LAN, closedAt: '2026-11-20T21:00:00.000Z' } }),
    });

    expect(await screen.findByText('Clôturée le 2026-11-20.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clôturer l’édition' })).toBeNull();
  });

  it('dit ce que le serveur a refusé', async () => {
    const admin = {
      ...serving({ ...FORM, edition: { ...LAN, type: 'inhouse', participantIds: [] } }),
      archiveEdition: () =>
        Promise.reject(new CommandFailed('Cette édition a des matchs : elle ne s’archive pas.')),
    };
    openSite('/admin/editions/e-ih', { auth: authAs(ADMIN), admin });

    fireEvent.click(await screen.findByRole('button', { name: 'Archiver l’édition' }));
    fireEvent.click(screen.getByRole('button', { name: 'Oui, archiver' }));

    expect(
      await screen.findByText(
        'Le serveur a refusé : Cette édition a des matchs : elle ne s’archive pas.',
      ),
    ).toBeTruthy();
  });

  it('dit qu’une édition introuvable ou archivée ne se modifie pas', async () => {
    openSite('/admin/editions/e-perdue', { auth: authAs(ADMIN), admin: serving() });

    expect(
      await screen.findByText('Cette édition n’existe pas, ou elle est archivée.'),
    ).toBeTruthy();
  });

  it('renvoie un simple membre vers la connexion', async () => {
    openSite('/admin/editions/new', {
      auth: authAs({ name: 'Lanterne', role: 'member', adminExpired: false }),
      admin: serving(),
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeTruthy();
  });

  it('dit que le formulaire n’a pas pu être chargé', async () => {
    openSite('/admin/editions/new', {
      auth: authAs(ADMIN),
      admin: { ...serving(), editionForm: () => Promise.reject(new Error('refusé')) },
    });

    expect(await screen.findByText('Impossible de charger le formulaire.')).toBeTruthy();
  });
});
