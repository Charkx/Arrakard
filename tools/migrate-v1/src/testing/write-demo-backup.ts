/**
 * Écrit la sauvegarde de démonstration dans `demo-backup/`, un fichier JSON
 * par table, au format d'une sauvegarde v1.
 *
 *   pnpm --filter @arrakis/migrate-v1 demo:write
 */
import { join } from 'node:path';
import { writeDump } from '../dump.ts';
import { demoBackup } from './demo-backup.ts';

const dir = join(import.meta.dirname, '../../demo-backup');
writeDump(dir, demoBackup());
console.log(`Sauvegarde de démonstration écrite dans ${dir}`);
