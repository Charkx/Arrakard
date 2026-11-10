/**
 * Rapport de migration sur une sauvegarde v1, sans rien écrire.
 *
 *   pnpm --filter @arrakis/migrate-v1 report <dossier de la sauvegarde> [référence v1]
 *
 * La référence v1 (notes calculées par le code v1) se génère avec
 * l'extracteur du golden master, option V1_REFERENCE.
 *
 * La sauvegarde contient un fichier JSON par table (export REST). Le rapport
 * cite des pseudos réels : il s'affiche, il ne se commite pas.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { planMigration } from './plan.ts';
import type { V1Dump } from './v1.ts';
import { verifyRatings, type V1Reference } from './verify.ts';

const TABLES = [
  'seasons',
  'splits',
  'teams',
  'players',
  'editions',
  'matches',
  'match_rows',
  'edition_participants',
  'registrations',
  'player_event_entries',
] as const satisfies readonly (keyof V1Dump)[];

const [dir, referencePath] = process.argv.slice(2);
if (!dir) {
  console.error('Usage : report <dossier de la sauvegarde v1>');
  process.exit(1);
}

const dump = Object.fromEntries(
  TABLES.map((table) => [table, JSON.parse(readFileSync(join(dir, `${table}.json`), 'utf8'))]),
) as unknown as V1Dump;

const plan = planMigration(dump);
const { rows, report } = plan;

console.log('## Lignes v2\n');
for (const [table, list] of Object.entries(rows)) {
  console.log(`${table.padEnd(22)} ${String((list as readonly unknown[]).length).padStart(5)}`);
}

console.log(`\n## Anomalies (${report.length})\n`);
for (const [code, list] of Map.groupBy(report, (a) => a.code)) {
  console.log(`### ${code} (${list.length})`);
  for (const a of list) console.log(`- ${a.message}`);
  console.log();
}

if (!referencePath) {
  console.log('## Écarts de notes : non vérifiés (référence v1 non fournie)');
  process.exit(0);
}
const reference = JSON.parse(readFileSync(referencePath, 'utf8')) as V1Reference;
const discrepancies = verifyRatings(plan, reference);
const names = new Map(rows.players.map((p) => [p.id, p.nickname]));
console.log(`## Écarts de notes (${discrepancies.length})\n`);
for (const [field, list] of Map.groupBy(discrepancies, (d) => d.field)) {
  console.log(`### ${field} (${list.length})`);
  for (const d of list.slice(0, 15)) {
    console.log(
      `- ${names.get(d.playerId) ?? d.playerId} · split ${d.splitId.slice(0, 8)} : v1 ${d.v1} → v2 ${d.v2}`,
    );
  }
  if (list.length > 15) console.log(`- … et ${list.length - 15} autres`);
  console.log();
}
