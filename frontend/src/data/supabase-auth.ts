import { AuthClient, type Session } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';
import type { AuthSource, MemberRole, SignedInUser } from './auth-source.ts';

/** La clé publique de l'API locale (voir `supabase-source.ts`). */
const LOCAL_KEY = 'sb_publishable_local';

/**
 * Ce que Discord permet au site de lire : le compte (`identify`), et ses rôles
 * sur le serveur, sans bot (`guilds.members.read`, ADR 0030).
 */
const DISCORD_SCOPES = 'identify guilds.members.read';

/**
 * La connexion par Supabase Auth et Discord. Ce module n'est chargé qu'au
 * premier usage (`lazyAuthSource`), avec `@supabase/auth-js`.
 */
export function supabaseAuth(
  url = import.meta.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? LOCAL_KEY,
  organizationSlug = import.meta.env.VITE_ORGANIZATION_SLUG ?? 'arrakis',
): AuthSource {
  const api = url.replace(/\/+$/, '');
  // À lire avant que la bibliothèque ne nettoie l'adresse : revient-on de Discord ?
  let returningFromDiscord = new URLSearchParams(window.location.search).has('code');
  const client = new AuthClient({
    url: `${api}/auth/v1`,
    headers: { apikey: key },
    storageKey: 'arrakis_auth',
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  });
  const rest = (token: string) =>
    new PostgrestClient(`${api}/rest/v1`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });

  async function organizationId(): Promise<string> {
    const { data, error } = await rest(key)
      .from('organizations')
      .select('id')
      .eq('slug', organizationSlug)
      .single<{ id: string }>();
    if (error) throw new Error(error.message);
    return data.id;
  }

  /** Le serveur revérifie le rôle Discord et met l'adhésion à jour (ADR 0030). */
  async function syncRole(session: Session, providerToken: string): Promise<MemberRole | null> {
    const response = await fetch(`${api}/functions/v1/sync-discord-role`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizationId: await organizationId(), providerToken }),
    });
    if (!response.ok) throw new Error(`Synchronisation du rôle : ${String(response.status)}.`);
    return ((await response.json()) as { role: MemberRole | null }).role;
  }

  /** Le rôle déjà enregistré, lu avec les droits de l'utilisateur (« ses propres adhésions »). */
  async function savedRole(session: Session): Promise<MemberRole | null> {
    const { data, error } = await rest(session.access_token)
      .from('organization_members')
      .select('role')
      .eq('organization_id', await organizationId())
      .eq('user_id', session.user.id)
      .maybeSingle<{ role: MemberRole }>();
    if (error) throw new Error(error.message);
    return data?.role ?? null;
  }

  return {
    async currentUser(): Promise<SignedInUser | null> {
      const { data, error } = await client.getSession();
      if (error) throw error;
      const { session } = data;
      if (!session) return null;
      const providerToken = session.provider_token;
      const syncNow = returningFromDiscord && typeof providerToken === 'string';
      returningFromDiscord = false;
      const role = syncNow ? await syncRole(session, providerToken) : await savedRole(session);
      return { name: displayName(session), role };
    },
    async signIn() {
      const { error } = await client.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: `${window.location.origin}/login`, scopes: DISCORD_SCOPES },
      });
      if (error) throw error;
    },
    async signOut() {
      const { error } = await client.signOut();
      if (error) throw error;
    },
  };
}

/** Le nom que Discord donne au compte : le nom affiché, sinon le pseudo. */
function displayName({ user }: Session): string {
  const metadata = user.user_metadata as {
    custom_claims?: { global_name?: string };
    full_name?: string;
    name?: string;
  };
  return metadata.custom_claims?.global_name ?? metadata.full_name ?? metadata.name ?? '';
}
