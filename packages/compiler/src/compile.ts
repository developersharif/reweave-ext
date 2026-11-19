/**
 * Template compiler: sanitize → resolve dialect → tokens/settings → route groups.
 * Pure and synchronous so it runs the same in the service worker, Studio, CI and Node.
 * Output contract: template-schema §9.2 step 5, extension-architecture §3, D-021.
 */
import {
  type Adapter,
  CODES,
  type Diagnostic,
  diag,
  hasErrors,
  type SettingValues,
  satisfies,
  type Target,
  type TemplateManifest,
} from '@reskin/schema';
import { generate, tokenize, tokenTypes } from './css/csstree.ts';
import { componentSelector, parseAdapter } from './dialect/adapter-selectors.ts';
import { resolveDialect } from './dialect/resolve.ts';
import { LIMITS } from './sanitize/allowlist.ts';
import { sanitizeCss } from './sanitize/sanitize.ts';
import { resolveSettingValues, resolveTokens, rootDeclarations, type TokenMap } from './values.ts';

/** Version of the dialect + runtime contract, checked against `requires.engine`. */
export const ENGINE_VERSION = '1.0.0';

export interface CompileInput {
  /** A manifest that passed `validateTemplate`. */
  manifest: TemplateManifest;
  /** Style file path → authoring-dialect CSS. */
  sources: Readonly<Record<string, string>>;
  /** The installed adapter (validated). Selects which manifest target compiles. */
  adapter: Adapter;
  /** Asset id → base64 `data:` URI. */
  assets?: Readonly<Record<string, string>>;
  variant?: string;
  settings?: Readonly<SettingValues>;
  palette?: TokenMap;
  tokenOverrides?: TokenMap;
}

export interface CompiledGroup {
  /** Adapter route ids where this sheet is enabled. */
  routes: string[];
  css: string;
}

export interface CompiledTemplate {
  engineVersion: string;
  templateId: string;
  templateVersion: string;
  adapterId: string;
  adapterVersion: string;
  /** Fast content hash of everything below (cache key, not an integrity check). */
  hash: string;
  /** In cascade order; the first group holds the generated `:root` tokens. */
  groups: CompiledGroup[];
  /** Routes where nothing may apply, whatever the groups say. */
  sensitiveRoutes: string[];
  /** Route id → URL path patterns, for the runtime's route matcher. */
  routeTable: Record<string, string[]>;
  rawSelectors: boolean;
  /** Components and assets the CSS actually uses (health + unused-asset checks). */
  components: string[];
  assets: string[];
}

export interface CompileResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  output?: CompiledTemplate;
}

const MEDIA_FUNCTIONS = new Set(['calc', 'min', 'max', 'clamp']);
const MEDIA_DELIMS = new Set(['<', '>', '=', '/']);

/** `media` on a style ref is wrapped as `@media <media> { … }`, so it must be a plain media query list. */
export function isSafeMediaQuery(text: string): boolean {
  if (text.includes('\\')) return false;
  let ok = true;
  tokenize(text, (type, start, end) => {
    const t = text.slice(start, end);
    switch (type) {
      case tokenTypes.Ident:
      case tokenTypes.Number:
      case tokenTypes.Dimension:
      case tokenTypes.Percentage:
      case tokenTypes.Colon:
      case tokenTypes.Comma:
      case tokenTypes.WhiteSpace:
      case tokenTypes.LeftParenthesis:
      case tokenTypes.RightParenthesis:
        return;
      case tokenTypes.Delim:
        if (!MEDIA_DELIMS.has(t)) ok = false;
        return;
      case tokenTypes.Function:
        if (!MEDIA_FUNCTIONS.has(t.slice(0, -1).toLowerCase())) ok = false;
        return;
      default:
        ok = false;
    }
  });
  return ok;
}

