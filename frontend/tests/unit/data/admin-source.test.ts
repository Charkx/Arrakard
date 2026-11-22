import { describe, expect, it, vi } from 'vitest';
import { lazyAdminSource } from '#src/data/admin-source.ts';

describe('lazyAdminSource', () => {
  it('ne charge la source qu’au premier usage, et une seule fois', async () => {
    const load = vi.fn(() => Promise.resolve({ editions: () => Promise.resolve([]) }));
    const admin = lazyAdminSource(load);

    expect(load).not.toHaveBeenCalled();
    expect(await admin.editions()).toEqual([]);
    await admin.editions();
    expect(load).toHaveBeenCalledOnce();
  });
});
