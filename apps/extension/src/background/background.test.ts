import { compiledKey, STORAGE_KEYS, STORAGE_VERSION, settingsKey } from '@reskin/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { getCompiled, getPrefs, getSites, setSites } from '../shared/storage';
import { recompile } from './compile-service';
import { startup } from './lifecycle';
import { migrate } from './migrations';
import { loadRegistry, registry } from './registry';
import { handleRequest, isTrustedSender } from './router';
import { syncRegistrations } from './sites';

const FOCUS = 'reskin/focus-youtube';
let granted = true;
let registered: string[] = [];

beforeEach(() => {
  fakeBrowser.reset();
  granted = true;
  registered = [];
  // permissions and scripting are not implemented by the fake browser.
  vi.spyOn(browser.permissions, 'contains').mockImplementation(async () => granted);
  vi.spyOn(browser.scripting, 'getRegisteredContentScripts').mockImplementation(async () =>
    registered.map((id) => ({ id }) as Browser.scripting.RegisteredContentScript),
  );
  vi.spyOn(browser.scripting, 'registerContentScripts').mockImplementation(async (scripts) => {
    registered.push(...scripts.map((s) => s.id));
  });
  vi.spyOn(browser.scripting, 'unregisterContentScripts').mockImplementation(async (filter) => {
    registered = registered.filter((id) => !filter?.ids?.includes(id));
  });
});

const reg = registry();
const ok = <T>(r: { ok: boolean; data?: T }) => {
  expect(r.ok).toBe(true);
  return r.data as T;
};

describe('migrations', () => {
  it('initializes a fresh install', async () => {
    expect(await migrate()).toEqual({ from: undefined, to: STORAGE_VERSION });
    const all = await browser.storage.local.get(null);
    expect(all).toEqual({
      [STORAGE_KEYS.version]: 1,
      [STORAGE_KEYS.prefs]: { paused: false },
      [STORAGE_KEYS.sites]: {},
    });
  });

  it('normalizes invalid values and leaves newer layouts alone', async () => {
    await browser.storage.local.set({ [STORAGE_KEYS.version]: 0, [STORAGE_KEYS.prefs]: 'junk' });
    await migrate();
    expect(await getPrefs()).toEqual({ paused: false });
    await browser.storage.local.set({ [STORAGE_KEYS.version]: 99, [STORAGE_KEYS.prefs]: 'junk' });
    expect(await migrate()).toEqual({ from: 99, to: 99 });
    expect((await browser.storage.local.get(STORAGE_KEYS.prefs))[STORAGE_KEYS.prefs]).toBe('junk');
  });
});

describe('registry', () => {
  it('loads the bundled adapter and template without problems', () => {
    expect(reg.problems).toEqual([]);
    expect([...reg.adapters.keys()]).toEqual(['youtube']);
    expect([...reg.templates.keys()]).toEqual([FOCUS]);
  });

  it('skips invalid entries and reports why', () => {
    const r = loadRegistry({ youtube: { schemaVersion: 1 } }, {});
    expect(r.adapters.size).toBe(0);
    expect(r.problems[0]?.id).toBe('adapter:youtube');
    expect(r.problems[0]?.diagnostics.some((d) => d.code === 'MANIFEST_INVALID')).toBe(true);
  });
});

describe('compile service', () => {
  it('writes compiled output for an enabled site and clears it when disabled', async () => {
    await setSites({ youtube: { enabled: true, templateId: FOCUS } });
    expect(await recompile(reg, 'youtube')).toMatchObject({ status: 'applied' });
    expect((await getCompiled('youtube'))?.templateId).toBe(FOCUS);

    await setSites({ youtube: { enabled: false, templateId: FOCUS } });
    expect(await recompile(reg, 'youtube')).toEqual({ status: 'cleared' });
    expect(await getCompiled('youtube')).toBeNull();
  });

  it('does not rewrite identical output', async () => {
    await setSites({ youtube: { enabled: true, templateId: FOCUS } });
    await recompile(reg, 'youtube');
    const set = vi.spyOn(browser.storage.local, 'set');
    await recompile(reg, 'youtube');
    expect(set).not.toHaveBeenCalled();
  });

  it('ignores stored setting values that are no longer valid', async () => {
    await setSites({ youtube: { enabled: true, templateId: FOCUS } });
    await browser.storage.local.set({ [settingsKey(FOCUS)]: { maxWidth: 'wide', unknown: true } });
    expect(await recompile(reg, 'youtube')).toMatchObject({ status: 'applied' });
    expect((await getCompiled('youtube'))?.groups[0]?.css).toContain('--rk-s-max-width:1280px');
  });
});

