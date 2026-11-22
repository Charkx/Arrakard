import { describe, expect, it } from 'vitest';
import {
  archiveTeam,
  createTeam,
  executeCommand,
  transferPlayer,
  type Actor,
  type CommandServices,
} from '#application/index.ts';
import type { CommandHarness } from './command-harness.ts';
import { SIROCCO_ID, ZEPHYR_ID } from './fixture.ts';

/** Le jour de l'horloge des tests, à Paris. */
const TODAY = '2026-11-22';

const ARK = { tag: 'ARK', name: 'Arrakis', divisions: ['div1'] } as const;
const VNT = { tag: 'VNT', name: 'Vent du Sud', divisions: [] } as const;

/** Crée l'équipe et rend son identifiant. */
async function create(
  services: CommandServices,
  actor: Actor,
  team: typeof ARK | typeof VNT,
): Promise<string> {
  return (await executeCommand(services, actor, createTeam, team)).teamId;
}

/**
 * Créer une équipe, transférer un joueur, archiver une équipe (cas d'usage
 * A4, ADR 0033), contre chaque implémentation des ports. Le jeu d'essai n'a
 * pas d'équipe : Zéphyr et Sirocco sont sans équipe au départ.
 */
export function describeTeamContract(name: string, harness: () => CommandHarness): void {
  describe(`équipes et rosters : ${name}`, () => {
    it('un admin crée une équipe, sans joueur', async () => {
      const { services, seed, team } = harness();
      const { organizationId, adminId } = await seed();

      const teamId = await create(services, { userId: adminId, organizationId }, ARK);

      expect(await team(organizationId, teamId)).toEqual({
        tag: 'ARK',
        name: 'Arrakis',
        divisions: ['div1'],
        archivedAt: null,
      });
    });

    it('un simple membre ne crée pas d’équipe', async () => {
      const { services, seed, commandLog } = harness();
      const { organizationId, memberId } = await seed();

      await expect(
        executeCommand(services, { userId: memberId, organizationId }, createTeam, ARK),
      ).rejects.toMatchObject({ reason: 'forbidden' });
      expect(await commandLog(organizationId)).toEqual([]);
    });

    it('deux équipes ne portent pas le même tag, même archivée', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const teamId = await create(services, actor, ARK);
      await executeCommand(services, actor, archiveTeam, { teamId });

      await expect(
        executeCommand(services, actor, createTeam, { ...ARK, name: 'Autre' }),
      ).rejects.toMatchObject({ reason: 'conflict' });
    });

    it('le même tag est libre dans une autre organisation', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId, otherOrganizationId, otherAdminId } = await seed();
      await create(services, { userId: adminId, organizationId }, ARK);

      const teamId = await create(
        services,
        { userId: otherAdminId, organizationId: otherOrganizationId },
        ARK,
      );

      expect(teamId).toEqual(expect.any(String));
    });

    it('un joueur sans équipe en rejoint une : son passage commence aujourd’hui', async () => {
      const { services, seed, stints } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const teamId = await create(services, actor, ARK);

      const outcome = await executeCommand(services, actor, transferPlayer, {
        playerId: ZEPHYR_ID,
        to: { teamId, status: 'starter' },
      });

      expect(outcome).toEqual({
        playerId: ZEPHYR_ID,
        from: null,
        to: { teamId, status: 'starter' },
        date: TODAY,
      });
      expect(await stints(organizationId, ZEPHYR_ID)).toEqual([
        { teamId, status: 'starter', joinedOn: TODAY, leftOn: null },
      ]);
    });

    it('un transfert garde le passage précédent dans l’historique', async () => {
      const { services, seed, stints } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ark = await create(services, actor, ARK);
      const vnt = await create(services, actor, VNT);
      await executeCommand(services, actor, transferPlayer, {
        playerId: ZEPHYR_ID,
        to: { teamId: ark, status: 'starter' },
      });

      const outcome = await executeCommand(services, actor, transferPlayer, {
        playerId: ZEPHYR_ID,
        to: { teamId: vnt, status: 'sub' },
      });

      expect(outcome.from).toEqual({ teamId: ark, status: 'starter' });
      expect(await stints(organizationId, ZEPHYR_ID)).toEqual([
        { teamId: ark, status: 'starter', joinedOn: TODAY, leftOn: TODAY },
        { teamId: vnt, status: 'sub', joinedOn: TODAY, leftOn: null },
      ]);
    });

    it('un changement de statut dans la même équipe est un nouveau passage', async () => {
      const { services, seed, stints } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ark = await create(services, actor, ARK);
      await executeCommand(services, actor, transferPlayer, {
        playerId: ZEPHYR_ID,
        to: { teamId: ark, status: 'sub' },
      });

      await executeCommand(services, actor, transferPlayer, {
        playerId: ZEPHYR_ID,
        to: { teamId: ark, status: 'starter' },
      });

      expect((await stints(organizationId, ZEPHYR_ID)).map((s) => s.status)).toEqual([
        'sub',
        'starter',
      ]);
    });

    it('un joueur déjà à cette place n’est pas transféré', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ark = await create(services, actor, ARK);
      const to = { teamId: ark, status: 'starter' } as const;
      await executeCommand(services, actor, transferPlayer, { playerId: ZEPHYR_ID, to });

      await expect(
        executeCommand(services, actor, transferPlayer, { playerId: ZEPHYR_ID, to }),
      ).rejects.toMatchObject({ reason: 'already_done' });
    });

    it('un joueur quitte son équipe sans en rejoindre une autre ; sans équipe, il ne la quitte pas deux fois', async () => {
      const { services, seed, stints } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ark = await create(services, actor, ARK);
      await executeCommand(services, actor, transferPlayer, {
        playerId: ZEPHYR_ID,
        to: { teamId: ark, status: 'starter' },
      });

      await executeCommand(services, actor, transferPlayer, { playerId: ZEPHYR_ID, to: null });

      expect(await stints(organizationId, ZEPHYR_ID)).toEqual([
        { teamId: ark, status: 'starter', joinedOn: TODAY, leftOn: TODAY },
      ]);
      await expect(
        executeCommand(services, actor, transferPlayer, { playerId: ZEPHYR_ID, to: null }),
      ).rejects.toMatchObject({ reason: 'already_done' });
    });

    it('un joueur ou une équipe d’une autre organisation est introuvable', async () => {
      const { services, seed, stints } = harness();
      const { organizationId, adminId, otherOrganizationId, otherAdminId } = await seed();
      const ark = await create(services, { userId: adminId, organizationId }, ARK);
      const other = { userId: otherAdminId, organizationId: otherOrganizationId };
      const otherTeam = await create(services, other, VNT);

      await expect(
        executeCommand(services, other, transferPlayer, {
          playerId: ZEPHYR_ID,
          to: { teamId: otherTeam, status: 'starter' },
        }),
      ).rejects.toMatchObject({ reason: 'not_found' });
      await expect(
        executeCommand(services, { userId: adminId, organizationId }, transferPlayer, {
          playerId: ZEPHYR_ID,
          to: { teamId: otherTeam, status: 'starter' },
        }),
      ).rejects.toMatchObject({ reason: 'not_found' });
      await expect(
        executeCommand(services, other, archiveTeam, { teamId: ark }),
      ).rejects.toMatchObject({ reason: 'not_found' });
      expect(await stints(organizationId, ZEPHYR_ID)).toEqual([]);
    });

    it('une équipe archivée ne recrute plus', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ark = await create(services, actor, ARK);
      await executeCommand(services, actor, archiveTeam, { teamId: ark });

      await expect(
        executeCommand(services, actor, transferPlayer, {
          playerId: ZEPHYR_ID,
          to: { teamId: ark, status: 'starter' },
        }),
      ).rejects.toMatchObject({ reason: 'conflict' });
    });

    it('archiver une équipe termine aujourd’hui les passages de ses joueurs, et garde son historique', async () => {
      const { services, seed, team, stints } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ark = await create(services, actor, ARK);
      const vnt = await create(services, actor, VNT);
      await executeCommand(services, actor, transferPlayer, {
        playerId: ZEPHYR_ID,
        to: { teamId: ark, status: 'starter' },
      });
      await executeCommand(services, actor, transferPlayer, {
        playerId: SIROCCO_ID,
        to: { teamId: vnt, status: 'coach' },
      });

      const outcome = await executeCommand(services, actor, archiveTeam, { teamId: ark });

      expect(outcome).toEqual({ teamId: ark, date: TODAY });
      expect((await team(organizationId, ark))?.archivedAt).toBe('2026-11-22T20:00:00.000Z');
      expect(await stints(organizationId, ZEPHYR_ID)).toEqual([
        { teamId: ark, status: 'starter', joinedOn: TODAY, leftOn: TODAY },
      ]);
      expect(await stints(organizationId, SIROCCO_ID)).toEqual([
        { teamId: vnt, status: 'coach', joinedOn: TODAY, leftOn: null },
      ]);
    });

    it('une équipe ne s’archive pas deux fois', async () => {
      const { services, seed } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ark = await create(services, actor, ARK);
      await executeCommand(services, actor, archiveTeam, { teamId: ark });

      await expect(
        executeCommand(services, actor, archiveTeam, { teamId: ark }),
      ).rejects.toMatchObject({ reason: 'already_done' });
    });

    it('le transfert est écrit au journal', async () => {
      const { services, seed, commandLog } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ark = await create(services, actor, ARK);
      await executeCommand(services, actor, transferPlayer, {
        playerId: ZEPHYR_ID,
        to: { teamId: ark, status: 'starter' },
      });

      expect((await commandLog(organizationId)).map((entry) => entry.command)).toEqual([
        'createTeam',
        'transferPlayer',
      ]);
    });
  });
}
