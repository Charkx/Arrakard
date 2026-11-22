import { describe, expect, it } from 'vitest';
import {
  archiveEdition,
  closeSeason,
  createEdition,
  executeCommand,
  mergePlayers,
  updateEdition,
  type EditionDetails,
} from '#application/index.ts';
import type { CommandHarness } from './command-harness.ts';
import { BRISE_ID, LEAGUE_ID, OFF_SEASON_ID, SEASON_ID, SIROCCO_ID, ZEPHYR_ID } from './fixture.ts';

const IH: EditionDetails = {
  name: 'IH #10',
  type: 'inhouse',
  date: '2026-11-27',
  seasonId: SEASON_ID,
  prestige: 'normal',
  location: null,
  url: null,
  description: null,
  arrakisWon: null,
  participantIds: [],
};

const LAN: EditionDetails = {
  ...IH,
  name: 'Gamers Assembly',
  type: 'external_lan',
  seasonId: null,
  location: 'Poitiers',
  url: 'https://gamers-assembly.example',
  arrakisWon: true,
  participantIds: [ZEPHYR_ID, SIROCCO_ID],
};

/**
 * Créer, modifier et archiver une édition (cas d'usage A3, ADR 0035), contre
 * chaque implémentation des ports. La clôture a sa propre suite. Dans le jeu
 * d'essai, `LEAGUE_ID` a un match, `OFF_SEASON_ID` aucun.
 */
