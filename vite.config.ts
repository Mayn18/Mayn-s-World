/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The Go server serves this folder in production (STATIC_DIR, default
    // dist/client; see internal/handlers/spa.go).
    outDir: 'dist/client',
  },
  server: {
    // In development the browser talks to Vite on :5173. Requests to /api are
    // forwarded to the Go server on :8080, so the browser still sees a single
    // origin, exactly like production, and no CORS configuration is needed.
    // 127.0.0.1 rather than "localhost": Node may resolve localhost to the IPv6
    // address ::1, but the Go server listens on IPv4 (0.0.0.0) only.
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
