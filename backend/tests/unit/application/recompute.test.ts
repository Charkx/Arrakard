import { project, V1_RATING_RULES } from '#domain/index.ts';
import { describe, expect, it } from 'vitest';
import { toFacts } from '#application/facts.ts';
import { recomputeProjections } from '#application/recompute.ts';
import { describeRecomputePortsContract } from '#support/application/contract.ts';
import { FIXTURE_ROWS } from '#support/application/fixture.ts';
import { inMemoryStore } from '#support/application/in-memory.ts';

const ORGANIZATION = '00000000-0000-4000-8000-000000000001';

describe('recomputeProjections', () => {
  it('écrit les projections que le domaine calcule, avec les règles de l’organisation', async () => {
    const store = inMemoryStore();
    store.addOrganization(ORGANIZATION, V1_RATING_RULES, toFacts(FIXTURE_ROWS));

    await recomputeProjections(store, ORGANIZATION);

    expect(store.projectionsOf(ORGANIZATION)).toEqual(
      project(toFacts(FIXTURE_ROWS), V1_RATING_RULES),
    );
  });

  it('n’écrit rien pour une organisation inconnue', async () => {
    const store = inMemoryStore();

    await expect(recomputeProjections(store, ORGANIZATION)).rejects.toThrow('introuvable');
    expect(store.projectionsOf(ORGANIZATION)).toBeUndefined();
  });
});

describeRecomputePortsContract('en mémoire', () => {
  const store = inMemoryStore();
  return {
    ports: store,
    seed(rules, rows) {
      const organizationId = crypto.randomUUID();
      store.addOrganization(organizationId, rules, toFacts(rows));
      return Promise.resolve(organizationId);
    },
    countProjections(organizationId) {
      const projections = store.projectionsOf(organizationId);
      return Promise.resolve({
        seasonRatings: projections?.seasonRatings.length ?? 0,
        editionHistory: projections?.editionHistory.length ?? 0,
        editionStandings: projections?.editionStandings.flatMap((s) => s.rows).length ?? 0,
      });
    },
  };
});
