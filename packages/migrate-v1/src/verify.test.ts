import { project, V1_RATING_RULES } from '@arrakis/domain';
import { describe, expect, it } from 'vitest';
import { planMigration } from './plan.ts';
import { aV1Dump, aV1Edition } from './testing/v1-builders.ts';
import { toFacts, verifyRatings, type V1Reference, type V1ReferencePlayer } from './verify.ts';

const plan = planMigration(aV1Dump({ editions: [aV1Edition({ mvp_player_name: 'Zéphyr' })] }));
const { rows } = plan;

/** La référence v1 telle que la v2 la recalcule : point de départ des tests. */
const reference = (): V1Reference => {
  const keyOf = new Map([...plan.playerIdByKey].map(([key, id]) => [id, key]));
  const ratings = project(toFacts(rows), V1_RATING_RULES).splitRatings;
  return {
    splits: [
      {
        splitId: 'split-1',
        players: ratings.map((r) => ({
          key: keyOf.get(r.playerId) ?? r.playerId,
          rating: r.rating.rating,
          impact: r.rating.impact,
          consistency: r.rating.consistency,
          clutch: r.rating.clutch,
          games: r.stats.games,
          wins: r.stats.wins,
          losses: r.stats.losses,
        })),
      },
    ],
  };
};

/** Remplace les joueurs de la référence. */
const withPlayers = (
  change: (players: readonly V1ReferencePlayer[]) => V1ReferencePlayer[],
): V1Reference => {
  const [split] = reference().splits;
  if (!split) throw new Error('Référence vide.');
  return { splits: [{ ...split, players: change(split.players) }] };
};

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

describe('verifyRatings (référence : le code v1 rejoué sur la sauvegarde)', () => {
  it('ne trouve aucun écart quand la v1 et la v2 concordent', () => {
    expect(verifyRatings(plan, reference())).toEqual([]);
  });

  it('signale chaque valeur qui diffère', () => {
    const v1 = withPlayers((players) =>
      players.map((p) => (p.key === 'zephyr' ? { ...p, rating: p.rating + 1, wins: 0 } : p)),
    );
    const zephyr = reference().splits[0]?.players.find((p) => p.key === 'zephyr');

    expect(verifyRatings(plan, v1)).toEqual([
      {
        playerId: 'player-zephyr',
        splitId: 'split-1',
        field: 'rating',
        v1: (zephyr?.rating ?? 0) + 1,
        v2: zephyr?.rating,
      },
      { playerId: 'player-zephyr', splitId: 'split-1', field: 'wins', v1: 0, v2: zephyr?.wins },
    ]);
  });

  it('signale un joueur noté d’un seul côté', () => {
    const v1 = withPlayers((players) =>
      players.map((p) => (p.key === 'zephyr' ? { ...p, key: 'fantome' } : p)),
    );

    expect(verifyRatings(plan, v1)).toEqual([
      { playerId: 'fantome', splitId: 'split-1', field: 'presence', v1: 'noté', v2: 'absent' },
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
