import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // cli.ts : lecture des fichiers et affichage, sans logique.
      exclude: ['src/**/*.test.ts', 'src/cli.ts', 'src/testing/**'],
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
    },
  },
});
