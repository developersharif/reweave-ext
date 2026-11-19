/**
 * Welcome page (T-3.6): opens on install; "Try it" opens the site restyled. The e2e
 * build holds site access already (D-029), so the "Allow access" step and the
 * browser's prompt are skipped here: a real install is Allow access → the prompt →
 * Try it, three clicks.
 */
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

test('install → welcome page → Try it → restyled YouTube, in at most 4 clicks', async ({
  context,
  harness,
}) => {
  void harness; // routes youtube.com to fixtures
  await expect
    .poll(() => context.pages().some((p) => p.url().endsWith('/welcome.html')))
    .toBe(true);
  const welcome = context.pages().find((p) => p.url().endsWith('/welcome.html')) as Page;
  const errors: string[] = [];
  welcome.on('pageerror', (e) => errors.push(e.message));
  await welcome.reload(); // listen for errors from the start
  let clicks = 0;

  await expect(welcome.getByRole('heading', { name: /Pick a template for YouTube/ })).toBeVisible();
  const covers = welcome.locator('img.cover');
  await expect(covers).toHaveCount(3);
  await expect
    .poll(() =>
      covers.evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0)),
    )
    .toBe(true);

  const opened = context.waitForEvent('page', {
    predicate: (p) => p.url().startsWith('https://www.youtube.com/'),
  });
  await welcome.getByRole('button', { name: 'Try it: Focus YouTube' }).click();
  clicks++;
  const yt = await opened;
  await yt.waitForLoadState();
  // Focus YouTube's sheets are adopted (the home fixture carries no chips or Shorts to hide).
  await expect
    .poll(() =>
      yt.evaluate(() =>
        document.adoptedStyleSheets.some((sheet) =>
          [...sheet.cssRules].some(
            (r) => r.cssText.includes('ytd-masthead') && r.cssText.includes('box-shadow'),
          ),
        ),
      ),
    )
    .toBe(true);
  expect(clicks).toBeLessThanOrEqual(4);
  expect(errors).toEqual([]);
});
