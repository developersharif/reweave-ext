/**
 * The user's library outside the bundled content (extension-architecture §8):
 * imported template bundles (`rk:installed`) and the export/import file format
 * (T-3.4). Background and options page only; the content script never reads these.
 */
import * as v from 'valibot';
import { KEBAB_ID, PALETTE_ID, TEMPLATE_ID } from './patterns.ts';
import { PrefsSchema, SitesSchema, StoredSettingsSchema } from './runtime.ts';

export const INSTALLED_KEY = 'rk:installed';

/** A template bundle, the `.zip` contents included: 2 MB (template-schema §4.1). */
export const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
export const MAX_BUNDLE_FILES = 200;
/** Relative POSIX path, no `..` segments, no leading slash. */
export const BUNDLE_PATH =
  /^(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9_][A-Za-z0-9._-]*(?:\/[A-Za-z0-9_][A-Za-z0-9._-]*)*$/;

const templateId = v.pipe(v.string(), v.regex(TEMPLATE_ID));
const bundlePath = v.pipe(v.string(), v.maxLength(200), v.regex(BUNDLE_PATH));

/** What is kept of an imported bundle: the manifest as authored, styles and assets. Previews are not kept. */
export const StoredBundleSchema = v.object({
  /** Re-validated every time the registry loads (security-model §3). */
  manifest: v.unknown(),
  sources: v.record(bundlePath, v.string()),
  /** Asset id → `data:` URI. */
  assets: v.record(v.pipe(v.string(), v.maxLength(64)), v.string()),
});

export const InstalledEntrySchema = v.object({
  version: v.pipe(v.string(), v.maxLength(64)),
  /** `catalog` arrives in M7, `local` (Studio drafts) in M5. */
  origin: v.picklist(['imported']),
  installedAt: v.pipe(v.number(), v.finite()),
  bundle: StoredBundleSchema,
});
export const InstalledSchema = v.record(templateId, InstalledEntrySchema);

/** The library file the options page exports and imports. Holds no browsing data. */
export const LibrarySchema = v.object({
  format: v.literal('reskin-library'),
  formatVersion: v.literal(1),
  exportedAt: v.pipe(v.string(), v.maxLength(40)),
  prefs: PrefsSchema,
  sites: SitesSchema,
  settings: v.record(templateId, StoredSettingsSchema),
  installed: InstalledSchema,
});

/** Base64 file contents from a template `.zip`, unpacked by the options page. */
export const BundleFilesSchema = v.pipe(
  v.record(bundlePath, v.pipe(v.string(), v.maxLength(Math.ceil(MAX_BUNDLE_BYTES / 3) * 4))),
  v.check((files) => Object.keys(files).length <= MAX_BUNDLE_FILES, 'Too many files'),
);

export type InstalledEntry = v.InferOutput<typeof InstalledEntrySchema>;
export type Installed = v.InferOutput<typeof InstalledSchema>;
export type Library = v.InferOutput<typeof LibrarySchema>;
export type BundleFiles = v.InferOutput<typeof BundleFilesSchema>;

export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string; path?: string };

function parseWith<S extends v.GenericSchema>(schema: S, value: unknown): Parsed<v.InferOutput<S>> {
  const r = v.safeParse(schema, value);
  if (r.success) return { ok: true, value: r.output };
  const issue = r.issues[0];
  const path = issue.path?.map((p) => String(p.key)).join('.');
  return { ok: false, message: issue.message, ...(path ? { path } : {}) };
}

export const parseLibrary = (value: unknown): Parsed<Library> => parseWith(LibrarySchema, value);
export const parseBundleFiles = (value: unknown): Parsed<BundleFiles> =>
  parseWith(BundleFilesSchema, value);

/**
 * `storage.sync` mirror (T-3.5). Same key names as `storage.local`. Sites carry no
 * `enabled`: whether a site is on depends on this browser's own permission grant.
 */
export const SYNC_LIMITS = {
  /** chrome.storage.sync QUOTA_BYTES and QUOTA_BYTES_PER_ITEM (technical-research §3). */
  totalBytes: 102_400,
  itemBytes: 8_192,
} as const;
export const SYNC_DIRTY_KEY = 'rk:sync:dirty';

export const SyncedSitesSchema = v.record(
  v.pipe(v.string(), v.regex(KEBAB_ID)),
  v.object({
    templateId: v.nullable(templateId),
    variantId: v.optional(v.pipe(v.string(), v.regex(KEBAB_ID))),
    paletteId: v.optional(v.pipe(v.string(), v.regex(PALETTE_ID))),
  }),
);
export type SyncedSites = v.InferOutput<typeof SyncedSitesSchema>;

export const parseSyncedSites = (value: unknown): Parsed<SyncedSites> =>
  parseWith(SyncedSitesSchema, value);
export const parseStoredSettings = (
  value: unknown,
): Parsed<v.InferOutput<typeof StoredSettingsSchema>> => parseWith(StoredSettingsSchema, value);
