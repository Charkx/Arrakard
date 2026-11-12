/** Base locale de Supabase (`supabase db start`) : la cible par défaut. */
export const LOCAL_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Refuse d'écrire dans une base qui n'est pas sur cette machine, sauf
 * confirmation explicite : une base hébergée ne se remplit pas par accident.
 */
export function assertTargetAllowed(databaseUrl: string, confirmHosted: boolean): void {
  const { hostname } = new URL(databaseUrl);
  if (LOCAL_HOSTS.has(hostname) || confirmHosted) return;
  throw new Error(
    `La base visée (${hostname}) n’est pas locale. Pour écrire dans une base hébergée, relancer avec --confirm-hosted.`,
  );
}
