import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Les tests d'écriture ont besoin de la base locale : `pnpm test:db`.
    exclude: ['src/**/*.db.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Les commandes et la lecture de fichiers n'ont pas de logique. L'écriture et la
      // lecture dans la base sont couvertes par les tests d'écriture (`pnpm test:db`).
      exclude: [
        'src/**/*.test.ts',
        'src/cli.ts',
        'src/load-cli.ts',
        'src/dump.ts',
        'src/db/load.ts',
        'src/db/read.ts',
        'src/testing/**',
      ],
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
    },
  },
});
