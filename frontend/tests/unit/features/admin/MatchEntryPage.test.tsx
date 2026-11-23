import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminSource } from '#src/data/admin-source.ts';
import type { AuthSource, SignedInUser } from '#src/data/auth-source.ts';
import type { EditionForm } from '#src/features/admin/edition-form.ts';
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
const ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'] as const;

function authAs(user: SignedInUser | null): AuthSource {
  return {
    currentUser: () => Promise.resolve(user),
    signIn: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
  };
}

const PLAYERS = Array.from({ length: 10 }, (_, i) => ({
  id: `p-${String(i)}`,
  nickname: `Joueur ${String(i)}`,
}));

const EDITION: NonNullable<EditionForm['edition']> = {
  name: 'IH #10',
  type: 'inhouse',
  date: '2026-11-27',
  seasonId: null,
  prestige: 'normal',
  location: null,
  url: null,
  description: null,
  arrakisWon: null,
  participantIds: [],
  version: 3,
  closedAt: null,
};

const IH: EditionForm = { seasons: [], players: PLAYERS, edition: EDITION };

function serving(form: EditionForm = IH) {
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
    createEdition: refused,
    updateEdition: refused,
    closeEdition: refused,
    recordMatch: vi.fn(() => Promise.resolve(2)),
    importDirectory: refused,
    importEdition: refused,
    archiveEdition: refused,
  } satisfies AdminSource;
}

/** Remplit toute la feuille : Joueur 0…4 côté A, 5…9 côté B. */
function fillSheet(): void {
  fireEvent.change(screen.getByLabelText('Durée (min:s)'), { target: { value: '32:10' } });
  const [teamA, teamB] = screen.getAllByLabelText('Équipe');
  if (!teamA || !teamB) throw new Error('Il faut deux champs Équipe.');
  fireEvent.change(teamA, { target: { value: 'Noxus' } });
  fireEvent.change(teamB, { target: { value: 'Ionia' } });
  ROLES.forEach((role, i) => {
    (['A', 'B'] as const).forEach((side, s) => {
      fireEvent.change(screen.getByLabelText(`Joueur ${role} ${side}`), {
        target: { value: `p-${String(i + s * 5)}` },
      });
      fireEvent.change(screen.getByLabelText(`Champion ${role} ${side}`), {
        target: { value: 'Ornn' },
      });
    });
  });
}

describe('la saisie d’un match', () => {
  it('s’ouvre depuis le formulaire de l’édition', async () => {
    openSite('/admin/editions/e-ih', { auth: authAs(ADMIN), admin: serving() });

    fireEvent.click(await screen.findByRole('link', { name: 'Saisir un match →' }));

    expect(screen.getByTestId('address').textContent).toBe('/admin/editions/e-ih/match');
  });

  it('enregistre une feuille complète en brouillon, à la version lue', async () => {
    const admin = serving();
    openSite('/admin/editions/e-ih/match', { auth: authAs(ADMIN), admin });

    await screen.findByRole('heading', { level: 1, name: 'Saisir un match · IH #10' });
    fillSheet();
    fireEvent.change(screen.getByLabelText('Kills TOP A'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Côté B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer en brouillon' }));

    expect(
      await screen.findByText(
        'Match 2 enregistré en brouillon : il sera visible après la publication.',
      ),
    ).toBeTruthy();
    const [editionId, version, match] = admin.recordMatch.mock.calls[0] as unknown as Parameters<
      AdminSource['recordMatch']
    >;
    expect([editionId, version]).toEqual(['e-ih', 3]);
    expect(match).toMatchObject({ durationSeconds: 1930, winner: 'B', teams: ['Noxus', 'Ionia'] });
    expect(match.lines[0]?.sides[0]).toEqual({
      playerId: 'p-0',
      champion: 'Ornn',
      kills: 4,
      deaths: 0,
      assists: 0,
      gold: 0,
    });
  });

  it('n’affiche aucune erreur sur une feuille vierge, avant le premier essai', async () => {
    openSite('/admin/editions/e-ih/match', { auth: authAs(ADMIN), admin: serving() });

    await screen.findByRole('heading', { level: 1, name: 'Saisir un match · IH #10' });

    expect(screen.queryByRole('list', { name: 'À corriger' })).toBeNull();
  });

  it('explique ce qui manque, et n’envoie rien tant que la feuille est incomplète', async () => {
    const admin = serving();
    openSite('/admin/editions/e-ih/match', { auth: authAs(ADMIN), admin });

    await screen.findByRole('heading', { level: 1, name: 'Saisir un match · IH #10' });
    fillSheet();
    fireEvent.change(screen.getByLabelText('Joueur MID B'), { target: { value: 'p-0' } });
    fireEvent.change(screen.getByLabelText('Champion ADC A'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Durée (min:s)'), { target: { value: '32' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer en brouillon' }));

    const problems = screen.getByRole('list', { name: 'À corriger' });
    expect(problems.textContent).toContain('La durée s’écrit en minutes et secondes');
    expect(problems.textContent).toContain('Aucun champion au ADC du côté A.');
    expect(problems.textContent).toContain('Joueur 0 est saisi deux fois.');
    expect(problems.textContent).toContain('Choisis le côté vainqueur.');
    expect(admin.recordMatch).not.toHaveBeenCalled();
  });

  it('dit qu’un événement externe n’a pas de match', async () => {
    openSite('/admin/editions/e-lan/match', {
      auth: authAs(ADMIN),
      admin: serving({ ...IH, edition: { ...EDITION, type: 'external_lan' } }),
    });

    expect(await screen.findByText('Un événement externe n’a pas de match.')).toBeTruthy();
  });

  it('renvoie un simple membre vers la connexion', async () => {
    openSite('/admin/editions/e-ih/match', {
      auth: authAs({ name: 'Lanterne', role: 'member', adminExpired: false }),
      admin: serving(),
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeTruthy();
  });
});
