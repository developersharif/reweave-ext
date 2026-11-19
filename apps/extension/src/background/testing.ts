/**
 * Shared setup for background tests: WXT's fake browser does not implement
 * `permissions` or `scripting`, so they are mocked here (AGENTS.md §7).
 */
import { vi } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { invalidateRegistry } from './registry';

export interface FakeApis {
  granted: boolean;
  registered: string[];
}

export function resetBrowser(): FakeApis {
  fakeBrowser.reset();
  invalidateRegistry();
  const apis: FakeApis = { granted: true, registered: [] };
  vi.spyOn(browser.permissions, 'contains').mockImplementation(async () => apis.granted);
  vi.spyOn(browser.scripting, 'getRegisteredContentScripts').mockImplementation(async () =>
    apis.registered.map((id) => ({ id }) as Browser.scripting.RegisteredContentScript),
  );
  vi.spyOn(browser.scripting, 'registerContentScripts').mockImplementation(async (scripts) => {
    apis.registered.push(...scripts.map((s) => s.id));
  });
  vi.spyOn(browser.scripting, 'unregisterContentScripts').mockImplementation(async (filter) => {
    apis.registered = apis.registered.filter((id) => !filter?.ids?.includes(id));
  });
  return apis;
}
