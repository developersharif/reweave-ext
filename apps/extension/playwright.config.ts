import { defineConfig } from '@playwright/test';

// E2E tests load the *built* extension (.output/chrome-mv3). Run `pnpm build` first.
// CI never hits live sites: site pages are served from fixtures via request interception (D-020).
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
});
