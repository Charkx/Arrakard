import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandFailed, type AdminSource } from '#src/data/admin-source.ts';
import type { EditionForm } from '#src/features/admin/edition-form.ts';
import { openSite } from '#support/render.tsx';
import { aWorkbook } from '#support/workbook.ts';

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

/** Une In House sans match, à la version 3. */
const IH: NonNullable<EditionForm['edition']> = {
  name: 'IH #12',
  type: 'inhouse',
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
const FORM: EditionForm = { edition: IH, seasons: [], players: [] };

function serving(importEdition: AdminSource['importEdition']) {
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
    importEdition: vi.fn(importEdition),
  } satisfies AdminSource;
}

/** Choisit ce fichier dans le champ, puis lance l'import. */
async function importFile(contents: BlobPart) {
  const input = await screen.findByLabelText('Fichier Excel');
  fireEvent.change(input, { target: { files: [new File([contents], 'ih-12.xlsx')] } });
  fireEvent.click(screen.getByRole('button', { name: 'Importer' }));
}

describe('l’import du fichier Excel d’une édition', () => {
  it('envoie au serveur les lignes de la feuille, à la version lue, puis dit combien de matchs sont importés', async () => {
    const admin = serving(() => Promise.resolve(1));
    openSite('/admin/editions/e-ih', { auth: ADMIN, admin });

    await importFile(aWorkbook());

    expect(await screen.findByText('Matchs importés en brouillon : 1.')).toBeTruthy();
    const [editionId, version, rows] = admin.importEdition.mock.calls[0] ?? [];
    expect([editionId, version]).toEqual(['e-ih', 3]);
    expect(rows?.map((r) => r.line)).toEqual([3, 5]);
    expect(admin.editionForm).toHaveBeenCalledTimes(2);
  });

  it('montre le refus du serveur, une ligne du fichier par ligne', async () => {
    const admin = serving(() =>
      Promise.reject(
        new CommandFailed('Le fichier est refusé :\nLigne 5 (match 1) : champion manquant.'),
      ),
    );
    openSite('/admin/editions/e-ih', { auth: ADMIN, admin });

    await importFile(aWorkbook());

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Le fichier est refusé :\nLigne 5 (match 1) : champion manquant.',
    );
  });

  it('dit qu’un fichier n’est pas un fichier Excel, sans rien envoyer', async () => {
    const admin = serving(() => Promise.resolve(1));
    openSite('/admin/editions/e-ih', { auth: ADMIN, admin });

    await importFile(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(admin.importEdition).not.toHaveBeenCalled();
  });

  it('n’est pas proposé pour un événement externe', async () => {
    const admin = {
      ...serving(() => Promise.resolve(1)),
      editionForm: () =>
        Promise.resolve({ ...FORM, edition: { ...IH, type: 'external_lan' as const } }),
    };
    openSite('/admin/editions/e-lan', { auth: ADMIN, admin });

    expect(await screen.findByLabelText('Nom')).toBeTruthy();
    expect(screen.queryByLabelText('Fichier Excel')).toBeNull();
  });
});
