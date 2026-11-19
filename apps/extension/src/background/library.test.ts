import { INSTALLED_KEY, settingsKey } from '@reskin/schema';
import { BUNDLED_TEMPLATES } from '@reskin/templates';
import { beforeEach, describe, expect, it } from 'vitest';
import { browser } from 'wxt/browser';
import type { AppState } from '../shared/messages';
import { getCompiled, getSites } from '../shared/storage';
import { currentRegistry, invalidateRegistry } from './registry';
import { handleRequest } from './router';
import { type FakeApis, resetBrowser } from './testing';

let apis: FakeApis;
beforeEach(() => {
  apis = resetBrowser();
});

const COPY = 'someone/focus-copy';
const b64 = (s: string) => btoa(s);

/** A user's template: the bundled Focus manifest under another id, with its own CSS. */
function bundle(over: { id?: string; css?: string; drop?: string } = {}): Record<string, string> {
  const manifest = {
    ...(BUNDLED_TEMPLATES['reskin/focus-youtube']?.manifest as Record<string, unknown>),
    id: over.id ?? COPY,
    name: 'Focus Copy',
  };
  const files: Record<string, string> = {
    'template.json': b64(JSON.stringify(manifest)),
    'styles/base.css': b64(over.css ?? ':--masthead { opacity: 0.5; }'),
    'styles/watch.css': b64(':--primary-column { max-width: setting(maxWidth) !important; }'),
    'previews/cover.jpg': b64('jpg'),
    'previews/before.jpg': b64('jpg'),
    'previews/after.jpg': b64('jpg'),
  };
  if (over.drop) delete files[over.drop];
  return files;
}

const send = async (m: Record<string, unknown>) => handleRequest(await currentRegistry(), m);
const ok = async (m: Record<string, unknown>) => {
  const r = await send(m);
  expect(r, JSON.stringify(r)).toMatchObject({ ok: true });
  return (r as { data: AppState }).data;
};
const refusal = async (m: Record<string, unknown>) => {
  const r = await send(m);
  expect(r.ok).toBe(false);
  return (r as { error: { code: string; diagnostics?: { code: string }[] } }).error;
};

describe('importTemplate', () => {
  it('installs a valid bundle, which can then be applied and re-imported as an update', async () => {
    const state = await ok({ type: 'importTemplate', files: bundle() });
    expect(state.library.find((t) => t.id === COPY)).toMatchObject({
      origin: 'imported',
      name: 'Focus Copy',
    });
    expect(state.sites[0]?.templates.map((t) => t.id)).toContain(COPY);

    await ok({ type: 'setSiteEnabled', adapterId: 'youtube', enabled: true });
    await ok({ type: 'setTemplate', adapterId: 'youtube', templateId: COPY });
    expect((await getCompiled('youtube'))?.groups[0]?.css).toContain(
      ':is(ytd-masthead){opacity:0.5}',
    );

    // Re-importing replaces it and recompiles where it's in use.
    await ok({ type: 'importTemplate', files: bundle({ css: ':--masthead { opacity: 0.7; }' }) });
    expect((await getCompiled('youtube'))?.groups[0]?.css).toContain(
      ':is(ytd-masthead){opacity:0.7}',
    );
  });

  it('refuses unsafe CSS, missing files, bundled ids and non-bundles, with diagnostics', async () => {
    const unsafe = await refusal({
      type: 'importTemplate',
      files: bundle({ css: '@import "https://evil.example/x.css";' }),
    });
    expect(unsafe.code).toBe('IMPORT_INVALID');
    expect(unsafe.diagnostics?.map((d) => d.code)).toContain('CSS_AT_RULE_FORBIDDEN');

    const missing = await refusal({
      type: 'importTemplate',
      files: bundle({ drop: 'styles/watch.css' }),
    });
    expect(missing.diagnostics?.map((d) => d.code)).toEqual(['FILE_MISSING']);

    const taken = await refusal({
      type: 'importTemplate',
      files: bundle({ id: 'reskin/focus-youtube' }),
    });
    expect(taken.diagnostics?.map((d) => d.code)).toEqual(['TEMPLATE_ID_TAKEN']);

    const notBundle = await refusal({ type: 'importTemplate', files: { '../x': 'aGk=' } });
    expect(notBundle.code).toBe('IMPORT_INVALID');

    expect(await browser.storage.local.get(INSTALLED_KEY)).toEqual({});
  });
});

