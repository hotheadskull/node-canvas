import { defineConfig } from 'vitest/config';

// The FULL suite (`npm test` at repo root) runs every workspace's tests.
// Session protocol: this command must be green before any session ends.
export default defineConfig({
  test: {
    projects: ['core/vitest.config.ts', 'app/vitest.config.ts', 'db/vitest.config.ts'],
  },
});
