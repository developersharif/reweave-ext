/**
 * `storage.sync` mirror for the user's choices (T-3.5): `rk:sites` (without `enabled`,
 * which depends on this browser's permissions) and `rk:settings:*`. Imported
 * templates are not synced (too large); their settings are, and apply wherever the
 * template is installed.
 *
 * - **Writes** are batched: at most one flush per `SYNC_INTERVAL_MS`, writing only keys
 *   whose value changed (chrome.storage.sync allows 120 writes/min, 1,800/h).
 * - **Size guards:** an item over 8 KB is not synced; if the total would pass 100 KB,
 *   the largest settings stay local-only. Sites always sync.
 * - **Conflicts:** last write wins per key, which is chrome.storage.sync's own rule.
 *   Remote changes are applied as they arrive. At startup, keys changed locally but not
 *   yet flushed (`rk:sync:dirty`) are pushed first, then synced values win.
 */
import {
  parseStoredSettings,
  parseSyncedSites,
  type Sites,
  STORAGE_KEYS,
  SYNC_DIRTY_KEY,
  SYNC_LIMITS,
  type SyncedSites,
  settingsKey,
} from '@reskin/schema';

/** Gap between flushes; a slider drag produces at most one write per interval. */
export const SYNC_INTERVAL_MS = 5000;
/** Changes made together are written together. */
export const SYNC_BATCH_MS = 1000;

const SETTINGS_PREFIX = settingsKey('');