describe('uninstallTemplate', () => {
  it('removes an imported template and its settings; sites using it go back to the original', async () => {
    await ok({ type: 'importTemplate', files: bundle() });
    await ok({ type: 'setSiteEnabled', adapterId: 'youtube', enabled: true });
    await ok({ type: 'setTemplate', adapterId: 'youtube', templateId: COPY });
    await ok({ type: 'setSettings', templateId: COPY, values: { maxWidth: 1000 } });

    const state = await ok({ type: 'uninstallTemplate', templateId: COPY });
    expect(state.library.map((t) => t.id)).not.toContain(COPY);
    expect((await getSites()).youtube).toEqual({ enabled: true, templateId: null });
    expect(await getCompiled('youtube')).toBeNull();
    expect(await browser.storage.local.get(settingsKey(COPY))).toEqual({});

    expect(
      (await refusal({ type: 'uninstallTemplate', templateId: 'reskin/focus-youtube' })).code,
    ).toBe('TEMPLATE_BUNDLED');
    expect((await refusal({ type: 'uninstallTemplate', templateId: COPY })).code).toBe(
      'UNKNOWN_TEMPLATE',
    );
  });
});

describe('library export and import', () => {
  it('export → clear storage → import restores the library', async () => {
    await ok({ type: 'importTemplate', files: bundle() });
    await ok({ type: 'setSiteEnabled', adapterId: 'youtube', enabled: true });
    await ok({ type: 'setTemplate', adapterId: 'youtube', templateId: COPY });
    await ok({ type: 'setPalette', adapterId: 'youtube', paletteId: 'reskin/nord' });
    await ok({ type: 'setSettings', templateId: COPY, values: { maxWidth: 1000 } });
    await ok({
      type: 'setSettings',
      templateId: 'reskin/calm-youtube',
      values: { hideChips: false },
    });
    await ok({ type: 'setPaused', paused: true });
    const before = await ok({ type: 'getState' });

    const exported = await send({ type: 'exportLibrary' });
    expect(exported.ok).toBe(true);
    const library = JSON.parse(JSON.stringify((exported as { data: unknown }).data));
    expect(library).toMatchObject({ format: 'reskin-library', formatVersion: 1 });
    expect(JSON.stringify(library)).not.toMatch(/youtube\.com|rk:health/);

    await browser.storage.local.clear();
    invalidateRegistry(); // the background does this on storage.onChanged
    apis.registered = [];
    expect((await ok({ type: 'getState' })).library.map((t) => t.id)).not.toContain(COPY);

    const restored = await ok({ type: 'importLibrary', library });
    expect(restored.prefs).toEqual(before.prefs);
    expect(restored.sites).toEqual(before.sites);
    expect(restored.library).toEqual(before.library);
    expect(apis.registered).toEqual(['rk-site-youtube']);
    expect((await getCompiled('youtube'))?.templateId).toBe(COPY);
  });

  it('disables restored sites whose access is not granted here, and refuses non-library files', async () => {
    await ok({ type: 'setSiteEnabled', adapterId: 'youtube', enabled: true });
    const library = (await send({ type: 'exportLibrary' })) as { data: unknown };
    await browser.storage.local.clear();
    invalidateRegistry();
    apis.granted = false;
    const restored = await ok({ type: 'importLibrary', library: library.data });
    expect(restored.sites[0]).toMatchObject({ enabled: false, templateId: 'reskin/focus-youtube' });

    const bad = await refusal({ type: 'importLibrary', library: { format: 'something-else' } });
    expect(bad.code).toBe('IMPORT_INVALID');
  });
});
