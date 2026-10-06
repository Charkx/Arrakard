import { describe, expect, it } from 'vitest';
import { planMigration } from './plan.ts';
import { aV1Dump, aV1Match, aV1Row, aV1Split } from './testing/v1-builders.ts';

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
  });
});
