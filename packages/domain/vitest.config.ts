import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/testing/**'],
      // ADR 0006 : couverture ≥ 95 % sur le domaine.
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
    },
  },
});
