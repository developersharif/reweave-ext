import { describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

describe('test environment', () => {
  it('provides an in-memory browser.storage', async () => {
    fakeBrowser.reset();
    await browser.storage.local.set({ 'rk:v': 1 });
    expect(await browser.storage.local.get('rk:v')).toEqual({ 'rk:v': 1 });
  });
});
