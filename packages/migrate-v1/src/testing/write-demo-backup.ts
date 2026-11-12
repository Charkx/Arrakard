/**
 * Écrit la sauvegarde de démonstration dans `demo-backup/`, un fichier JSON
 * par table, au format d'une sauvegarde v1.
 *
 *   pnpm --filter @arrakis/migrate-v1 demo:write
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { demoBackup } from './demo-backup.ts';

const dir = join(import.meta.dirname, '../../demo-backup');
mkdirSync(dir, { recursive: true });
for (const [table, rows] of Object.entries(demoBackup())) {
  writeFileSync(join(dir, `${table}.json`), `${JSON.stringify(rows, null, 2)}\n`);
}
console.log(`Sauvegarde de démonstration écrite dans ${dir}`);
