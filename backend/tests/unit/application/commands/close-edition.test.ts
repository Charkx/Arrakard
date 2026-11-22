import { toFacts } from '#application/index.ts';
import { V1_RATING_RULES } from '#domain/index.ts';
import { describeCloseEditionContract, NOW } from '#support/application/close-edition-contract.ts';
import { FIXTURE_ROWS } from '#support/application/fixture.ts';
import { inMemoryStore } from '#support/application/in-memory.ts';

describeCloseEditionContract('en mémoire', () => {
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
    commandLog: (organizationId) => Promise.resolve(store.commandLogOf(organizationId)),
    hasProjections: (organizationId) =>
      Promise.resolve(store.projectionsOf(organizationId) !== undefined),
  };
});

const NO_ROWS = { seasons: [], editions: [], matches: [], performances: [], players: [] };
