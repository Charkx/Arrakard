import type { Sql } from 'postgres';
import { clearOrganization, FACT_TABLES, PROJECTION_TABLES } from '../db/load.ts';

/** Outils des tests d'écriture. Ils ne servent pas au chargement lui-même. */

/** Supprime une organisation de test et tout ce qu'elle contient. Sans effet si elle n'existe pas. */
export async function removeOrganization(sql: Sql, slug: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [organization] = await tx<{ id: string }[]>`
      select id from organizations where slug = ${slug}`;
    if (!organization) return;
    await clearOrganization(tx, organization.id);
    await tx`delete from organizations where id = ${organization.id}`;
  });
}

/**
 * Empreinte de tout ce qu'une organisation contient : chaque ligne de chaque
 * table écrite par le chargement. Deux empreintes égales, deux contenus égaux.
 */
export async function fingerprint(sql: Sql, slug: string): Promise<string> {
  const prints: string[] = [];
  for (const table of [...FACT_TABLES, ...PROJECTION_TABLES]) {
    const [row] = await sql<{ print: string }[]>`
      select md5(coalesce(string_agg(t::text, '|' order by t::text), '')) as print
      from ${sql(table)} t join organizations o on o.id = t.organization_id
      where o.slug = ${slug}`;
    prints.push(`${table}:${row?.print ?? ''}`);
  }
  return prints.join('\n');
}
