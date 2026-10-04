import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Tant que le premier test n'existe pas, la CI reste verte.
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      // ADR 0006 : couverture ≥ 95 % sur le domaine.
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
    },
  },
});