export interface Area {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

export const isMirrored = (key: string): boolean =>
  key === STORAGE_KEYS.sites || key.startsWith(SETTINGS_PREFIX);

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const encoder = new TextEncoder();
/** Chrome measures an item as its key plus the JSON of its value; bytes, to be safe with non-ASCII. */
export const itemBytes = (key: string, value: unknown): number =>
  encoder.encode(key).length + encoder.encode(JSON.stringify(value)).length;

/** The synced form of a local value. */
export function toSync(key: string, value: unknown): unknown {
  if (key !== STORAGE_KEYS.sites) return value;
  const out: SyncedSites = {};
  for (const [id, { enabled: _local, ...choice }] of Object.entries(value as Sites))
    out[id] = choice;
  return out;
}

/** A synced value merged into the local one, or undefined when it is invalid. */
export function fromSync(key: string, remote: unknown, local: unknown): unknown {
  if (key === STORAGE_KEYS.sites) {
    const r = parseSyncedSites(remote);
    if (!r.ok) return undefined;
    const current = (local ?? {}) as Sites;
    const merged: Sites = { ...current };
    for (const [id, choice] of Object.entries(r.value))
      merged[id] = { enabled: current[id]?.enabled ?? false, ...choice };
    return merged;
  }
  const r = parseStoredSettings(remote);
  return r.ok ? r.value : undefined;
}

/** What fits: items over the per-item limit are dropped, then the largest settings until the total fits. */
export function planSync(items: Readonly<Record<string, unknown>>): {
  keep: Record<string, unknown>;
  skipped: string[];
} {
  const sizes = Object.entries(items).map(([key, value]) => ({
    key,
    value,
    bytes: itemBytes(key, value),
  }));
  const skipped = sizes.filter((s) => s.bytes > SYNC_LIMITS.itemBytes).map((s) => s.key);
  let fits = sizes.filter((s) => s.bytes <= SYNC_LIMITS.itemBytes);
  let total = fits.reduce((n, s) => n + s.bytes, 0);
  const bySize = fits.filter((s) => s.key !== STORAGE_KEYS.sites).sort((a, b) => b.bytes - a.bytes);
  for (const s of bySize) {
    if (total <= SYNC_LIMITS.totalBytes) break;
    total -= s.bytes;
    skipped.push(s.key);
    fits = fits.filter((f) => f !== s);
  }
  return { keep: Object.fromEntries(fits.map((s) => [s.key, s.value])), skipped };
}

/** Writes the given keys' local values to sync, if they changed. Returns the number of write calls. */
export async function flush(local: Area, sync: Area, keys: readonly string[]): Promise<number> {
  const all = await local.get(null);
  const desired = Object.fromEntries(
    Object.entries(all)
      .filter(([k]) => isMirrored(k))
      .map(([k, v]) => [k, toSync(k, v)]),
  );
  const { keep, skipped } = planSync(desired);
  if (skipped.length > 0) console.warn('[reskin] not synced (too large):', skipped);
  const remote = await sync.get(null);
  const set: Record<string, unknown> = {};
  const remove: string[] = [];
  for (const key of new Set(keys)) {
    if (!isMirrored(key)) continue;
    if (key in keep) {
      if (!same(remote[key], keep[key])) set[key] = keep[key];
    } else if (key in remote) remove.push(key);
  }
  let writes = 0;
  if (Object.keys(set).length > 0) {
    await sync.set(set);
    writes++;
  }
  if (remove.length > 0) {
    await sync.remove(remove);
    writes++;
  }
  return writes;
}

/**
 * Applies remote changes to local storage. A removed settings key is removed locally;
 * a removed `rk:sites` is ignored (never wipe a device's sites from afar). Returns the
 * keys that changed locally.
 */
export async function applyRemote(
  local: Area,
  changes: Readonly<Record<string, { newValue?: unknown }>>,
): Promise<string[]> {
  const keys = Object.keys(changes).filter(isMirrored);
  if (keys.length === 0) return [];
  const current = await local.get(keys);
  const set: Record<string, unknown> = {};
  const remove: string[] = [];
  for (const key of keys) {
    const remote = changes[key]?.newValue;
    if (remote === undefined) {
      if (key !== STORAGE_KEYS.sites && key in current) remove.push(key);
      continue;
    }
    const merged = fromSync(key, remote, current[key]);
    if (merged !== undefined && !same(merged, current[key])) set[key] = merged;
  }
  if (Object.keys(set).length > 0) await local.set(set);
  if (remove.length > 0) await local.remove(remove);
  return [...Object.keys(set), ...remove];
}

/** Startup: push unflushed local changes, then take synced values, then push keys sync doesn't have. */
export async function reconcile(local: Area, sync: Area): Promise<string[]> {
  const dirty = (await local.get(SYNC_DIRTY_KEY))[SYNC_DIRTY_KEY];
  const pending = Array.isArray(dirty)
    ? dirty.filter((k): k is string => typeof k === 'string')
    : [];
  if (pending.length > 0) {
    await flush(local, sync, pending);
    await local.remove(SYNC_DIRTY_KEY);
  }
  const remote = await sync.get(null);
  const changed = await applyRemote(
    local,
    Object.fromEntries(
      Object.entries(remote)
        .filter(([k]) => !pending.includes(k))
        .map(([k, v]) => [k, { newValue: v }]),
    ),
  );
  const localOnly = Object.keys(await local.get(null)).filter(
    (k) => isMirrored(k) && !(k in remote),
  );
  if (localOnly.length > 0) await flush(local, sync, localOnly);
  return changed;
}

export interface SchedulerDeps {
  now: () => number;
  after: (ms: number, fn: () => void) => void;
  flush: (keys: string[]) => Promise<unknown>;
  /** Persists the dirty set (empty = clear), so a stopped service worker doesn't lose it. */
  persist: (keys: string[]) => Promise<void>;
}

/** Collects changed keys and flushes them in batches, at most once per interval. */
export class SyncScheduler {
  readonly #dirty = new Set<string>();
  #timer = false;
  #lastFlush = Number.NEGATIVE_INFINITY;
  readonly #deps: SchedulerDeps;

  constructor(deps: SchedulerDeps) {
    this.#deps = deps;
  }

  mark(keys: readonly string[]): void {
    const before = this.#dirty.size;
    for (const k of keys) if (isMirrored(k)) this.#dirty.add(k);
    if (this.#dirty.size > before) this.#persist();
    if (this.#timer || this.#dirty.size === 0) return;
    this.#timer = true;
    const wait = Math.max(SYNC_BATCH_MS, this.#lastFlush + SYNC_INTERVAL_MS - this.#deps.now());
    this.#deps.after(wait, () => void this.#run());
  }

  #persist(): void {
    void this.#deps.persist([...this.#dirty]).catch(() => undefined);
  }

  async #run(): Promise<void> {
    const keys = [...this.#dirty];
    this.#dirty.clear();
    this.#lastFlush = this.#deps.now();
    try {
      await this.#deps.flush(keys);
    } catch (e) {
      console.warn('[reskin] sync failed; will retry with the next change', e);
      for (const k of keys) this.#dirty.add(k);
    } finally {
      this.#timer = false;
      this.#persist(); // whatever was marked during the flush (often nothing)
    }
  }
}

/** `persist` for the scheduler: the dirty keys in local storage. */
export const persistDirty = (local: Area) => (keys: string[]) =>
  keys.length > 0 ? local.set({ [SYNC_DIRTY_KEY]: keys }) : local.remove(SYNC_DIRTY_KEY);
