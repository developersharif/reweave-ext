/**
 * Live check of the YouTube adapter: does every component still match on the real
 * site? Manual tool, never run in CI.
 *
 *   cd apps/extension && node scripts/live-check-youtube.mjs            # logged out, headless
 *   node scripts/live-check-youtube.mjs --profile ~/.rk-yt-profile      # your own profile, headed
 *
 * With --profile the browser opens headed on a persistent profile: sign in to YouTube
 * there once, close the window, and re-run to check the logged-in pages. Nothing is
 * recorded except match counts printed to the terminal. Also checks that every site
 * variable in the adapter's theme map still exists (if not, re-run map-youtube-theme.mjs).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

const { values } = parseArgs({ options: { profile: { type: 'string' } } });
const adapter = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '../../../packages/adapters/youtube/adapter.json'),
    'utf8',
  ),
);
const PAGES = {
  home: 'https://www.youtube.com/',
  watch: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  search: 'https://www.youtube.com/results?search_query=cats',
  shorts: 'https://www.youtube.com/shorts',
  channel: 'https://www.youtube.com/@YouTube',
  subscriptions: 'https://www.youtube.com/feed/subscriptions',
  playlist: 'https://www.youtube.com/@YouTube/playlists',
};

const ctx = values.profile
  ? await chromium.launchPersistentContext(values.profile, {
      headless: false,
      viewport: { width: 1440, height: 900 },
    })
  : await (await chromium.launch()).newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'en-US',
    });
const components = Object.entries(adapter.components).filter(([, c]) => !c.protected);
let problems = 0;

for (const [route, url] of Object.entries(PAGES)) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  if (route === 'playlist') {
    // Open the first playlist from the channel's playlists tab.
    await page.waitForTimeout(3000);
    await page.locator('a[href^="/playlist?list="]').first().click();
    await page.waitForURL(/\/playlist/);
  }
  await page.waitForTimeout(4000);
  if (route === 'watch') {
    await page.locator('ytd-comments#comments').scrollIntoViewIfNeeded();
    await page
      .locator('ytd-comment-thread-renderer')
      .first()
      .waitFor({ timeout: 20_000 })
      .catch(() => {});
  }
  const expected = components.filter(
    ([, c]) => !c.routes || c.routes.includes('*') || c.routes.includes(route),
  );
  const counts = await page.evaluate(
    (list) => list.map(([id, sel]) => [id, document.querySelectorAll(sel).length]),
    expected.map(([id, c]) => [id, c.selector]),
  );
  const missing = counts.filter(([, n]) => n === 0).map(([id]) => id);
  // Theme map (D-033): every bound site variable should still be defined.
  const themeVars = Object.values(adapter.theme?.bind ?? {}).flat();
  const undefinedVars = await page.evaluate(
    (vars) =>
      vars.filter((v) => !getComputedStyle(document.documentElement).getPropertyValue(v).trim()),
    themeVars,
  );
  if (undefinedVars.length)
    missing.push(`theme: ${undefinedVars.length}/${themeVars.length} variables gone`);
  problems += missing.length;
  console.log(
    `${route.padEnd(14)} ${new URL(page.url()).pathname.padEnd(22)} ${expected.length - missing.length}/${expected.length} components` +
      (missing.length ? `  MISSING: ${missing.join(', ')}` : ''),
  );
  await page.close();
}
await ctx.close();
process.exitCode = problems ? 1 : 0;
