import type { MigrationPlan } from './plan.ts';

/** Le rapport d'un plan de migration : les lignes produites, puis les anomalies par sorte. */
export function formatReport({ rows, report }: MigrationPlan): string {
  const lines = ['## Lignes v2', ''];
  for (const [table, list] of Object.entries(rows)) {
    lines.push(`${table.padEnd(22)} ${String((list as readonly unknown[]).length).padStart(5)}`);
  }

  lines.push('', `## Anomalies (${report.length})`, '');
  for (const [code, list] of Map.groupBy(report, (a) => a.code)) {
    lines.push(`### ${code} (${list.length})`);
    for (const a of list) lines.push(`- ${a.message}`);
    lines.push('');
  }
  return lines.join('\n');
}
