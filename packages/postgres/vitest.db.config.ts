import { defineConfig } from 'vitest/config';

// Tests sur la base locale (`pnpm db:start`) : ils tournent avec `pnpm test:db`.
export default defineConfig({
  test: {
    include: ['src/**/*.db.test.ts'],
    fileParallelism: false,
  },
});
