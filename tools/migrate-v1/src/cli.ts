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
import { readDump } from './dump.ts';
import { planMigration } from './plan.ts';
import { formatReport } from './report.ts';
import { verifyRatings, type V1Reference } from './verify.ts';

const [dir, referencePath] = process.argv.slice(2);
if (!dir) {
  console.error('Usage : report <dossier de la sauvegarde v1>');
  process.exit(1);
}

const plan = planMigration(readDump(dir));
const { rows } = plan;

console.log(formatReport(plan));

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
      `- ${names.get(d.playerId) ?? d.playerId} · saison ${d.seasonId.slice(0, 8)} : v1 ${d.v1} → v2 ${d.v2}`,
    );
  }
  if (list.length > 15) console.log(`- … et ${list.length - 15} autres`);
  console.log();
}
