import { toFacts } from '../application/index.ts';
import {
  FIXTURE_ROWS,
  LEAGUE_ID,
  SEASON_ID,
  SIROCCO_ID,
  ZEPHYR_ID,
} from '../application/testing/index.ts';
import { project, V1_RATING_RULES } from '../domain/index.ts';
import { describe, expect, it } from 'vitest';
import { toProjectionRows } from './projections.ts';

/** Une saison, une ligue d'un match d'une ligne : Zéphyr gagne 3/1/7, Sirocco perd 1/3/2. */
const rows = toProjectionRows(project(toFacts(FIXTURE_ROWS), V1_RATING_RULES));

describe('toProjectionRows', () => {
  it('écrit une note par joueur et par saison, avec ses statistiques', () => {
    const winner = rows.player_season_ratings.find((r) => r.player_id === ZEPHYR_ID);

    expect(winner).toMatchObject({
      season_id: SEASON_ID,
      games: 1,
      wins: 1,
      losses: 0,
      winrate: 100,
      kda: 10,
      kills: 3,
      deaths: 1,
      assists: 7,
      recent_form: 'stable',
      previous_rating: null,
    });
    expect(rows.player_season_ratings).toHaveLength(2);
  });

  it('écrit une ligne d’historique par joueur et par édition', () => {
    const loser = rows.player_edition_history.find((h) => h.player_id === SIROCCO_ID);

    expect(loser).toMatchObject({ edition_id: LEAGUE_ID, result: 'loss', games: 1, wins: 0 });
  });

  it('écrit le classement de soirée, une ligne par joueur, avec son rang et ses points', () => {
    const ranks = rows.edition_standings.map((s) => [s.player_id, s.rank]);

    expect(ranks).toEqual([
      [ZEPHYR_ID, 1],
      [SIROCCO_ID, 2],
    ]);
    expect(rows.edition_standings[0]).toMatchObject({ team: 'ARK', champion: 'Ornn', wins: 1 });
  });
});
