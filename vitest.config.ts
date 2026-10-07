import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    env: { NODE_ENV: 'test' },
    // All tests share one database, so run files serially.
    fileParallelism: false,
  },
});
