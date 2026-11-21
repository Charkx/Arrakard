import { describe, expect, it } from 'vitest';
import { planMigration } from './plan.ts';
import { formatReport } from './report.ts';
import { aV1Dump, aV1Edition } from './testing/v1-builders.ts';

describe('formatReport', () => {
  it('compte les lignes de chaque table', () => {
    const plan = planMigration(aV1Dump());

    const report = formatReport(plan);

    expect(report).toMatch(/^players +2$/m);
    expect(report).toMatch(/^matches +1$/m);
  });

  it('regroupe les anomalies par sorte, avec leur nombre', () => {
    const plan = planMigration(aV1Dump({ editions: [aV1Edition({ split_id: null })] }));

    const report = formatReport(plan);

    expect(report).toContain('## Anomalies (1)');
    expect(report).toContain('### edition-outside-season (1)');
  });

  it('dit qu’il n’y a aucune anomalie quand la sauvegarde est propre', () => {
    const plan = planMigration(aV1Dump());

    expect(formatReport(plan)).toContain('## Anomalies (0)');
  });
});
