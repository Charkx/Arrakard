/**
 * Fait une sauvegarde de la v1 : un fichier JSON par table, lu par l'API REST
 * de la v1 avec sa clé publique. C'est ce que `load` sait charger.
 *
 *   V1_SUPABASE_URL=… V1_SUPABASE_ANON_KEY=… pnpm --filter @arrakis/migrate-v1 backup <nouveau dossier>
 *
 * Données réelles : le dossier doit être nouveau et hors du dépôt, pour ne
 * jamais être commité. La v1 n'est que lue.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { downloadTable, type ReadPage } from './backup.ts';
import { TABLES } from './dump.ts';

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

const readPage: ReadPage = async (table, offset, limit) => {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&offset=${offset}&limit=${limit}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`Lecture de ${table} refusée : ${response.status}`);
  return (await response.json()) as unknown[];
};

// Tout est lu avant d'écrire : une lecture qui échoue ne laisse pas de sauvegarde à moitié.
const tables = [];
for (const table of TABLES) {
  const rows = await downloadTable(readPage, table);
  tables.push({ table, rows });
  console.log(`${table} : ${rows.length} lignes`);
}
mkdirSync(target, { recursive: true });
for (const { table, rows } of tables) {
  writeFileSync(join(target, `${table}.json`), JSON.stringify(rows, null, 2));
}
console.log(`## Sauvegarde écrite dans ${target}`);
