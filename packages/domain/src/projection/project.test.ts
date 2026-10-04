import { describe, expect, it } from 'vitest';
import { computeRating } from '../rating/rating.ts';
import { V1_RATING_RULES, type RatingRules } from '../rating/rules.ts';
import { computePlayerStats } from '../stats/stats.ts';
import type { EditionFact, Facts, MatchFact, PerformanceFact } from '../facts.ts';
import { project } from './project.ts';

// ── Constructeur de faits lisible : éditions → matchs → performances ─────────

interface PerfSpec extends Partial<Omit<PerformanceFact, 'matchId' | 'line'>> {
  readonly playerId: string;
}

let sequence = 0;

function anEdition(
  overrides: Partial<EditionFact>,
  matches: PerfSpec[][],
  matchOverrides: Partial<MatchFact> = {},
): Pick<Facts, 'editions' | 'matches' | 'performances'> {
  const edition: EditionFact = {
    id: `e${++sequence}`,
    type: 'league_div1',
    date: '2026-01-01',
    splitId: 's1',
    prestige: 'normal',
    ...overrides,
  };
  const matchFacts = matches.map((_, i) => ({
    id: `${edition.id}-m${i + 1}`,
    editionId: edition.id,
    matchNumber: i + 1,
    winnerTeam: 'ARK',
    durationSeconds: 1800,
    ...matchOverrides,
  }));
  const performances = matches.flatMap((perfs, i) =>
    perfs.map((p, line): PerformanceFact => ({
      matchId: `${edition.id}-m${i + 1}`,
      line,
      side: 'A',
      team: 'ARK',
      role: 'MID',
      champion: 'Ahri',
      result: 'win',
      kills: 0,
      deaths: 0,
      assists: 0,
      gold: 0,
      ...p,
    })),
  );
  return { editions: [edition], matches: matchFacts, performances };
}

function facts(...parts: Pick<Facts, 'editions' | 'matches' | 'performances'>[]): Facts {
  const ids = new Set(parts.flatMap((p) => p.performances.map((x) => x.playerId)));
  return {
    splits: [
      { id: 's1', seasonId: 'season-1', number: 1 },
      { id: 's2', seasonId: 'season-2', number: 1 },
    ],
    editions: parts.flatMap((p) => p.editions),
    matches: parts.flatMap((p) => p.matches),
    performances: parts.flatMap((p) => p.performances),
    players: [...ids].map((id) => ({ id, nickname: id })),
  };
}

