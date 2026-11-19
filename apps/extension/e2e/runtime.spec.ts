/**
 * Extension runtime on fixture-backed youtube.com (T-2.4, T-2.6, T-2.9), using the
 * bundled "Focus YouTube" template (T-2.8). No live sites: see fixtures.ts.
 */
import type { Page } from '@playwright/test';
import { expect, test, ytFixtureHtml, ytUrl } from './fixtures';

const style = (page: Page, selector: string, prop: string) =>
  page.evaluate(
    ([sel, p]) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).getPropertyValue(p) : 'missing';
    },
    [selector, prop] as const,
  );

const enableYouTube = async (send: (m: Record<string, unknown>) => Promise<unknown>) => {
  const res = (await send({ type: 'setSiteEnabled', adapterId: 'youtube', enabled: true })) as {
    ok: boolean;
    data?: { sites: { adapterId: string; enabled: boolean; templateId: string | null }[] };
  };
  expect(res.ok).toBe(true);
  expect(res.data?.sites[0]).toMatchObject({ enabled: true, templateId: 'reskin/focus-youtube' });
};

const PRIMARY = 'ytd-watch-flexy #primary';
const CHIPS = 'chip-bar-view-model';

test('applies the template on a fixture-backed page and follows SPA navigation', async ({
  context,
  harness,
}) => {
  await enableYouTube(harness.send);
  const page = await context.newPage();
  await page.goto(ytUrl('watch'));

  // Watch group (route-scoped) and base group (all routes) are both on.
  await expect.poll(() => style(page, PRIMARY, 'max-width')).toBe('1280px');
  expect(await style(page, CHIPS, 'opacity')).toBe('0.85');
  // Nothing is added to the DOM (T8): only adopted sheets.
  expect(
    await page.evaluate(() => document.querySelectorAll('style, link[rel=stylesheet]').length),
  ).toBe(0);

  // SPA navigation to search: the watch group stays on during the grace period...
  await page.evaluate(() => history.pushState({}, '', '/results?search_query=x'));
  await page.waitForTimeout(200);
  expect(await style(page, PRIMARY, 'max-width')).toBe('1280px');
  // ...and turns off once the site says the new page is rendered.
  // (well before the 1.5 s fallback timer, so this proves the event ended it)
  await page.evaluate(() => document.dispatchEvent(new Event('yt-navigate-finish')));
  await expect.poll(() => style(page, PRIMARY, 'max-width'), { timeout: 500 }).toBe('none');
  expect(await style(page, CHIPS, 'opacity')).toBe('0.85'); // base group still on

  // Sensitive route: everything off at once, no grace period.
  await page.evaluate(() => history.pushState({}, '', '/account'));
  await expect.poll(() => style(page, CHIPS, 'opacity')).toBe('1');

  // Back to watch: both groups again.
  await page.evaluate(() => history.pushState({}, '', '/watch?v=fixture'));
  await expect.poll(() => style(page, PRIMARY, 'max-width')).toBe('1280px');
});

test('applies setting changes and the global pause without a reload', async ({
  context,
  harness,
}) => {
  await enableYouTube(harness.send);
  const page = await context.newPage();
  await page.goto(ytUrl('watch'));
  await expect.poll(() => style(page, PRIMARY, 'max-width')).toBe('1280px');

  const res = (await harness.send({
    type: 'setSettings',
    templateId: 'reskin/focus-youtube',
    values: { maxWidth: 1000 },
  })) as { ok: boolean };
  expect(res.ok).toBe(true);
  await expect.poll(() => style(page, PRIMARY, 'max-width')).toBe('1000px');

  await harness.send({ type: 'setPaused', paused: true });
  await expect.poll(() => style(page, PRIMARY, 'max-width')).toBe('none');
  await harness.send({ type: 'setPaused', paused: false });
  await expect.poll(() => style(page, PRIMARY, 'max-width')).toBe('1000px');

  // "Original site" removes the template entirely.
  await harness.send({ type: 'setTemplate', adapterId: 'youtube', templateId: null });
  await expect.poll(() => style(page, PRIMARY, 'max-width')).toBe('none');
  expect(await page.evaluate(() => document.adoptedStyleSheets.length)).toBe(0);
});

test('hides Shorts on search by default', async ({ context, harness }) => {
  await enableYouTube(harness.send);
  const page = await context.newPage();
  await page.goto(ytUrl('search'));
  await expect.poll(() => style(page, 'grid-shelf-view-model', 'display')).toBe('none');
});

test('pauses the template while a protected consent dialog is visible (T-2.9)', async ({
  context,
  harness,
}) => {
  await enableYouTube(harness.send);
  await harness.send({
    type: 'setSettings',
    templateId: 'reskin/focus-youtube',
    values: { hideHomeFeed: true },
  });
  // The EU consent bump, added to the home fixture (not served to the capture location).
  harness.serve(
    'home',
    ytFixtureHtml('home').replace(
      '<ytd-app',
      '<ytd-consent-bump-v2-lightbox></ytd-consent-bump-v2-lightbox><ytd-app',
    ),
  );
  const page = await context.newPage();
  await page.goto(ytUrl('home'));
  const feed = 'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer';

  // Original site while the dialog is up.
  await page.waitForTimeout(1000);
  expect(await style(page, feed, 'display')).not.toBe('none');

  // Dialog dismissed: the template comes back within a poll tick.
  await page.evaluate(() => document.querySelector('ytd-consent-bump-v2-lightbox')?.remove());
  await expect.poll(() => style(page, feed, 'display')).toBe('none');
});
