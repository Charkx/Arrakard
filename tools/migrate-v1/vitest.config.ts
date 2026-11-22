import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Les tests unitaires. Ceux d'écriture (`tests/integration`) ont besoin de la base locale : `pnpm test:db`.
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Les commandes et la lecture de fichiers n'ont pas de logique. L'écriture
      // dans la base est couverte par les tests d'intégration (`pnpm test:db`).
      exclude: ['src/cli.ts', 'src/load-cli.ts', 'src/backup-cli.ts', 'src/dump.ts', 'src/load.ts'],
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
    },
  },
});
