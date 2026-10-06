import { project, V1_RATING_RULES } from '@arrakis/domain';
import { describe, expect, it } from 'vitest';
import { planMigration } from './plan.ts';
import { aV1Dump, aV1Edition } from './testing/v1-builders.ts';
import type { V1PlayerSplitStats } from './v1.ts';
import { toFacts, verifyRatings } from './verify.ts';

const { rows } = planMigration(aV1Dump({ editions: [aV1Edition({ mvp_player_name: 'Zéphyr' })] }));

/** Zéphyr d'un côté, les autres joueurs de l'autre. */
const splitZephyr = () => {
  const all = asV1();
  const zephyr = all.find((s) => s.player_id === 'player-zephyr');
  if (!zephyr) throw new Error('Zéphyr absent des notes recalculées.');
  return { zephyr, others: all.filter((s) => s !== zephyr) };
};

/** Les statistiques v1 telles que la v2 les recalcule : point de départ des tests. */
const asV1 = (): V1PlayerSplitStats[] =>
  project(toFacts(rows), V1_RATING_RULES).splitRatings.map((r) => ({
    player_id: r.playerId,
    split_id: r.splitId,
    rating: r.rating.rating,
    impact: r.rating.impact,
    consistance: r.rating.consistency,
    clutch: r.rating.clutch,
    tier: r.rating.tier,
    games: r.stats.games,
    wins: r.stats.wins,
    losses: r.stats.losses,
  }));

describe('toFacts', () => {
  it('traduit les lignes v2 en faits du domaine', () => {
    const facts = toFacts(rows);

    expect(facts.splits).toEqual([{ id: 'split-1', seasonId: 'season-1', number: 1 }]);
    expect(facts.editions).toEqual([
      {
        id: 'edition-1',
        type: 'league_div1',
        date: '2026-02-01',
        splitId: 'split-1',
        prestige: 'championship',
        eventMvpPlayerId: 'player-zephyr',
      },
    ]);
    expect(facts.matches).toEqual([
      {
        id: 'match-1',
        editionId: 'edition-1',
        matchNumber: 1,
        winnerTeam: 'ARK',
        durationSeconds: 1800,
      },
    ]);
    expect(facts.performances[0]).toEqual({
      matchId: 'match-1',
      line: 0,
      side: 'A',
      playerId: 'player-zephyr',
      team: 'ARK',
      role: 'TOP',
      champion: 'Ornn',
      result: 'win',
      kills: 3,
      deaths: 1,
      assists: 7,
      gold: 12000,
    });
    expect(facts.players).toContainEqual({ id: 'player-zephyr', nickname: 'Zéphyr' });
  });

  it('omet le MVP de soirée quand il n’y en a pas', () => {
    const facts = toFacts(planMigration(aV1Dump()).rows);

    expect(facts.editions[0]).not.toHaveProperty('eventMvpPlayerId');
  });
});

describe('verifyRatings', () => {
  it('ne trouve aucun écart quand la v1 et la v2 concordent', () => {
    expect(verifyRatings(rows, asV1())).toEqual([]);
  });

  it('ignore les lignes v1 sans partie', () => {
    const { zephyr } = splitZephyr();
    const v1 = [...asV1(), { ...zephyr, player_id: 'idle', games: 0, wins: 0, losses: 0 }];

    expect(verifyRatings(rows, v1)).toEqual([]);
  });

  it('signale chaque valeur qui diffère', () => {
    const { zephyr, others } = splitZephyr();
    const v1 = [{ ...zephyr, rating: zephyr.rating + 1, wins: 0 }, ...others];

    expect(verifyRatings(rows, v1)).toEqual([
      {
        playerId: 'player-zephyr',
        splitId: 'split-1',
        field: 'rating',
        v1: zephyr.rating + 1,
        v2: zephyr.rating,
      },
      { playerId: 'player-zephyr', splitId: 'split-1', field: 'wins', v1: 0, v2: zephyr.wins },
    ]);
  });

  it('signale un joueur noté d’un seul côté', () => {
    const { zephyr, others } = splitZephyr();
    const v1 = [...others, { ...zephyr, player_id: 'ghost' }];

    expect(verifyRatings(rows, v1)).toEqual([
      { playerId: 'ghost', splitId: 'split-1', field: 'presence', v1: 'noté', v2: 'absent' },
      {
        playerId: 'player-zephyr',
        splitId: 'split-1',
        field: 'presence',
        v1: 'absent',
        v2: 'noté',
      },
    ]);
  });
});