/** cyrb53 — small, fast, well-distributed 53-bit string hash. */
export function hashString(s: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

const routeKey = (routes: readonly string[]) => [...routes].sort().join(',');

export function compileTemplate(input: CompileInput): CompileResult {
  const { manifest, adapter } = input;
  const d: Diagnostic[] = [];

  const ti = manifest.targets.findIndex((t) => t.adapter === adapter.id);
  const target: Target | undefined = manifest.targets[ti];
  if (!target) {
    d.push(
      diag(CODES.ADAPTER_MISMATCH, 'error', `Template has no target for adapter "${adapter.id}"`, {
        path: 'targets',
      }),
    );
    return { ok: false, diagnostics: d };
  }
  const tp = `targets.${ti}`;
  if (!satisfies(adapter.version, target.adapterRange)) {
    d.push(
      diag(
        CODES.ADAPTER_RANGE_UNSATISFIED,
        'error',
        `${adapter.id}@${adapter.version} is outside ${target.adapterRange}`,
        { path: `${tp}.adapterRange` },
      ),
    );
  }
  const engine = manifest.requires?.engine;
  if (engine && !satisfies(ENGINE_VERSION, engine)) {
    d.push(
      diag(
        CODES.ENGINE_UNSUPPORTED,
        'error',
        `Template needs engine ${engine}; this extension has ${ENGINE_VERSION}. Update the extension.`,
        { path: 'requires.engine' },
      ),
    );
  }

  const parsed = parseAdapter(adapter);
  d.push(...parsed.diagnostics);

  // Routes ---------------------------------------------------------------------
  const sensitive = new Set(
    Object.entries(adapter.routes)
      .filter(([, r]) => r.sensitive)
      .map(([id]) => id),
  );
  const checkRoutes = (
    routes: readonly string[],
    allowed: ReadonlySet<string> | null,
    path: string,
  ) =>
    routes.forEach((r, i) => {
      if (!Object.hasOwn(adapter.routes, r))
        d.push(
          diag(CODES.ROUTE_UNKNOWN, 'error', `Adapter has no route "${r}"`, {
            path: `${path}.${i}`,
          }),
        );
      else if (sensitive.has(r))
        d.push(
          diag(
            CODES.ROUTE_SENSITIVE,
            'error',
            `"${r}" is a sensitive route; templates never apply there`,
            { path: `${path}.${i}` },
          ),
        );
      else if (allowed && !allowed.has(r))
        d.push(
          diag(CODES.ROUTE_NOT_IN_TARGET, 'error', `"${r}" is not in this target's routes`, {
            path: `${path}.${i}`,
          }),
        );
    });
  if (target.routes) checkRoutes(target.routes, null, `${tp}.routes`);
  const baseRoutes = (target.routes ?? Object.keys(adapter.routes)).filter(
    (r) => !sensitive.has(r) && Object.hasOwn(adapter.routes, r),
  );
  const baseSet = new Set(baseRoutes);

  // Values -------------------------------------------------------------------------
  const variant = input.variant
    ? manifest.variants?.find((x) => x.id === input.variant)
    : undefined;
  if (input.variant && !variant)
    d.push(
      diag(CODES.VARIANT_UNKNOWN, 'warning', `Unknown variant "${input.variant}"; using defaults`, {
        path: 'variants',
      }),
    );
  const settings = manifest.settings ?? [];
  const sv = resolveSettingValues(settings, variant, input.settings);
  const tv = resolveTokens(manifest, variant, input.palette, input.tokenOverrides);
  d.push(...sv.diagnostics, ...tv.diagnostics);

  // Groups -------------------------------------------------------------------------
  const groups = new Map<string, { routes: string[]; css: string[] }>();
  const group = (routes: readonly string[]) => {
    const key = routeKey(routes);
    const existing = groups.get(key);
    if (existing) return existing;
    const created = { routes: [...routes].sort(), css: [] as string[] };
    groups.set(key, created);
    return created;
  };
  group(baseRoutes).css.push(rootDeclarations(tv.css, settings, sv.values));

  const assets = Object.fromEntries(
    (manifest.assets ?? []).map((a) => [a.id, input.assets?.[a.id] ?? '']),
  );
  const used = { components: new Set<string>(), assets: new Set<string>() };
  let rawSelectors = false;
  let totalBytes = 0;
  let totalSelectors = 0;

  target.styles.forEach((style, si) => {
    const sp = `${tp}.styles.${si}`;
    if (style.routes) checkRoutes(style.routes, baseSet, `${sp}.routes`);
    const source = input.sources[style.file];
    if (source === undefined) {
      d.push(
        diag(CODES.STYLE_FILE_MISSING, 'error', `Missing style file ${style.file}`, {
          path: `${sp}.file`,
        }),
      );
      return;
    }
    const s = sanitizeCss(source, style.file);
    d.push(...s.diagnostics);
    totalBytes += s.stats.bytes;
    totalSelectors += s.stats.selectors;
    const r = resolveDialect(s.ast, {
      file: style.file,
      adapter,
      settings,
      values: sv.values,
      assets,
    });
    d.push(...r.diagnostics);
    rawSelectors ||= r.rawSelectors;
    for (const c of r.components) used.components.add(c);
    for (const a of r.assets) used.assets.add(a);

    let css = generate(s.ast);
    if (style.media) {
      if (isSafeMediaQuery(style.media)) css = `@media ${style.media}{${css}}`;
      else
        d.push(
          diag(CODES.CSS_MEDIA_INVALID, 'error', 'media must be a plain media query list', {
            path: `${sp}.media`,
          }),
        );
    }
    const routes = (style.routes ?? baseRoutes).filter((x) => baseSet.has(x));
    if (css && routes.length > 0) group(routes).css.push(css);
  });

  for (const [hi, h] of (target.hide ?? []).entries()) {
    const hp = `${tp}.hide.${hi}`;
    const c = parsed.components.get(h.component);
    if (!c) {
      d.push(
        diag(CODES.COMPONENT_UNKNOWN, 'error', `Adapter has no component "${h.component}"`, {
          path: `${hp}.component`,
        }),
      );
      continue;
    }
    if (c.protected) {
      d.push(
        diag(
          CODES.PROTECTED_COMPONENT_HIDDEN,
          'error',
          `"${h.component}" is protected and cannot be hidden`,
          { path: `${hp}.component` },
        ),
      );
      continue;
    }
    if (h.routes) checkRoutes(h.routes, baseSet, `${hp}.routes`);
    used.components.add(h.component);
    if (h.when) {
      const negated = h.when.startsWith('!');
      const on = sv.values[h.when.replace(/^!/, '')] === true;
      if (on === negated) continue;
    }
    const routes = (h.routes ?? baseRoutes).filter((x) => baseSet.has(x));
    if (routes.length > 0)
      group(routes).css.push(`${generate(componentSelector(c))}{display:none!important}`);
  }

  if (totalBytes > LIMITS.totalBytes)
    d.push(
      diag(
        CODES.CSS_SIZE_LIMIT,
        'error',
        `Style files total ${totalBytes} bytes; the limit is ${LIMITS.totalBytes}`,
        { path: `${tp}.styles` },
      ),
    );
  if (totalSelectors > LIMITS.totalSelectors)
    d.push(
      diag(
        CODES.CSS_TOO_MANY_SELECTORS,
        'error',
        `${totalSelectors} selectors; the limit is ${LIMITS.totalSelectors}`,
        { path: `${tp}.styles` },
      ),
    );
  if (rawSelectors && target.rawSelectors !== true)
    d.push(
      diag(
        CODES.RAW_SELECTORS_UNDECLARED,
        'error',
        'Styles use selectors outside adapter components; set "rawSelectors": true on this target',
        { path: `${tp}.rawSelectors` },
      ),
    );
  if (!rawSelectors && target.rawSelectors === true)
    d.push(
      diag(
        CODES.RAW_SELECTORS_UNDECLARED,
        'warning',
        '"rawSelectors": true is set but every selector uses adapter components',
        { path: `${tp}.rawSelectors` },
      ),
    );

  if (hasErrors(d)) return { ok: false, diagnostics: d };

  const body = {
    engineVersion: ENGINE_VERSION,
    templateId: manifest.id,
    templateVersion: manifest.version,
    adapterId: adapter.id,
    adapterVersion: adapter.version,
    groups: [...groups.values()].map((g) => ({ routes: g.routes, css: g.css.join('') })),
    sensitiveRoutes: [...sensitive].sort(),
    routeTable: Object.fromEntries(
      Object.entries(adapter.routes).map(([id, r]) => [
        id,
        Array.isArray(r.path) ? [...r.path] : [r.path],
      ]),
    ),
    rawSelectors,
    components: [...used.components].sort(),
    assets: [...used.assets].sort(),
  };
  return { ok: true, diagnostics: d, output: { ...body, hash: hashString(JSON.stringify(body)) } };
}
