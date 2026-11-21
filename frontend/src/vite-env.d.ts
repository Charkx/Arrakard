/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adresse de l'API Supabase. Par défaut, celle de `supabase start`. */
  readonly VITE_SUPABASE_URL?: string;
  /** Clé publique de l'API. Inutile en local. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** L'organisation affichée. Par défaut, « arrakis ». */
  readonly VITE_ORGANIZATION_SLUG?: string;
}
