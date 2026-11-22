import { defineConfig } from 'vitest/config';

// Tests sur l'API locale (`supabase start`, démonstration chargée). Ils tournent
// à part de `pnpm check`, avec les tests de la base.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
  },
});
