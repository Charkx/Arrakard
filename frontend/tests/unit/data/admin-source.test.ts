import { describe, expect, it, vi } from 'vitest';
import { lazyAdminSource } from '#src/data/admin-source.ts';

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
    expect(load).toHaveBeenCalledOnce();
  });
});
