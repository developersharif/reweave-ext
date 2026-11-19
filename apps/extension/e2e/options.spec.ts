/**
 * Options/library page (T-3.4): import a template `.zip`, apply and uninstall it,
 * and export → clear storage → import restores the library.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { makeZip } from '../src/library/make-zip';
import { expect, test } from './fixtures';

const FOCUS = resolve(import.meta.dirname, '../../../packages/templates/focus-youtube');

/** Focus YouTube re-packaged as someone's template, zipped as its folder. */
async function userTemplateZip(): Promise<Buffer> {
  const manifest = JSON.parse(readFileSync(join(FOCUS, 'template.json'), 'utf8'));
  manifest.id = 'someone/my-focus';
  manifest.name = 'My Focus';
  const files: Record<string, string | Uint8Array> = {
    'my-focus/template.json': JSON.stringify(manifest),
  };
  for (const f of [
    'styles/base.css',
    'styles/watch.css',
    'previews/cover.jpg',
    'previews/before.jpg',
    'previews/after.jpg',
  ])
    files[`my-focus/${f}`] = new Uint8Array(readFileSync(join(FOCUS, f)));
  return Buffer.from(await makeZip(files, { deflate: true }));
}

const state = (page: Page) =>
  page.evaluate(async () => {
    const g = globalThis as unknown as {
      chrome: { runtime: { sendMessage: (m: unknown) => Promise<unknown> } };
    };
    return ((await g.chrome.runtime.sendMessage({ type: 'getState' })) as { data: unknown })
      .data as {
      prefs: { paused: boolean };
      sites: { enabled: boolean; templateId: string | null; paletteId: string | null }[];
      library: { id: string }[];
    };
  });

test('import a template zip, use it, back up, clear, restore, uninstall', async ({
  context,
  extensionId,
  harness,
}) => {
  await harness.send({ type: 'setSiteEnabled', adapterId: 'youtube', enabled: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.getByRole('heading', { name: 'Sites' })).toBeVisible();

  // A zip with unsafe CSS is refused with the sanitizer's code.
  const evil = await makeZip({ 'template.json': '{}' });
  await page.getByLabel('Import template (.zip)').setInputFiles({
    name: 'evil.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(evil),
  });
  await expect(page.getByRole('alert')).toContainText('The template has problems');
  await page.getByRole('button', { name: 'Dismiss' }).click();

  await page.getByLabel('Import template (.zip)').setInputFiles({
    name: 'my-focus.zip',
    mimeType: 'application/zip',
    buffer: await userTemplateZip(),
  });
  await expect(page.getByRole('status')).toHaveText(/Installed My Focus 1\.0\.0/);
  await page.getByLabel('Template', { exact: true }).selectOption({ label: 'My Focus' });
  await page.getByLabel('Colours', { exact: true }).selectOption({ label: 'Nord' });
  // Controlled inputs update when the background answers: click, then wait for the state.
  const pause = page.getByLabel('Pause all templates');
  await pause.click();
  await expect(pause).toBeChecked();
  await expect.poll(async () => (await state(page)).sites[0]?.paletteId).toBe('reskin/nord');
  const before = await state(page);
  expect(before.sites[0]).toMatchObject({ enabled: true, templateId: 'someone/my-focus' });

  // Export, wipe everything, restore.
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export library' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^reweave-library-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();

  await page.evaluate(() =>
    (
      globalThis as unknown as { chrome: { storage: { local: { clear: () => Promise<void> } } } }
    ).chrome.storage.local.clear(),
  );
  await page.reload();
  await expect(page.getByLabel('Pause all templates')).not.toBeChecked();
  expect((await state(page)).library.map((t) => t.id)).not.toContain('someone/my-focus');

  await page.getByLabel('Import library').setInputFiles(file);
  await page.getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByRole('status')).toHaveText(/Library imported/);
  const after = await state(page);
  expect(after.prefs).toEqual(before.prefs);
  expect(after.sites).toEqual(before.sites);
  expect(after.library).toEqual(before.library);
  await expect(page.getByLabel('Template', { exact: true })).toHaveValue('someone/my-focus');

  // Uninstall: the site falls back to "Original site".
  await page.getByRole('button', { name: 'Uninstall My Focus' }).click();
  await expect(page.getByRole('status')).toHaveText(/Uninstalled My Focus/);
  await expect(page.getByLabel('Template', { exact: true })).toHaveValue('');
  expect(errors).toEqual([]);
});
