import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Les tests sur l'API locale : `pnpm test:db`.
    exclude: ['src/**/*.db.test.ts'],
    setupFiles: ['src/testing/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // main.tsx ne fait que brancher l'application sur la page.
      // main.tsx branche le site sur la page ; supabase-source.ts parle à l'API,
      // et se vérifie sur la base locale (README).
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/main.tsx',
        'src/data/supabase-source.ts',
        'src/testing/**',
      ],
    },
  },
});
