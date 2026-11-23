import { describe, expect, it } from 'vitest';
import {
  createEdition,
  createTeam,
  executeCommand,
  importEdition,
  recordMatch,
  type ImportedRow,
} from '#application/index.ts';
import type { RoleLine } from '#domain/index.ts';
import type { CommandHarness } from './command-harness.ts';
import { LEAGUE_ID, OFF_SEASON_ID, SEASON_ID } from './fixture.ts';

const ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'] as const;

/**
 * Les cinq lignes d'un match de la feuille LIGUE1_STATS : « Joueur 1 » à
 * « Joueur 5 » pour l'équipe A, « Joueur 6 » à « Joueur 10 » pour l'équipe B,
 * qui gagne. Le fichier a une ligne parasite puis l'en-tête : les données
 * commencent à la ligne 3.
 */
function sheetMatch(
  matchNumber: number,
  { teams = ['Noxus', 'Ionia'], names = (i: number) => `Joueur ${String(i)}` } = {},
): ImportedRow[] {
  return ROLES.map((role, i) => ({
    line: 3 + (matchNumber - 1) * 5 + i,
    cells: {
      MATCH: matchNumber,
      GAGNANT: teams[1],
      DURÉE: 32.1,
      EQUIPE: teams[0],
      'WIN/LOSE': 'LOSE',
      POSTE: role,
      'NOM DU JOUEUR': names(i + 1),
      CHAMPION: 'Ornn',
      K: i,
      D: 2,
      A: 5,
      GOLD: 9500,
      'EQUIPE.1': teams[1],
      'WIN/LOSE.1': 'WIN',
      'POSTE.1': role,
      'NOM DU JOUEUR.1': names(i + 6),
      'CHAMPION.1': 'Sion',
      'K.1': i + 1,
      'D.1': 2,
      'A.1': 5,
      'GOLD.1': 9500,
    },
  }));
}

/**
 * Importer le fichier Excel d'une édition, cas simple (cas d'usage A1,
 * ADR 0038), contre chaque implémentation des ports. `OFF_SEASON_ID` est une
 * In House sans match ; `LEAGUE_ID` une ligue qui a déjà un match.
 */
