import { defineConfig } from 'vitest/config';

// Tests d'écriture : ils ont besoin de la base locale (`pnpm db:start`).
// Ils tournent à part de `pnpm check`, avec les tests pgTAP.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
  },
});
