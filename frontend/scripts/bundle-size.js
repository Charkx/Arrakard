// Poids du JavaScript chargé à l'ouverture du site, une fois compressé (gzip,
// 1 kB = 1000 octets). Lancé par la CI après la construction : elle échoue
// au-delà de la limite.
//
// Seuls comptent les fichiers que cite index.html. Les autres sont chargés à la
// demande, comme la connexion (ADR 0024) : ce script vérifie aussi qu'elle
// n'est pas dans les fichiers de l'ouverture.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT_KB = 250;
/** Une méthode de `@supabase/auth-js` : sa présence trahit la bibliothèque de connexion. */
const AUTH_LIBRARY_MARK = 'signInWithOAuth';
const dist = join(import.meta.dirname, '../dist');

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const files = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map(([, path]) => path);
if (files.length === 0) {
  console.error('Aucun JavaScript cité par dist/index.html : lancer `pnpm build` avant.');
  process.exit(1);
}

let total = 0;
for (const path of files) {
  const code = readFileSync(join(dist, path));
  if (code.includes(AUTH_LIBRARY_MARK)) {
    console.error(`${path} contient la bibliothèque de connexion : elle doit être chargée à part.`);
    process.exit(1);
  }
  const size = gzipSync(code).length;
  total += size;
  console.log(`${(size / 1000).toFixed(1).padStart(7)} kB  ${path}`);
}

const totalKb = total / 1000;
console.log(`${totalKb.toFixed(1).padStart(7)} kB  total compressé (limite : ${LIMIT_KB} kB)`);
if (totalKb > LIMIT_KB) {
  console.error(`Le JavaScript initial dépasse ${LIMIT_KB} kB compressé.`);
  process.exit(1);
}
