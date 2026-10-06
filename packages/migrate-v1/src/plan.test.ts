import { describe, expect, it } from 'vitest';
import { planMigration } from './plan.ts';
import {
  aV1Dump,
  aV1Edition,
  aV1Match,
  aV1Player,
  aV1Row,
  aV1Split,
} from './testing/v1-builders.ts';

describe('planMigration', () => {
  describe('calendrier', () => {
    it('reprend les saisons, et ferme tous les splits sauf le split actif', () => {
      const { rows } = planMigration(
        aV1Dump({
          splits: [
            aV1Split({ id: 'old', is_active: false, end_date: '2025-12-31' }),
            aV1Split({ id: 'current', number: 2 }),
          ],
        }),
      );

      expect(rows.seasons).toEqual([{ id: 'season-1', name: 'Saison 1', year: 2026 }]);
      expect(rows.splits.map((s) => [s.id, s.status])).toEqual([
        ['old', 'closed'],
        ['current', 'open'],
      ]);
    });
  });

  describe('matchs et performances', () => {
    it('lit la durée affichée, exacte à la seconde', () => {
      const { rows } = planMigration(
        aV1Dump({ matches: [aV1Match({ duration_display: '34:52' })] }),
      );

      expect(rows.matches).toEqual([
        {
          id: 'match-1',
          edition_id: 'edition-1',
          match_number: 1,
          winner_team: 'ARK',
          duration_seconds: 2092,
          matchday: null,
          is_final: false,
        },
      ]);
    });

    it('fait deux performances d’une ligne de match, une par côté', () => {
      const { rows } = planMigration(aV1Dump());

      expect(rows.performances).toEqual([
        {
          match_id: 'match-1',
          line: 0,
          side: 'A',
          player_id: 'player-zephyr',
          team: 'ARK',
          role: 'TOP',
          champion: 'Ornn',
          result: 'win',
          kills: 3,
          deaths: 1,
          assists: 7,
          gold: 12000,
        },
        {
          match_id: 'match-1',
          line: 0,
          side: 'B',
          player_id: 'player-sirocco',
          team: 'DUN',
          role: 'TOP',
          champion: 'Gnar',
          result: 'loss',
          kills: 1,
          deaths: 3,
          assists: 2,
          gold: 9000,
        },
      ]);
    });

    it('numérote les lignes dans l’ordre des rôles, quel que soit l’ordre de la sauvegarde', () => {
      const { rows } = planMigration(
        aV1Dump({
          match_rows: [
            aV1Row({ id: 'r-sup', role: 'SUP', a_player_name: 'A5', b_player_name: 'B5' }),
            aV1Row({ id: 'r-top', role: 'TOP', a_player_name: 'A1', b_player_name: 'B1' }),
            aV1Row({ id: 'r-mid', role: 'MID', a_player_name: 'A3', b_player_name: 'B3' }),
          ],
        }),
      );

      expect(rows.performances.filter((p) => p.side === 'A').map((p) => [p.role, p.line])).toEqual([
        ['TOP', 0],
        ['MID', 2],
        ['SUP', 4],
      ]);
    });

    it('complète un nom d’équipe vide avec l’équipe du match, côté par côté (M5)', () => {
      const { rows, report } = planMigration(
        aV1Dump({ match_rows: [aV1Row({ a_team: '', b_team: '' })] }),
      );

      expect(rows.performances.map((p) => p.team)).toEqual(['ARK', 'DUN']);
      expect(report).toContainEqual({
        code: 'missing-team',
        message: 'Match match-1, TOP : équipe vide des côtés A et B, complétée depuis le match.',
      });
    });

    it('signale une équipe vide d’un seul côté', () => {
      const { report } = planMigration(aV1Dump({ match_rows: [aV1Row({ b_team: '' })] }));

      expect(report).toEqual([
        {
          code: 'missing-team',
          message: 'Match match-1, TOP : équipe vide du côté B, complétée depuis le match.',
        },
      ]);
    });

    it('migre tel quel un match où les deux équipes ont perdu, et le signale (M3)', () => {
      const { rows, report } = planMigration(
        aV1Dump({
          matches: [aV1Match({ winner: 'XYZ' })],
          match_rows: [aV1Row({ a_result: 'LOSE' })],
        }),
      );

      expect(rows.performances.map((p) => p.result)).toEqual(['loss', 'loss']);
      expect(rows.matches[0]?.winner_team).toBe('XYZ');
      expect(report).toEqual([
        {
          code: 'contradictory-result',
          message:
            'Match match-1 (ARK contre DUN) : vainqueur enregistré « XYZ », résultats des lignes A loss / B loss. Migré tel quel, à corriger après la bascule.',
        },
      ]);
    });

    it('signale un vainqueur absent du match même si les lignes sont cohérentes', () => {
      const { rows, report } = planMigration(
        aV1Dump({
          matches: [aV1Match({ winner: 'XYZ' })],
          match_rows: [aV1Row({ a_result: 'LOSE', b_result: 'WIN' })],
        }),
      );

      expect(rows.performances.map((p) => p.result)).toEqual(['loss', 'win']);
      expect(report.map((a) => a.code)).toEqual(['contradictory-result']);
    });

    it.each([
      [
        'une ligne dont le match n’existe pas',
        aV1Dump({ matches: [] }),
        'Ligne row-1 : match match-1 introuvable.',
      ],
      [
        'un match dont l’édition n’existe pas',
        aV1Dump({ editions: [aV1Edition({ id: 'other' })] }),
        'Match match-1 : édition edition-1 introuvable.',
      ],
      [
        'une durée illisible',
        aV1Dump({ matches: [aV1Match({ duration_display: '33.05' })] }),
        'Match match-1 : durée illisible « 33.05 ».',
      ],
    ])('refuse une sauvegarde incohérente : %s', (_label, dump, error) => {
      expect(() => planMigration(dump)).toThrow(error);
    });
  });

  describe('identité des joueurs', () => {
    const playerOf = (plan: ReturnType<typeof planMigration>, side: 'A' | 'B') =>
      plan.rows.performances.find((p) => p.side === side)?.player_id;

    it('rattache une graphie au joueur de même clé, à la casse et au tag près (M1)', () => {
      const plan = planMigration(
        aV1Dump({ match_rows: [aV1Row({ a_player_name: 'ARK zéPHYR' })] }),
      );

      expect(playerOf(plan, 'A')).toBe('player-zephyr');
      expect(plan.report).toEqual([]);
    });

    it('enregistre le pseudo et chaque graphie rencontrée comme alias normalisés', () => {
      const plan = planMigration(aV1Dump({ match_rows: [aV1Row({ a_player_name: 'ZEPHYR' })] }));

      expect(plan.rows.player_aliases.filter((a) => a.player_id === 'player-zephyr')).toEqual([
        { player_id: 'player-zephyr', alias: 'zephyr' },
      ]);
    });

    it('crée un joueur pour une clé sans joueur v1, avec un identifiant stable', () => {
      const dump = aV1Dump({ match_rows: [aV1Row({ b_player_name: 'Harmattan' })] });

      const first = planMigration(dump);
      const second = planMigration(dump);

      const id = playerOf(first, 'B');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(playerOf(second, 'B')).toBe(id);
      expect(first.rows.players).toContainEqual(
        expect.objectContaining({
          id,
          nickname: 'Harmattan',
          archived: false,
          created_at: '2026-02-01T00:00:00Z',
        }),
      );
      expect(first.report).toContainEqual({
        code: 'new-player',
        message: `« Harmattan » ne correspond à aucun joueur v1 : joueur créé (${String(id)}).`,
      });
    });

    it('nomme le nouveau joueur d’après sa graphie la plus fréquente', () => {
      const plan = planMigration(
        aV1Dump({
          matches: [aV1Match(), aV1Match({ id: 'match-2', match_number: 2 })],
          match_rows: [
            aV1Row({ b_player_name: 'harmattan' }),
            aV1Row({ id: 'row-2', match_id: 'match-2', b_player_name: 'Harmattan' }),
            aV1Row({ id: 'row-3', match_id: 'match-2', role: 'MID', b_player_name: 'Harmattan' }),
          ],
        }),
      );

      expect(plan.rows.players.map((p) => p.nickname)).toContain('Harmattan');
    });

    it('à fréquence égale, nomme le nouveau joueur d’après la graphie qui vient en premier', () => {
      const plan = planMigration(
        aV1Dump({
          matches: [aV1Match(), aV1Match({ id: 'match-2', match_number: 2 })],
          match_rows: [
            aV1Row({ b_player_name: 'harmattan' }),
            aV1Row({ id: 'row-2', match_id: 'match-2', b_player_name: 'Harmattan' }),
          ],
        }),
      );

      expect(plan.rows.players.map((p) => p.nickname)).toContain('Harmattan');
    });

    it('date un joueur créé du jour de sa première édition', () => {
      const plan = planMigration(
        aV1Dump({
          editions: [
            aV1Edition({ id: 'late', created_at: '2026-03-01T00:00:00Z' }),
            aV1Edition({ id: 'early', created_at: '2026-01-15T00:00:00Z' }),
          ],
          matches: [
            aV1Match({ edition_id: 'late' }),
            aV1Match({ id: 'match-2', edition_id: 'early' }),
          ],
          match_rows: [
            aV1Row({ b_player_name: 'Harmattan' }),
            aV1Row({ id: 'row-2', match_id: 'match-2', b_player_name: 'Harmattan' }),
          ],
        }),
      );

      expect(plan.rows.players.find((p) => p.nickname === 'Harmattan')?.created_at).toBe(
        '2026-01-15T00:00:00Z',
      );
    });

    it('départage des homonymes par l’équipe citée dans les lignes (M2)', () => {
      const plan = planMigration(
        aV1Dump({
          players: [
            aV1Player({ id: 'zephyr-ark', team_id: 'team-ark', team_tag: 'ARK' }),
            aV1Player({ id: 'zephyr-dun', team_id: 'team-dun', team_tag: 'DUN' }),
            aV1Player({ id: 'player-sirocco', name: 'Sirocco' }),
          ],
        }),
      );

      expect(playerOf(plan, 'A')).toBe('zephyr-ark');
      expect(plan.rows.players.map((p) => p.id)).toContain('zephyr-dun');
      expect(plan.report).toContainEqual({
        code: 'homonyms',
        message:
          '« zephyr » : 2 joueurs v1. Performances attribuées à zephyr-ark (équipe ARK) ; zephyr-dun migré sans performance.',
      });
    });

    it('refuse de deviner entre des homonymes qu’aucune équipe ne départage', () => {
      const dump = aV1Dump({
        players: [
          aV1Player({ id: 'zephyr-1' }),
          aV1Player({ id: 'zephyr-2' }),
          aV1Player({ id: 'player-sirocco', name: 'Sirocco' }),
        ],
      });

      expect(() => planMigration(dump)).toThrow(
        '« zephyr » : 2 joueurs v1 (zephyr-1, zephyr-2) qu’aucune équipe ne départage.',
      );
    });

    it('ne rattache aucune performance à un joueur fusionné, dont les alias passent au joueur conservé', () => {
      const plan = planMigration(
        aV1Dump({
          players: [
            aV1Player(),
            aV1Player({ id: 'old-zephyr', name: 'Zephyr Old', merged_into: 'player-zephyr' }),
            aV1Player({ id: 'player-sirocco', name: 'Sirocco' }),
          ],
        }),
      );

      expect(plan.rows.players).toContainEqual(
        expect.objectContaining({ id: 'old-zephyr', merged_into: 'player-zephyr' }),
      );
      expect(plan.rows.player_aliases.filter((a) => a.player_id === 'player-zephyr')).toEqual([
        { player_id: 'player-zephyr', alias: 'zephyr' },
        { player_id: 'player-zephyr', alias: 'zephyr old' },
      ]);
      expect(plan.rows.player_aliases.some((a) => a.player_id === 'old-zephyr')).toBe(false);
    });

    it('migre les joueurs sans performance, avec leur pseudo comme alias', () => {
      const plan = planMigration(
        aV1Dump({
          players: [
            aV1Player(),
            aV1Player({ id: 'player-sirocco', name: 'Sirocco' }),
            aV1Player({ id: 'bench', name: 'Simoun', archived: true, discord_user_id: '42' }),
          ],
        }),
      );

      expect(plan.rows.players).toContainEqual({
        id: 'bench',
        nickname: 'Simoun',
        archived: true,
        merged_into: null,
        discord_user_id: '42',
        created_at: '2026-01-01T00:00:00Z',
      });
      expect(plan.rows.player_aliases).toContainEqual({ player_id: 'bench', alias: 'simoun' });
    });
  });
});
