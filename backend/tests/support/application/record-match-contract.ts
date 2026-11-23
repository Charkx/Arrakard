import { describe, expect, it } from 'vitest';
import {
  archiveEdition,
  closeSeason,
  createEdition,
  executeCommand,
  mergePlayers,
  recordMatch,
  type RecordMatchInput,
} from '#application/index.ts';
import type { CommandHarness } from './command-harness.ts';
import { BRISE_ID, LEAGUE_ID, OFF_SEASON_ID, SEASON_ID, SIROCCO_ID, ZEPHYR_ID } from './fixture.ts';

const side = (playerId: string, champion: string, kills: number) => ({
  playerId,
  champion,
  kills,
  deaths: 2,
  assists: 5,
  gold: 9500,
});

/** Une feuille de cinq lignes : les cinq premiers joueurs côté A, les cinq suivants côté B. */
function entry(editionId: string, version: number, ids: readonly string[]): RecordMatchInput {
  return {
    editionId,
    version,
    durationSeconds: 1930,
    winner: 'B',
    teams: ['Noxus', 'Ionia'],
    lines: (['TOP', 'JGL', 'MID', 'ADC', 'SUP'] as const).map((role, i) => ({
      role,
      sides: [side(ids[i] ?? '', 'Ornn', i), side(ids[i + 5] ?? '', 'Sion', i + 1)],
    })),
  };
}

/**
 * Saisir un match à la main (cas d'usage A14, ADR 0037), contre chaque
 * implémentation des ports. `OFF_SEASON_ID` est une In House sans match.
 */
export function describeRecordMatchContract(name: string, harness: () => CommandHarness): void {
  describe(`saisir un match à la main : ${name}`, () => {
    it('un admin saisit un match : il est en brouillon, numéroté après les autres', async () => {
      const { services, seed, addPlayers, recordedMatch, edition } = harness();
      const { organizationId, adminId } = await seed();
      const ids = await addPlayers(organizationId, 10);

      const outcome = await executeCommand(
        services,
        { userId: adminId, organizationId },
        recordMatch,
        entry(LEAGUE_ID, 1, ids),
      );

      expect(outcome).toMatchObject({ editionId: LEAGUE_ID, matchNumber: 2, version: 2 });
      const match = await recordedMatch(organizationId, outcome.matchId);
      expect(match).toMatchObject({
        editionId: LEAGUE_ID,
        matchNumber: 2,
        winnerTeam: 'Ionia',
        durationSeconds: 1930,
        draft: true,
      });
      expect(match?.performances.slice(0, 2)).toEqual([
        {
          line: 0,
          side: 'A',
          playerId: ids[0],
          team: 'Noxus',
          role: 'TOP',
          champion: 'Ornn',
          result: 'loss',
          kills: 0,
          deaths: 2,
          assists: 5,
          gold: 9500,
        },
        {
          line: 0,
          side: 'B',
          playerId: ids[5],
          team: 'Ionia',
          role: 'TOP',
          champion: 'Sion',
          result: 'win',
          kills: 1,
          deaths: 2,
          assists: 5,
          gold: 9500,
        },
      ]);
      expect(match?.performances).toHaveLength(10);
      expect((await edition(organizationId, LEAGUE_ID))?.version).toBe(2);
    });

    it('le premier match d’une édition porte le numéro 1, et n’entre pas dans les notes', async () => {
      const { services, seed, addPlayers, publishedMatchIds } = harness();
      const { organizationId, adminId } = await seed();
      const ids = await addPlayers(organizationId, 10);

      const { matchNumber, matchId } = await executeCommand(
        services,
        { userId: adminId, organizationId },
        recordMatch,
        entry(OFF_SEASON_ID, 1, ids),
      );

      expect(matchNumber).toBe(1);
      expect(await publishedMatchIds(organizationId)).not.toContain(matchId);
    });

    it('refuse une feuille où un joueur est saisi deux fois', async () => {
      const { services, seed, addPlayers, edition } = harness();
      const { organizationId, adminId } = await seed();
      const ids = await addPlayers(organizationId, 10);
      const twice = [...ids.slice(0, 9), ids[0] ?? ''];

      await expect(
        executeCommand(
          services,
          { userId: adminId, organizationId },
          recordMatch,
          entry(LEAGUE_ID, 1, twice),
        ),
      ).rejects.toMatchObject({ reason: 'conflict' });
      expect((await edition(organizationId, LEAGUE_ID))?.version).toBe(1);
    });

    it('refuse un joueur fusionné ou inconnu', async () => {
      const { services, seed, addPlayers } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ids = await addPlayers(organizationId, 9);
      await executeCommand(services, actor, mergePlayers, {
        absorbedId: BRISE_ID,
        keptId: ZEPHYR_ID,
      });

      await expect(
        executeCommand(services, actor, recordMatch, entry(LEAGUE_ID, 1, [...ids, BRISE_ID])),
      ).rejects.toMatchObject({ reason: 'not_found' });
    });

    it('une version périmée est un conflit', async () => {
      const { services, seed, addPlayers } = harness();
      const { organizationId, adminId } = await seed();
      const ids = await addPlayers(organizationId, 10);

      await expect(
        executeCommand(
          services,
          { userId: adminId, organizationId },
          recordMatch,
          entry(LEAGUE_ID, 7, ids),
        ),
      ).rejects.toMatchObject({ reason: 'conflict' });
    });

    it('une saison clôturée ne reçoit plus de match', async () => {
      const { services, seed, addPlayers } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ids = await addPlayers(organizationId, 10);
      await executeCommand(services, actor, closeSeason, { seasonId: SEASON_ID });

      await expect(
        executeCommand(services, actor, recordMatch, entry(LEAGUE_ID, 1, ids)),
      ).rejects.toMatchObject({ reason: 'season_closed' });
    });

    it('ni un événement externe, ni une édition archivée ne reçoivent de match', async () => {
      const { services, seed, addPlayers } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ids = await addPlayers(organizationId, 10);
      const { editionId } = await executeCommand(services, actor, createEdition, {
        name: 'Gamers Assembly',
        type: 'external_lan',
        date: '2026-11-28',
        seasonId: null,
        prestige: 'normal',
        location: null,
        url: null,
        description: null,
        arrakisWon: null,
        participantIds: [SIROCCO_ID],
      });
      await executeCommand(services, actor, archiveEdition, {
        editionId: OFF_SEASON_ID,
        version: 1,
      });

      await expect(
        executeCommand(services, actor, recordMatch, entry(editionId, 1, ids)),
      ).rejects.toMatchObject({ reason: 'conflict' });
      await expect(
        executeCommand(services, actor, recordMatch, entry(OFF_SEASON_ID, 2, ids)),
      ).rejects.toMatchObject({ reason: 'conflict' });
    });

    it('un simple membre ne saisit pas de match', async () => {
      const { services, seed, addPlayers } = harness();
      const { organizationId, memberId } = await seed();
      const ids = await addPlayers(organizationId, 10);

      await expect(
        executeCommand(
          services,
          { userId: memberId, organizationId },
          recordMatch,
          entry(LEAGUE_ID, 1, ids),
        ),
      ).rejects.toMatchObject({ reason: 'forbidden' });
    });
  });
}
