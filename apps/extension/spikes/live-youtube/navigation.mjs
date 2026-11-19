/**
 * T-2.2 navigation spike: LIVE youtube.com, run manually, never in CI.
 *   cd apps/extension && node spikes/live-youtube/navigation.mjs
 * Measures, from the content script's isolated world, how quickly each navigation
 * signal fires after YouTube changes the URL, and whether the adopted sheet survives
 * SPA navigations and a back/forward-cache round trip.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const EXT = join(import.meta.dirname, 'ext');
const CSS = 'ytd-masthead{background:rgb(255,0,128)!important}';
const dir = mkdtempSync(join(tmpdir(), 'rk-spike-'));
const ctx = await chromium.launchPersistentContext(dir, {
  channel: 'chromium',
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
await sw.evaluate((s) => chrome.storage.local.set(s), { mode: 'adopted', css: CSS });

// Main world: record when the page itself navigates (the ground truth). Passive
// listeners only; wrapping history.pushState broke YouTube's rendering.
await ctx.addInitScript(() => {
  const w = /** @type {any} */ (window);
  w.__rkNav = [];
  w.navigation?.addEventListener('navigate', (e) =>
    w.__rkNav.push({
      k: `navigate(${e.navigationType})`,
      t: performance.now(),
      url: new URL(e.destination.url).pathname,
    }),
  );
  addEventListener('popstate', () =>
    w.__rkNav.push({ k: 'popstate(main)', t: performance.now(), url: location.pathname }),
  );
});

const page = await ctx.newPage();
const snapshot = async (label) => {
  await page.waitForTimeout(2500);
  const rec = JSON.parse((await page.getAttribute('html', 'data-rk-spike')) ?? '{}');
  const nav = await page.evaluate(() => /** @type {any} */ (window).__rkNav ?? []);
  const bg = await page.evaluate(() => {
    const m = document.querySelector('ytd-masthead');
    return m ? getComputedStyle(m).backgroundColor : null;
  });
  // Main world (where the page's own scripts run): can the page see our sheet?
  const mainWorld = await page.evaluate(() => {
    const sheets = document.adoptedStyleSheets;
    const ours = sheets.find((s) =>
      [...s.cssRules].some(
        (r) => r.cssText.includes('255, 0, 128') || r.cssText.includes('255,0,128'),
      ),
    );
    return {
      adoptedCount: sheets.length,
      oursVisible: Boolean(ours),
      oursRuleText: ours?.cssRules[0]?.cssText ?? null,
    };
  });
  return { label, url: new URL(page.url()).pathname, bg, rec, nav, mainWorld };
};

const steps = [];
await page.goto('https://www.youtube.com/results?search_query=cats', { waitUntil: 'load' });
steps.push(await snapshot('initial load /results'));

await page.locator('ytd-search ytd-video-renderer a#video-title:visible').first().click();
await page.waitForURL(/\/watch/);
steps.push(await snapshot('click result → /watch'));

await page.locator('ytd-masthead ytd-topbar-logo-renderer a#logo:visible').first().click();
await page.waitForURL((u) => u.pathname === '/');
steps.push(await snapshot('click logo → /'));

const box = page.locator('input[name="search_query"]').first();
await box.click();
await box.fill('dogs');
await box.press('Enter');
await page.waitForURL(/\/results/);
steps.push(await snapshot('search → /results'));

await page.goBack();
await page.waitForURL((u) => u.pathname === '/');
steps.push(await snapshot('back → /'));

await page.goForward();
await page.waitForURL(/\/results/);
steps.push(await snapshot('forward → /results'));

await page.goto('https://example.com/');
await page.goBack();
await page.waitForURL(/youtube\.com\/results/);
steps.push(await snapshot('example.com, then back (bfcache?)'));

// Report: latency of each isolated-world signal after the page's own history call.
const final = steps.at(-1);
const nav = steps.at(-2).nav; // last snapshot before leaving the document
console.log(
  'isolated world: Navigation API =',
  final.rec.hasNavigationApi,
  ', URLPattern =',
  final.rec.hasUrlPattern,
);
console.log(
  'main-world navigations:',
  JSON.stringify(nav.map((n) => ({ k: n.k, t: Math.round(n.t), url: n.url }))),
);
const events = steps.at(-2).rec.events ?? [];
console.log(
  'isolated-world events:',
  JSON.stringify(
    events.map((e) => ({ n: e.name, t: Math.round(e.t), url: e.url, persisted: e.persisted })),
  ),
);
for (const s of steps) {
  const lost = (s.rec.checks ?? []).filter((c) => !c.present).length;
  console.log(
    `${s.label.padEnd(36)} path=${s.url.padEnd(9)} masthead=${s.bg} sheetMissingChecks=${lost} events=${(s.rec.events ?? []).length} mainWorld=${JSON.stringify(s.mainWorld)}`,
  );
}
console.log('final document events:', JSON.stringify(final.rec.events));
await ctx.close();
rmSync(dir, { recursive: true, force: true });
