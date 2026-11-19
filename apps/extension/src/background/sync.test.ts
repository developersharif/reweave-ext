import { SYNC_DIRTY_KEY, SYNC_LIMITS } from '@reskin/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Area,
  applyRemote,
  flush,
  itemBytes,
  persistDirty,
  planSync,
  reconcile,
  SYNC_INTERVAL_MS,
  SyncScheduler,
  toSync,
} from './sync';

/** An in-memory storage area that counts write calls. */
class Memory implements Area {
  data: Record<string, unknown> = {};
  writes = 0;
  async get(keys: string | string[] | null) {
    const list = keys === null ? Object.keys(this.data) : Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(
      list.filter((k) => k in this.data).map((k) => [k, structuredClone(this.data[k])]),
    );
  }
  async set(items: Record<string, unknown>) {
    this.writes++;
    Object.assign(this.data, structuredClone(items));
  }
  async remove(keys: string | string[]) {
    this.writes++;
    for (const k of Array.isArray(keys) ? keys : [keys]) delete this.data[k];
  }
}

const SITES = 'rk:sites';
const FOCUS = 'rk:settings:reskin/focus-youtube';
/** A settings value whose item is exactly `bytes` long under `key`. */
const sized = (key: string, bytes: number) => {
  const base = itemBytes(key, { s: '' });
  return { s: 'x'.repeat(bytes - base) };
};

describe('size guards', () => {
  it('keeps an item at exactly 8 KB and skips one byte more', () => {
    const atLimit = sized(FOCUS, SYNC_LIMITS.itemBytes);
    expect(itemBytes(FOCUS, atLimit)).toBe(8192);
    expect(planSync({ [FOCUS]: atLimit }).skipped).toEqual([]);
    expect(planSync({ [FOCUS]: sized(FOCUS, SYNC_LIMITS.itemBytes + 1) }).skipped).toEqual([FOCUS]);
  });

  it('counts bytes, not characters', () => {
    expect(itemBytes('k', 'é')).toBe(1 + 4); // "é" in quotes: 1 + 2 + 1 bytes
  });

  it('drops the largest settings until the total fits, and always keeps sites', () => {
    const items: Record<string, unknown> = { [SITES]: sized(SITES, 8000) };
    for (let i = 0; i < 12; i++) {
      const key = `rk:settings:someone/t${i}`;
      items[key] = sized(key, 8000 + i); // 12 × ~8 KB + 8 KB > 100 KB
    }
    const { keep, skipped } = planSync(items);
    expect(skipped).toEqual(['rk:settings:someone/t11']);
    expect(Object.keys(keep)).toContain(SITES);
    const total = Object.entries(keep).reduce((n, [k, v]) => n + itemBytes(k, v), 0);
    expect(total).toBeLessThanOrEqual(SYNC_LIMITS.totalBytes);
  });
});

