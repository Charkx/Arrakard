import type { Division, RecentForm, Role, Tier } from '@arrakis/domain';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  toMatches,
  type EditionHeader,
  type EditionPageData,
  type MatchPlayerRow,
  type StandingRow,
} from './edition.ts';
import type { DataSource, LeaderboardData, LeaderboardEntry } from './leaderboard.ts';
import type { MergedPlayer, PlayedMatch, PlayerPageData } from './player.ts';

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
  return {
    loadLeaderboard: () => loadLeaderboard(client, organizationSlug),
    loadPlayer: (playerId) => loadPlayer(client, organizationSlug, playerId),
    loadEdition: (editionId) => loadEdition(client, organizationSlug, editionId),
  };
}

/** L'organisation que le site affiche (ADR 0008). Toute lecture se limite à elle. */
async function organizationId(client: SupabaseClient, slug: string): Promise<string> {
  const organization = await client
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle<{ id: string }>();
  if (organization.error) throw organization.error;
  if (!organization.data) throw new Error(`Organisation « ${slug} » introuvable.`);
  return organization.data.id;
}

async function loadLeaderboard(client: SupabaseClient, slug: string): Promise<LeaderboardData> {
  const organization = { data: { id: await organizationId(client, slug) } };

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

/** Une ligne de la vue `player_profile_view` (migration 20261114000000_player_profile.sql). */
interface PlayerProfileViewRow {
  readonly player_id: string;
  readonly nickname: string;
  readonly team_tag: string | null;
  readonly team_name: string | null;
  readonly season_name: string | null;
  readonly dominant_role: Role | null;
  readonly rating: number | null;
  readonly impact: number;
  readonly consistency: number;
  readonly clutch: number;
  readonly tier: Tier;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  readonly winrate: number;
  readonly kda: number | string;
  readonly recent_form: RecentForm;
  readonly previous_rating: number | null;
  readonly editions_played: number;
  readonly top_champions: readonly string[];
}

/** Une ligne de la vue `player_matches_view`. */
interface PlayerMatchViewRow {
  readonly match_id: string;
  readonly edition_id: string;
  readonly edition_name: string;
  readonly edition_date: string;
  readonly match_number: number;
  readonly matchday: number | null;
  readonly role: Role;
  readonly champion: string;
  readonly result: PlayedMatch['result'];
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
}

// Un identifiant de joueur est un UUID : une adresse mal formée ne va pas jusqu'à la base.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadPlayer(
  client: SupabaseClient,
  slug: string,
  playerId: string,
): Promise<PlayerPageData | MergedPlayer | null> {
  if (!UUID.test(playerId)) return null;
  const organization = await organizationId(client, slug);
  const profile = await client
    .from('player_profile_view')
    .select('*')
    .eq('organization_id', organization)
    .eq('player_id', playerId)
    // Un joueur archivé est masqué des pages publiques (glossaire).
    .eq('archived', false)
    .maybeSingle<PlayerProfileViewRow>();
  if (profile.error) throw profile.error;
  if (!profile.data) return mergedInto(client, organization, playerId);

  const matches = await client
    .from('player_matches_view')
    .select(
      'match_id, edition_id, edition_name, edition_date, match_number, matchday, role, champion, result, kills, deaths, assists',
    )
    .eq('organization_id', organization)
    .eq('player_id', playerId)
    .overrideTypes<PlayerMatchViewRow[], { merge: false }>();
  if (matches.error) throw matches.error;

  const row = profile.data;
  return {
    profile: {
      playerId: row.player_id,
      nickname: row.nickname,
      teamTag: row.team_tag,
      teamName: row.team_name,
      seasonName: row.season_name,
      season:
        row.rating === null || row.dominant_role === null
          ? null
          : {
              role: row.dominant_role,
              rating: row.rating,
              impact: row.impact,
              consistency: row.consistency,
              clutch: row.clutch,
              tier: row.tier,
              games: row.games,
              wins: row.wins,
              losses: row.losses,
              winrate: row.winrate,
              kda: Number(row.kda),
              recentForm: row.recent_form,
              previousRating: row.previous_rating,
              editionsPlayed: row.editions_played,
              topChampions: row.top_champions,
            },
    },
    matches: matches.data.map((m) => ({
      matchId: m.match_id,
      editionId: m.edition_id,
      editionName: m.edition_name,
      editionDate: m.edition_date,
      matchNumber: m.match_number,
      matchday: m.matchday,
      role: m.role,
      champion: m.champion,
      result: m.result,
      kills: m.kills,
      deaths: m.deaths,
      assists: m.assists,
    })),
  };
}

