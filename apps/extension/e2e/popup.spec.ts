import { BRAND } from '@reskin/brand';
import { expect, test } from './fixtures';

test('extension loads and the popup renders the brand', async ({ context, extensionId }) => {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(BRAND.name);
  await expect(page.getByText(BRAND.tagline)).toBeVisible();
  expect(errors).toEqual([]);
});