const ratingOf = (playerId: string, splitId: string, projections: ReturnType<typeof project>) =>
  projections.splitRatings.find((r) => r.playerId === playerId && r.splitId === splitId);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('project', () => {
  it('sans faits, aucune projection', () => {
    expect(project(facts(), V1_RATING_RULES)).toEqual({
      splitRatings: [],
      editionHistory: [],
      editionStandings: [],
    });
  });

  describe('notes par split', () => {
    it('chaque split a sa propre note, calculée sur ses seules performances', () => {
      const projections = project(
        facts(
          anEdition({ splitId: 's1' }, [[{ playerId: 'meta', kills: 9, deaths: 1 }]]),
          anEdition({ splitId: 's2' }, [[{ playerId: 'meta', result: 'loss', deaths: 5 }]]),
        ),
        V1_RATING_RULES,
      );

      const s1 = computeRating([
        { role: 'MID', result: 'win', kills: 9, deaths: 1, assists: 0, weight: 1 },
      ]);
      const s2 = computeRating([
        { role: 'MID', result: 'loss', kills: 0, deaths: 5, assists: 0, weight: 1 },
      ]);
      expect(ratingOf('meta', 's1', projections)).toMatchObject({ rating: s1 });
      expect(ratingOf('meta', 's2', projections)).toMatchObject({ rating: s2 });
    });

    it('les statistiques affichées incluent le GPM, déduit de l’or et de la durée', () => {
      const projections = project(
        facts(anEdition({}, [[{ playerId: 'meta', gold: 12_000 }]], { durationSeconds: 1500 })),
        V1_RATING_RULES,
      );

      expect(ratingOf('meta', 's1', projections)?.stats).toMatchObject({
        avgGold: 12_000,
        avgGpm: 480,
      });
    });

    it('le poids de chaque édition vient des règles de note', () => {
      const doubleLeague: RatingRules = {
        weightOf: (e) => (e.type === 'league_div1' ? 2 : 1),
        countsTowardRating: () => true,
      };
      const projections = project(
        facts(
          anEdition({ type: 'league_div1' }, [[{ playerId: 'meta', result: 'win' }]]),
          anEdition({ type: 'tournament' }, [[{ playerId: 'meta', result: 'loss' }]]),
        ),
        doubleLeague,
      );

      const expected = computeRating([
        { role: 'MID', result: 'win', kills: 0, deaths: 0, assists: 0, weight: 2 },
        { role: 'MID', result: 'loss', kills: 0, deaths: 0, assists: 0, weight: 1 },
      ]);
      expect(ratingOf('meta', 's1', projections)?.rating).toEqual(expected);
    });

    it('une édition exclue par les règles ne compte pas dans la note', () => {
      const withoutInhouse: RatingRules = {
        ...V1_RATING_RULES,
        countsTowardRating: (e) => e.type !== 'inhouse',
      };
      const projections = project(
        facts(
          anEdition({ type: 'league_div1' }, [[{ playerId: 'meta' }]]),
          anEdition({ type: 'inhouse' }, [[{ playerId: 'meta', result: 'loss' }]]),
        ),
        withoutInhouse,
      );

      expect(ratingOf('meta', 's1', projections)?.stats.games).toBe(1);
    });

    it('un joueur qui n’a joué que des éditions exclues n’a pas de note pour ce split', () => {
      const withoutInhouse: RatingRules = {
        ...V1_RATING_RULES,
        countsTowardRating: (e) => e.type !== 'inhouse',
      };

      const projections = project(
        facts(anEdition({ type: 'inhouse' }, [[{ playerId: 'meta' }]])),
        withoutInhouse,
      );

      expect(projections.splitRatings).toEqual([]);
    });

    it('une édition hors split ne produit pas de note de split', () => {
      const projections = project(
        facts(anEdition({ splitId: null }, [[{ playerId: 'meta' }]])),
        V1_RATING_RULES,
      );

      expect(projections.splitRatings).toEqual([]);
    });

    it('les performances sont prises dans l’ordre chronologique, pas dans l’ordre de stockage (anomalie A5)', () => {
      const projections = project(
        facts(
          anEdition({ date: '2026-03-01' }, [
            [{ playerId: 'meta', result: 'win' }],
            [{ playerId: 'meta', result: 'win' }],
          ]),
          anEdition({ date: '2026-01-01' }, [
            [{ playerId: 'meta', result: 'loss' }],
            [{ playerId: 'meta', result: 'loss' }],
          ]),
        ),
        V1_RATING_RULES,
      );

      expect(ratingOf('meta', 's1', projections)?.stats.recentForm).toBe('up');
    });

    describe('note précédente : avant la dernière édition du split', () => {
      const earlier = anEdition({ date: '2026-01-01' }, [
        [
          { playerId: 'regular', result: 'loss' },
          { playerId: 'absent', result: 'win' },
        ],
      ]);
      const latest = anEdition({ date: '2026-02-01' }, [
        [{ playerId: 'regular', result: 'win', kills: 10 }, { playerId: 'newcomer' }],
      ]);
      const projections = project(facts(earlier, latest), V1_RATING_RULES);

      it('est la note calculée sans la dernière édition', () => {
        const before = computeRating([
          { role: 'MID', result: 'loss', kills: 0, deaths: 0, assists: 0, weight: 1 },
        ]);
        expect(ratingOf('regular', 's1', projections)?.previousRating).toBe(before.rating);
      });

      it('est absente pour un joueur dont c’est la première édition', () => {
        expect(ratingOf('newcomer', 's1', projections)?.previousRating).toBeNull();
      });

      it('égale la note actuelle pour un joueur absent de la dernière édition', () => {
        const absent = ratingOf('absent', 's1', projections);
        expect(absent?.previousRating).toBe(absent?.rating.rating);
      });
    });
  });

  describe('historique par édition', () => {
    it('une entrée par édition jouée, avec la note de carrière cumulée jusqu’à elle', () => {
      const first = anEdition({ date: '2026-01-01', splitId: 's1' }, [
        [{ playerId: 'meta', kills: 4, deaths: 1 }],
      ]);
      const second = anEdition({ date: '2026-06-01', splitId: 's2' }, [
        [{ playerId: 'meta', result: 'loss', deaths: 3, assists: 2 }],
        [{ playerId: 'meta', result: 'loss' }],
      ]);

      const { editionHistory } = project(facts(second, first), V1_RATING_RULES);

      const perf = { role: 'MID', kills: 0, deaths: 0, assists: 0, weight: 1 } as const;
      const afterFirst = computeRating([{ ...perf, result: 'win', kills: 4, deaths: 1 }]);
      const afterSecond = computeRating([
        { ...perf, result: 'win', kills: 4, deaths: 1 },
        { ...perf, result: 'loss', deaths: 3, assists: 2 },
        { ...perf, result: 'loss' },
      ]);
      expect(editionHistory).toEqual([
        {
          playerId: 'meta',
          editionId: first.editions[0]?.id,
          careerRating: afterFirst.rating,
          result: 'win',
          stats: computePlayerStats([
            { result: 'win', kills: 4, deaths: 1, assists: 0, gold: 0, gpm: 0 },
          ]),
        },
        {
          playerId: 'meta',
          editionId: second.editions[0]?.id,
          careerRating: afterSecond.rating,
          result: 'loss',
          stats: expect.objectContaining({ games: 2, wins: 0 }) as unknown,
        },
      ]);
    });

    it('une édition est gagnée si le joueur a gagné plus de la moitié de ses matchs', () => {
      const tied = anEdition({}, [
        [{ playerId: 'meta', result: 'win' }],
        [{ playerId: 'meta', result: 'loss' }],
      ]);

      const { editionHistory } = project(facts(tied), V1_RATING_RULES);

      expect(editionHistory[0]?.result).toBe('loss');
    });
  });

  it('calcule le classement de chaque édition avec son MVP et son barème', () => {
    const edition = anEdition({ eventMvpPlayerId: 'zed' }, [
      [
        { playerId: 'meta', result: 'win' },
        { playerId: 'zed', side: 'B', result: 'loss' },
      ],
    ]);

    const { editionStandings } = project(facts(edition), V1_RATING_RULES);

    expect(editionStandings).toEqual([
      {
        editionId: edition.editions[0]?.id,
        rows: [
          expect.objectContaining({ rank: 1, playerId: 'zed', points: -3 + 10 }) as unknown,
          expect.objectContaining({ rank: 2, playerId: 'meta', points: 5 }) as unknown,
        ],
      },
    ]);
  });

  it('ne dépend pas de l’ordre dans lequel les faits sont stockés (ADR 0003)', () => {
    const all = facts(
      anEdition({ date: '2026-01-01' }, [
        [
          { playerId: 'meta', kills: 3 },
          { playerId: 'zed', side: 'B', result: 'loss' },
        ],
        [
          { playerId: 'meta', result: 'loss' },
          { playerId: 'zed', side: 'B', deaths: 2 },
        ],
      ]),
      anEdition({ date: '2026-02-01', splitId: 's2' }, [[{ playerId: 'zed', assists: 7 }]]),
    );
    const reversed: Facts = {
      splits: [...all.splits].reverse(),
      editions: [...all.editions].reverse(),
      matches: [...all.matches].reverse(),
      performances: [...all.performances].reverse(),
      players: [...all.players].reverse(),
    };

    expect(project(reversed, V1_RATING_RULES)).toEqual(project(all, V1_RATING_RULES));
  });

  describe('cas limites', () => {
    it('une performance dont le match est inconnu est ignorée', () => {
      const edition = anEdition({}, [[{ playerId: 'meta' }]]);
      const orphan = {
        ...edition.performances[0],
        matchId: 'missing',
        playerId: 'ghost',
      } as PerformanceFact;

      const projections = project(
        facts(edition, { editions: [], matches: [], performances: [orphan] }),
        V1_RATING_RULES,
      );

      expect(projections.splitRatings.map((r) => r.playerId)).toEqual(['meta']);
    });

    it('une édition sans match (événement externe) ne produit ni historique ni classement', () => {
      const external = anEdition({ type: 'external_lan' }, []);

      expect(project(facts(external), V1_RATING_RULES)).toEqual({
        splitRatings: [],
        editionHistory: [],
        editionStandings: [],
      });
    });

    it('sans durée connue, le GPM vaut 0', () => {
      const projections = project(
        facts(anEdition({}, [[{ playerId: 'meta', gold: 9000 }]], { durationSeconds: 0 })),
        V1_RATING_RULES,
      );

      expect(ratingOf('meta', 's1', projections)?.stats.avgGpm).toBe(0);
    });

    it('le MVP de match et le barème de l’édition sont transmis au classement de soirée', () => {
      const edition = anEdition(
        { scoring: { win: 1, loss: 0, kill: 0, assist: 0, death: 0, mvpEvent: 0, mvpMatch: 100 } },
        [[{ playerId: 'meta' }]],
        { mvpPlayerId: 'meta' },
      );

      const { editionStandings } = project(facts(edition), V1_RATING_RULES);

      expect(editionStandings[0]?.rows[0]).toMatchObject({ matchMvpCount: 1, points: 101 });
    });
  });
});
