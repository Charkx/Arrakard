import { defineConfig } from 'vitest/config';

const AT_LEAST_95 = { lines: 95, functions: 95, branches: 95, statements: 95 };

export default defineConfig({
  test: {
    // Les tests unitaires. Ceux sur la base locale (`tests/integration`) tournent avec `pnpm test:db`.
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        '**/index.ts',
        // Ce qui parle à la base est couvert par les tests d'intégration (`pnpm test:db`).
        'src/infrastructure/local.ts',
        'src/infrastructure/organizations.ts',
        'src/infrastructure/ports.ts',
        'src/infrastructure/read.ts',
        'src/infrastructure/tables.ts',
        'src/infrastructure/write.ts',
      ],
      // ADR 0006 : au moins 95 %, couche par couche.
      thresholds: {
        'src/domain/**': AT_LEAST_95,
        'src/application/**': AT_LEAST_95,
        'src/infrastructure/**': AT_LEAST_95,
      },
    },
  },
});
