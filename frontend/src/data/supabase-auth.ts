import { AuthClient, type Session } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';
import type { Division, EditionType } from '@arrakis/backend/domain';
import type { AdminEdition, SeasonStatus } from '../features/admin/admin.ts';
import type { RosterStatus } from '../features/admin/teams.ts';
import { CommandFailed, type AdminSource } from './admin-source.ts';
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

  /** La session de l'admin connecté ; sans elle, rien ne se lit ni ne s'envoie. */
  async function accessToken(): Promise<string> {
    const { data, error } = await client.getSession();
    if (error) throw error;
    if (!data.session) throw new Error('Personne n’est connecté.');
    return data.session.access_token;
  }

  /** Envoie une commande à son Edge Function (ADR 0026). */
  async function command(name: string, input: Record<string, unknown>): Promise<void> {
    const token = await accessToken();
    const response = await fetch(`${api}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationId: await organizationId(rest(token), organizationSlug),
        ...input,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      throw new CommandFailed(body.message ?? String(response.status));
    }
  }

  const admin: AdminSource = {
    async editions() {
      const db = rest(await accessToken());
      const rows = await db.rpc('admin_editions', {
        org: await organizationId(db, organizationSlug),
      });
      if (rows.error) throw rows.error;
      return (rows.data as readonly AdminEditionRow[]).map(toAdminEdition);
    },
    async activeSeason() {
      const db = rest(await accessToken());
      const { data, error } = await db
        .from('seasons')
        .select('id, name')
        .eq('organization_id', await organizationId(db, organizationSlug))
        .eq('status', 'open')
        .maybeSingle<{ id: string; name: string }>();
      if (error) throw error;
      return data;
    },
    openSeason: (name, year) => command('open-season', { name, year }),
    closeSeason: (seasonId) => command('close-season', { seasonId }),
    async rosters() {
      // Les équipes et les passages sont publics (ADR 0031) : l'API ordinaire.
      const db = rest(await accessToken());
      const organization = await organizationId(db, organizationSlug);
      const [teams, players, stints] = await Promise.all([
        db
          .from('teams')
          .select('id, tag, name, divisions')
          .eq('organization_id', organization)
          .is('archived_at', null)
          .order('tag')
          .overrideTypes<
            { id: string; tag: string; name: string; divisions: Division[] }[],
            { merge: false }
          >(),
        db
          .from('players')
          .select('id, nickname')
          .eq('organization_id', organization)
          .is('merged_into', null)
          .order('nickname')
          .overrideTypes<{ id: string; nickname: string }[], { merge: false }>(),
        db
          .from('team_memberships')
          .select('player_id, team_id, status')
          .eq('organization_id', organization)
          .is('left_on', null)
          .overrideTypes<
            { player_id: string; team_id: string; status: RosterStatus }[],
            { merge: false }
          >(),
      ]);
      if (teams.error) throw teams.error;
      if (players.error) throw players.error;
      if (stints.error) throw stints.error;
      const places = new Map(
        stints.data.map((s) => [s.player_id, { teamId: s.team_id, status: s.status }]),
      );
      return {
        teams: teams.data,
        players: players.data.map((p) => ({ ...p, place: places.get(p.id) ?? null })),
      };
    },
    createTeam: (tag, name, divisions) => command('create-team', { tag, name, divisions }),
    transferPlayer: (playerId, to) => command('transfer-player', { playerId, to }),
    archiveTeam: (teamId) => command('archive-team', { teamId }),
    async profiles() {
      // Le compte Discord n'est pas public : une fonction réservée aux admins (ADR 0034).
      const db = rest(await accessToken());
      const rows = await db.rpc('admin_profiles', {
        org: await organizationId(db, organizationSlug),
      });
      if (rows.error) throw rows.error;
      return (
        rows.data as readonly {
          player_id: string;
          nickname: string;
          discord_user_id: string | null;
        }[]
      ).map((p) => ({ id: p.player_id, nickname: p.nickname, discordUserId: p.discord_user_id }));
    },
    mergePlayers: (absorbedId, keptId) => command('merge-players', { absorbedId, keptId }),
    linkDiscordAccount: (playerId, discordUserId) =>
      command('link-discord-account', { playerId, discordUserId }),
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
