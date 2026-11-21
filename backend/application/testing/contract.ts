import { E1_E2_RATING_RULES, project, type Facts, type RatingRules } from '../../domain/index.ts';
import { describe, expect, it } from 'vitest';
import { toFacts, type FactRows } from '../facts.ts';
import { recomputeProjections, type RecomputePorts } from '../recompute.ts';
import { FIXTURE_ROWS } from './fixture.ts';

/** Ce qu'une implémentation des ports fournit à la suite de contrat. */
export interface ContractHarness {
  readonly ports: RecomputePorts;
  /** Crée une organisation avec ces règles et ces faits, et rend son identifiant. */
  readonly seed: (rules: RatingRules, rows: FactRows) => Promise<string>;
  /** Le nombre de lignes de chaque projection écrite pour l'organisation. */
  readonly countProjections: (organizationId: string) => Promise<ProjectionCounts>;
}

export interface ProjectionCounts {
  readonly seasonRatings: number;
  readonly editionHistory: number;
  readonly editionStandings: number;
}

/** Un identifiant qu'aucune organisation ne porte. */
const UNKNOWN_ORGANIZATION = '00000000-0000-4000-8000-0000000000ff';

/**
 * Les mêmes tests, contre chaque implémentation des ports du recalcul (en
 * mémoire et Postgres), pour qu'elles ne divergent pas (ADR 0023).
 */
export function describeRecomputePortsContract(name: string, harness: () => ContractHarness): void {
  describe(`ports du recalcul : ${name}`, () => {
    it('rend les faits de l’organisation, tels qu’écrits', async () => {
      const { ports, seed } = harness();
      const organizationId = await seed(E1_E2_RATING_RULES, FIXTURE_ROWS);

      const facts = await ports.facts.readFacts(organizationId);

      expect(sorted(facts)).toEqual(sorted(toFacts(FIXTURE_ROWS)));
    });

    it('ne rend aucun fait pour une organisation qui n’en a pas', async () => {
      const facts = await harness().ports.facts.readFacts(UNKNOWN_ORGANIZATION);

      expect(facts).toEqual({
        seasons: [],
        editions: [],
        matches: [],
        performances: [],
        players: [],
      });
    });

    it('rend les règles de note de l’organisation, et refuse une organisation inconnue', async () => {
      const { ports, seed } = harness();
      const organizationId = await seed(E1_E2_RATING_RULES, FIXTURE_ROWS);

      expect(await ports.organizations.ratingRules(organizationId)).toBe(E1_E2_RATING_RULES);
      await expect(ports.organizations.ratingRules(UNKNOWN_ORGANIZATION)).rejects.toThrow(
        'introuvable',
      );
    });

    it('le recalcul remplace les projections au lieu de les ajouter', async () => {
      const { ports, seed, countProjections } = harness();
      const organizationId = await seed(E1_E2_RATING_RULES, FIXTURE_ROWS);
      const expected = project(toFacts(FIXTURE_ROWS), E1_E2_RATING_RULES);

      await recomputeProjections(ports, organizationId);
      await recomputeProjections(ports, organizationId);

      expect(await countProjections(organizationId)).toEqual({
        seasonRatings: expected.seasonRatings.length,
        editionHistory: expected.editionHistory.length,
        editionStandings: expected.editionStandings.flatMap((s) => s.rows).length,
      });
    });
  });
}

/** Les faits rangés dans un ordre fixe : une base ne garantit pas l'ordre des lignes. */
function sorted(facts: Facts): Facts {
  const byJson = <T>(list: readonly T[]) =>
    list.toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return {
    seasons: byJson(facts.seasons),
    editions: byJson(facts.editions),
    matches: byJson(facts.matches),
    performances: byJson(facts.performances),
    players: byJson(facts.players),
  };
}
