import { describe, expect, it } from 'vitest';
import {
  closeEdition,
  closeSeason,
  executeCommand,
  linkDiscordAccount,
  mergePlayers,
  transferPlayer,
  createTeam,
} from '#application/index.ts';
import type { CommandHarness } from './command-harness.ts';
import {
  BRISE_ID,
  LEAGUE_ID,
  MATCH_ID,
  OFF_SEASON_ID,
  SEASON_ID,
  SIROCCO_ID,
  ZEPHYR_ID,
} from './fixture.ts';

const DISCORD = '123456789012345678';
const OTHER_DISCORD = '876543210987654321';

/**
 * Fusionner deux profils, lier une carte à Discord (cas d'usage A5 et A6,
 * ADR 0034), contre chaque implémentation des ports. Brise n'a joué aucun
 * match du jeu d'essai : c'est le double possible de Zéphyr. Zéphyr et
 * Sirocco ont joué le même match : ce sont deux joueurs.
 */
export function describePlayerContract(name: string, harness: () => CommandHarness): void {
  describe(`fusionner des profils, lier une carte à Discord : ${name}`, () => {
    it('la fusion déplace les performances et laisse un renvoi depuis l’ancien profil', async () => {
      const { services, seed, addPublishedMatch, profile, performanceMatchIds } = harness();
      const { organizationId, adminId } = await seed();
      const published = await addPublishedMatch(organizationId, LEAGUE_ID, BRISE_ID);

      const outcome = await executeCommand(
        services,
        { userId: adminId, organizationId },
        mergePlayers,
        { absorbedId: BRISE_ID, keptId: ZEPHYR_ID },
      );

      expect(outcome).toEqual({ absorbedId: BRISE_ID, keptId: ZEPHYR_ID, movedPerformances: 1 });
      expect(await performanceMatchIds(organizationId, BRISE_ID)).toEqual([]);
      expect(await performanceMatchIds(organizationId, ZEPHYR_ID)).toEqual(
        [MATCH_ID, published].sort(),
      );
      expect(await profile(organizationId, BRISE_ID)).toEqual({
        mergedInto: ZEPHYR_ID,
        discordUserId: null,
        aliases: [],
      });
      expect((await profile(organizationId, ZEPHYR_ID))?.aliases).toEqual(['brise']);
    });

    it('les notes sont recalculées après une fusion', async () => {
      const { services, seed, addPublishedMatch, seasonRatings } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await addPublishedMatch(organizationId, LEAGUE_ID, BRISE_ID);
      // Une première commande recalcule : Brise a sa note.
      await executeCommand(services, actor, closeEdition, { editionId: OFF_SEASON_ID, version: 1 });
      const before = await seasonRatings(organizationId, SEASON_ID);
      expect(before.has(BRISE_ID)).toBe(true);

      await executeCommand(services, actor, mergePlayers, {
        absorbedId: BRISE_ID,
        keptId: ZEPHYR_ID,
      });

      const after = await seasonRatings(organizationId, SEASON_ID);
      expect(after.has(BRISE_ID)).toBe(false);
      expect(after.get(ZEPHYR_ID)).not.toBe(before.get(ZEPHYR_ID));
    });

    it('une fusion corrige aussi une saison clôturée : c’est une exception assumée', async () => {
      const { services, seed, addPublishedMatch, seasonRatings } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await addPublishedMatch(organizationId, LEAGUE_ID, BRISE_ID);
      await executeCommand(services, actor, closeSeason, { seasonId: SEASON_ID });

      await executeCommand(services, actor, mergePlayers, {
        absorbedId: BRISE_ID,
        keptId: ZEPHYR_ID,
      });

      expect((await seasonRatings(organizationId, SEASON_ID)).has(BRISE_ID)).toBe(false);
    });

    it('un simple membre ne fusionne pas de profils', async () => {
      const { services, seed, profile } = harness();
      const { organizationId, memberId } = await seed();

      await expect(
        executeCommand(services, { userId: memberId, organizationId }, mergePlayers, {
          absorbedId: BRISE_ID,
          keptId: ZEPHYR_ID,
        }),
      ).rejects.toMatchObject({ reason: 'forbidden' });
      expect((await profile(organizationId, BRISE_ID))?.mergedInto).toBeNull();
    });

    it('deux profils qui ont joué le même match ne se fusionnent pas', async () => {
      const { services, seed, profile } = harness();
      const { organizationId, adminId } = await seed();

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, mergePlayers, {
          absorbedId: SIROCCO_ID,
          keptId: ZEPHYR_ID,
        }),
      ).rejects.toMatchObject({ reason: 'conflict' });
      expect((await profile(organizationId, SIROCCO_ID))?.mergedInto).toBeNull();
    });

    it('un profil ne se fusionne pas avec lui-même, ni avec un profil déjà fusionné', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };

      await expect(
        executeCommand(services, actor, mergePlayers, { absorbedId: BRISE_ID, keptId: BRISE_ID }),
      ).rejects.toMatchObject({ reason: 'conflict' });
      await executeCommand(services, actor, mergePlayers, {
        absorbedId: BRISE_ID,
        keptId: ZEPHYR_ID,
      });
      await expect(
        executeCommand(services, actor, mergePlayers, { absorbedId: SIROCCO_ID, keptId: BRISE_ID }),
      ).rejects.toMatchObject({ reason: 'not_found' });
    });

    it('les profils qui renvoyaient vers l’absorbé renvoient vers le conservé', async () => {
      const { services, seed, markMerged, profile } = harness();
      const { organizationId, adminId } = await seed();
      await markMerged(organizationId, SIROCCO_ID, BRISE_ID);

      await executeCommand(services, { userId: adminId, organizationId }, mergePlayers, {
        absorbedId: BRISE_ID,
        keptId: ZEPHYR_ID,
      });

      expect((await profile(organizationId, SIROCCO_ID))?.mergedInto).toBe(ZEPHYR_ID);
    });

    it('le compte Discord du profil absorbé suit ; deux comptes différents bloquent la fusion', async () => {
      const { services, seed, profile } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await executeCommand(services, actor, linkDiscordAccount, {
        playerId: BRISE_ID,
        discordUserId: DISCORD,
      });
      await executeCommand(services, actor, linkDiscordAccount, {
        playerId: ZEPHYR_ID,
        discordUserId: OTHER_DISCORD,
      });

      await expect(
        executeCommand(services, actor, mergePlayers, { absorbedId: BRISE_ID, keptId: ZEPHYR_ID }),
      ).rejects.toMatchObject({ reason: 'conflict' });
      await executeCommand(services, actor, linkDiscordAccount, {
        playerId: ZEPHYR_ID,
        discordUserId: null,
      });
      await executeCommand(services, actor, mergePlayers, {
        absorbedId: BRISE_ID,
        keptId: ZEPHYR_ID,
      });

      expect((await profile(organizationId, ZEPHYR_ID))?.discordUserId).toBe(DISCORD);
      expect((await profile(organizationId, BRISE_ID))?.discordUserId).toBeNull();
    });

    it('le passage en cours de l’absorbé se termine ; le conservé sans équipe prend sa place', async () => {
      const { services, seed, stints } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const { teamId } = await executeCommand(services, actor, createTeam, {
        tag: 'ARK',
        name: 'Arrakis',
        divisions: [],
      });
      await executeCommand(services, actor, transferPlayer, {
        playerId: BRISE_ID,
        to: { teamId, status: 'sub' },
      });

      await executeCommand(services, actor, mergePlayers, {
        absorbedId: BRISE_ID,
        keptId: ZEPHYR_ID,
      });

      expect(await stints(organizationId, BRISE_ID)).toEqual([
        { teamId, status: 'sub', joinedOn: '2026-11-22', leftOn: '2026-11-22' },
      ]);
      expect(await stints(organizationId, ZEPHYR_ID)).toEqual([
        { teamId, status: 'sub', joinedOn: '2026-11-22', leftOn: null },
      ]);
    });

    it('le conservé déjà dans une équipe y reste', async () => {
      const { services, seed, stints } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ark = await executeCommand(services, actor, createTeam, {
        tag: 'ARK',
        name: 'Arrakis',
        divisions: [],
      });
      const vnt = await executeCommand(services, actor, createTeam, {
        tag: 'VNT',
        name: 'Vent du Sud',
        divisions: [],
      });
      await executeCommand(services, actor, transferPlayer, {
        playerId: BRISE_ID,
        to: { teamId: ark.teamId, status: 'sub' },
      });
      await executeCommand(services, actor, transferPlayer, {
        playerId: ZEPHYR_ID,
        to: { teamId: vnt.teamId, status: 'starter' },
      });

      await executeCommand(services, actor, mergePlayers, {
        absorbedId: BRISE_ID,
        keptId: ZEPHYR_ID,
      });

      expect(await stints(organizationId, ZEPHYR_ID)).toEqual([
        { teamId: vnt.teamId, status: 'starter', joinedOn: '2026-11-22', leftOn: null },
      ]);
    });

    it('un admin lie une carte à un compte Discord, puis la délie', async () => {
      const { services, seed, profile } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };

      expect(
        await executeCommand(services, actor, linkDiscordAccount, {
          playerId: ZEPHYR_ID,
          discordUserId: DISCORD,
        }),
      ).toEqual({ playerId: ZEPHYR_ID, discordUserId: DISCORD });
      expect((await profile(organizationId, ZEPHYR_ID))?.discordUserId).toBe(DISCORD);

      await executeCommand(services, actor, linkDiscordAccount, {
        playerId: ZEPHYR_ID,
        discordUserId: null,
      });
      expect((await profile(organizationId, ZEPHYR_ID))?.discordUserId).toBeNull();
    });

    it('un compte Discord n’est lié qu’à une carte', async () => {
      const { services, seed, profile } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await executeCommand(services, actor, linkDiscordAccount, {
        playerId: ZEPHYR_ID,
        discordUserId: DISCORD,
      });

      await expect(
        executeCommand(services, actor, linkDiscordAccount, {
          playerId: SIROCCO_ID,
          discordUserId: DISCORD,
        }),
      ).rejects.toMatchObject({ reason: 'conflict' });
      expect((await profile(organizationId, SIROCCO_ID))?.discordUserId).toBeNull();
    });

    it('une carte déjà liée à ce compte ne se relie pas', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const input = { playerId: ZEPHYR_ID, discordUserId: DISCORD };
      await executeCommand(services, actor, linkDiscordAccount, input);

      await expect(
        executeCommand(services, actor, linkDiscordAccount, input),
      ).rejects.toMatchObject({ reason: 'already_done' });
    });

    it('un joueur d’une autre organisation est introuvable', async () => {
      const { services, seed } = harness();
      const { otherOrganizationId, otherAdminId } = await seed();

      await expect(
        executeCommand(
          services,
          { userId: otherAdminId, organizationId: otherOrganizationId },
          linkDiscordAccount,
          { playerId: ZEPHYR_ID, discordUserId: DISCORD },
        ),
      ).rejects.toMatchObject({ reason: 'not_found' });
    });
  });
}
