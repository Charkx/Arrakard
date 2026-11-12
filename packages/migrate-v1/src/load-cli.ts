/**
 * Charge une sauvegarde v1 dans une base v2 : les faits migrés, puis les
 * projections recalculées, en une seule transaction.
 *
 *   pnpm --filter @arrakis/migrate-v1 load <dossier de la sauvegarde> [--replace] [--confirm-hosted]
 *
 * La base visée est la base locale de Supabase, ou celle de la variable
 * DATABASE_URL. Une base hébergée exige --confirm-hosted.
 *
 * Une organisation qui contient déjà des données n'est remplacée qu'avec
 * --replace : tout ce qui y a été saisi depuis le dernier chargement est perdu.
 *
 * Le rapport cite des pseudos réels si la sauvegarde est réelle : il
 * s'affiche, il ne se commite pas.
 */
import postgres from 'postgres';
import { loadPlan } from './db/load.ts';
import { assertTargetAllowed, LOCAL_DATABASE_URL } from './db/target.ts';
import { readDump } from './dump.ts';
import { planMigration } from './plan.ts';
import { formatReport } from './report.ts';

const args = process.argv.slice(2);
const dir = args.find((arg) => !arg.startsWith('--'));
if (!dir) {
  console.error('Usage : load <dossier de la sauvegarde v1> [--replace] [--confirm-hosted]');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;
try {
  assertTargetAllowed(databaseUrl, args.includes('--confirm-hosted'));
} catch (refusal) {
  console.error(refusal instanceof Error ? refusal.message : refusal);
  process.exit(1);
}

// Le rapport d'abord : on voit ce qui va être écrit avant que ce soit écrit.
const plan = planMigration(readDump(dir));
console.log(formatReport(plan));

const sql = postgres(databaseUrl, { onnotice: () => undefined });
try {
  await loadPlan(
    sql,
    plan,
    { slug: 'arrakis', name: 'Arrakis' },
    { replace: args.includes('--replace') },
  );
  console.log(`## Chargement terminé dans ${new URL(databaseUrl).hostname}`);
} catch (failure) {
  console.error(failure instanceof Error ? failure.message : failure);
  process.exitCode = 1;
} finally {
  await sql.end();
}
