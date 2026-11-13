/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The Hono server serves this folder in production (see src/server/index.ts).
    outDir: 'dist/client',
  },
  server: {
    // In development the browser talks to Vite on :5173. Requests to /api are
    // forwarded to the Hono server on :3000, so the browser still sees a single
    // origin, exactly like production, and no CORS configuration is needed.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
