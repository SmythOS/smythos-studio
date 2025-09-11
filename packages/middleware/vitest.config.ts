import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },

  resolve: {
    alias: {
      // Removed @~internal alias as it was pointing to a non-existent path
    },
  },
});
