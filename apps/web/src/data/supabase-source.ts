import type { Division, RecentForm, Role, Tier } from '@arrakis/domain';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DataSource, LeaderboardData, LeaderboardEntry } from './leaderboard.ts';

/** Une ligne de la vue `leaderboard_view` (migration 20261113000000_leaderboard.sql). */
interface LeaderboardViewRow {
  readonly player_id: string;
  readonly nickname: string;
  readonly archived: boolean;
  readonly dominant_role: Role;
  readonly team_tag: string | null;
  readonly divisions: readonly Division[];
  readonly rating: number;
  readonly impact: number;
  readonly consistency: number;
  readonly clutch: number;
  readonly tier: Tier;
  readonly games: number;
  readonly winrate: number;
  readonly kda: number | string;
  readonly recent_form: RecentForm;
  readonly previous_rating: number | null;
  readonly editions_played: number;
}

/**
 * Clé publique de l'API locale. L'API de `supabase start` sert les visiteurs
 * sans clé, mais la bibliothèque en exige une. Une clé au format
 * « publishable » est acceptée par l'API locale comme celle d'un visiteur ;
 * une clé quelconque, elle, est refusée comme jeton de connexion invalide.
 */
const LOCAL_KEY = 'sb_publishable_local';

/** Lit la base par l'API de Supabase : en local par défaut, sinon celle des variables. */
export function supabaseSource(
  url = import.meta.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? LOCAL_KEY,
  organizationSlug = import.meta.env.VITE_ORGANIZATION_SLUG ?? 'arrakis',
): DataSource {
  const client = createClient(url, key, { auth: { persistSession: false } });
  return { loadLeaderboard: () => loadLeaderboard(client, organizationSlug) };
}

async function loadLeaderboard(client: SupabaseClient, slug: string): Promise<LeaderboardData> {
  const organization = await client
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle<{ id: string }>();
  if (organization.error) throw organization.error;
  if (!organization.data) return { seasonName: null, entries: [] };

  const season = await client
    .from('seasons')
    .select('id, name')
    .eq('organization_id', organization.data.id)
    .eq('status', 'open')
    .maybeSingle<{ id: string; name: string }>();
  if (season.error) throw season.error;
  if (!season.data) return { seasonName: null, entries: [] };

  const rows = await client
    .from('leaderboard_view')
    .select('*')
    .eq('season_id', season.data.id)
    .overrideTypes<LeaderboardViewRow[], { merge: false }>();
  if (rows.error) throw rows.error;

  return { seasonName: season.data.name, entries: rows.data.map(toEntry) };
}

function toEntry(row: LeaderboardViewRow): LeaderboardEntry {
  return {
    playerId: row.player_id,
    nickname: row.nickname,
    archived: row.archived,
    role: row.dominant_role,
    teamTag: row.team_tag,
    divisions: row.divisions,
    rating: row.rating,
    impact: row.impact,
    consistency: row.consistency,
    clutch: row.clutch,
    tier: row.tier,
    games: row.games,
    winrate: row.winrate,
    // Postgres renvoie les nombres décimaux sous forme de texte.
    kda: Number(row.kda),
    recentForm: row.recent_form,
    editionsPlayed: row.editions_played,
    ...(row.previous_rating !== null && { previousRating: row.previous_rating }),
  };
}
