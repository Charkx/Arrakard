/**
 * Sauvegarde de la base v1 : une entrée par table, telle que renvoyée par
 * l'API REST de Supabase. Seules les colonnes lues par la migration sont typées.
 */
export interface V1Dump {
  readonly seasons: readonly V1Season[];
  readonly splits: readonly V1Split[];
  readonly teams: readonly V1Team[];
  readonly players: readonly V1Player[];
  readonly editions: readonly V1Edition[];
  readonly matches: readonly V1Match[];
  readonly match_rows: readonly V1MatchRow[];
  readonly edition_participants: readonly V1EditionParticipant[];
  readonly registrations: readonly V1Registration[];
  readonly player_event_entries: readonly V1PlayerEventEntry[];
}

export interface V1Season {
  readonly id: string;
  readonly name: string;
  readonly year: number;
}

export interface V1Split {
  readonly id: string;
  readonly season_id: string;
  readonly number: number;
  readonly name: string;
  readonly start_date: string | null;
  readonly end_date: string | null;
  readonly is_active: boolean;
}

export interface V1Team {
  readonly id: string;
  readonly tag: string;
  readonly name: string;
  readonly divisions: readonly string[];
  readonly logo_url: string | null;
  readonly archived_at: string | null;
}

export interface V1Customization {
  readonly title?: string;
  readonly selectedBadges?: readonly string[];
  readonly background?: string;
  readonly bio?: string;
  readonly accounts?: readonly { readonly riotId: string; readonly main: boolean }[];
}

export interface V1Player {
  readonly id: string;
  readonly name: string;
  readonly archived: boolean;
  readonly merged_into: string | null;
  readonly discord_user_id: string | null;
  readonly team_id: string | null;
  readonly team_tag: string | null;
  readonly status: 'starter' | 'sub';
  readonly riot_id: string | null;
  readonly customization: V1Customization | null;
  readonly created_at: string;
}

export type V1EditionType =
  | 'ligue_div1'
  | 'ligue_div2'
  | 'inhouse'
  | 'tournament'
  | 'lan'
  | 'external_lan'
  | 'external_event';

export interface V1Edition {
  readonly id: string;
  readonly season_id: string;
  readonly split_id: string | null;
  readonly name: string;
  readonly type: V1EditionType;
  readonly date: string;
  readonly prestige: 'normal' | 'premium' | 'championship';
  readonly mvp_player_name: string | null;
  readonly display_number: number | null;
  readonly location: string | null;
  readonly url: string | null;
  readonly description: string | null;
  readonly arrakis_won: boolean | null;
  readonly source_file_hash: string | null;
  readonly created_at: string;
}

export interface V1Match {
  readonly id: string;
  readonly edition_id: string;
  readonly match_number: number;
  readonly team_a: string;
  readonly team_b: string;
  readonly winner: string;
  readonly duration_display: string;
  readonly journee: number | null;
  readonly is_final: boolean;
}

export type V1Role = 'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP';

/** Une ligne de rôle d'un match : le joueur du côté A et celui du côté B. */
export interface V1MatchRow {
  readonly id: string;
  readonly match_id: string;
  readonly role: V1Role;
  readonly a_player_name: string;
  readonly a_team: string;
  readonly a_champion: string;
  readonly a_result: 'WIN' | 'LOSE';
  readonly a_kills: number;
  readonly a_deaths: number;
  readonly a_assists: number;
  readonly a_gold: number;
  readonly b_player_name: string;
  readonly b_team: string;
  readonly b_champion: string;
  readonly b_result: 'WIN' | 'LOSE';
  readonly b_kills: number;
  readonly b_deaths: number;
  readonly b_assists: number;
  readonly b_gold: number;
}

export interface V1EditionParticipant {
  readonly edition_id: string;
  readonly player_id: string;
}

export interface V1Registration {
  readonly id: string;
  readonly edition_id: string;
  readonly discord_user_id: string;
  readonly pseudo: string;
  readonly role: string;
  readonly secondary_role: string | null;
  readonly rank: string | null;
  readonly opgg: string | null;
  readonly alt_riot_id: string | null;
  readonly speaks_english: boolean;
  readonly created_at: string;
}

export interface V1PlayerEventEntry {
  readonly id: string;
  readonly player_id: string;
  readonly edition_id: string;
  readonly event_type: string;
  readonly event_name: string;
  readonly date: string;
  readonly result: 'W' | 'L';
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
}
