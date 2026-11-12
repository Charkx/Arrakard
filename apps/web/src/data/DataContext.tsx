import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import type { DataSource } from './leaderboard.ts';

const DataContext = createContext<DataSource | null>(null);

export function DataProvider({
  source,
  children,
}: {
  readonly source: DataSource;
  readonly children: ReactNode;
}) {
  return <DataContext value={source}>{children}</DataContext>;
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

/** Charge une donnée une fois, et dit où en est le chargement. */
export function useLoaded<T>(load: (source: DataSource) => Promise<T>): Loaded<T> {
  const source = useDataSource();
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' });

  useEffect(() => {
    let current = true;
    load(source).then(
      (data) => {
        if (current) setState({ status: 'ready', data });
      },
      () => {
        if (current) setState({ status: 'error' });
      },
    );
    return () => {
      current = false;
    };
    // `load` est une fonction déclarée hors du composant : elle ne change pas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  return state;
}
