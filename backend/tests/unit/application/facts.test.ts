import { describe, expect, it } from 'vitest';
import { toFacts } from '#application/facts.ts';
import {
  FIXTURE_ROWS,
  LEAGUE_ID,
  MATCH_ID,
  OFF_SEASON_ID,
  SEASON_ID,
  ZEPHYR_ID,
} from '#support/application/fixture.ts';

describe('toFacts', () => {
  const facts = toFacts(FIXTURE_ROWS);

  it('traduit les lignes en faits du domaine, colonne par colonne', () => {
    expect(facts.seasons).toEqual([{ id: SEASON_ID }]);
    expect(facts.matches).toEqual([
      {
        id: MATCH_ID,
        editionId: LEAGUE_ID,
        matchNumber: 1,
        winnerTeam: 'ARK',
        durationSeconds: 1800,
      },
    ]);
    expect(facts.performances[0]).toEqual({
      matchId: MATCH_ID,
      line: 0,
      side: 'A',
      playerId: ZEPHYR_ID,
      team: 'ARK',
      role: 'TOP',
      champion: 'Ornn',
      result: 'win',
      kills: 3,
      deaths: 1,
      assists: 7,
      gold: 12000,
    });
    expect(facts.players).toContainEqual({ id: ZEPHYR_ID, nickname: 'Zéphyr' });
  });

  it('garde le MVP de soirée quand il existe, et l’omet sinon', () => {
    expect(facts.editions).toEqual([
      {
        id: LEAGUE_ID,
        type: 'league_div1',
        date: '2026-02-01',
        seasonId: SEASON_ID,
        prestige: 'championship',
        eventMvpPlayerId: ZEPHYR_ID,
      },
      {
        id: OFF_SEASON_ID,
        type: 'inhouse',
        date: '2026-03-01',
        seasonId: null,
        prestige: 'normal',
      },
    ]);
  });
});
