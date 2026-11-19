/**
 * @reskin/templates: templates bundled with the extension. Exported raw (manifest +
 * style sources); the extension validates, sanitizes and compiles them like any other
 * template (sanitize twice, security-model §3).
 *
 * CSS comes in through Vite `?raw` imports, so this module is for the extension build
 * and its tests. Node tools read the template directories with node:fs instead.
 */

import calmYoutubeBase from '../calm-youtube/styles/base.css?raw';
import calmYoutubeManifest from '../calm-youtube/template.json' with { type: 'json' };
import compactYoutubeBase from '../compact-youtube/styles/base.css?raw';
import compactYoutubeManifest from '../compact-youtube/template.json' with { type: 'json' };
import focusYoutubeBase from '../focus-youtube/styles/base.css?raw';
import focusYoutubeWatch from '../focus-youtube/styles/watch.css?raw';
import focusYoutubeManifest from '../focus-youtube/template.json' with { type: 'json' };

export const PACKAGE_NAME = '@reskin/templates';

export interface BundledTemplate {
  /** Unvalidated `template.json`. */
  manifest: unknown;
  /** Style file path (as in the manifest) → authoring-dialect CSS. */
  sources: Readonly<Record<string, string>>;
  /** Asset id → `data:` URI. */
  assets: Readonly<Record<string, string>>;
}

export const BUNDLED_TEMPLATES: Readonly<Record<string, BundledTemplate>> = {
  'reskin/focus-youtube': {
    manifest: focusYoutubeManifest,
    sources: { 'styles/base.css': focusYoutubeBase, 'styles/watch.css': focusYoutubeWatch },
    assets: {},
  },
  'reskin/compact-youtube': {
    manifest: compactYoutubeManifest,
    sources: { 'styles/base.css': compactYoutubeBase },
    assets: {},
  },
  'reskin/calm-youtube': {
    manifest: calmYoutubeManifest,
    sources: { 'styles/base.css': calmYoutubeBase },
    assets: {},
  },
};

/** Template directories in this package, for Node tools and tests. */
export const TEMPLATE_DIRS: Readonly<Record<string, string>> = {
  'reskin/focus-youtube': 'focus-youtube',
  'reskin/compact-youtube': 'compact-youtube',
  'reskin/calm-youtube': 'calm-youtube',
};
