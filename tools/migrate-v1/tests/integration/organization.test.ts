import {
  FACT_TABLES,
  LOCAL_DATABASE_URL,
  PROJECTION_TABLES,
} from '@arrakis/backend/infrastructure';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadPlan } from '#src/load.ts';
import { planMigration } from '#src/plan.ts';
import { planForOrganization } from '#src/rekey.ts';
import { fingerprint, removeOrganization } from '#support/db.ts';
import { demoBackupCopy } from '#support/demo-backup.ts';

/**
 * Deux organisations remplies avec la même sauvegarde, comme `arrakis` et
 * `arrakis-essai` (ADR 0021), sur la base locale. La première garde les
 * identifiants de la sauvegarde ; la seconde reçoit les siens.
 */
const FIRST = { slug: 'essai-orga-une', name: 'Essai, première' };
const SECOND = { slug: 'essai-orga-deux', name: 'Essai, seconde' };

const sql = postgres(LOCAL_DATABASE_URL, { onnotice: () => undefined });
// Une copie : la base locale peut déjà contenir la démonstration d'origine.
const plan = planMigration(demoBackupCopy(2));

/** Le nombre de lignes de chaque table pour l'organisation : les identifiants diffèrent, pas le contenu. */
async function countRows(slug: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of [...FACT_TABLES, ...PROJECTION_TABLES]) {
    const [row] = await sql<{ count: number }[]>`
      select count(*)::int as count
      from ${sql(table)} t join organizations o on o.id = t.organization_id
      where o.slug = ${slug}`;
    counts[table] = row?.count ?? 0;
  }
  return counts;
}

async function removeBoth(): Promise<void> {
  await removeOrganization(sql, FIRST.slug);
  await removeOrganization(sql, SECOND.slug);
}

beforeAll(removeBoth);
afterAll(async () => {
  await removeBoth();
  await sql.end();
});

describe('charger la même sauvegarde dans deux organisations', () => {
  it('les deux se chargent côte à côte, chacune avec tous ses faits', async () => {
    await loadPlan(sql, plan, FIRST, { replace: true });
    await loadPlan(sql, planForOrganization(plan, SECOND.slug), SECOND, { replace: true });

    const first = await countRows(FIRST.slug);
    expect(first.editions).toBeGreaterThan(0);
    expect(await countRows(SECOND.slug)).toEqual(first);
  });

  it('recharger la seconde ne vide jamais la première', async () => {
    const before = await fingerprint(sql, FIRST.slug);

    await loadPlan(sql, planForOrganization(plan, SECOND.slug), SECOND, { replace: true });

    expect(await fingerprint(sql, FIRST.slug)).toEqual(before);
  });
});
