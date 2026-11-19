/** Identifier patterns shared by manifests, the compiler and the extension. */

/** Creator handle / owner: lowercase, digits, single hyphens, 2–32 chars. */
export const HANDLE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,31}$/;
/** Template slug: kebab-case, 3–48 chars. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** `owner/slug` */
export const TEMPLATE_ID = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,31}\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Adapter, palette, component, route, variant and asset ids: kebab-case. */
export const KEBAB_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
/** Palette id: `owner/slug` like templates. */
export const PALETTE_ID = TEMPLATE_ID;
/** Setting ids are camelCase so they read naturally in `@setting hideShorts`. */
export const SETTING_ID = /^[a-z][a-zA-Z0-9]{0,31}$/;
/** Values of `select` settings. */
export const SELECT_VALUE = /^[a-z0-9-]{1,32}$/;
/** DOM event names an adapter may list as navigation hints. */
export const EVENT_NAME = /^[a-z][a-z0-9-]{0,63}$/;
/** Hostnames (no scheme, no port, no wildcard). */
export const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
/** Route path pattern: starts with `/`, `*` is the only wildcard. */
export const ROUTE_PATH = /^\/[A-Za-z0-9/@*._~%-]*$/;
/** A site's CSS custom property name, as an adapter theme binding names it. */
export const CSS_CUSTOM_PROPERTY = /^--[A-Za-z0-9_-]{1,80}$/;
/** Tags on templates. */
export const TAG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const LICENSES = [
  'MIT',
  'Apache-2.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'CC0-1.0',
  'MPL-2.0',
] as const;
export type License = (typeof LICENSES)[number];

/** Fonts/images bundled in a template must use one of these. */
export const ASSET_LICENSES = [...LICENSES, 'OFL-1.1'] as const;

export const CATEGORIES = [
  'focus',
  'aesthetic',
  'compact',
  'accessibility',
  'retro',
  'dark',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const RANGE_UNITS = ['', 'px', 'rem', 'em', '%', 'vw', 'vh', 'ch', 'ms', 's'] as const;

/** Words a template name/summary may not use (template-schema §10). */
export const OFFICIAL_WORDS =
  /\b(official|officially|verified by|endorsed by|by youtube|by google|by reddit|by x corp)\b/i;
