import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Les tests sur la base locale tournent avec `pnpm test:db`.
    exclude: ['src/**/*.db.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Ce qui parle à la base est couvert par les tests sur la base locale (`pnpm test:db`).
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        'src/local.ts',
        'src/organizations.ts',
        'src/ports.ts',
        'src/read.ts',
        'src/tables.ts',
        'src/write.ts',
      ],
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
    },
  },
});
