import { project, V1_RATING_RULES } from '@arrakis/domain';
import { describe, expect, it } from 'vitest';
import { planMigration } from '../plan.ts';
import { aV1Dump } from '../testing/v1-builders.ts';
import { toFacts } from '../verify.ts';
import { toProjectionRows } from './projection-rows.ts';

/** Une saison, une édition, un match d'une ligne : Zéphyr gagne 3/1/7, Sirocco perd 1/3/2. */
const rows = toProjectionRows(project(toFacts(planMigration(aV1Dump()).rows), V1_RATING_RULES));

describe('toProjectionRows', () => {
  it('écrit une note par joueur et par saison, avec ses statistiques', () => {
    const winner = rows.player_season_ratings.find((r) => r.player_id === 'player-zephyr');

    expect(winner).toMatchObject({
      season_id: 'season-1',
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
    const loser = rows.player_edition_history.find((h) => h.player_id === 'player-sirocco');

    expect(loser).toMatchObject({ edition_id: 'edition-1', result: 'loss', games: 1, wins: 0 });
  });

  it('écrit le classement de soirée, une ligne par joueur, avec son rang et ses points', () => {
    const ranks = rows.edition_standings.map((s) => [s.player_id, s.rank]);

    expect(ranks).toEqual([
      ['player-zephyr', 1],
      ['player-sirocco', 2],
    ]);
    expect(rows.edition_standings[0]).toMatchObject({ team: 'ARK', champion: 'Ornn', wins: 1 });
  });
});