/** Le profil n'existe plus si le joueur a été fusionné : on cherche le joueur conservé. */
async function mergedInto(
  client: SupabaseClient,
  organization: string,
  playerId: string,
): Promise<MergedPlayer | null> {
  const player = await client
    .from('players')
    .select('merged_into')
    .eq('organization_id', organization)
    .eq('id', playerId)
    .maybeSingle<{ merged_into: string | null }>();
  if (player.error) throw player.error;
  return player.data?.merged_into ? { mergedInto: player.data.merged_into } : null;
}

/**
 * Lit une vue entière d'une édition, en remplaçant chaque ligne par sa forme
 * dans le site. `toItem` porte le type de la ligne qu'il attend.
 */
async function rowsOf<T>(
  client: SupabaseClient,
  view: string,
  organization: string,
  editionId: string,
  toItem: (row: never) => T,
): Promise<T[]> {
  const result = await client
    .from(view)
    .select('*')
    .eq('organization_id', organization)
    .eq('edition_id', editionId);
  if (result.error) throw result.error;
  return result.data.map((row) => toItem(row as never));
}

async function loadEdition(
  client: SupabaseClient,
  slug: string,
  editionId: string,
): Promise<EditionPageData | null> {
  if (!UUID.test(editionId)) return null;
  const organization = await organizationId(client, slug);
  const [edition] = await rowsOf(client, 'edition_page_view', organization, editionId, toHeader);
  if (!edition) return null;

  const [standings, matchRows, participants] = await Promise.all([
    rowsOf(client, 'edition_standings_view', organization, editionId, toStanding),
    rowsOf(client, 'edition_matches_view', organization, editionId, toMatchPlayer),
    rowsOf(client, 'edition_participants_view', organization, editionId, (r: ParticipantRow) => ({
      playerId: r.player_id,
      nickname: r.nickname,
    })),
  ]);
  return {
    edition,
    standings: standings.sort((a, b) => a.rank - b.rank),
    matches: toMatches(matchRows),
    participants: participants.sort((a, b) => a.nickname.localeCompare(b.nickname)),
  };
}

interface EditionPageRow {
  readonly edition_id: string;
  readonly name: string;
  readonly type: EditionHeader['type'];
  readonly date: string;
  readonly season_name: string | null;
  readonly location: string | null;
  readonly description: string | null;
  readonly event_mvp_nickname: string | null;
}

const toHeader = (r: EditionPageRow): EditionHeader => ({
  editionId: r.edition_id,
  name: r.name,
  type: r.type,
  date: r.date,
  seasonName: r.season_name,
  location: r.location,
  description: r.description,
  eventMvp: r.event_mvp_nickname,
});

interface StandingViewRow {
  readonly player_id: string;
  readonly nickname: string;
  readonly rank: number;
  readonly team: string;
  readonly role: StandingRow['role'];
  readonly champion: string;
  readonly wins: number;
  readonly losses: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly is_event_mvp: boolean;
  readonly result_points: number;
  readonly stat_points: number;
  readonly mvp_points: number;
  readonly points: number;
}

const toStanding = (r: StandingViewRow): StandingRow => ({
  playerId: r.player_id,
  nickname: r.nickname,
  rank: r.rank,
  team: r.team,
  role: r.role,
  champion: r.champion,
  wins: r.wins,
  losses: r.losses,
  kills: r.kills,
  deaths: r.deaths,
  assists: r.assists,
  isEventMvp: r.is_event_mvp,
  resultPoints: r.result_points,
  statPoints: r.stat_points,
  mvpPoints: r.mvp_points,
  points: r.points,
});

interface MatchViewRow {
  readonly match_id: string;
  readonly match_number: number;
  readonly matchday: number | null;
  readonly is_final: boolean;
  readonly duration_seconds: number;
  readonly winner_team: string;
  readonly mvp_nickname: string | null;
  readonly line: number;
  readonly side: 'A' | 'B';
  readonly player_id: string;
  readonly nickname: string;
  readonly team: string;
  readonly role: MatchPlayerRow['role'];
  readonly champion: string;
  readonly result: MatchPlayerRow['result'];
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
}

const toMatchPlayer = (r: MatchViewRow): MatchPlayerRow => ({
  matchId: r.match_id,
  matchNumber: r.match_number,
  matchday: r.matchday,
  isFinal: r.is_final,
  durationSeconds: r.duration_seconds,
  winnerTeam: r.winner_team,
  mvp: r.mvp_nickname,
  line: r.line,
  side: r.side,
  playerId: r.player_id,
  nickname: r.nickname,
  team: r.team,
  role: r.role,
  champion: r.champion,
  result: r.result,
  kills: r.kills,
  deaths: r.deaths,
  assists: r.assists,
});

interface ParticipantRow {
  readonly player_id: string;
  readonly nickname: string;
}
