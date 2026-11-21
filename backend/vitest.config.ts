import { defineConfig } from 'vitest/config';

const AT_LEAST_95 = { lines: 95, functions: 95, branches: 95, statements: 95 };

export default defineConfig({
  test: {
    include: ['{domain,application,infrastructure}/**/*.test.ts'],
    // Les tests sur la base locale tournent avec `pnpm test:db`.
    exclude: ['**/*.db.test.ts', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['{domain,application,infrastructure}/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/index.ts',
        'domain/testing/**',
        // Ce qui parle à la base est couvert par les tests sur la base locale (`pnpm test:db`).
        'infrastructure/local.ts',
        'infrastructure/organizations.ts',
        'infrastructure/ports.ts',
        'infrastructure/read.ts',
        'infrastructure/tables.ts',
        'infrastructure/write.ts',
      ],
      // ADR 0006 : au moins 95 %, couche par couche.
      thresholds: {
        'domain/**': AT_LEAST_95,
        'application/**': AT_LEAST_95,
        'infrastructure/**': AT_LEAST_95,
      },
    },
  },
});
