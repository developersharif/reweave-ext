/**
 * @reskin/adapters: platform-maintained site adapters (template-schema.md §11).
 * Exported raw; consumers validate with `validateAdapter` (and the compiler checks
 * selectors) before use, like any other input.
 */
import youtube from '../youtube/adapter.json' with { type: 'json' };

export const PACKAGE_NAME = '@reskin/adapters';

/** Adapter id → raw adapter JSON, as shipped inside the extension. */
export const BUNDLED_ADAPTERS: Readonly<Record<string, unknown>> = { youtube };
