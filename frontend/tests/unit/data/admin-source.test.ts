import { describe, expect, it, vi } from 'vitest';
import { lazyAdminSource } from '#src/data/admin-source.ts';
import { blankMatch } from '#src/features/admin/match-entry.ts';

describe('lazyAdminSource', () => {
  it('ne charge la source qu’au premier usage, et une seule fois', async () => {
    const load = vi.fn(() =>
      Promise.resolve({
        editions: () => Promise.resolve([]),
        activeSeason: () => Promise.resolve({ id: 's-3', name: 'Saison 3' }),
        openSeason: () => Promise.resolve(),
        closeSeason: () => Promise.resolve(),
        rosters: () => Promise.resolve({ teams: [], players: [] }),
        createTeam: () => Promise.resolve(),
        transferPlayer: () => Promise.resolve(),
        archiveTeam: () => Promise.resolve(),
        profiles: () => Promise.resolve([]),
        mergePlayers: () => Promise.resolve(),
        linkDiscordAccount: () => Promise.resolve(),
        editionForm: () => Promise.resolve({ edition: null, seasons: [], players: [] }),
        createEdition: () => Promise.resolve('e-new'),
        updateEdition: () => Promise.resolve(),
        archiveEdition: () => Promise.resolve(),
        closeEdition: () => Promise.resolve(),
        recordMatch: () => Promise.resolve(2),
        importDirectory: () => Promise.resolve({ players: [], teamTags: [] }),
        importEdition: () =>
          Promise.resolve({ matches: 3, createdPlayers: 0, createdTeams: 0, transfers: 0 }),
      }),
    );
    const admin = lazyAdminSource(load);

    expect(load).not.toHaveBeenCalled();
    expect(await admin.editions()).toEqual([]);
    expect(await admin.activeSeason()).toEqual({ id: 's-3', name: 'Saison 3' });
    await admin.openSeason('Saison 4', 2027);
    await admin.closeSeason('s-3');
    expect(await admin.rosters()).toEqual({ teams: [], players: [] });
    await admin.createTeam('ARK', 'Arrakis', ['div1']);
    await admin.transferPlayer('p-1', null);
    await admin.archiveTeam('t-1');
    expect(await admin.profiles()).toEqual([]);
    await admin.mergePlayers('p-1', 'p-2');
    await admin.linkDiscordAccount('p-1', null);
    expect((await admin.editionForm(null)).edition).toBeNull();
    expect(
      await admin.createEdition({
        name: 'IH',
        type: 'inhouse',
        date: '2026-11-23',
        seasonId: null,
        prestige: 'normal',
        location: null,
        url: null,
        description: null,
        arrakisWon: null,
        participantIds: [],
      }),
    ).toBe('e-new');
    await admin.updateEdition('e-1', 1, {
      name: 'IH',
      type: 'inhouse',
      date: '2026-11-23',
      seasonId: null,
      prestige: 'normal',
      location: null,
      url: null,
      description: null,
      arrakisWon: null,
      participantIds: [],
    });
    await admin.closeEdition('e-1', 2);
    expect(await admin.recordMatch('e-1', 2, blankMatch())).toBe(2);
    expect((await admin.importDirectory()).players).toEqual([]);
    expect(
      (await admin.importEdition('e-1', 1, [], { names: {}, unknownTeams: {}, transfers: {} }))
        .matches,
    ).toBe(3);
    await admin.archiveEdition('e-1', 3);
    expect(load).toHaveBeenCalledOnce();
  });
});
