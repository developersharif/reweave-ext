/**
 * Adapter health on this device (T-3.3): the content script probes the parts the
 * adapter lists, and the popup shows "Works here" or "May be broken" with a
 * prefilled report link that carries no page data.
 */
import { expect, test, ytFixtureHtml, ytUrl } from './fixtures';

type Health = { status: string; failed: string[] } | null;

test('probes report a missing part; the popup badge and report link reflect it', async ({
  context,
  extensionId,
  harness,
}) => {
  const health = async () => {
    const res = (await harness.send({ type: 'getState' })) as {
      data: { sites: { health: Health }[] };
    };
    return res.data.sites[0]?.health ?? null;
  };
  await harness.send({ type: 'setSiteEnabled', adapterId: 'youtube', enabled: true });
  const yt = await context.newPage();
  await yt.goto(ytUrl('watch'));
  await expect.poll(health, { timeout: 10_000 }).toEqual({
    status: 'working',
    failed: [],
    themeFailed: false,
  });

  // YouTube renamed its comments element: the probe fails (after a recheck for late renders).
  harness.serve(
    'watch',
    ytFixtureHtml('watch')
      .replace(/<ytd-comments\b([^>]*)>/, '<div$1>')
      .replace('</ytd-comments>', '</div>'),
  );
  await yt.reload();
  await expect
    .poll(async () => (await health())?.failed, { timeout: 15_000 })
    .toEqual(['comments']);

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const tabId = await popup.evaluate(async () => {
    const g = globalThis as unknown as {
      chrome: { tabs: { query: (q: object) => Promise<{ id?: number }[]> } };
    };
    return (await g.chrome.tabs.query({ url: 'https://www.youtube.com/*' }))[0]?.id;
  });
  await popup.goto(`chrome-extension://${extensionId}/popup.html?tab=${tabId}`);
  await expect(popup.getByText('May be broken (1 part not found)')).toBeVisible();
  const href =
    (await popup.getByRole('link', { name: 'Looks broken?' }).getAttribute('href')) ?? '';
  const url = new URL(href);
  expect(url.hostname).toBe('github.com');
  expect(url.searchParams.get('body')).toContain('`comments`');
  expect(href).not.toContain('youtube.com');
});
