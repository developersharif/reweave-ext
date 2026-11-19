/**
 * Palettes, variants and the adapter theme map (T-3.1, T-3.2, T-3.7, D-033) on a
 * fixture-backed watch page. Fixtures carry no YouTube CSS, so the page gets a tiny
 * stand-in for YouTube's: a generated colour variable on :root/[dark] that paints
 * ytd-app, like the real site does.
 */
import type { Page } from '@playwright/test';
import { expect, test, ytFixtureHtml, ytUrl } from './fixtures';

const SITE_CSS =
  '<style>:root{--t3e41d7b17b187f69:#fff;--yt-sys-color-baseline--base-background:#fff}' +
  '[dark]{--t3e41d7b17b187f69:#0f0f0f;--yt-sys-color-baseline--base-background:#0f0f0f}' +
  'ytd-app{display:block;min-height:10px;background:var(--t3e41d7b17b187f69)}</style>';

const appBackground = (page: Page) =>
  page.evaluate(
    () => getComputedStyle(document.querySelector('ytd-app') as Element).backgroundColor,
  );

test('palettes and variants re-theme the page live; unset colours follow the site', async ({
  context,
  harness,
}) => {
  harness.serve(
    'watch',
    ytFixtureHtml('watch').replace('<head></head>', `<head>${SITE_CSS}</head>`),
  );
  const send = async (m: Record<string, unknown>) => {
    const res = (await harness.send(m)) as { ok: boolean };
    expect(res.ok, JSON.stringify(m)).toBe(true);
  };
  await send({ type: 'setSiteEnabled', adapterId: 'youtube', enabled: true });
  const page = await context.newPage();
  await page.goto(ytUrl('watch'));

  // Focus sets no colours: YouTube keeps its own (light, then dark).
  await expect
    .poll(() => page.evaluate(() => document.adoptedStyleSheets.length))
    .toBeGreaterThan(0);
  expect(await appBackground(page)).toBe('rgb(255, 255, 255)');

  // Calm's own colours are pushed to the site...
  await send({ type: 'setTemplate', adapterId: 'youtube', templateId: 'reskin/calm-youtube' });
  await expect.poll(() => appBackground(page)).toBe('rgb(27, 26, 31)');
  // ...its Day variant swaps them...
  await send({
    type: 'setTemplate',
    adapterId: 'youtube',
    templateId: 'reskin/calm-youtube',
    variantId: 'day',
  });
  await expect.poll(() => appBackground(page)).toBe('rgb(246, 241, 233)');
  // ...and a palette wins over both.
  await send({ type: 'setPalette', adapterId: 'youtube', paletteId: 'reskin/nord' });
  await expect.poll(() => appBackground(page)).toBe('rgb(46, 52, 64)');
  // The palette also applies to Focus.
  await send({ type: 'setTemplate', adapterId: 'youtube', templateId: 'reskin/focus-youtube' });
  await expect.poll(() => appBackground(page)).toBe('rgb(46, 52, 64)');

  // No palette: back to the site's own colours, including its dark theme.
  await send({ type: 'setPalette', adapterId: 'youtube', paletteId: null });
  await expect.poll(() => appBackground(page)).toBe('rgb(255, 255, 255)');
  await page.evaluate(() => document.documentElement.setAttribute('dark', ''));
  expect(await appBackground(page)).toBe('rgb(15, 15, 15)');
});
