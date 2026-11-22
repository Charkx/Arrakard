/**
 * Fait une sauvegarde de la v1 : un fichier JSON par table, lu par l'API REST
 * de la v1 avec sa clé publique. C'est ce que `load` sait charger.
 *
 *   V1_SUPABASE_URL=… V1_SUPABASE_ANON_KEY=… pnpm --filter @arrakis/migrate-v1 backup <nouveau dossier>
 *
 * Données réelles : le dossier doit être nouveau et hors du dépôt, pour ne
 * jamais être commité. La v1 n'est que lue.
 */
import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { downloadTable, type ReadPage } from './backup.ts';
import { TABLES, writeDump, type BackupTable } from './dump.ts';

const REPOSITORY = resolve(import.meta.dirname, '../../..');

const dir = process.argv[2];
const { V1_SUPABASE_URL: url, V1_SUPABASE_ANON_KEY: key } = process.env;
if (!dir || !url || !key) {
  console.error(
    'Usage : V1_SUPABASE_URL=… V1_SUPABASE_ANON_KEY=… backup <nouveau dossier hors du dépôt>',
  );
  process.exit(1);
}
const target = resolve(dir);
if (target === REPOSITORY || target.startsWith(REPOSITORY + sep)) {
  console.error(`Refusé : ${target} est dans le dépôt, et une sauvegarde ne se commite jamais.`);
  process.exit(1);
}
if (existsSync(target)) {
  console.error(`Refusé : ${target} existe déjà. Une sauvegarde va dans un dossier neuf.`);
  process.exit(1);
}

// `count=exact` : l'API donne aussi le total de la table, dans `Content-Range` (« 0-999/4170 »).
const readPage: ReadPage = async (table, offset, limit) => {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&offset=${offset}&limit=${limit}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
  });
  if (!response.ok) throw new Error(`Lecture de ${table} refusée : ${response.status}`);
  const total = Number(response.headers.get('content-range')?.split('/')[1]);
  if (!Number.isInteger(total)) throw new Error(`Lecture de ${table} : total inconnu`);
  return { rows: (await response.json()) as unknown[], total };
};

// Tout est lu avant d'écrire : une lecture qui échoue ne laisse pas de sauvegarde à moitié.
const tables: Partial<Record<BackupTable, unknown[]>> = {};
for (const table of TABLES) {
  const rows = await downloadTable(readPage, table);
  tables[table] = rows;
  console.log(`${table} : ${rows.length} lignes`);
}
writeDump(target, tables);
console.log(`## Sauvegarde écrite dans ${target}`);
