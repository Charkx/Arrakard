import { describe, expect, it } from 'vitest';
import { bySeason, type AdminEdition } from '#src/features/admin/admin.ts';

function anEdition(overrides: Partial<AdminEdition> = {}): AdminEdition {
  return {
    editionId: 'e-1',
    name: 'In House #12',
    type: 'inhouse',
    date: '2026-11-02',
    season: { id: 's-3', name: 'Saison 3', status: 'open' },
    closedAt: null,
    hasPublishedResults: true,
    hasPublishedFinal: false,
    draftCount: 0,
    ...overrides,
  };
}

describe('bySeason', () => {
  it('ne rend aucune section sans édition', () => {
    expect(bySeason([], '2026-11-22')).toEqual([]);
  });

  it('range les éditions par saison, la saison en cours d’abord, puis la plus récente', () => {
    const sections = bySeason(
      [
        anEdition({
          editionId: 'ancienne',
          season: { id: 's-1', name: 'Saison 1', status: 'closed' },
          date: '2025-03-01',
        }),
        anEdition({ editionId: 'en-cours', date: '2026-11-02' }),
        anEdition({
          editionId: 'precedente',
          season: { id: 's-2', name: 'Saison 2', status: 'closed' },
          date: '2026-06-14',
        }),
      ],
      '2026-11-22',
    );

    expect(sections.map((s) => s.season?.name)).toEqual(['Saison 3', 'Saison 2', 'Saison 1']);
  });

  it('met les éditions hors saison à la fin', () => {
    const sections = bySeason(
      [
        anEdition({
          editionId: 'hors',
          season: null,
          date: '2026-12-01',
        }),
        anEdition(),
      ],
      '2026-11-22',
    );

    expect(sections.map((s) => s.season?.name ?? null)).toEqual(['Saison 3', null]);
  });

  it('montre dans une saison la plus récente édition en haut, avec son statut déduit', () => {
    const [section] = bySeason(
      [
        anEdition({ editionId: 'lan', type: 'lan', date: '2026-10-19', hasPublishedFinal: true }),
        anEdition({ editionId: 'ligue', type: 'league_div1', date: '2026-11-09', draftCount: 2 }),
        anEdition({
          editionId: 'a-venir',
          type: 'tournament',
          date: '2026-12-05',
          hasPublishedResults: false,
        }),
      ],
      '2026-11-22',
    );

    expect(section?.editions.map((e) => [e.editionId, e.status, e.draftCount])).toEqual([
      ['a-venir', 'upcoming', 0],
      ['ligue', 'ongoing', 2],
      ['lan', 'completed', 0],
    ]);
  });
});
