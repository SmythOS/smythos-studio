import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },

  resolve: {
    alias: {
      '@~internal': '/node_modules/@~internal',
    },
  },
});
