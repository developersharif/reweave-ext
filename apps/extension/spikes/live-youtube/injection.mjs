/**
 * T-2.1 injection spike: LIVE youtube.com, run manually, never in CI.
 *   cd apps/extension && node spikes/live-youtube/injection.mjs [loads-per-cell]
 * Loads a throwaway extension (ext/) whose document_start content script reads CSS
 * from chrome.storage.local and applies it as an adopted sheet or a <style> element.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const EXT = join(import.meta.dirname, 'ext');
const N = Number(process.argv[2] ?? 8);
const PAGES = {
  home: 'https://www.youtube.com/',
  watch: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
};
// ~60 KB, like a mid-size template: one visible rule plus filler.
const CSS = `ytd-masthead{background:rgb(255,0,128)!important}html{background:#0f0f10}${Array.from(
  { length: 1800 },
  (_, i) => `ytd-rich-item-renderer .rk-filler-${i}:hover>.x{color:red;margin:${i % 7}px}`,
).join('')}`;

const dir = mkdtempSync(join(tmpdir(), 'rk-spike-'));
const ctx = await chromium.launchPersistentContext(dir, {
  channel: 'chromium',
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));

async function load(mode, page, throttle) {
  await sw.evaluate((s) => chrome.storage.local.set(s), { mode, css: CSS });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await p.goto(PAGES[page], { waitUntil: 'load', timeout: 60_000 });
  await p.waitForTimeout(1500);
  const rec = JSON.parse((await p.getAttribute('html', 'data-rk-spike')) ?? '{}');
  const bg = await p.evaluate(() => {
    const m = document.querySelector('ytd-masthead');
    return m ? getComputedStyle(m).backgroundColor : null;
  });
  await p.close();
  return { ...rec, bg };
}

const q = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : Number.NaN;
};
const results = [];
for (const throttle of [1, 4]) {
  for (const page of Object.keys(PAGES)) {
    for (const mode of ['adopted', 'style']) {
      const runs = [];
      for (let i = 0; i < N; i++) runs.push(await load(mode, page, throttle));
      const apply = runs.map((r) => r.tApplied - r.t0);
      const storage = runs.map((r) => r.tStorage - r.t0);
      const flashes = runs.filter((r) => r.fcp !== null && r.fcp < r.tApplied).length;
      results.push({
        throttle: `${throttle}x`,
        page,
        mode,
        n: runs.length,
        startToApplyMs: `${q(apply, 0.5).toFixed(1)} / ${q(apply, 0.95).toFixed(1)}`,
        storageReadMs: `${q(storage, 0.5).toFixed(1)} / ${q(storage, 0.95).toFixed(1)}`,
        fcpMedianMs: q(
          runs.map((r) => r.fcp ?? Number.NaN),
          0.5,
        ).toFixed(0),
        paintedBeforeApply: `${flashes}/${runs.length}`,
        bodyExistedAtApply: runs.filter((r) => r.bodyAtApply).length,
        styleApplied: runs.filter((r) => r.bg === 'rgb(255, 0, 128)').length,
        sheetLostDuringLoad: runs.filter((r) => r.checks?.some((c) => !c.present)).length,
      });
      console.log(JSON.stringify(results.at(-1)));
    }
  }
}
console.table(results);
await ctx.close();
rmSync(dir, { recursive: true, force: true });
