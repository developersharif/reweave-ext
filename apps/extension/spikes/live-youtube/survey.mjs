/**
 * T-2.3 helper: LIVE youtube.com, run manually, never in CI.
 *   cd apps/extension && node spikes/live-youtube/survey.mjs [out.json]
 * Lists the custom elements, ids and view-model tags present on each page type
 * (logged out), to choose stable adapter selectors.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

export const PAGES = {
  home: 'https://www.youtube.com/',
  watch: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  search: 'https://www.youtube.com/results?search_query=cats',
  shorts: 'https://www.youtube.com/shorts',
  channel: 'https://www.youtube.com/@YouTube',
  playlist: 'https://www.youtube.com/playlist?list=PLbpi6ZahtOH6Ar_3GPy3workiUk2bIoTw',
  subscriptions: 'https://www.youtube.com/feed/subscriptions',
};

const browser = await chromium.launch({ channel: 'chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
const out = {};
for (const [name, url] of Object.entries(PAGES)) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(4000);
  await page.mouse.wheel(0, 2500);
  await page.waitForTimeout(2000);
  out[name] = await page.evaluate(() => {
    const tags = {};
    const ids = {};
    for (const el of document.querySelectorAll('*')) {
      const t = el.localName;
      if (t.includes('-')) tags[t] = (tags[t] ?? 0) + 1;
      if (el.id) ids[`${t}#${el.id}`] = (ids[`${t}#${el.id}`] ?? 0) + 1;
    }
    const attrs = {};
    for (const sel of ['[page-subtype]', '[is-shorts]', '[role="dialog"]', '[data-testid]']) {
      attrs[sel] = [...document.querySelectorAll(sel)]
        .slice(0, 8)
        .map(
          (e) =>
            `${e.localName}${e.getAttribute('page-subtype') ? `[page-subtype=${e.getAttribute('page-subtype')}]` : ''}`,
        );
    }
    return {
      finalUrl: location.pathname + location.search,
      nodes: document.querySelectorAll('*').length,
      tags,
      ids,
      attrs,
    };
  });
  console.log(
    name,
    out[name].finalUrl,
    'nodes',
    out[name].nodes,
    'custom tags',
    Object.keys(out[name].tags).length,
  );
  await page.close();
}
writeFileSync(process.argv[2] ?? 'survey.json', JSON.stringify(out, null, 1));
await browser.close();
