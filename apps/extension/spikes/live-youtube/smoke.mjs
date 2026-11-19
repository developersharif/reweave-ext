/**
 * Live smoke test of the real extension on www.youtube.com (logged out). Manual,
 * never in CI. Uses the RK_E2E build (YouTube access pre-granted, D-029):
 *   cd apps/extension && pnpm build:e2e && node spikes/live-youtube/smoke.mjs
 * Checks: Focus YouTube applies on the live site, survives SPA navigation, and nothing
 * from the extension logs errors.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const EXT = resolve(import.meta.dirname, '../../.output/chrome-mv3-e2e');
const dir = mkdtempSync(join(tmpdir(), 'rk-smoke-'));
const ctx = await chromium.launchPersistentContext(dir, {
  channel: 'chromium',
  viewport: { width: 1440, height: 900 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
const swErrors = [];
sw.on('console', (m) => m.type() === 'error' && swErrors.push(m.text()));
const id = new URL(sw.url()).host;

const ext = await ctx.newPage();
await ext.goto(`chrome-extension://${id}/popup.html`);
const send = (m) => ext.evaluate((msg) => chrome.runtime.sendMessage(msg), m);
const res = await send({ type: 'setSiteEnabled', adapterId: 'youtube', enabled: true });
console.log(
  'enable:',
  res.ok,
  res.data?.sites[0]?.templateId,
  res.data?.sites[0]?.problem ?? 'no problem',
);

const page = await ctx.newPage();
const pageErrors = [];
page.on(
  'console',
  (m) =>
    m.type() === 'error' &&
    /reskin|content-scripts/.test(m.text() + m.location().url) &&
    pageErrors.push(m.text()),
);
const style = (sel, prop) =>
  page.evaluate(
    ([s, p]) => {
      const el = document.querySelector(s);
      return el ? getComputedStyle(el).getPropertyValue(p) : 'missing';
    },
    [sel, prop],
  );
const results = [];
const check = (label, actual, expected) => {
  const ok = actual === expected;
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${actual}${ok ? '' : ` (expected ${expected})`}`);
};

await page.goto('https://www.youtube.com/results?search_query=cats', { waitUntil: 'load' });
await page.waitForTimeout(4000);
check('search: Shorts shelf hidden', await style('grid-shelf-view-model', 'display'), 'none');
check(
  'search: Shorts card hidden',
  await style('ytm-shorts-lockup-view-model-v2', 'display'),
  'none',
);

await page.locator('ytd-search a[href^="/watch?v="]:visible').first().click(); // layout varies by A/B bucket
await page.waitForURL(/\/watch/);
await page.waitForTimeout(3000);
check(
  'SPA → watch: column capped (beats YouTube CSS)',
  await style('ytd-watch-flexy #primary', 'max-width'),
  '1280px',
);
check(
  'watch: adopted sheets',
  String(await page.evaluate(() => document.adoptedStyleSheets.length)),
  '2',
);

await send({ type: 'setSettings', templateId: 'reskin/focus-youtube', values: { maxWidth: 1000 } });
await page.waitForTimeout(500);
check('setting change live', await style('ytd-watch-flexy #primary', 'max-width'), '1000px');

await page.locator('ytd-masthead ytd-topbar-logo-renderer a#logo:visible').first().click();
await page.waitForURL((u) => u.pathname === '/');
await page.waitForTimeout(2500);
// YouTube's own CSS sets a width here, so "off" means "no longer our 1000px".
const after = await style('ytd-watch-flexy #primary', 'max-width');
check('SPA → home: watch group off', after === '1000px' ? `still ${after}` : 'off', 'off');

await send({ type: 'setTemplate', adapterId: 'youtube', templateId: null });
await page.waitForTimeout(500);
check(
  'Original site: sheets removed',
  String(await page.evaluate(() => document.adoptedStyleSheets.length)),
  '0',
);

console.log('extension errors (service worker):', swErrors.length ? swErrors : 'none');
console.log('extension errors (page):', pageErrors.length ? pageErrors : 'none');
await ctx.close();
rmSync(dir, { recursive: true, force: true });
process.exitCode = results.every(Boolean) && !swErrors.length && !pageErrors.length ? 0 : 1;
