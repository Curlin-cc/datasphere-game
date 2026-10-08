import { defineConfig } from 'vite';

// Relative base so the build works locally and under GitHub Pages (/datasphere-game/)
export default defineConfig({
  base: './',
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
});
