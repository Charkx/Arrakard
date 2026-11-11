// Poids du JavaScript chargé à l'ouverture du site, une fois compressé.
// Lancé par la CI après la construction : elle échoue au-delà de la limite.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT_KB = 250;
const assets = join(import.meta.dirname, '../dist/assets');

const files = readdirSync(assets).filter((name) => name.endsWith('.js'));
if (files.length === 0) {
  console.error('Aucun fichier JavaScript dans dist/assets : lancer `pnpm build` avant.');
  process.exit(1);
}

let total = 0;
for (const name of files) {
  const size = gzipSync(readFileSync(join(assets, name))).length;
  total += size;
  console.log(`${(size / 1000).toFixed(1).padStart(7)} kB  ${name}`);
}

const totalKb = total / 1000;
console.log(`${totalKb.toFixed(1).padStart(7)} kB  total compressé (limite : ${LIMIT_KB} kB)`);
if (totalKb > LIMIT_KB) {
  console.error(`Le JavaScript initial dépasse ${LIMIT_KB} kB compressé.`);
  process.exit(1);
}
