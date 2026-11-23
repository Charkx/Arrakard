import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandFailed, type AdminSource } from '#src/data/admin-source.ts';
import type { EditionForm } from '#src/features/admin/edition-form.ts';
import type { DirectoryEntry } from '#src/features/admin/import-review.ts';
import { openSite } from '#support/render.tsx';
import { aMatchWorkbook, aWorkbook } from '#support/workbook.ts';

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

const ADMIN = {
  currentUser: () =>
    Promise.resolve({ name: 'Kinox', role: 'admin', adminExpired: false } as const),
  signIn: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
};

/** Une journée de ligue sans match, à la version 3. */
const DAY: NonNullable<EditionForm['edition']> = {
  name: 'Ligue D1, journée 3',
  type: 'league_div1',
  date: '2026-11-20',
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
const FORM: EditionForm = { edition: DAY, seasons: [], players: [] };

/** Des pseudos inventés : les neuf premiers sont connus, « Zephir » ne l'est pas. */
const NAMES = [
  'Zéphyr',
  'Brise',
  'Mistral',
  'Sirocco',
  'Foehn',
  'Alizé',
  'Bora',
  'Noroît',
  'Autan',
  'Zephir',
];
const known = (nickname: string, teamTag: string | null): DirectoryEntry => ({
  playerId: `p-${nickname}`,
  nickname,
  aliases: [nickname],
  teamTag,
  archived: false,
  status: teamTag === null ? null : 'starter',
});
/** Sirocco est à VNT mais joue pour NOX ; ION est une équipe inconnue. */
const DIRECTORY = {
  players: NAMES.slice(0, 9).map((n) => known(n, n === 'Sirocco' ? 'VNT' : null)),
  teamTags: ['NOX', 'VNT'],
};

const DONE = { matches: 1, createdPlayers: 0, createdTeams: 1, transfers: 1 };

function serving(importEdition: AdminSource['importEdition'] = () => Promise.resolve(DONE)) {
  const refused = () => Promise.reject(new Error('Hors sujet.'));
  return {
    editions: refused,
    activeSeason: refused,
    openSeason: refused,
    closeSeason: refused,
    rosters: refused,
    createTeam: refused,
    transferPlayer: refused,
    archiveTeam: refused,
    profiles: refused,
    mergePlayers: refused,
    linkDiscordAccount: refused,
    editionForm: vi.fn(() => Promise.resolve(FORM)),
    createEdition: refused,
    updateEdition: refused,
    archiveEdition: refused,
    closeEdition: refused,
    recordMatch: refused,
    importDirectory: vi.fn(() => Promise.resolve(DIRECTORY)),
    importEdition: vi.fn(importEdition),
  } satisfies AdminSource;
}

/** Choisit ce fichier dans le champ. */
async function choose(contents: BlobPart) {
  const input = await screen.findByLabelText('Fichier Excel');
  fireEvent.change(input, { target: { files: [new File([contents], 'journee-3.xlsx')] } });
}

/** Décide chaque cas du fichier de `NAMES`. */
async function decideEverything() {
  fireEvent.change(await screen.findByLabelText(/^Zephir/), { target: { value: 'p-Zéphyr' } });
  const team = screen.getByRole('radiogroup', { name: /^ION/ });
  fireEvent.click(within(team).getByLabelText('Créer'));
  const transfer = screen.getByRole('radiogroup', { name: 'Sirocco : VNT → NOX' });
  fireEvent.click(within(transfer).getByLabelText('Appliquer'));
}

describe('l’import du fichier Excel d’une édition', () => {
  it('liste les cas à décider, par sorte, avant d’importer', async () => {
    openSite('/admin/editions/e-j3', { auth: ADMIN, admin: serving() });

    await choose(aMatchWorkbook(NAMES));

    expect(await screen.findByText('1 match(s) · 9 joueur(s) reconnu(s)')).toBeTruthy();
    expect(screen.getByText('Joueurs non reconnus (1)')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Relier à Zéphyr (83 %)' })).toBeTruthy();
    expect(screen.getByText('Équipes inconnues (1)')).toBeTruthy();
    expect(screen.getByText('Transferts (1)')).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Importer' }).disabled).toBe(true);
  });

  it('envoie les lignes et les décisions, à la version lue, puis dit ce qui a été écrit', async () => {
    const admin = serving();
    openSite('/admin/editions/e-j3', { auth: ADMIN, admin });
    await choose(aMatchWorkbook(NAMES));
    await decideEverything();

    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));

    expect(
      await screen.findByText(
        'Matchs importés en brouillon : 1. Joueurs créés : 0. Équipes créées : 1. Transferts : 1.',
      ),
    ).toBeTruthy();
    const [editionId, version, rows, decisions] = admin.importEdition.mock.calls[0] ?? [];
    expect([editionId, version, rows?.length]).toEqual(['e-j3', 3, 5]);
    expect(decisions).toEqual({
      names: { zephir: { kind: 'existing', playerId: 'p-Zéphyr' } },
      unknownTeams: { ION: 'create' },
      transfers: { 'p-Sirocco': 'apply' },
    });
    expect(admin.editionForm).toHaveBeenCalledTimes(2);
  });

  it('montre les problèmes d’un fichier mal formé, sans rien proposer d’importer', async () => {
    openSite('/admin/editions/e-j3', { auth: ADMIN, admin: serving() });

    await choose(aWorkbook());

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Le fichier sera refusé :\nMatch 1 (lignes 3, 5) : 2 ligne(s) au lieu de 5.',
    );
    expect(screen.queryByRole('button', { name: 'Importer' })).toBeNull();
  });

  it('montre le refus du serveur, une ligne par ligne du message', async () => {
    const admin = serving(() =>
      Promise.reject(
        new CommandFailed('Ce fichier a déjà été importé, dans l’édition « IH #12 ».'),
      ),
    );
    openSite('/admin/editions/e-j3', { auth: ADMIN, admin });
    await choose(aMatchWorkbook(NAMES));
    await decideEverything();

    fireEvent.click(screen.getByRole('button', { name: 'Importer' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Ce fichier a déjà été importé, dans l’édition « IH #12 ».',
    );
  });

  it('dit qu’un fichier n’est pas un fichier Excel, sans rien envoyer', async () => {
    const admin = serving();
    openSite('/admin/editions/e-j3', { auth: ADMIN, admin });

    await choose(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(admin.importEdition).not.toHaveBeenCalled();
  });

  it('n’est pas proposé pour un événement externe', async () => {
    const admin = {
      ...serving(),
      editionForm: () =>
        Promise.resolve({ ...FORM, edition: { ...DAY, type: 'external_lan' as const } }),
    };
    openSite('/admin/editions/e-lan', { auth: ADMIN, admin });

    expect(await screen.findByLabelText('Nom')).toBeTruthy();
    expect(screen.queryByLabelText('Fichier Excel')).toBeNull();
  });
});
