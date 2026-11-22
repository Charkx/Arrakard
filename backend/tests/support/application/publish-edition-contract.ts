import { describe, expect, it } from 'vitest';
import { executeCommand, publishEdition } from '#application/index.ts';
import { NOW, type CommandHarness } from './command-harness.ts';
import { LEAGUE_ID, MATCH_ID } from './fixture.ts';

/**
 * La publication des brouillons d'une édition (ADR 0012), contre chaque
 * implémentation des ports : la même suite, en mémoire et sur Postgres.
 */
export function describePublishEditionContract(name: string, harness: () => CommandHarness): void {
  describe(`publier une édition : ${name}`, () => {
    it('un brouillon n’est pas lu par le recalcul : il ne compte dans aucune note', async () => {
      const { seed, addDraftMatch, publishedMatchIds } = harness();
      const { organizationId } = await seed();

      await addDraftMatch(organizationId, LEAGUE_ID);

      expect(await publishedMatchIds(organizationId)).toEqual([MATCH_ID]);
    });

    it('publier rend les brouillons de l’édition visibles du recalcul', async () => {
      const { services, seed, addDraftMatch, publishedMatchIds } = harness();
      const { organizationId, adminId } = await seed();
      const draftId = await addDraftMatch(organizationId, LEAGUE_ID);

      await executeCommand(services, { userId: adminId, organizationId }, publishEdition, {
        editionId: LEAGUE_ID,
        version: 1,
      });

      expect((await publishedMatchIds(organizationId)).toSorted()).toEqual(
        [MATCH_ID, draftId].toSorted(),
      );
    });

    it('la publication est un fait : quelle édition, quels matchs, quand, par qui', async () => {
      const { services, seed, addDraftMatch, publications } = harness();
      const { organizationId, adminId } = await seed();
      const draftId = await addDraftMatch(organizationId, LEAGUE_ID);

      const outcome = await executeCommand(
        services,
        { userId: adminId, organizationId },
        publishEdition,
        { editionId: LEAGUE_ID, version: 1 },
      );

      expect(await publications(organizationId)).toEqual([
        {
          editionId: LEAGUE_ID,
          matchIds: [draftId],
          publishedAt: NOW.toISOString(),
          publishedBy: adminId,
        },
      ]);
      expect(outcome).toMatchObject({ editionId: LEAGUE_ID, matchIds: [draftId], version: 2 });
    });

    it('publier une édition sans brouillon est refusé, et rien n’est écrit', async () => {
      const { services, seed, edition, publications, commandLog } = harness();
      const { organizationId, adminId } = await seed();

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, publishEdition, {
          editionId: LEAGUE_ID,
          version: 1,
        }),
      ).rejects.toMatchObject({ reason: 'nothing_to_publish' });
      expect(await edition(organizationId, LEAGUE_ID)).toEqual({ version: 1, closedAt: null });
      expect(await publications(organizationId)).toEqual([]);
      expect(await commandLog(organizationId)).toEqual([]);
    });

    it('une version périmée est un conflit, et le brouillon le reste', async () => {
      const { services, seed, addDraftMatch, publishedMatchIds } = harness();
      const { organizationId, adminId } = await seed();
      await addDraftMatch(organizationId, LEAGUE_ID);

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, publishEdition, {
          editionId: LEAGUE_ID,
          version: 7,
        }),
      ).rejects.toMatchObject({ reason: 'conflict' });
      expect(await publishedMatchIds(organizationId)).toEqual([MATCH_ID]);
    });

    it('une édition inconnue est introuvable', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, publishEdition, {
          editionId: '00000000-0000-4000-8000-00000000b0ff',
          version: 1,
        }),
      ).rejects.toMatchObject({ reason: 'not_found' });
    });
  });
}
