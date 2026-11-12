import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readDump } from '../dump.ts';
import { planMigration } from '../plan.ts';
import { demoBackup } from './demo-backup.ts';

describe('la sauvegarde de démonstration', () => {
  it('se migre sans aucune anomalie', () => {
    const plan = planMigration(demoBackup());

    expect(plan.report).toEqual([]);
  });

  it('couvre les cas dont les pages ont besoin', () => {
    const { rows } = planMigration(demoBackup());

    expect(rows.seasons.map((s) => s.status).sort()).toEqual(['closed', 'open']);
    expect(new Set(rows.editions.map((e) => e.type))).toEqual(
      new Set(['league_div1', 'league_div2', 'inhouse', 'external_event']),
    );
    expect(rows.players.some((p) => p.archived)).toBe(true);
    expect(rows.edition_participants.length).toBeGreaterThan(0);
    expect(rows.matches.some((m) => m.is_final)).toBe(true);
  });

  it('est la même à chaque appel', () => {
    expect(demoBackup()).toEqual(demoBackup());
  });

  it('est à jour dans le dossier demo-backup (sinon : pnpm demo:write)', () => {
    const committed = readDump(join(import.meta.dirname, '../../demo-backup'));

    expect(committed).toEqual(demoBackup());
  });
});