describe('flush and remote changes', () => {
  let local: Memory;
  let sync: Memory;
  beforeEach(() => {
    local = new Memory();
    sync = new Memory();
  });

  it('syncs choices without `enabled`, and writes only what changed', async () => {
    local.data[SITES] = {
      youtube: { enabled: true, templateId: 'reskin/calm-youtube', paletteId: 'reskin/nord' },
    };
    local.data[FOCUS] = { maxWidth: 1000 };
    expect(await flush(local, sync, [SITES, FOCUS])).toBe(1);
    expect(sync.data).toEqual({
      [SITES]: { youtube: { templateId: 'reskin/calm-youtube', paletteId: 'reskin/nord' } },
      [FOCUS]: { maxWidth: 1000 },
    });
    // Toggling `enabled` is not a synced change.
    local.data[SITES] = {
      youtube: { enabled: false, templateId: 'reskin/calm-youtube', paletteId: 'reskin/nord' },
    };
    expect(await flush(local, sync, [SITES])).toBe(0);
    // A reset (removed settings) removes the synced copy.
    delete local.data[FOCUS];
    expect(await flush(local, sync, [FOCUS])).toBe(1);
    expect(sync.data).not.toHaveProperty(FOCUS);
  });

  it('merges remote sites into local, keeping this browser’s `enabled`', async () => {
    local.data[SITES] = { youtube: { enabled: true, templateId: 'reskin/focus-youtube' } };
    const changed = await applyRemote(local, {
      [SITES]: {
        newValue: {
          youtube: { templateId: 'reskin/calm-youtube', variantId: 'day' },
          reddit: { templateId: null },
        },
      },
      [FOCUS]: { newValue: { maxWidth: 1200 } },
      'rk:compiled:youtube': { newValue: 'ignored' },
    });
    expect(changed.sort()).toEqual([SITES, FOCUS].sort());
    expect(local.data[SITES]).toEqual({
      youtube: { enabled: true, templateId: 'reskin/calm-youtube', variantId: 'day' },
      reddit: { enabled: false, templateId: null },
    });
    // Same value again: nothing to write. Invalid values are ignored. Removed sites never wipe local.
    local.writes = 0;
    expect(await applyRemote(local, { [FOCUS]: { newValue: { maxWidth: 1200 } } })).toEqual([]);
    expect(
      await applyRemote(local, { [FOCUS]: { newValue: { maxWidth: { evil: true } } } }),
    ).toEqual([]);
    expect(await applyRemote(local, { [SITES]: {} })).toEqual([]);
    expect(local.writes).toBe(0);
    expect(await applyRemote(local, { [FOCUS]: {} })).toEqual([FOCUS]);
  });

  it('reconcile: unflushed local changes win, then synced values, then local-only keys are pushed', async () => {
    local.data[SITES] = { youtube: { enabled: true, templateId: 'reskin/focus-youtube' } };
    local.data[FOCUS] = { maxWidth: 1000 }; // changed here just before the worker stopped
    local.data['rk:settings:reskin/calm-youtube'] = { hideChips: false }; // only here
    local.data[SYNC_DIRTY_KEY] = [FOCUS];
    sync.data[SITES] = { youtube: { templateId: 'reskin/compact-youtube' } };
    sync.data[FOCUS] = { maxWidth: 1600 };

    await reconcile(local, sync);
    expect(local.data[FOCUS]).toEqual({ maxWidth: 1000 });
    expect(sync.data[FOCUS]).toEqual({ maxWidth: 1000 });
    expect(local.data[SITES]).toEqual({
      youtube: { enabled: true, templateId: 'reskin/compact-youtube' },
    });
    expect(sync.data['rk:settings:reskin/calm-youtube']).toEqual({ hideChips: false });
    expect(local.data).not.toHaveProperty(SYNC_DIRTY_KEY);
  });
});

describe('SyncScheduler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a 20-second slider drag produces at most one sync write per 5 s', async () => {
    const local = new Memory();
    const sync = new Memory();
    const flushTimes: number[] = [];
    const scheduler = new SyncScheduler({
      now: () => Date.now(),
      after: (ms, fn) => void setTimeout(fn, ms),
      flush: async (keys) => {
        const writes = await flush(local, sync, keys);
        for (let i = 0; i < writes; i++) flushTimes.push(Date.now());
      },
      persist: persistDirty(local),
    });
    for (let t = 0; t < 20_000; t += 120) {
      local.data[FOCUS] = { maxWidth: 960 + (t % 840) };
      scheduler.mark([FOCUS]);
      await vi.advanceTimersByTimeAsync(120);
    }
    await vi.advanceTimersByTimeAsync(SYNC_INTERVAL_MS * 2);

    expect(flushTimes.length).toBeGreaterThan(0);
    expect(flushTimes.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < flushTimes.length; i++)
      expect((flushTimes[i] ?? 0) - (flushTimes[i - 1] ?? 0)).toBeGreaterThanOrEqual(
        SYNC_INTERVAL_MS,
      );
    expect(sync.data[FOCUS]).toEqual(local.data[FOCUS]); // the last value made it
    expect(local.data).not.toHaveProperty(SYNC_DIRTY_KEY);
  });

  it('keeps unsynced keys after a failed flush and retries on the next change', async () => {
    const flushed: string[][] = [];
    let fail = true;
    const scheduler = new SyncScheduler({
      now: () => Date.now(),
      after: (ms, fn) => void setTimeout(fn, ms),
      flush: async (keys) => {
        if (fail) throw new Error('quota');
        flushed.push(keys);
      },
      persist: async () => undefined,
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    scheduler.mark([FOCUS, 'rk:compiled:youtube']);
    await vi.advanceTimersByTimeAsync(SYNC_INTERVAL_MS);
    fail = false;
    scheduler.mark([SITES]);
    await vi.advanceTimersByTimeAsync(SYNC_INTERVAL_MS);
    expect(flushed).toEqual([[FOCUS, SITES]]);
  });
});

describe('toSync', () => {
  it('leaves settings unchanged', () => {
    expect(toSync(FOCUS, { a: 1 })).toEqual({ a: 1 });
  });
});
