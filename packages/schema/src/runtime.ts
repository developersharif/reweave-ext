/**
 * Extension storage values and runtime messages (extension-architecture.md §8, §9).
 * Every value read from `chrome.storage` and every message is validated against
 * these schemas at the boundary (AGENTS.md §4).
 */
import * as v from 'valibot';
import { EVENT_NAME, KEBAB_ID, ROUTE_PATH, SETTING_ID, TEMPLATE_ID } from './patterns.ts';

/** Bumped when the storage layout changes; migrations live in the extension. */
export const STORAGE_VERSION = 1;

export const STORAGE_KEYS = {
  version: 'rk:v',
  prefs: 'rk:prefs',
  sites: 'rk:sites',
} as const;
export const settingsKey = (templateId: string): string => `rk:settings:${templateId}`;
export const compiledKey = (adapterId: string): string => `rk:compiled:${adapterId}`;
export const healthKey = (adapterId: string): string => `rk:health:${adapterId}`;

/** Compiled CSS per site is capped (extension-architecture §14). */
export const MAX_COMPILED_CSS_BYTES = 300 * 1024;

const kebab = v.pipe(v.string(), v.regex(KEBAB_ID));
const templateId = v.pipe(v.string(), v.regex(TEMPLATE_ID));
const settingId = v.pipe(v.string(), v.regex(SETTING_ID));
const shortText = v.pipe(v.string(), v.maxLength(64));

export const PrefsSchema = v.object({
  paused: v.boolean(),
  /** D-017: off by default; nothing reads it before M8. */
  telemetryOptIn: v.optional(v.boolean()),
});
export const DEFAULT_PREFS: Prefs = { paused: false };

export const SiteStateSchema = v.object({
  enabled: v.boolean(),
  /** null = "Original site". */
  templateId: v.nullable(templateId),
  variantId: v.optional(kebab),
  paletteId: v.optional(v.pipe(v.string(), v.maxLength(80))),
});
export const SitesSchema = v.record(kebab, SiteStateSchema);

export const SettingValueSchema = v.union([
  v.boolean(),
  v.pipe(v.number(), v.finite()),
  v.pipe(v.string(), v.maxLength(200)),
]);
export const StoredSettingsSchema = v.record(settingId, SettingValueSchema);

export const CompiledGroupSchema = v.object({
  /** Adapter route ids where this sheet is enabled. */
  routes: v.pipe(v.array(kebab), v.maxLength(64)),
  css: v.string(),
});

/**
 * Compiler output and `rk:compiled:<adapterId>`, the only value the content script
 * reads (D-021 output contract).
 */
export const CompiledTemplateSchema = v.pipe(
  v.object({
    engineVersion: shortText,
    templateId,
    templateVersion: shortText,
    adapterId: kebab,
    adapterVersion: shortText,
    /** Fast content hash of everything else (cache key, not an integrity check). */
    hash: shortText,
    /** In cascade order; the first group holds the generated `:root` tokens. */
    groups: v.pipe(v.array(CompiledGroupSchema), v.maxLength(64)),
    /** Routes where nothing may apply, whatever the groups say. */
    sensitiveRoutes: v.array(kebab),
    /** Route id → URL path patterns, for the runtime's route matcher. */
    routeTable: v.record(kebab, v.array(v.pipe(v.string(), v.regex(ROUTE_PATH)))),
    rawSelectors: v.boolean(),
    /** Components and assets the CSS actually uses (health + unused-asset checks). */
    components: v.array(kebab),
    assets: v.array(kebab),
    /** Adapter events meaning "in-page navigation finished" (extension-architecture §4). */
    navigationEvents: v.pipe(v.array(v.pipe(v.string(), v.regex(EVENT_NAME))), v.maxLength(8)),
    /** Protected component selectors; the runtime pauses the template while one is visible (T-2.9). */
    protectedSelectors: v.pipe(v.array(v.pipe(v.string(), v.maxLength(2000))), v.maxLength(32)),
  }),
  v.check(
    (c) => c.groups.reduce((n, g) => n + g.css.length, 0) <= MAX_COMPILED_CSS_BYTES,
    'Compiled CSS exceeds the per-site limit',
  ),
);

export type Prefs = v.InferOutput<typeof PrefsSchema>;
export type SiteState = v.InferOutput<typeof SiteStateSchema>;
export type Sites = v.InferOutput<typeof SitesSchema>;
export type StoredSettings = v.InferOutput<typeof StoredSettingsSchema>;
export type CompiledGroup = v.InferOutput<typeof CompiledGroupSchema>;
export type CompiledTemplate = v.InferOutput<typeof CompiledTemplateSchema>;

// ── Messages: popup/options → background ──────────────────────────────────────

export const RequestSchema = v.variant('type', [
  v.object({ type: v.literal('getState') }),
  v.object({ type: v.literal('setSiteEnabled'), adapterId: kebab, enabled: v.boolean() }),
  v.object({
    type: v.literal('setTemplate'),
    adapterId: kebab,
    templateId: v.nullable(templateId),
    variantId: v.optional(kebab),
  }),
  v.object({
    type: v.literal('setSettings'),
    templateId,
    values: StoredSettingsSchema,
  }),
  v.object({ type: v.literal('resetSettings'), templateId }),
  v.object({ type: v.literal('setPaused'), paused: v.boolean() }),
]);
export type Request = v.InferOutput<typeof RequestSchema>;
export type RequestType = Request['type'];

/** Message error codes (stable, like diagnostics). */
export const MESSAGE_ERRORS = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNKNOWN_SITE: 'UNKNOWN_SITE',
  UNKNOWN_TEMPLATE: 'UNKNOWN_TEMPLATE',
  PERMISSION_MISSING: 'PERMISSION_MISSING',
  COMPILE_FAILED: 'COMPILE_FAILED',
  INTERNAL: 'INTERNAL',
} as const;
export type MessageErrorCode = (typeof MESSAGE_ERRORS)[keyof typeof MESSAGE_ERRORS];

export type Response<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: MessageErrorCode; message: string } };

/** Parses a value read from storage; returns `fallback` when it is missing or invalid. */
export function parseStored<S extends v.GenericSchema>(
  schema: S,
  value: unknown,
  fallback: v.InferOutput<S>,
): v.InferOutput<S> {
  if (value === undefined) return fallback;
  const r = v.safeParse(schema, value);
  return r.success ? r.output : fallback;
}

export function parseRequest(value: unknown): Request | null {
  const r = v.safeParse(RequestSchema, value);
  return r.success ? r.output : null;
}

export function parseCompiled(value: unknown): CompiledTemplate | null {
  const r = v.safeParse(CompiledTemplateSchema, value);
  return r.success ? r.output : null;
}