export function describeImportEditionContract(name: string, harness: () => CommandHarness): void {
  describe(`importer un fichier Excel : ${name}`, () => {
    it('les matchs du fichier sont en brouillon, avec les mêmes faits qu’une saisie à la main', async () => {
      const { services, seed, addPlayers, recordedMatch } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      const ids = await addPlayers(organizationId, 10);

      const imported = await executeCommand(services, actor, importEdition, {
        editionId: OFF_SEASON_ID,
        version: 1,
        rows: [...sheetMatch(1), ...sheetMatch(2)],
      });
      const typed = await executeCommand(services, actor, recordMatch, {
        editionId: LEAGUE_ID,
        version: 1,
        durationSeconds: 32 * 60 + 10,
        winner: 'B',
        teams: ['Noxus', 'Ionia'],
        lines: ROLES.map((role, i): RoleLine => ({
          role,
          sides: [
            {
              playerId: ids[i] ?? '',
              champion: 'Ornn',
              kills: i,
              deaths: 2,
              assists: 5,
              gold: 9500,
            },
            {
              playerId: ids[i + 5] ?? '',
              champion: 'Sion',
              kills: i + 1,
              deaths: 2,
              assists: 5,
              gold: 9500,
            },
          ],
        })),
      });

      expect(imported.version).toBe(3);
      expect(imported.matchIds).toHaveLength(2);
      const [first] = imported.matchIds;
      const fromFile = await recordedMatch(organizationId, first ?? '');
      const byHand = await recordedMatch(organizationId, typed.matchId);
      expect(fromFile).toMatchObject({ editionId: OFF_SEASON_ID, matchNumber: 1, draft: true });
      expect(fromFile?.winnerTeam).toBe('Ionia');
      expect(fromFile?.durationSeconds).toBe(byHand?.durationSeconds);
      expect(fromFile?.performances).toEqual(byHand?.performances);
    });

    it('un pseudo écrit avec le tag d’une équipe connue est reconnu', async () => {
      const { services, seed, addPlayers } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await addPlayers(organizationId, 10);
      await executeCommand(services, actor, createTeam, {
        tag: 'NOX',
        name: 'Noxus',
        divisions: [],
      });

      const outcome = await executeCommand(services, actor, importEdition, {
        editionId: OFF_SEASON_ID,
        version: 1,
        rows: sheetMatch(1, {
          names: (i) => (i <= 5 ? `NOX Joueur ${String(i)}` : `Joueur ${String(i)}`),
        }),
      });

      expect(outcome.matchIds).toHaveLength(1);
    });

    it('un pseudo inconnu refuse l’import, et rien n’est écrit', async () => {
      const { services, seed, addPlayers, edition } = harness();
      const { organizationId, adminId } = await seed();
      await addPlayers(organizationId, 9);

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, importEdition, {
          editionId: OFF_SEASON_ID,
          version: 1,
          rows: sheetMatch(1),
        }),
      ).rejects.toMatchObject({
        reason: 'conflict',
        message: expect.stringContaining('« Joueur 10 »') as string,
      });
      expect((await edition(organizationId, OFF_SEASON_ID))?.version).toBe(1);
    });

    it('un fichier mal formé est refusé, avec un message qui nomme la ligne', async () => {
      const { services, seed, addPlayers } = harness();
      const { organizationId, adminId } = await seed();
      await addPlayers(organizationId, 10);
      const rows = sheetMatch(1).map((row) =>
        row.line === 5 ? { ...row, cells: { ...row.cells, 'K.1': 'trois' } } : row,
      );

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, importEdition, {
          editionId: OFF_SEASON_ID,
          version: 1,
          rows,
        }),
      ).rejects.toMatchObject({
        reason: 'conflict',
        message: expect.stringContaining('Ligne 5 (match 1)') as string,
      });
    });

    it('dans une ligue, une équipe inconnue refuse l’import', async () => {
      const { services, seed, addPlayers } = harness();
      const { organizationId, adminId } = await seed();
      const actor = { userId: adminId, organizationId };
      await addPlayers(organizationId, 10);
      const { editionId } = await executeCommand(services, actor, createEdition, {
        name: 'Ligue D2, journée 1',
        type: 'league_div2',
        date: '2026-11-25',
        seasonId: SEASON_ID,
        prestige: 'normal',
        location: null,
        url: null,
        description: null,
        arrakisWon: null,
        participantIds: [],
      });

      await expect(
        executeCommand(services, actor, importEdition, {
          editionId,
          version: 1,
          rows: sheetMatch(1),
        }),
      ).rejects.toMatchObject({
        reason: 'conflict',
        message: expect.stringContaining('« Noxus »') as string,
      });
    });

    it('une édition qui a déjà des matchs n’est pas importée', async () => {
      const { services, seed, addPlayers } = harness();
      const { organizationId, adminId } = await seed();
      await addPlayers(organizationId, 10);

      await expect(
        executeCommand(services, { userId: adminId, organizationId }, importEdition, {
          editionId: LEAGUE_ID,
          version: 1,
          rows: sheetMatch(1),
        }),
      ).rejects.toMatchObject({
        reason: 'conflict',
        message: expect.stringContaining('déjà des matchs') as string,
      });
    });

    it('un simple membre n’importe pas', async () => {
      const { services, seed, addPlayers } = harness();
      const { organizationId, memberId } = await seed();
      await addPlayers(organizationId, 10);

      await expect(
        executeCommand(services, { userId: memberId, organizationId }, importEdition, {
          editionId: OFF_SEASON_ID,
          version: 1,
          rows: sheetMatch(1),
        }),
      ).rejects.toMatchObject({ reason: 'forbidden' });
    });
  });
}
