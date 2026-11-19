import { BRAND } from '@reskin/brand';
import { expect, test, ytUrl } from './fixtures';

test('popup renders without errors', async ({ context, extensionId }) => {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(BRAND.name);
  // Its own tab is not a supported site (and the e2e build already holds YouTube access).
  await expect(page.getByRole('heading', { name: 'Not supported here' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('popup on a YouTube tab: enable, change a setting, switch to Original site', async ({
  context,
  extensionId,
  harness,
}) => {
  const yt = await context.newPage();
  await yt.goto(ytUrl('watch'));
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const tabId = await popup.evaluate(async () => {
    const g = globalThis as unknown as {
      chrome: { tabs: { query: (q: object) => Promise<{ id?: number }[]> } };
    };
    return (await g.chrome.tabs.query({ url: 'https://www.youtube.com/*' }))[0]?.id;
  });
  await popup.goto(`chrome-extension://${extensionId}/popup.html?tab=${tabId}`);

  await expect(popup.getByRole('heading', { name: 'www.youtube.com' })).toBeVisible();
  // Controlled inputs update when the background answers, so click, then wait for the state.
  const toggle = popup.getByRole('checkbox', { name: 'Use on this site' });
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(popup.getByText('Focus YouTube')).toHaveCount(2); // card + template list

  const hideFeed = popup.getByRole('checkbox', { name: 'Hide home feed' });
  await hideFeed.click();
  await expect(hideFeed).toBeChecked();
  const state = (await harness.send({ type: 'getState' })) as {
    data: { sites: { settings: Record<string, unknown> }[] };
  };
  expect(state.data.sites[0]?.settings.hideHomeFeed).toBe(true);

  // Palette picker: Focus uses palettes.
  const nord = popup.getByRole('radio', { name: 'Nord' });
  await nord.click();
  await expect(nord).toBeChecked();
  const withPalette = (await harness.send({ type: 'getState' })) as {
    data: { sites: { paletteId: string | null }[] };
  };
  expect(withPalette.data.sites[0]?.paletteId).toBe('reskin/nord');

  // Variant (T-3.7): "Deep focus" turns on its settings; the user's own value stays.
  await popup.getByLabel('Variant').selectOption({ label: 'Deep focus' });
  await expect(popup.getByRole('checkbox', { name: 'Hide comments' })).toBeChecked();
  await expect(popup.getByRole('checkbox', { name: 'Hide recommendations' })).toBeChecked();
  await expect(popup.getByRole('checkbox', { name: 'Hide home feed' })).toBeChecked();
  const withVariant = (await harness.send({ type: 'getState' })) as {
    data: { sites: { variantId: string | null; settings: Record<string, unknown> }[] };
  };
  expect(withVariant.data.sites[0]).toMatchObject({
    variantId: 'deep-focus',
    settings: { hideComments: true, hideRelated: true },
  });

  const original = popup.getByRole('radio', { name: 'Original site' });
  await original.click();
  await expect(original).toBeChecked();
  await expect(popup.getByText('Hide home feed')).toHaveCount(0);
});
