import type {
  V1Dump,
  V1Edition,
  V1Match,
  V1MatchRow,
  V1Player,
  V1Season,
  V1Split,
  V1Team,
} from '../v1.ts';

/** Fabriques de données v1 fictives : chaque test ne précise que ce qui compte pour lui. */

export const aV1Season = (overrides: Partial<V1Season> = {}): V1Season => ({
  id: 'season-1',
  name: 'Saison 1',
  year: 2026,
  ...overrides,
});

export const aV1Split = (overrides: Partial<V1Split> = {}): V1Split => ({
  id: 'split-1',
  season_id: 'season-1',
  number: 1,
  name: 'Split 1',
  start_date: '2026-01-01',
  end_date: null,
  is_active: true,
  ...overrides,
});

export const aV1Team = (overrides: Partial<V1Team> = {}): V1Team => ({
  id: 'team-ark',
  tag: 'ARK',
  name: 'Arrakis',
  divisions: ['div1'],
  logo_url: null,
  archived_at: null,
  ...overrides,
});

export const aV1Player = (overrides: Partial<V1Player> = {}): V1Player => ({
  id: 'player-zephyr',
  name: 'Zéphyr',
  archived: false,
  merged_into: null,
  discord_user_id: null,
  team_id: null,
  team_tag: null,
  status: 'starter',
  riot_id: null,
  customization: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const aV1Edition = (overrides: Partial<V1Edition> = {}): V1Edition => ({
  id: 'edition-1',
  season_id: 'season-1',
  split_id: 'split-1',
  name: 'Ligue #1 Div 1',
  type: 'ligue_div1',
  date: '2026-02-01',
  prestige: 'championship',
  mvp_player_name: null,
  display_number: 1,
  location: null,
  url: null,
  description: null,
  arrakis_won: null,
  source_file_hash: null,
  created_at: '2026-02-01T00:00:00Z',
  ...overrides,
});

export const aV1Match = (overrides: Partial<V1Match> = {}): V1Match => ({
  id: 'match-1',
  edition_id: 'edition-1',
  match_number: 1,
  team_a: 'ARK',
  team_b: 'DUN',
  winner: 'ARK',
  duration_display: '30:00',
  journee: null,
  is_final: false,
  ...overrides,
});

export const aV1Row = (overrides: Partial<V1MatchRow> = {}): V1MatchRow => ({
  id: 'row-1',
  match_id: 'match-1',
  role: 'TOP',
  a_player_name: 'Zéphyr',
  a_team: 'ARK',
  a_champion: 'Ornn',
  a_result: 'WIN',
  a_kills: 3,
  a_deaths: 1,
  a_assists: 7,
  a_gold: 12000,
  b_player_name: 'Sirocco',
  b_team: 'DUN',
  b_champion: 'Gnar',
  b_result: 'LOSE',
  b_kills: 1,
  b_deaths: 3,
  b_assists: 2,
  b_gold: 9000,
  ...overrides,
});

/** Une sauvegarde minimale et cohérente : une saison, un split, une édition, un match d'une ligne. */
export const aV1Dump = (overrides: Partial<V1Dump> = {}): V1Dump => ({
  seasons: [aV1Season()],
  splits: [aV1Split()],
  teams: [aV1Team(), aV1Team({ id: 'team-dun', tag: 'DUN', name: 'Dune' })],
  players: [
    aV1Player({ team_id: 'team-ark', team_tag: 'ARK' }),
    aV1Player({ id: 'player-sirocco', name: 'Sirocco', team_id: 'team-dun', team_tag: 'DUN' }),
  ],
  editions: [aV1Edition()],
  matches: [aV1Match()],
  match_rows: [aV1Row()],
  edition_participants: [],
  registrations: [],
  player_event_entries: [],
  player_split_stats: [],
  ...overrides,
});
