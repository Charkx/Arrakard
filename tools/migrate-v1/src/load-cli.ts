/**
 * Charge une sauvegarde v1 dans une base v2 : les faits migrés, puis les
 * projections recalculées, en une seule transaction.
 *
 *   pnpm --filter @arrakis/migrate-v1 load <dossier de la sauvegarde> [--organization=arrakis-essai] [--replace] [--confirm-hosted]
 *
 * La base visée est la base locale de Supabase, ou celle de la variable
 * DATABASE_URL. Une base hébergée exige --confirm-hosted.
 *
 * L'organisation visée est `arrakis`, celle du site public, ou l'organisation
 * d'essai avec --organization=arrakis-essai (ADR 0021) : ses identifiants sont
 * alors réécrits, et charger l'une ne touche jamais l'autre.
 *
 * Une organisation qui contient déjà des données n'est remplacée qu'avec
 * --replace : tout ce qui y a été saisi depuis le dernier chargement est perdu.
 *
 * Le rapport cite des pseudos réels si la sauvegarde est réelle : il
 * s'affiche, il ne se commite pas.
 */
import { LOCAL_DATABASE_URL } from '@arrakis/backend/infrastructure';
import postgres from 'postgres';
import { loadPlan } from './load.ts';
import { assertTargetAllowed } from './target.ts';
import { readDump } from './dump.ts';
import { planMigration } from './plan.ts';
import { LOAD_USAGE, parseLoadArgs } from './load-args.ts';
import { planForOrganization } from './rekey.ts';
import { formatReport } from './report.ts';

const parsed = parseLoadArgs(process.argv.slice(2));
if (!parsed) {
  console.error(LOAD_USAGE);
  process.exit(1);
}
const { dir, organization, replace, confirmHosted } = parsed;

const databaseUrl = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;
try {
  assertTargetAllowed(databaseUrl, confirmHosted);
} catch (refusal) {
  console.error(refusal instanceof Error ? refusal.message : refusal);
  process.exit(1);
}

// Le rapport d'abord : on voit ce qui va être écrit avant que ce soit écrit.
const plan = planForOrganization(planMigration(readDump(dir)), organization.slug);
console.log(formatReport(plan));

const sql = postgres(databaseUrl, { onnotice: () => undefined });
try {
  await loadPlan(sql, plan, organization, { replace });
  console.log(
    `## Chargement terminé dans ${new URL(databaseUrl).hostname}, organisation ${organization.slug}`,
  );
} catch (failure) {
  console.error(failure instanceof Error ? failure.message : failure);
  process.exitCode = 1;
} finally {
  await sql.end();
}
