import { describe, expect, it } from 'vitest';
import {
  closeEdition,
  closeSeason,
  executeCommand,
  openSeason,
  publishEdition,
} from '#application/index.ts';
import type { CommandHarness } from './command-harness.ts';
import { LEAGUE_ID, OFF_SEASON_ID, SEASON_ID } from './fixture.ts';

/**
 * Ouvrir et clôturer une saison (ADR 0014), contre chaque implémentation des
 * ports. Le jeu d'essai a une saison ouverte, `SEASON_ID`, dont `LEAGUE_ID`
 * est une édition. « Figée » veut dire qu'une saison clôturée ne reçoit plus
 * de match (docs/architecture/overview.md).
 */
export function describeSeasonContract(name: string, harness: () => CommandHarness): void {
  describe(`ouvrir et clôturer une saison : ${name}`, () => {
    it('un admin clôture la saison ouverte : elle est close, au jour de l’horloge à Paris', async () => {
      const { services, seed, season } = harness();
      const { organizationId, adminId } = await seed();

      const outcome = await executeCommand(
        services,
        { userId: adminId, organizationId },
        closeSeason,
        { seasonId: SEASON_ID },
      );

      expect(outcome).toEqual({ seasonId: SEASON_ID, endDate: '2026-11-22' });
      expect(await season(organizationId, SEASON_ID)).toEqual({
        status: 'closed',
        endDate: '2026-11-22',
      });
    });

    it('une saison déjà clôturée ne se clôture pas deux fois', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await executeCommand(services, actor, closeSeason, { seasonId: SEASON_ID });

      await expect(
        executeCommand(services, actor, closeSeason, { seasonId: SEASON_ID }),
      ).rejects.toMatchObject({ reason: 'already_done' });
    });

    it('la saison d’une autre organisation est introuvable', async () => {
      const { services, seed, season } = harness();
      const { organizationId, otherOrganizationId, otherAdminId } = await seed();

      await expect(
        executeCommand(
          services,
          { userId: otherAdminId, organizationId: otherOrganizationId },
          closeSeason,
          { seasonId: SEASON_ID },
        ),
      ).rejects.toMatchObject({ reason: 'not_found' });
      expect((await season(organizationId, SEASON_ID))?.status).toBe('open');
    });

    it('on n’ouvre pas une saison tant qu’une autre est ouverte', async () => {
      const { services, seed, commandLog } = harness();
      const { organizationId, adminId } = await seed();

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, openSeason, {
          name: 'Saison 4',
          year: 2027,
        }),
      ).rejects.toMatchObject({ reason: 'conflict' });
      expect(await commandLog(organizationId)).toEqual([]);
    });

    it('après la clôture, un admin ouvre la saison suivante : c’est la saison active', async () => {
      const { services, seed, season } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await executeCommand(services, actor, closeSeason, { seasonId: SEASON_ID });

      const { seasonId } = await executeCommand(services, actor, openSeason, {
        name: 'Saison 4',
        year: 2027,
      });

      expect(await season(organizationId, seasonId)).toEqual({ status: 'open', endDate: null });
    });

    it('deux saisons ne portent pas le même nom', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await executeCommand(services, actor, closeSeason, { seasonId: SEASON_ID });
      const { seasonId } = await executeCommand(services, actor, openSeason, {
        name: 'Saison 4',
        year: 2027,
      });
      await executeCommand(services, actor, closeSeason, { seasonId });

      await expect(
        executeCommand(services, actor, openSeason, { name: 'Saison 4', year: 2028 }),
      ).rejects.toMatchObject({ reason: 'conflict' });
    });

    it('les brouillons d’une édition d’une saison clôturée ne se publient pas : ses notes ne bougent plus', async () => {
      const { services, seed, addDraftMatch, seasonRatings, publishedMatchIds } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const draftId = await addDraftMatch(organizationId, LEAGUE_ID);
      await executeCommand(services, actor, closeSeason, { seasonId: SEASON_ID });
      const frozen = await seasonRatings(organizationId, SEASON_ID);

      await expect(
        executeCommand(services, actor, publishEdition, { editionId: LEAGUE_ID, version: 1 }),
      ).rejects.toMatchObject({ reason: 'season_closed' });
      // Une autre commande recalcule tout : la saison clôturée garde ses notes.
      await executeCommand(services, actor, closeEdition, { editionId: OFF_SEASON_ID, version: 1 });

      expect(await publishedMatchIds(organizationId)).not.toContain(draftId);
      expect(await seasonRatings(organizationId, SEASON_ID)).toEqual(frozen);
    });
  });
}
