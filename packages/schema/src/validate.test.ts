import youtube from '@reskin/test-fixtures/adapters/youtube-spec.json' with { type: 'json' };
import dusk from '@reskin/test-fixtures/palettes/dusk.json' with { type: 'json' };
import example from '@reskin/test-fixtures/spec-example/template.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import type { Adapter } from './adapter.ts';
import { flattenTokenTree, type Palette } from './palette.ts';
import { validateAdapter, validatePalette, validateTemplate } from './validate.ts';

type Json = Record<string, unknown>;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const errors = (r: { diagnostics: { code: string; path?: string; severity: string }[] }) =>
  r.diagnostics.filter((d) => d.severity === 'error').map((d) => ({ code: d.code, path: d.path }));

const adapter = validateAdapter(youtube).value as Adapter;
const ctx = { adapters: { youtube: adapter } };

describe('validateTemplate: spec example', () => {
  it('accepts the template-schema §3.1 example', () => {
    const r = validateTemplate(example, ctx);
    expect(r.diagnostics).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('warns (not errors) on unknown top-level fields', () => {
    const r = validateTemplate({ ...clone(example), futureField: 1 }, ctx);
    expect(r.ok).toBe(true);
    expect(r.diagnostics).toEqual([
      expect.objectContaining({ code: 'MANIFEST_UNKNOWN_FIELD', path: 'futureField' }),
    ]);
  });
});

/** Each case mutates a copy of the spec example and names the first expected `{code, path}`. */
const invalid: [string, (m: Json) => void, string, string][] = [
  ['missing schemaVersion', (m) => delete m.schemaVersion, 'MANIFEST_INVALID', 'schemaVersion'],
  ['future schemaVersion', (m) => (m.schemaVersion = 2), 'MANIFEST_INVALID', 'schemaVersion'],
  ['id without owner', (m) => (m.id = 'minimal-youtube'), 'MANIFEST_INVALID', 'id'],
  ['slug too short', (m) => (m.id = 'demo/ab'), 'MANIFEST_INVALID', 'id'],
  ['uppercase id', (m) => (m.id = 'Demo/Minimal'), 'MANIFEST_INVALID', 'id'],
  ['name too short', (m) => (m.name = 'YT'), 'MANIFEST_INVALID', 'name'],
  ['summary too long', (m) => (m.summary = 'x'.repeat(141)), 'MANIFEST_INVALID', 'summary'],
  ['bad version', (m) => (m.version = '1.2'), 'MANIFEST_INVALID', 'version'],
  ['unsupported license', (m) => (m.license = 'GPL-3.0'), 'MANIFEST_INVALID', 'license'],
  ['no authors', (m) => (m.authors = []), 'MANIFEST_INVALID', 'authors'],
  ['unknown category', (m) => (m.category = 'pretty'), 'MANIFEST_INVALID', 'category'],
  [
    'too many tags',
    (m) => (m.tags = Array.from({ length: 9 }, (_, i) => `t${i}`)),
    'MANIFEST_INVALID',
    'tags',
  ],
  ['no targets', (m) => (m.targets = []), 'MANIFEST_INVALID', 'targets'],
  [
    'bad adapter range',
    (m) => (target(m).adapterRange = 'latest'),
    'MANIFEST_INVALID',
    'targets.0.adapterRange',
  ],
  [
    'style path escapes folder',
    (m) => (style(m, 0).file = 'styles/../../etc.css'),
    'MANIFEST_INVALID',
    'targets.0.styles.0.file',
  ],
  [
    'style not .css',
    (m) => (style(m, 0).file = 'styles/base.scss'),
    'MANIFEST_INVALID',
    'targets.0.styles.0.file',
  ],
  [
    'hide.when not a setting id',
    (m) => (hide(m, 0).when = 'hide shorts'),
    'MANIFEST_INVALID',
    'targets.0.hide.0.when',
  ],
  [
    'setting id not camelCase',
    (m) => (setting(m, 0).id = 'hide-shorts'),
    'MANIFEST_INVALID',
    'settings.0.id',
  ],
  [
    'free-text setting type',
    (m) => (setting(m, 0).type = 'text'),
    'MANIFEST_INVALID',
    'settings.0.type',
  ],
  [
    'label too long',
    (m) => (setting(m, 0).label = 'x'.repeat(41)),
    'MANIFEST_INVALID',
    'settings.0.label',
  ],
  [
    'select value with spaces',
    (m) => (opts(m)[0] = { value: 'very compact', label: 'X' }),
    'MANIFEST_INVALID',
    'settings.2.options.0.value',
  ],
  ['range step 0', (m) => (setting(m, 3).step = 0), 'MANIFEST_INVALID', 'settings.3.step'],
  ['no previews', (m) => (m.previews = []), 'MANIFEST_INVALID', 'previews'],
  [
    'preview not an image',
    (m) => (preview(m, 0).file = 'previews/cover.gif'),
    'MANIFEST_INVALID',
    'previews.0.file',
  ],
  // semantic
  ['official name', (m) => (m.name = 'Official YouTube Dark'), 'NAME_IMPLIES_OFFICIAL', 'name'],
  [
    '"by YouTube" summary',
    (m) => (m.summary = 'A theme by YouTube fans'),
    'NAME_IMPLIES_OFFICIAL',
    'summary',
  ],
  [
    'duplicate setting id',
    (m) => (setting(m, 1).id = 'hideShorts'),
    'DUPLICATE_ID',
    'settings.1.id',
  ],
  ['range min ≥ max', (m) => (setting(m, 3).min = 2000), 'SETTING_RANGE_INVALID', 'settings.3.min'],
  [
    'range default outside',
    (m) => (setting(m, 3).default = 100),
    'SETTING_DEFAULT_INVALID',
    'settings.3.default',
  ],
  [
    'select default not an option',
    (m) => (setting(m, 2).default = 'roomy'),
    'SETTING_DEFAULT_INVALID',
    'settings.2.default',
  ],
  [
    'hide.when unknown setting',
    (m) => (hide(m, 0).when = 'hideReels'),
    'SETTING_REF_UNKNOWN',
    'targets.0.hide.0.when',
  ],
  [
    'hide.when on select setting',
    (m) => (hide(m, 0).when = '!density'),
    'SETTING_REF_NOT_BOOLEAN',
    'targets.0.hide.0.when',
  ],
  [
    'unknown token',
    (m) => (tokens(m)['color.background'] = '#000'),
    'TOKEN_UNKNOWN',
    'tokens.defaults.color.background',
  ],
  [
    'token value injection',
    (m) => (tokens(m)['color.bg'] = 'red; } body { display:none'),
    'TOKEN_VALUE_INVALID',
    'tokens.defaults.color.bg',
  ],
  [
    'font token with url',
    (m) => (tokens(m)['font.body'] = 'x, url(https://evil.test)'),
    'TOKEN_VALUE_INVALID',
    'tokens.defaults.font.body',
  ],
  [
    'variant unknown setting',
    (m) => (variant(m, 0).settings = { hideEverything: true }),
    'SETTING_REF_UNKNOWN',
    'variants.0.settings.hideEverything',
  ],
  [
    'variant bad setting value',
    (m) => (variant(m, 0).settings = { hideHomeFeed: 'yes' }),
    'SETTING_VALUE_INVALID',
    'variants.0.settings.hideHomeFeed',
  ],
  ['two covers', (m) => (preview(m, 1).role = 'cover'), 'COVER_PREVIEW_COUNT', 'previews'],
  [
    'font without license',
    (m) => delete asset(m, 0).license,
    'MANIFEST_INVALID',
    'assets.0.license',
  ],
  [
    'font not woff2',
    (m) => (asset(m, 0).file = 'assets/inter.png'),
    'MANIFEST_INVALID',
    'assets.0.file',
  ],
  // adapter-aware
  [
    'unknown adapter',
    (m) => (target(m).adapter = 'myspace'),
    'ADAPTER_REF_UNKNOWN',
    'targets.0.adapter',
  ],
  [
    'unknown route',
    (m) => (style(m, 2).routes = ['watch-later']),
    'ROUTE_UNKNOWN',
    'targets.0.styles.2.routes.0',
  ],
  [
    'hide unknown component',
    (m) => (hide(m, 0).component = 'reels'),
    'COMPONENT_UNKNOWN',
    'targets.0.hide.0.component',
  ],
  [
    'hide protected component',
    (m) => (hide(m, 0).component = 'consent-dialog'),
    'PROTECTED_COMPONENT_HIDDEN',
    'targets.0.hide.0.component',
  ],
];

describe('validateTemplate: invalid fixtures', () => {
  it('has at least 20 cases', () => expect(invalid.length).toBeGreaterThanOrEqual(20));

  it.each(invalid)('%s → %s', (_name, mutate, code, path) => {
    const m = clone(example) as Json;
    mutate(m);
    const r = validateTemplate(m, ctx);
    expect(r.ok).toBe(false);
    expect(errors(r)).toContainEqual({ code, path });
  });
});

describe('validateTemplate: adapter range', () => {
  it('warns when the installed adapter is outside the range', () => {
    const m = clone(example) as Json;
    target(m).adapterRange = '^3.0.0';
    const r = validateTemplate(m, ctx);
    expect(r.ok).toBe(true);
    expect(r.diagnostics.map((d) => d.code)).toContain('ADAPTER_RANGE_UNSATISFIED');
  });
});

describe('validateAdapter', () => {
  it('accepts the template-schema §11 example', () => {
    const r = validateAdapter(youtube);
    expect(r.diagnostics).toEqual([]);
  });

  it('accepts a theme block', () => {
    const a = clone(youtube) as Json;
    a.theme = {
      scope: ':root, [dark]',
      follow: { 'color.bg': '--site-bg', 'color.link': '--site-accent' },
      bind: { 'color.bg': ['--site-bg', '--t3e41d7b17b187f69'], 'color.accent': ['--site-accent'] },
    };
    expect(validateAdapter(a).diagnostics).toEqual([]);
  });

  it.each<[string, (a: Json) => void, string, string]>([
    ['bad host', (a) => (a.hosts = ['https://www.youtube.com']), 'MANIFEST_INVALID', 'hosts.0'],
    [
      'route path without slash',
      (a) => (routes(a).home = { path: 'home' }),
      'MANIFEST_INVALID',
      'routes.home.path',
    ],
    [
      'component on unknown route',
      (a) => (components(a).masthead = { selector: 'x', routes: ['feed'] }),
      'ROUTE_UNKNOWN',
      'components.masthead.routes.0',
    ],
    [
      'probe for unknown component',
      (a) => ((a.probes as Json[])[0] = { component: 'nope', route: 'home', expect: 'present' }),
      'COMPONENT_UNKNOWN',
      'probes.0.component',
    ],
    [
      'only sensitive routes',
      (a) => (a.routes = { account: { path: '/account', sensitive: true } }),
      'MANIFEST_INVALID',
      'routes',
    ],
    [
      'theme token outside standard/v1',
      (a) => (a.theme = { scope: ':root', follow: { 'color.sparkle': '--site-bg' } }),
      'TOKEN_UNKNOWN',
      'theme.follow.color.sparkle',
    ],
    [
      'theme variable that is not a custom property',
      (a) => (a.theme = { scope: ':root', bind: { 'color.bg': ['background'] } }),
      'MANIFEST_INVALID',
      'theme.bind.color.bg.0',
    ],
    [
      'theme variable that breaks out of its declaration',
      (a) => (a.theme = { scope: ':root', bind: { 'color.bg': ['--x;color:red'] } }),
      'MANIFEST_INVALID',
      'theme.bind.color.bg.0',
    ],
    [
      'theme binding a reserved variable',
      (a) => (a.theme = { scope: ':root', bind: { 'color.bg': ['--rk-color-text'] } }),
      'CSS_RESERVED_NAME',
      'theme.bind.color.bg.0',
    ],
    [
      'site variable bound to two tokens',
      (a) =>
        (a.theme = {
          scope: ':root',
          bind: { 'color.bg': ['--site-bg'], 'color.surface': ['--site-raised', '--site-bg'] },
        }),
      'DUPLICATE_ID',
      'theme.bind.color.surface.1',
    ],
  ])('%s → %s', (_name, mutate, code, path) => {
    const a = clone(youtube) as Json;
    if (_name === 'only sensitive routes') {
      a.components = {};
      a.probes = [];
    }
    mutate(a);
    expect(errors(validateAdapter(a))).toContainEqual({ code, path });
  });
});

describe('validatePalette', () => {
  it('accepts DTCG 2025.10 shapes and flattens them', () => {
    const r = validatePalette(dusk);
    expect(r.diagnostics).toEqual([]);
    expect(flattenTokenTree((r.value as Palette).tokens).tokens).toEqual({
      'color.bg': '#1a1a2e',
      'color.text': 'oklch(0.93 0.02 280)',
      'color.accent': '#e94560',
      'font.body': 'Atkinson Hyperlegible, system-ui, sans-serif',
      'radius.md': '12px',
      'motion.duration': '200ms',
    });
  });

  it('warns on unknown tokens and rejects unsafe values', () => {
    const p = clone(dusk) as Json;
    const color = (p.tokens as Record<string, Json>).color as Json;
    color.sparkle = { $value: '#fff' };
    color.bg = { $value: 'url(https://evil.test)' };
    const r = validatePalette(p);
    expect(r.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'TOKEN_UNKNOWN',
        severity: 'warning',
        path: 'tokens.color.sparkle',
      }),
    );
    expect(errors(r)).toContainEqual({ code: 'TOKEN_VALUE_INVALID', path: 'tokens.color.bg' });
  });
});

// --- helpers -----------------------------------------------------------------
const at = (x: unknown, ...keys: (string | number)[]): Json =>
  keys.reduce<unknown>((o, k) => (o as Record<string | number, unknown>)[k], x) as Json;
const target = (m: Json) => at(m, 'targets', 0);
const style = (m: Json, i: number) => at(m, 'targets', 0, 'styles', i);
const hide = (m: Json, i: number) => at(m, 'targets', 0, 'hide', i);
const setting = (m: Json, i: number) => at(m, 'settings', i);
const opts = (m: Json) => at(m, 'settings', 2, 'options') as unknown as Json[];
const tokens = (m: Json) => at(m, 'tokens', 'defaults');
const variant = (m: Json, i: number) => at(m, 'variants', i);
const preview = (m: Json, i: number) => at(m, 'previews', i);
const asset = (m: Json, i: number) => at(m, 'assets', i);
const routes = (a: Json) => at(a, 'routes');
const components = (a: Json) => at(a, 'components');
