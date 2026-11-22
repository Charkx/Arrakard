import { useEffect, useState } from 'react';
import { useAdminSource, useAuthSource } from '../../data/DataContext.tsx';
import type { AdminSource } from '../../data/admin-source.ts';
import { isFreshAdmin } from './admin.ts';

export type AdminData<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'refused' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly data: T };

/**
 * Ce qu'une page admin lit, pour un admin à jour seulement (ADR 0030) ;
 * `reload` relit après une commande réussie : le serveur dit ce qui a changé.
 * `load` doit être stable (une fonction du module) : sa nouvelle valeur relit tout.
 */
export function useAdminData<T>(load: (admin: AdminSource) => Promise<T>) {
  const auth = useAuthSource();
  const admin = useAdminSource();
  const [state, setState] = useState<AdminData<T>>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let current = true;
    const run = async (): Promise<AdminData<T>> =>
      isFreshAdmin(await auth.currentUser())
        ? { status: 'ready', data: await load(admin) }
        : { status: 'refused' };
    run().then(
      (loaded) => {
        if (current) setState(loaded);
      },
      () => {
        if (current) setState({ status: 'error' });
      },
    );
    return () => {
      current = false;
    };
  }, [auth, admin, load, version]);

  const reload = () => {
    setVersion((v) => v + 1);
  };
  return { state, reload };
}
