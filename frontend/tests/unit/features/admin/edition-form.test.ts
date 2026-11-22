import { describe, expect, it } from 'vitest';
import { blankEdition, toSend, type EditionForm } from '#src/features/admin/edition-form.ts';

const FORM: EditionForm = {
  edition: null,
  seasons: [
    { id: 's-2', name: 'Saison 2', status: 'closed' },
    { id: 's-3', name: 'Saison 3', status: 'open' },
  ],
  players: [],
};

describe('blankEdition', () => {
  it('propose une In House du jour, dans la saison ouverte', () => {
    expect(blankEdition('2026-11-23', FORM)).toMatchObject({
      type: 'inhouse',
      date: '2026-11-23',
      seasonId: 's-3',
    });
  });

  it('hors saison quand aucune n’est ouverte', () => {
    expect(blankEdition('2026-11-23', { ...FORM, seasons: [] }).seasonId).toBeNull();
  });
});

describe('toSend', () => {
  it('retire participants et victoire d’une édition qui a des matchs', () => {
    const details = {
      ...blankEdition('2026-11-23', FORM),
      participantIds: ['p-1'],
      arrakisWon: true,
    };

    expect(toSend(details)).toMatchObject({ participantIds: [], arrakisWon: null });
    expect(toSend({ ...details, type: 'external_event' })).toMatchObject({
      participantIds: ['p-1'],
      arrakisWon: true,
    });
  });
});
