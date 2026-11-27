import { describe, expect, it } from 'vitest';
import {
  archiveTeam,
  createEdition,
  createTeam,
  executeCommand,
  importEdition,
  transferPlayer,
  type Actor,
  type CommandServices,
} from '#application/index.ts';
import type { CommandHarness } from './command-harness.ts';
import { OFF_SEASON_ID, SEASON_ID } from './fixture.ts';
import { sheetMatch } from './sheet-rows.ts';

/** Le jour de l'horloge des tests, à Paris. */
const TODAY = '2026-11-22';

const NO_DECISION = { names: {}, unknownTeams: {}, transfers: {} };

/** « Joueur 1 » à « Joueur 10 », sauf le pseudo `i` remplacé par `name`. */
const renaming = (i: number, name: string) => (n: number) =>
  n === i ? name : `Joueur ${String(n)}`;

/** Crée une journée de ligue sans match, et rend son identifiant. */
async function aLeagueDay(services: CommandServices, actor: Actor): Promise<string> {
  const { editionId } = await executeCommand(services, actor, createEdition, {
    name: 'Ligue D1, journée 3',
    type: 'league_div1',
    date: '2026-11-25',
    seasonId: SEASON_ID,
    prestige: 'normal',
    location: null,
    url: null,
    description: null,
    arrakisWon: null,
    participantIds: [],
  });
  return editionId;
}

/**
 * Les décisions de l'admin à l'import (cas d'usage A1, ADR 0039) : relier ou
 * créer un joueur, créer ou ignorer une équipe, appliquer ou ignorer un
 * transfert, et le réimport d'un fichier, contre chaque implémentation des ports.
 */
