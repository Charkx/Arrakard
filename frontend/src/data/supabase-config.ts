/**
 * Clé publique de l'API locale, envoyée comme en ligne : une clé au format
 * « publishable » est acceptée par l'API locale comme celle d'un visiteur ;
 * une clé quelconque, elle, est refusée comme jeton de connexion invalide.
 */
export const LOCAL_KEY = 'sb_publishable_local';

/** Où joindre Supabase, et quelle organisation afficher. */
export interface SupabaseConfig {
  /** L'adresse de l'API, sans barre oblique finale : `…co/` donnerait `…co//rest/v1`. */
  readonly api: string;
  readonly key: string;
  readonly organizationSlug: string;
}

/** La configuration des variables du site ; par défaut, celle de `supabase start`. */
export function supabaseConfig({
  url = import.meta.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? LOCAL_KEY,
  organizationSlug = import.meta.env.VITE_ORGANIZATION_SLUG ?? 'arrakis',
}: { url?: string; key?: string; organizationSlug?: string } = {}): SupabaseConfig {
  return { api: url.replace(/\/+$/, ''), key, organizationSlug };
}
