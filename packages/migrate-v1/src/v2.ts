import type { EditionType, Prestige, Role } from '@arrakis/domain';

/**
 * Lignes v2 à insérer, une propriété par colonne SQL (même nom, voir la
 * migration initiale). `organization_id` est ajouté à l'écriture.
 */
export interface V2Rows {
  readonly seasons: readonly V2Season[];
  readonly splits: readonly V2Split[];
  readonly teams: readonly V2Team[];
  readonly players: readonly V2Player[];
  readonly player_aliases: readonly V2PlayerAlias[];
  readonly team_memberships: readonly V2TeamMembership[];
  readonly editions: readonly V2Edition[];
  readonly matches: readonly V2Match[];
  readonly performances: readonly V2Performance[];
  readonly edition_participants: readonly V2EditionParticipant[];
  readonly card_customizations: readonly V2CardCustomization[];
  readonly registrations: readonly V2Registration[];
}

export interface V2Season {
  readonly id: string;
  readonly name: string;
  readonly year: number;
}

export interface V2Split {
  readonly id: string;
  readonly season_id: string;
  readonly number: number;
  readonly name: string;
  readonly start_date: string | null;
  readonly end_date: string | null;
  readonly status: 'open' | 'closed';
}

export interface V2Team {
  readonly id: string;
  readonly tag: string;
  readonly name: string;
  readonly divisions: readonly string[];
  readonly logo_url: string | null;
  readonly archived_at: string | null;
}

export interface V2Player {
  readonly id: string;
  readonly nickname: string;
  readonly archived: boolean;
  readonly merged_into: string | null;
  readonly discord_user_id: string | null;
  readonly created_at: string;
}

export interface V2PlayerAlias {
  readonly player_id: string;
  readonly alias: string;
}

export interface V2TeamMembership {
  readonly player_id: string;
  readonly team_id: string;
  readonly status: 'starter' | 'sub';
  readonly joined_on: string;
  readonly left_on: null;
}

export interface V2Edition {
  readonly id: string;
  readonly name: string;
  readonly type: EditionType;
  readonly date: string;
  readonly split_id: string | null;
  readonly prestige: Prestige;
  readonly event_mvp_player_id: string | null;
  readonly display_number: number | null;
  readonly location: string | null;
  readonly url: string | null;
  readonly description: string | null;
  readonly arrakis_won: boolean | null;
  readonly source_file_hash: string | null;
  readonly created_at: string;
}

export interface V2Match {
  readonly id: string;
  readonly edition_id: string;
  readonly match_number: number;
  readonly winner_team: string;
  readonly duration_seconds: number;
  readonly matchday: number | null;
  readonly is_final: boolean;
}

export interface V2Performance {
  readonly match_id: string;
  readonly line: number;
  readonly side: 'A' | 'B';
  readonly player_id: string;
  readonly team: string;
  readonly role: Role;
  readonly champion: string;
  readonly result: 'win' | 'loss';
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly gold: number;
}

export interface V2EditionParticipant {
  readonly edition_id: string;
  readonly player_id: string;
}

export interface V2CardCustomization {
  readonly player_id: string;
  readonly title: string | null;
  readonly selected_badges: readonly string[];
  readonly background: string | null;
  readonly riot_accounts: readonly { readonly riotId: string; readonly main: boolean }[];
}

export interface V2Registration {
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