export function describeImportDecisionsContract(name: string, harness: () => CommandHarness): void {
  describe(`décider à l’import : ${name}`, () => {
    it('un pseudo relié à un joueur existant lui donne ses matchs, et devient son alias', async () => {
      const { services, seed, addPlayers, profile, recordedMatch } = harness();
      const { organizationId, adminId } = await seed();
      const ids = await addPlayers(organizationId, 10);
      const tenth = ids[9] ?? '';

      const outcome = await executeCommand(
        services,
        { userId: adminId, organizationId },
        importEdition,
        {
          editionId: OFF_SEASON_ID,
          version: 1,
          rows: sheetMatch(1, { names: renaming(10, 'Joueur Dix') }),
          decisions: {
            ...NO_DECISION,
            names: { 'joueur dix': { kind: 'existing', playerId: tenth } },
          },
        },
      );

      expect(outcome.createdPlayerIds).toEqual([]);
      expect((await profile(organizationId, tenth))?.aliases).toContain('joueur dix');
      const match = await recordedMatch(organizationId, outcome.matchIds[0] ?? '');
      expect(match?.performances.at(-1)?.playerId).toBe(tenth);
    });

    it('un pseudo pour lequel l’admin choisit « nouveau joueur » crée le joueur, qui joue ses matchs', async () => {
      const { services, seed, addPlayers, recordedMatch, stints } = harness();
      const { organizationId, adminId } = await seed();
      await addPlayers(organizationId, 9);

      const outcome = await executeCommand(
        services,
        { userId: adminId, organizationId },
        importEdition,
        {
          editionId: OFF_SEASON_ID,
          version: 1,
          rows: sheetMatch(1),
          decisions: { ...NO_DECISION, names: { 'joueur 10': { kind: 'new' } } },
        },
      );

      const [created = ''] = outcome.createdPlayerIds;
      const match = await recordedMatch(organizationId, outcome.matchIds[0] ?? '');
      expect(match?.performances.at(-1)?.playerId).toBe(created);
      // Une In House n'a pas de roster : le nouveau joueur reste sans équipe.
      expect(await stints(organizationId, created)).toEqual([]);
    });

    it('dans une ligue, une équipe créée par l’import reçoit ses nouveaux joueurs comme titulaires', async () => {
      const { services, seed, addPlayers, team, stints } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await addPlayers(organizationId, 9);
      const editionId = await aLeagueDay(services, actor);

      const outcome = await executeCommand(services, actor, importEdition, {
        editionId,
        version: 1,
        rows: sheetMatch(1, { teams: ['NOX', 'ION'] }),
        decisions: {
          names: { 'joueur 10': { kind: 'new' } },
          unknownTeams: { NOX: 'ignore', ION: 'create' },
          transfers: {},
        },
      });

      const [ion = ''] = outcome.createdTeamIds;
      expect(outcome.createdTeamIds).toHaveLength(1);
      expect(await team(organizationId, ion)).toMatchObject({ tag: 'ION', name: 'ION' });
      expect(await stints(organizationId, outcome.createdPlayerIds[0] ?? '')).toEqual([
        { teamId: ion, status: 'starter', joinedOn: TODAY, leftOn: null },
      ]);
    });

    it('une équipe inconnue reliée à une équipe connue reçoit ses nouveaux joueurs, sans être créée', async () => {
      const { services, seed, addPlayers, stints } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await addPlayers(organizationId, 9);
      const { teamId: ion } = await executeCommand(services, actor, createTeam, {
        tag: 'ION',
        name: 'Ionia',
        divisions: ['div1'],
      });
      const editionId = await aLeagueDay(services, actor);

      // « IONN » est une faute de frappe pour ION.
      const outcome = await executeCommand(services, actor, importEdition, {
        editionId,
        version: 1,
        rows: sheetMatch(1, { teams: ['NOX', 'IONN'] }),
        decisions: {
          names: { 'joueur 10': { kind: 'new' } },
          unknownTeams: { NOX: 'ignore', IONN: { linkTo: 'ION' } },
          transfers: {},
        },
      });

      expect(outcome.createdTeamIds).toEqual([]);
      expect((await stints(organizationId, outcome.createdPlayerIds[0] ?? '')).at(-1)?.teamId).toBe(
        ion,
      );
    });

    it('un transfert appliqué change l’équipe du joueur, en gardant son statut ; ignoré, rien ne change', async () => {
      const { services, seed, addPlayers, stints } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ids = await addPlayers(organizationId, 10);
      const [first = '', sixth = ''] = [ids[0], ids[5]];
      const { teamId: nox } = await executeCommand(services, actor, createTeam, {
        tag: 'NOX',
        name: 'Noxus',
        divisions: ['div1'],
      });
      const { teamId: ion } = await executeCommand(services, actor, createTeam, {
        tag: 'ION',
        name: 'Ionia',
        divisions: ['div1'],
      });
      // Joueur 1 joue pour NOX mais est remplaçant à ION ; Joueur 6 l'inverse.
      await executeCommand(services, actor, transferPlayer, {
        playerId: first,
        to: { teamId: ion, status: 'sub' },
      });
      await executeCommand(services, actor, transferPlayer, {
        playerId: sixth,
        to: { teamId: nox, status: 'starter' },
      });
      const editionId = await aLeagueDay(services, actor);

      const outcome = await executeCommand(services, actor, importEdition, {
        editionId,
        version: 1,
        rows: sheetMatch(1, { teams: ['NOX', 'ION'] }),
        decisions: { ...NO_DECISION, transfers: { [first]: 'apply', [sixth]: 'ignore' } },
      });

      expect(outcome.transferredPlayerIds).toEqual([first]);
      expect((await stints(organizationId, first)).at(-1)).toEqual({
        teamId: nox,
        status: 'sub',
        joinedOn: TODAY,
        leftOn: null,
      });
      expect((await stints(organizationId, sixth)).at(-1)?.teamId).toBe(nox);
    });

    it('une équipe archivée ne recrute pas par l’import', async () => {
      const { services, seed, addPlayers } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await addPlayers(organizationId, 10);
      const { teamId } = await executeCommand(services, actor, createTeam, {
        tag: 'NOX',
        name: 'Noxus',
        divisions: [],
      });
      await executeCommand(services, actor, archiveTeam, { teamId });
      const editionId = await aLeagueDay(services, actor);

      await expect(
        executeCommand(services, actor, importEdition, {
          editionId,
          version: 1,
          rows: sheetMatch(1, { teams: ['NOX', 'ION'], names: renaming(1, 'Novice') }),
          decisions: {
            names: { novice: { kind: 'new' } },
            unknownTeams: { ION: 'ignore' },
            transfers: {},
          },
        }),
      ).rejects.toMatchObject({
        reason: 'conflict',
        message: expect.stringContaining('« NOX » est archivée') as string,
      });
    });

    it('le même fichier n’est pas importé deux fois, ni dans la même édition, ni dans une autre', async () => {
      const { services, seed, addPlayers } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await addPlayers(organizationId, 10);
      const rows = sheetMatch(1);
      const { version } = await executeCommand(services, actor, importEdition, {
        editionId: OFF_SEASON_ID,
        version: 1,
        rows,
      });
      const { editionId: other } = await executeCommand(services, actor, createEdition, {
        name: 'IH #13',
        type: 'inhouse',
        date: '2026-11-27',
        seasonId: null,
        prestige: 'normal',
        location: null,
        url: null,
        description: null,
        arrakisWon: null,
        participantIds: [],
      });

      for (const [editionId, at] of [
        [OFF_SEASON_ID, version],
        [other, 1],
      ] as const) {
        await expect(
          executeCommand(services, actor, importEdition, { editionId, version: at, rows }),
        ).rejects.toMatchObject({
          reason: 'already_done',
          message: expect.stringContaining('déjà été importé') as string,
        });
      }
    });
  });
}
