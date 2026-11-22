import type { FactRows } from '#application/facts.ts';

/**
 * Une petite organisation : une saison, une ligue d'un match où Zéphyr (MVP de
 * soirée) bat Sirocco, et une soirée hors saison sans match ni MVP. Des
 * identifiants UUID, pour qu'elle s'écrive aussi dans Postgres.
 */
export const SEASON_ID = '00000000-0000-4000-8000-00000000a001';
export const LEAGUE_ID = '00000000-0000-4000-8000-00000000b001';
export const OFF_SEASON_ID = '00000000-0000-4000-8000-00000000b002';
export const MATCH_ID = '00000000-0000-4000-8000-00000000c001';
export const ZEPHYR_ID = '00000000-0000-4000-8000-00000000d001';
export const SIROCCO_ID = '00000000-0000-4000-8000-00000000d002';

export const FIXTURE_ROWS: FactRows = {
  seasons: [{ id: SEASON_ID }],
  editions: [
    {
      id: LEAGUE_ID,
      type: 'league_div1',
      date: '2026-02-01',
      season_id: SEASON_ID,
      prestige: 'championship',
      event_mvp_player_id: ZEPHYR_ID,
    },
    {
      id: OFF_SEASON_ID,
      type: 'inhouse',
      date: '2026-03-01',
      season_id: null,
      prestige: 'normal',
      event_mvp_player_id: null,
    },
  ],
  matches: [
    {
      id: MATCH_ID,
      edition_id: LEAGUE_ID,
      match_number: 1,
      winner_team: 'ARK',
      duration_seconds: 1800,
    },
  ],
  performances: [
    {
      match_id: MATCH_ID,
      line: 0,
      side: 'A',
      player_id: ZEPHYR_ID,
      team: 'ARK',
      role: 'TOP',
      champion: 'Ornn',
      result: 'win',
      kills: 3,
      deaths: 1,
      assists: 7,
      gold: 12000,
    },
    {
      match_id: MATCH_ID,
      line: 0,
      side: 'B',
      player_id: SIROCCO_ID,
      team: 'VNT',
      role: 'TOP',
      champion: 'Sion',
      result: 'loss',
      kills: 1,
      deaths: 3,
      assists: 2,
      gold: 9000,
    },
  ],
  players: [
    { id: ZEPHYR_ID, nickname: 'Zéphyr' },
    { id: SIROCCO_ID, nickname: 'Sirocco' },
  ],
};