export function describeEditionContract(name: string, harness: () => CommandHarness): void {
  describe(`créer, modifier, archiver une édition : ${name}`, () => {
    it('un admin crée une édition de la saison, sans match, à la version 1', async () => {
      const { services, seed, editionRecord } = harness();
      const { organizationId, adminId } = await seed();

      const outcome = await executeCommand(
        services,
        { userId: adminId, organizationId },
        createEdition,
        IH,
      );

      expect(outcome.version).toBe(1);
      expect(await editionRecord(organizationId, outcome.editionId)).toEqual({
        ...IH,
        archived: false,
      });
    });

    it('un événement externe se crée sans match, avec ses participants', async () => {
      const { services, seed, editionRecord } = harness();
      const { organizationId, adminId } = await seed();

      const { editionId } = await executeCommand(
        services,
        { userId: adminId, organizationId },
        createEdition,
        LAN,
      );

      expect(await editionRecord(organizationId, editionId)).toEqual({
        ...LAN,
        participantIds: [ZEPHYR_ID, SIROCCO_ID].sort(),
        archived: false,
      });
    });

    it('seul un événement externe a des participants', async () => {
      const { services, seed, commandLog } = harness();
      const { organizationId, adminId } = await seed();

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, createEdition, {
          ...IH,
          participantIds: [ZEPHYR_ID],
        }),
      ).rejects.toMatchObject({ reason: 'conflict' });
      expect(await commandLog(organizationId)).toEqual([]);
    });

    it('un participant est un joueur non fusionné de l’organisation', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await executeCommand(services, actor, mergePlayers, {
        absorbedId: BRISE_ID,
        keptId: ZEPHYR_ID,
      });

      await expect(
        executeCommand(services, actor, createEdition, { ...LAN, participantIds: [BRISE_ID] }),
      ).rejects.toMatchObject({ reason: 'not_found' });
    });

    it('une saison clôturée ne reçoit pas de nouvelle édition', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await executeCommand(services, actor, closeSeason, { seasonId: SEASON_ID });

      await expect(executeCommand(services, actor, createEdition, IH)).rejects.toMatchObject({
        reason: 'season_closed',
      });
    });

    it('un simple membre ne crée pas d’édition', async () => {
      const { services, seed } = harness();
      const { organizationId, memberId } = await seed();

      await expect(
        executeCommand(services, { userId: memberId, organizationId }, createEdition, IH),
      ).rejects.toMatchObject({ reason: 'forbidden' });
    });

    it('un admin modifie une édition : nouvelle version, nouvelles valeurs', async () => {
      const { services, seed, editionRecord } = harness();
      const { organizationId, adminId } = await seed();
      const changed = {
        ...IH,
        name: 'IH #9 bis',
        date: '2026-03-02',
        prestige: 'premium',
      } as const;

      const outcome = await executeCommand(
        services,
        { userId: adminId, organizationId },
        updateEdition,
        { editionId: OFF_SEASON_ID, version: 1, ...changed },
      );

      expect(outcome).toEqual({ editionId: OFF_SEASON_ID, version: 2 });
      expect(await editionRecord(organizationId, OFF_SEASON_ID)).toEqual({
        ...changed,
        archived: false,
      });
    });

    it('une modification sur une version périmée est un conflit', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await executeCommand(services, actor, updateEdition, {
        editionId: OFF_SEASON_ID,
        version: 1,
        ...IH,
      });

      await expect(
        executeCommand(services, actor, updateEdition, {
          editionId: OFF_SEASON_ID,
          version: 1,
          ...IH,
        }),
      ).rejects.toMatchObject({ reason: 'conflict' });
    });

    it('une édition d’une saison clôturée ne se modifie plus', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await executeCommand(services, actor, closeSeason, { seasonId: SEASON_ID });

      await expect(
        executeCommand(services, actor, updateEdition, {
          editionId: LEAGUE_ID,
          version: 1,
          ...IH,
          seasonId: null,
        }),
      ).rejects.toMatchObject({ reason: 'season_closed' });
    });

    it('une édition qui a des matchs ne devient pas un événement externe', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, updateEdition, {
          editionId: LEAGUE_ID,
          version: 1,
          ...LAN,
          participantIds: [],
        }),
      ).rejects.toMatchObject({ reason: 'conflict' });
    });

    it('sortir une édition de sa saison refait les notes de la saison', async () => {
      const { services, seed, seasonRatings } = harness();
      const { organizationId, adminId } = await seed();

      await executeCommand(services, { userId: adminId, organizationId }, updateEdition, {
        editionId: LEAGUE_ID,
        version: 1,
        ...IH,
        name: 'Ligue D1',
        type: 'league_div1',
        date: '2026-02-01',
        seasonId: null,
      });

      expect((await seasonRatings(organizationId, SEASON_ID)).size).toBe(0);
    });

    it('un admin archive une édition sans match ; pas deux fois', async () => {
      const { services, seed, editionRecord } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };

      expect(
        await executeCommand(services, actor, archiveEdition, {
          editionId: OFF_SEASON_ID,
          version: 1,
        }),
      ).toEqual({ editionId: OFF_SEASON_ID, version: 2 });
      expect((await editionRecord(organizationId, OFF_SEASON_ID))?.archived).toBe(true);
      await expect(
        executeCommand(services, actor, archiveEdition, { editionId: OFF_SEASON_ID, version: 2 }),
      ).rejects.toMatchObject({ reason: 'already_done' });
      await expect(
        executeCommand(services, actor, updateEdition, {
          editionId: OFF_SEASON_ID,
          version: 2,
          ...IH,
        }),
      ).rejects.toMatchObject({ reason: 'conflict' });
    });

    it('une édition qui a des matchs ne s’archive pas', async () => {
      const { services, seed, editionRecord } = harness();
      const { organizationId, adminId } = await seed();

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, archiveEdition, {
          editionId: LEAGUE_ID,
          version: 1,
        }),
      ).rejects.toMatchObject({ reason: 'conflict' });
      expect((await editionRecord(organizationId, LEAGUE_ID))?.archived).toBe(false);
    });

    it('l’édition d’une autre organisation est introuvable', async () => {
      const { services, seed } = harness();
      const { otherOrganizationId, otherAdminId } = await seed();

      await expect(
        executeCommand(
          services,
          { userId: otherAdminId, organizationId: otherOrganizationId },
          archiveEdition,
          { editionId: OFF_SEASON_ID, version: 1 },
        ),
      ).rejects.toMatchObject({ reason: 'not_found' });
    });
  });
}
