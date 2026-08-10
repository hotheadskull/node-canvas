import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // 45s: e2e drives the DEV server (React dev mode + headless software
  // rendering), where long typing runs cost ~45ms/keystroke. Profiled
  // 2026-08-09: the time is React dev-mode JSX overhead, not app code --
  // production builds don't feel it. Raise only with a profile in hand.
  timeout: 45_000,
  // 2 workers: at the default (half cores) this machine oversubscribes --
  // typing/zoom timing tests flake under contention AND the suite runs
  // SLOWER (measured 2026-08-10: 4 workers 4.3m flaky, 2 workers 2.9m
  // green). Raise only with a clean timed run in hand.
  workers: 2,
  use: {
    baseURL: 'http://localhost:1421',
  },
  webServer: {
    command: 'npm run dev -w app',
    port: 1421,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
