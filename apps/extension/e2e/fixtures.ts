import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { type BrowserContext, test as base, chromium, type Page } from '@playwright/test';

/** The RK_E2E build (`pnpm build:e2e`): same code, site permissions pre-granted (D-029). */
const EXTENSION_PATH = resolve(import.meta.dirname, '../.output/chrome-mv3-e2e');
const YT_FIXTURES = resolve(import.meta.dirname, '../../../packages/test-fixtures/youtube');

interface FixturePage {
  path: string;
  query?: string;
  route: string;
}
const pages = (
  JSON.parse(readFileSync(join(YT_FIXTURES, 'pages.json'), 'utf8')) as {
    pages: Record<string, FixturePage>;
  }
).pages;

export type YouTubePage = keyof typeof pages & string;

/** Full https://www.youtube.com URL for a fixture page. */
export const ytUrl = (name: YouTubePage): string => {
  const p = pages[name];
  if (!p) throw new Error(`No YouTube fixture "${name}"`);
  return `https://www.youtube.com${p.path}${p.query ?? ''}`;
};

export const ytFixtureHtml = (name: YouTubePage): string =>
  readFileSync(join(YT_FIXTURES, `${name}.html`), 'utf8');

export interface Harness {
  /** Overrides the HTML served for one fixture page (e.g. to add a consent dialog). */
  serve: (name: YouTubePage, html: string) => void;
  /** Sends a runtime message from an extension page, like the popup does. */
  send: (message: Record<string, unknown>) => Promise<unknown>;
}

export const test = base.extend<{ context: BrowserContext; extensionId: string; harness: Harness }>(
  {
    // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture signature
    context: async ({}, use) => {
      const userDataDir = mkdtempSync(join(tmpdir(), 'reskin-e2e-'));
      const context = await chromium.launchPersistentContext(userDataDir, {
        channel: 'chromium', // bundled Chromium: branded Chrome no longer honors --load-extension
        args: [
          `--disable-extensions-except=${EXTENSION_PATH}`,
          `--load-extension=${EXTENSION_PATH}`,
        ],
      });
      await use(context);
      await context.close();
    },
    extensionId: async ({ context }, use) => {
      let [worker] = context.serviceWorkers();
      worker ??= await context.waitForEvent('serviceworker');
      await use(new URL(worker.url()).host);
    },
    harness: async ({ context, extensionId }, use) => {
      // CI never hits live sites (D-020): YouTube pages come from fixtures, everything else is aborted.
      const overrides = new Map<string, string>();
      await context.route(/^https?:\/\//, (route) => {
        const url = new URL(route.request().url());
        const match = Object.entries(pages).find(
          ([, p]) => url.hostname === 'www.youtube.com' && url.pathname === p.path,
        );
        if (!match || route.request().resourceType() !== 'document') return route.abort();
        const [name] = match;
        return route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: overrides.get(name) ?? ytFixtureHtml(name),
        });
      });
      let ext: Page | undefined;
      await use({
        serve: (name, html) => overrides.set(name, html),
        send: async (message) => {
          if (!ext) {
            ext = await context.newPage();
            await ext.goto(`chrome-extension://${extensionId}/popup.html`);
          }
          return ext.evaluate((m) => {
            const g = globalThis as unknown as {
              chrome: { runtime: { sendMessage: (msg: unknown) => Promise<unknown> } };
            };
            return g.chrome.runtime.sendMessage(m);
          }, message);
        },
      });
    },
  },
);

export const expect = test.expect;