describe('message router', () => {
  it('accepts only extension pages as senders', () => {
    const origin = 'chrome-extension://abc/';
    expect(isTrustedSender({ id: 'abc', url: `${origin}popup.html` }, 'abc', origin)).toBe(true);
    expect(isTrustedSender({ id: 'abc', url: 'https://www.youtube.com/' }, 'abc', origin)).toBe(
      false,
    );
    expect(isTrustedSender({ id: 'other', url: `${origin}popup.html` }, 'abc', origin)).toBe(false);
    expect(isTrustedSender({ id: 'abc' }, 'abc', origin)).toBe(false);
  });

  it('rejects malformed requests', async () => {
    expect(
      await handleRequest(reg, { type: 'setSiteEnabled', adapterId: 'YouTube!' }),
    ).toMatchObject({
      ok: false,
      error: { code: 'BAD_REQUEST' },
    });
    expect(await handleRequest(reg, 'nope')).toMatchObject({
      ok: false,
      error: { code: 'BAD_REQUEST' },
    });
  });

  it('enables a site: registers the content script, picks a template, compiles', async () => {
    await startup(reg);
    const state = ok(
      await handleRequest(reg, { type: 'setSiteEnabled', adapterId: 'youtube', enabled: true }),
    );
    expect(state.sites[0]).toMatchObject({
      adapterId: 'youtube',
      granted: true,
      enabled: true,
      templateId: FOCUS,
    });
    expect(state.sites[0]?.settings).toEqual({
      hideShorts: true,
      hideHomeFeed: false,
      maxWidth: 1280,
    });
    expect(registered).toEqual(['rk-site-youtube']);
    expect(await browser.storage.local.get(compiledKey('youtube'))).not.toEqual({});

    ok(await handleRequest(reg, { type: 'setSiteEnabled', adapterId: 'youtube', enabled: false }));
    expect(registered).toEqual([]);
    expect(await getCompiled('youtube')).toBeNull();
  });

  it('refuses to enable a site without its permission', async () => {
    granted = false;
    expect(
      await handleRequest(reg, { type: 'setSiteEnabled', adapterId: 'youtube', enabled: true }),
    ).toMatchObject({
      ok: false,
      error: { code: 'PERMISSION_MISSING' },
    });
    expect(registered).toEqual([]);
  });

  it('switches templates, including "Original site", and validates ids', async () => {
    ok(await handleRequest(reg, { type: 'setSiteEnabled', adapterId: 'youtube', enabled: true }));
    ok(await handleRequest(reg, { type: 'setTemplate', adapterId: 'youtube', templateId: null }));
    expect(await getCompiled('youtube')).toBeNull();
    expect((await getSites()).youtube).toEqual({ enabled: true, templateId: null });
    expect(
      await handleRequest(reg, {
        type: 'setTemplate',
        adapterId: 'youtube',
        templateId: 'someone/else',
      }),
    ).toMatchObject({ ok: false, error: { code: 'UNKNOWN_TEMPLATE' } });
    // Re-enabling keeps the user's "Original site" choice.
    ok(await handleRequest(reg, { type: 'setSiteEnabled', adapterId: 'youtube', enabled: false }));
    ok(await handleRequest(reg, { type: 'setSiteEnabled', adapterId: 'youtube', enabled: true }));
    expect((await getSites()).youtube?.templateId).toBeNull();
  });

  it('merges valid settings, drops invalid ones, and resets', async () => {
    ok(await handleRequest(reg, { type: 'setSiteEnabled', adapterId: 'youtube', enabled: true }));
    let state = ok(
      await handleRequest(reg, {
        type: 'setSettings',
        templateId: FOCUS,
        values: { maxWidth: 1000, hideShorts: 'yes' },
      }),
    );
    expect(state.sites[0]?.settings).toMatchObject({ maxWidth: 1000, hideShorts: true });
    expect((await getCompiled('youtube'))?.groups[0]?.css).toContain('--rk-s-max-width:1000px');
    state = ok(await handleRequest(reg, { type: 'resetSettings', templateId: FOCUS }));
    expect(state.sites[0]?.settings).toMatchObject({ maxWidth: 1280 });
  });

  it('stores the global pause', async () => {
    const state = ok(await handleRequest(reg, { type: 'setPaused', paused: true }));
    expect(state.prefs.paused).toBe(true);
  });
});

describe('registration sync', () => {
  it('disables a site and unregisters its script when the permission is revoked', async () => {
    ok(await handleRequest(reg, { type: 'setSiteEnabled', adapterId: 'youtube', enabled: true }));
    granted = false;
    expect(await syncRegistrations()).toEqual(['youtube']);
    expect(registered).toEqual([]);
    expect((await getSites()).youtube?.enabled).toBe(false);
  });
});

describe('exclusive', () => {
  it('runs tasks one at a time, in order, even when one fails', async () => {
    const { exclusive } = await import('./exclusive');
    const order: string[] = [];
    const slow = exclusive(async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push('a');
      throw new Error('boom');
    });
    const fast = exclusive(async () => order.push('b'));
    await expect(slow).rejects.toThrow('boom');
    await fast;
    expect(order).toEqual(['a', 'b']);
  });

  it('enables a site when its permission is granted', async () => {
    const { onPermissionsAdded } = await import('./router');
    await onPermissionsAdded(reg, ['https://www.youtube.com/*']);
    expect((await getSites()).youtube).toMatchObject({ enabled: true, templateId: FOCUS });
    expect(registered).toEqual(['rk-site-youtube']);
  });
});
