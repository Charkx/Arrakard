import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import type { AuthSource } from './auth-source.ts';
import type { DataSource } from './data-source.ts';

const DataContext = createContext<DataSource | null>(null);
const AuthContext = createContext<AuthSource | null>(null);

/** Donne aux pages la source des données, et la connexion. */
export function DataProvider({
  source,
  auth,
  children,
}: {
  readonly source: DataSource;
  readonly auth: AuthSource;
  readonly children: ReactNode;
}) {
  return (
    <DataContext value={source}>
      <AuthContext value={auth}>{children}</AuthContext>
    </DataContext>
  );
}

export function useAuthSource(): AuthSource {
  const auth = use(AuthContext);
  if (!auth) throw new Error('useAuthSource s’utilise sous <DataProvider>.');
  return auth;
}

export function useDataSource(): DataSource {
  const source = use(DataContext);
  if (!source) throw new Error('useDataSource s’utilise sous <DataProvider>.');
  return source;
}

export type Loaded<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly data: T };

/**
 * Charge une donnée, et dit où en est le chargement. Elle se recharge quand
 * `key` change (l'identifiant d'un joueur, par exemple). `load` doit être
 * déclarée hors du composant, pour ne pas relancer le chargement à chaque affichage.
 */
export function useLoaded<T, K>(
  load: (source: DataSource, key: K) => Promise<T>,
  key: K,
): Loaded<T> {
  const source = useDataSource();
  // Le résultat garde la clé qu'il concerne : pour une autre clé, c'est « en cours ».
  const [result, setResult] = useState<{ readonly key: K; readonly loaded: Loaded<T> } | null>(
    null,
  );

  useEffect(() => {
    let current = true;
    load(source, key).then(
      (data) => {
        if (current) setResult({ key, loaded: { status: 'ready', data } });
      },
      () => {
        if (current) setResult({ key, loaded: { status: 'error' } });
      },
    );
    return () => {
      current = false;
    };
  }, [source, load, key]);

  return result !== null && Object.is(result.key, key) ? result.loaded : { status: 'loading' };
}
