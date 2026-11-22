import { describe, expect, it, vi } from 'vitest';
import { lazyAuthSource, type AuthSource } from '#src/data/auth-source.ts';

describe('lazyAuthSource', () => {
  it('ne charge la connexion qu’au premier usage, et une seule fois', async () => {
    const real: AuthSource = {
      currentUser: () => Promise.resolve({ name: 'Kinox', role: 'admin' }),
      signIn: () => Promise.resolve(),
      signOut: () => Promise.resolve(),
    };
    const load = vi.fn(() => Promise.resolve(real));
    const auth = lazyAuthSource(load);

    expect(load).not.toHaveBeenCalled();
    expect(await auth.currentUser()).toEqual({ name: 'Kinox', role: 'admin' });
    await auth.signIn();
    await auth.signOut();
    expect(load).toHaveBeenCalledOnce();
  });
});
