import { project, V1_RATING_RULES } from '@arrakis/domain';
import { describe, expect, it } from 'vitest';
import { planMigration, type MigrationPlan } from './plan.ts';
import {
  aV1Dump,
  aV1Edition,
  aV1Match,
  aV1Row,
  aV1Season,
  aV1Split,
} from './testing/v1-builders.ts';
import { toFacts, verifyRatings, type V1Reference, type V1ReferencePlayer } from './verify.ts';

const plan = planMigration(aV1Dump({ editions: [aV1Edition({ mvp_player_name: 'Zéphyr' })] }));
const { rows } = plan;

/**
 * La référence v1 d'un plan, telle que la v2 la recalcule : point de départ
 * des tests. Elle garde le vocabulaire de la v1, qui note par split : chaque
 * saison v2 y redevient le split v1 dont elle vient.
 */
const referenceOf = (migration: MigrationPlan): V1Reference => {
  const keyOf = new Map([...migration.playerIdByKey].map(([key, id]) => [id, key]));
  const ratings = project(toFacts(migration.rows), V1_RATING_RULES).seasonRatings;
  return {
    splits: [...migration.seasonIdBySplitId].map(([splitId, seasonId]) => ({
      splitId,
      players: ratings
        .filter((r) => r.seasonId === seasonId)
        .map((r) => ({
          key: keyOf.get(r.playerId) ?? r.playerId,
          rating: r.rating.rating,
          impact: r.rating.impact,
          consistency: r.rating.consistency,
          clutch: r.rating.clutch,
          games: r.stats.games,
          wins: r.stats.wins,
          losses: r.stats.losses,
        })),
    })),
  };
};

const reference = (): V1Reference => referenceOf(plan);

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

    expect(facts.seasons).toEqual([{ id: 'season-1' }]);
    expect(facts.editions).toEqual([
      {
        id: 'edition-1',
        type: 'league_div1',
        date: '2026-02-01',
        seasonId: 'season-1',
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
        seasonId: 'season-1',
        field: 'rating',
        v1: (zephyr?.rating ?? 0) + 1,
        v2: zephyr?.rating,
      },
      { playerId: 'player-zephyr', seasonId: 'season-1', field: 'wins', v1: 0, v2: zephyr?.wins },
    ]);
  });

  it('signale un joueur noté d’un seul côté', () => {
    const v1 = withPlayers((players) =>
      players.map((p) => (p.key === 'zephyr' ? { ...p, key: 'fantome' } : p)),
    );

    expect(verifyRatings(plan, v1)).toEqual([
      { playerId: 'fantome', seasonId: 'season-1', field: 'presence', v1: 'noté', v2: 'absent' },
      {
        playerId: 'player-zephyr',
        seasonId: 'season-1',
        field: 'presence',
        v1: 'absent',
        v2: 'noté',
      },
    ]);
  });

  describe('deux saisons, chacune venue d’un split v1', () => {
    // Zéphyr gagne en saison 1 et perd en saison 2 : ses deux notes diffèrent.
    const twoSeasons = planMigration(
      aV1Dump({
        seasons: [aV1Season(), aV1Season({ id: 'season-2', name: 'Saison 2', year: 2027 })],
        splits: [
          aV1Split({ is_active: false }),
          aV1Split({ id: 'split-2', season_id: 'season-2', start_date: '2027-01-01' }),
        ],
        editions: [
          aV1Edition(),
          aV1Edition({
            id: 'edition-2',
            season_id: 'season-2',
            split_id: 'split-2',
            date: '2027-02-01',
            display_number: 2,
          }),
        ],
        matches: [aV1Match(), aV1Match({ id: 'match-2', edition_id: 'edition-2', winner: 'DUN' })],
        match_rows: [
          aV1Row(),
          aV1Row({ id: 'row-2', match_id: 'match-2', a_result: 'LOSE', b_result: 'WIN' }),
        ],
      }),
    );

    it('compare chaque split de la référence à la saison qui le contenait', () => {
      const v1 = referenceOf(twoSeasons);

      expect(v1.splits.map((s) => s.splitId)).toEqual(['split-1', 'split-2']);
      expect(verifyRatings(twoSeasons, v1)).toEqual([]);
    });

    it('trouve des écarts si les notes de deux splits sont interverties', () => {
      const [first, second] = referenceOf(twoSeasons).splits;
      if (!first || !second) throw new Error('Référence incomplète.');
      const swapped: V1Reference = {
        splits: [
          { ...first, players: second.players },
          { ...second, players: first.players },
        ],
      };

      const seasons = new Set(verifyRatings(twoSeasons, swapped).map((d) => d.seasonId));

      expect(seasons).toEqual(new Set(['season-1', 'season-2']));
    });
  });

  it('laisse hors de la comparaison une édition hors saison', () => {
    const withOutsider = planMigration(
      aV1Dump({
        editions: [
          aV1Edition(),
          aV1Edition({ id: 'edition-2', split_id: null, display_number: 2 }),
        ],
        matches: [aV1Match(), aV1Match({ id: 'match-2', edition_id: 'edition-2' })],
        match_rows: [aV1Row(), aV1Row({ id: 'row-2', match_id: 'match-2', a_kills: 20 })],
      }),
    );

    expect(verifyRatings(withOutsider, reference())).toEqual([]);
  });

  it('s’arrête si la référence cite un split absent de la sauvegarde', () => {
    const v1: V1Reference = { splits: [{ splitId: 'fantome', players: [] }] };

    expect(() => verifyRatings(plan, v1)).toThrow(
      'Référence v1 : split fantome inconnu de la sauvegarde.',
    );
  });
});
