import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { type BrowserContext, test as base, chromium } from '@playwright/test';

const EXTENSION_PATH = resolve(import.meta.dirname, '../.output/chrome-mv3');

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture signature
  context: async ({}, use) => {
    const userDataDir = mkdtempSync(join(tmpdir(), 'reskin-e2e-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium', // bundled Chromium: branded Chrome no longer honors --load-extension
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    await use(id);
  },
});

export const expect = test.expect;
