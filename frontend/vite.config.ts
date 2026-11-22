import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    // Les tests unitaires. Ceux sur l'API locale (`tests/integration`) : `pnpm test:db`.
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/support/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // main.tsx branche le site sur la page ; supabase-source.ts parle à l'API,
      // et se vérifie sur la base locale (README).
      exclude: ['src/main.tsx', 'src/data/supabase-source.ts'],
    },
  },
});
