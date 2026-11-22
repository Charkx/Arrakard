import { defineConfig } from 'vitest/config';

// Tests d'intégration, sur la base locale (`pnpm db:start`) : ils tournent avec `pnpm test:db`.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
  },
});
