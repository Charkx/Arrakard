import { describe, expect, it } from 'vitest';
import { closeEdition, CommandRejected, executeCommand } from '#application/index.ts';
import { NOW, type CommandHarness } from './command-harness.ts';
import { LEAGUE_ID } from './fixture.ts';

/**
 * La clôture d'une édition, contre chaque implémentation des ports (en mémoire
 * et Postgres) : la même suite, pour qu'elles ne divergent pas (ADR 0023).
 */
export function describeCloseEditionContract(name: string, harness: () => CommandHarness): void {
  describe(`clôturer une édition : ${name}`, () => {
    it('un admin clôture une édition : elle porte la date de clôture, donnée par l’horloge', async () => {
      const { services, seed, edition } = harness();
      const { organizationId, adminId } = await seed();

      await executeCommand(services, { userId: adminId, organizationId }, closeEdition, {
        editionId: LEAGUE_ID,
        version: 1,
      });

      expect((await edition(organizationId, LEAGUE_ID))?.closedAt).toBe(NOW.toISOString());
    });

    it('la clôture augmente la version de l’édition, et la rend', async () => {
      const { services, seed, edition } = harness();
      const { organizationId, adminId } = await seed();

      const outcome = await executeCommand(
        services,
        { userId: adminId, organizationId },
        closeEdition,
        { editionId: LEAGUE_ID, version: 1 },
      );

      expect(outcome).toEqual({
        editionId: LEAGUE_ID,
        closedAt: NOW.toISOString(),
        version: 2,
      });
      expect((await edition(organizationId, LEAGUE_ID))?.version).toBe(2);
    });

    it('une version périmée est un conflit, et rien n’est écrit', async () => {
      const { services, seed, edition, commandLog } = harness();
      const { organizationId, adminId } = await seed();

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, closeEdition, {
          editionId: LEAGUE_ID,
          version: 7,
        }),
      ).rejects.toMatchObject({ reason: 'conflict' });
      expect(await edition(organizationId, LEAGUE_ID)).toEqual({ version: 1, closedAt: null });
      expect(await commandLog(organizationId)).toEqual([]);
    });

    it('une édition déjà clôturée ne se clôture pas une seconde fois', async () => {
      const { services, seed, edition } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await executeCommand(services, actor, closeEdition, { editionId: LEAGUE_ID, version: 1 });

      await expect(
        executeCommand(services, actor, closeEdition, { editionId: LEAGUE_ID, version: 2 }),
      ).rejects.toMatchObject({ reason: 'already_done' });
      expect((await edition(organizationId, LEAGUE_ID))?.version).toBe(2);
    });

    it('une édition inconnue est introuvable', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, closeEdition, {
          editionId: '00000000-0000-4000-8000-00000000b0ff',
          version: 1,
        }),
      ).rejects.toMatchObject({ reason: 'not_found' });
    });

    it('un membre qui n’est pas admin est refusé, et rien n’est écrit', async () => {
      const { services, seed, edition, commandLog } = harness();
      const { organizationId, memberId } = await seed();

      await expect(
        executeCommand(services, { userId: memberId, organizationId }, closeEdition, {
          editionId: LEAGUE_ID,
          version: 1,
        }),
      ).rejects.toMatchObject({ reason: 'forbidden' });
      expect(await edition(organizationId, LEAGUE_ID)).toEqual({ version: 1, closedAt: null });
      expect(await commandLog(organizationId)).toEqual([]);
    });

    it('l’admin d’une autre organisation ne trouve pas l’édition, ni n’agit dans la première', async () => {
      const { services, seed, edition } = harness();
      const { organizationId, otherOrganizationId, otherAdminId } = await seed();
      const input = { editionId: LEAGUE_ID, version: 1 };

      await expect(
        executeCommand(
          services,
          { userId: otherAdminId, organizationId: otherOrganizationId },
          closeEdition,
          input,
        ),
      ).rejects.toMatchObject({ reason: 'not_found' });
      await expect(
        executeCommand(services, { userId: otherAdminId, organizationId }, closeEdition, input),
      ).rejects.toMatchObject({ reason: 'forbidden' });
      expect(await edition(organizationId, LEAGUE_ID)).toEqual({ version: 1, closedAt: null });
    });

    it('une clôture laisse une ligne dans le journal des commandes', async () => {
      const { services, seed, commandLog } = harness();
      const { organizationId, adminId } = await seed();
      const input = { editionId: LEAGUE_ID, version: 1 };

      await executeCommand(services, { userId: adminId, organizationId }, closeEdition, input);

      expect(await commandLog(organizationId)).toEqual([
        {
          organizationId,
          command: 'closeEdition',
          actorUserId: adminId,
          input,
          outcome: { editionId: LEAGUE_ID, closedAt: NOW.toISOString(), version: 2 },
          createdAt: NOW.toISOString(),
        },
      ]);
    });

    it('une commande refusée ne laisse aucune ligne au journal, et ne recalcule rien', async () => {
      const { services, seed, commandLog, hasProjections } = harness();
      const { organizationId, adminId } = await seed();

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, closeEdition, {
          editionId: LEAGUE_ID,
          version: 7,
        }),
      ).rejects.toBeInstanceOf(CommandRejected);
      expect(await commandLog(organizationId)).toEqual([]);
      expect(await hasProjections(organizationId)).toBe(false);
    });

    it('les projections sont recalculées après la clôture', async () => {
      const { services, seed, hasProjections } = harness();
      const { organizationId, adminId } = await seed();

      await executeCommand(services, { userId: adminId, organizationId }, closeEdition, {
        editionId: LEAGUE_ID,
        version: 1,
      });

      expect(await hasProjections(organizationId)).toBe(true);
    });
  });
}
