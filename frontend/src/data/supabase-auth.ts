import { AuthClient, type Session } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';
import type { EditionType } from '@arrakis/backend/domain';
import type { AdminEdition, SeasonStatus } from '../features/admin/admin.ts';
import type { AdminSource } from './admin-source.ts';
import type { AuthSource, MemberRole, SignedInUser } from './auth-source.ts';
import { supabaseConfig } from './supabase-config.ts';
import { organizationId } from './supabase-source.ts';

/**
 * Ce que Discord permet au site de lire : le compte (`identify`), et ses rôles
 * sur le serveur, sans bot (`guilds.members.read`, ADR 0030).
 */
const DISCORD_SCOPES = 'identify guilds.members.read';

/** La connexion, et ce qu'un admin lit avec sa session (ADR 0031). */
export interface SupabaseSession {
  readonly auth: AuthSource;
  readonly admin: AdminSource;
}

/**
 * La connexion par Supabase Auth et Discord. Ce module n'est chargé qu'au
 * premier usage (`lazyAuthSource`), avec `@supabase/auth-js`.
 */
export function supabaseSession(
  { api, key, organizationSlug } = supabaseConfig(),
): SupabaseSession {
  // À lire avant que la bibliothèque ne nettoie l'adresse : revient-on de Discord ?
  const params = new URLSearchParams(window.location.search);
  const refusal = params.get('error_description') ?? params.get('error');
  let returningFromDiscord = params.has('code');
  /** La synchronisation du retour de Discord, partagée par les appels qui l'attendent. */
  let synced: Promise<SignedInUser | null> | undefined;

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

  /** Le serveur revérifie le rôle Discord et met l'adhésion à jour (ADR 0030). */
  async function syncRole(session: Session, providerToken: string): Promise<MemberRole | null> {
    const response = await fetch(`${api}/functions/v1/sync-discord-role`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationId: await organizationId(rest(key), organizationSlug),
        providerToken,
      }),
    });
    if (!response.ok) throw new Error(`Synchronisation du rôle : ${String(response.status)}.`);
    return ((await response.json()) as { role: MemberRole | null }).role;
  }

  /**
   * Le rôle enregistré, lu avec les droits de l'utilisateur. Pour un admin,
   * la base dit aussi si son rôle compte encore (`is_org_admin`, ADR 0030).
   */
  async function savedRole(session: Session): Promise<Omit<SignedInUser, 'name'>> {
    const db = rest(session.access_token);
    const organization = await organizationId(db, organizationSlug);
    const { data, error } = await db
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization)
      .eq('user_id', session.user.id)
      .maybeSingle<{ role: MemberRole }>();
    if (error) throw error;
    const role = data?.role ?? null;
    if (role !== 'admin') return { role, adminExpired: false };
    const admin = await db.rpc('is_org_admin', { org: organization });
    if (admin.error) throw admin.error;
    return { role, adminExpired: admin.data !== true };
  }

  async function load(sync: boolean): Promise<SignedInUser | null> {
    const { data, error } = await client.getSession();
    if (error) throw error;
    const { session } = data;
    if (!session) return null;
    const providerToken = session.provider_token;
    const role =
      sync && typeof providerToken === 'string'
        ? { role: await syncRole(session, providerToken), adminExpired: false }
        : await savedRole(session);
    return { name: displayName(session), ...role };
  }

  const auth: AuthSource = {
    currentUser() {
      if (refusal !== null) return Promise.reject(new Error(refusal));
      // En développement, React lance deux fois l'affichage : les deux attendent
      // la même synchronisation.
      if (returningFromDiscord) return (synced ??= load(true));
      return load(false);
    },
    async signIn() {
      const { error } = await client.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: `${window.location.origin}/login`, scopes: DISCORD_SCOPES },
      });
      if (error) throw error;
    },
    async signOut() {
      returningFromDiscord = false;
      synced = undefined;
      const { error } = await client.signOut();
      if (error) throw error;
    },
  };

  const admin: AdminSource = {
    async editions() {
      const { data, error } = await client.getSession();
      if (error) throw error;
      if (!data.session) throw new Error('Personne n’est connecté.');
      const db = rest(data.session.access_token);
      const rows = await db.rpc('admin_editions', {
        org: await organizationId(db, organizationSlug),
      });
      if (rows.error) throw rows.error;
      return (rows.data as readonly AdminEditionRow[]).map(toAdminEdition);
    },
  };

  return { auth, admin };
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

/** Une ligne de `admin_editions` (migration 20261122050000_admin_editions.sql). */
interface AdminEditionRow {
  readonly edition_id: string;
  readonly name: string;
  readonly type: EditionType;
  readonly date: string;
  readonly season_id: string | null;
  readonly season_name: string | null;
  readonly season_status: SeasonStatus | null;
  readonly closed_at: string | null;
  readonly has_published_results: boolean;
  readonly has_published_final: boolean;
  readonly draft_count: number;
}

const toAdminEdition = (r: AdminEditionRow): AdminEdition => ({
  editionId: r.edition_id,
  name: r.name,
  type: r.type,
  date: r.date,
  season:
    r.season_id === null || r.season_name === null || r.season_status === null
      ? null
      : { id: r.season_id, name: r.season_name, status: r.season_status },
  closedAt: r.closed_at,
  hasPublishedResults: r.has_published_results,
  hasPublishedFinal: r.has_published_final,
  draftCount: r.draft_count,
});
