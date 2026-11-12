import { defineConfig } from 'vitest/config';

// Tests d'écriture : ils ont besoin de la base locale (`supabase db start`).
// Ils tournent à part de `pnpm check`, avec les tests pgTAP.
export default defineConfig({
  test: {
    include: ['src/**/*.db.test.ts'],
    fileParallelism: false,
  },
});
