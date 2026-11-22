import { toFacts } from '#application/index.ts';
import { V1_RATING_RULES } from '#domain/index.ts';
import {
  DRAFT_MATCH_NUMBER,
  NOW,
  PUBLISHED_MATCH_NUMBER,
  type CommandHarness,
} from './command-harness.ts';
import { FIXTURE_ROWS, SIROCCO_ID, ZEPHYR_ID } from './fixture.ts';
import { inMemoryStore } from './in-memory.ts';

const NO_ROWS = { seasons: [], editions: [], matches: [], performances: [], players: [] };

/** Le harnais des suites de contrat des commandes, sur les entrepôts en mémoire. */
export function inMemoryCommandHarness(): CommandHarness {
  const store = inMemoryStore();
  return {
    services: { unitOfWork: store.unitOfWork, clock: { now: () => NOW } },
    seed() {
      const seeded = {
        organizationId: crypto.randomUUID(),
        adminId: crypto.randomUUID(),
        memberId: crypto.randomUUID(),
        otherOrganizationId: crypto.randomUUID(),
        otherAdminId: crypto.randomUUID(),
      };
      store.addOrganization(seeded.organizationId, V1_RATING_RULES, toFacts(FIXTURE_ROWS));
      store.addOrganization(seeded.otherOrganizationId, V1_RATING_RULES, toFacts(NO_ROWS));
      store.addMember(seeded.organizationId, seeded.adminId, 'admin');
      store.addMember(seeded.organizationId, seeded.memberId, 'member');
      store.addMember(seeded.otherOrganizationId, seeded.otherAdminId, 'admin');
      return Promise.resolve(seeded);
    },
    edition: (organizationId, editionId) =>
      Promise.resolve(store.editionOf(organizationId, editionId)),
    editionRecord: (organizationId, editionId) =>
      Promise.resolve(store.editionRecordOf(organizationId, editionId)),
    commandLog: (organizationId) => Promise.resolve(store.commandLogOf(organizationId)),
    hasProjections: (organizationId) =>
      Promise.resolve(store.projectionsOf(organizationId) !== undefined),
    addDraftMatch(organizationId, editionId) {
      const matchId = crypto.randomUUID();
      const { performances } = toFacts(FIXTURE_ROWS);
      store.addDraftMatch(
        organizationId,
        {
          id: matchId,
          editionId,
          matchNumber: DRAFT_MATCH_NUMBER,
          winnerTeam: 'ARK',
          durationSeconds: 1500,
        },
        performances
          .filter((p) => p.playerId === ZEPHYR_ID || p.playerId === SIROCCO_ID)
          .map((p) => ({ ...p, matchId })),
      );
      return Promise.resolve(matchId);
    },
    publishedMatchIds: async (organizationId) =>
      (await store.facts.readFacts(organizationId)).matches.map((m) => m.id),
    publications: (organizationId) => Promise.resolve(store.publicationsOf(organizationId)),
    season(organizationId, seasonId) {
      const season = store.seasonOf(organizationId, seasonId);
      return Promise.resolve(season && { status: season.status, endDate: season.endDate });
    },
    addPublishedMatch(organizationId, editionId, playerId) {
      const matchId = crypto.randomUUID();
      store.addPublishedMatch(
        organizationId,
        {
          id: matchId,
          editionId,
          matchNumber: PUBLISHED_MATCH_NUMBER,
          winnerTeam: 'ARK',
          durationSeconds: 1600,
        },
        [
          {
            matchId,
            line: 2,
            side: 'A',
            playerId,
            team: 'ARK',
            role: 'MID',
            champion: 'Ahri',
            result: 'win',
            kills: 5,
            deaths: 2,
            assists: 6,
            gold: 11000,
          },
        ],
      );
      return Promise.resolve(matchId);
    },
    profile: (organizationId, playerId) =>
      Promise.resolve(store.profileOf(organizationId, playerId)),
    performanceMatchIds: (organizationId, playerId) =>
      Promise.resolve(store.performanceMatchIdsOf(organizationId, playerId)),
    markMerged(organizationId, absorbedId, keptId) {
      store.markMerged(organizationId, absorbedId, keptId);
      return Promise.resolve();
    },
    team: (organizationId, teamId) => Promise.resolve(store.teamOf(organizationId, teamId)),
    stints: (organizationId, playerId) => Promise.resolve(store.stintsOf(organizationId, playerId)),
    seasonRatings: (organizationId, seasonId) =>
      Promise.resolve(
        new Map(
          (store.projectionsOf(organizationId)?.seasonRatings ?? [])
            .filter((r) => r.seasonId === seasonId)
            .map((r) => [r.playerId, r.rating.rating]),
        ),
      ),
  };
}
