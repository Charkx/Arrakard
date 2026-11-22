import { describe, expect, it } from 'vitest';
import { editionStatus, type EditionStatusFacts } from '#domain/edition/status.ts';

const TODAY = '2026-11-22';

/** Une ligue du jour, sans résultat publié ni clôture : on change un fait à la fois. */
const league = (facts: Partial<EditionStatusFacts> = {}): EditionStatusFacts => ({
  type: 'league_div1',
  date: TODAY,
  closedAt: null,
  hasPublishedResults: false,
  hasPublishedFinal: false,
  ...facts,
});

describe('editionStatus (ADR 0013)', () => {
  it('est à venir quand sa date est dans le futur et que rien n’est publié', () => {
    expect(editionStatus(league({ date: '2026-12-01' }), TODAY)).toBe('upcoming');
  });

  it('est en cours le jour même, sans finale publiée', () => {
    expect(editionStatus(league(), TODAY)).toBe('ongoing');
  });

  it('reste en cours après sa date, tant qu’aucune finale n’est publiée', () => {
    expect(editionStatus(league({ date: '2026-09-01', hasPublishedResults: true }), TODAY)).toBe(
      'ongoing',
    );
  });

  it('est en cours dès qu’un résultat est publié, même avant sa date', () => {
    expect(editionStatus(league({ date: '2026-12-01', hasPublishedResults: true }), TODAY)).toBe(
      'ongoing',
    );
  });

  it('est terminée quand son match final est publié', () => {
    expect(
      editionStatus(league({ hasPublishedResults: true, hasPublishedFinal: true }), TODAY),
    ).toBe('completed');
  });

  describe('une soirée In House', () => {
    const inhouse = (facts: Partial<EditionStatusFacts>) => league({ type: 'inhouse', ...facts });

    it('est terminée quand sa date est passée et que des résultats sont publiés', () => {
      expect(editionStatus(inhouse({ date: '2026-11-21', hasPublishedResults: true }), TODAY)).toBe(
        'completed',
      );
    });

    it('reste en cours le soir même, résultats publiés', () => {
      expect(editionStatus(inhouse({ hasPublishedResults: true }), TODAY)).toBe('ongoing');
    });

    it('reste en cours après sa date si rien n’est publié', () => {
      expect(editionStatus(inhouse({ date: '2026-11-21' }), TODAY)).toBe('ongoing');
    });
  });

  describe.each(['external_event', 'external_lan'] as const)(
    'un événement externe (%s)',
    (type) => {
      it('est terminé dès que sa date est passée', () => {
        expect(editionStatus(league({ type, date: '2026-11-21' }), TODAY)).toBe('completed');
      });

      it('est en cours le jour même', () => {
        expect(editionStatus(league({ type }), TODAY)).toBe('ongoing');
      });

      it('est à venir avant sa date', () => {
        expect(editionStatus(league({ type, date: '2026-12-01' }), TODAY)).toBe('upcoming');
      });
    },
  );

  it('est terminée quand un admin l’a clôturée, quelle que soit sa date', () => {
    const closedAt = '2026-11-20T20:00:00.000Z';

    expect(editionStatus(league({ closedAt }), TODAY)).toBe('completed');
    expect(editionStatus(league({ closedAt, date: '2026-12-01' }), TODAY)).toBe('completed');
    expect(editionStatus(league({ closedAt, date: '2026-09-01' }), TODAY)).toBe('completed');
  });
});
