/** Golden-file tests (T-1.4, T-1.5, T-1.6) and compile-stage error codes. */
import { join } from 'node:path';
import {
  flattenTokenTree,
  type Palette,
  type TemplateManifest,
  validatePalette,
} from '@reskin/schema';
import { describe, expect, it } from 'vitest';
import { generate } from '../src/css/csstree.ts';
import { type CompileInput, compileTemplate, sanitizeCss } from '../src/index.ts';
import {
  FAKE_ASSETS,
  FIXTURES,
  HERE,
  list,
  read,
  readJson,
  singleFileManifest,
  specAdapter,
  specManifest,
  specSources,
} from './fixtures.ts';

const adapter = specAdapter();
const pretty = (css: string) => `${css.replaceAll('}', '}\n').trim()}\n`;

describe('dialect golden files', () => {
  const files = list(join(HERE, 'dialect'), '.css');
  const runs = {
    defaults: {},
    alt: { hideShorts: false, hideHomeFeed: true, density: 'compact', maxWidth: 1337 },
  };

  for (const file of files) {
    for (const [run, settings] of Object.entries(runs)) {
      it(`${file} (${run})`, async () => {
        const r = compileTemplate({
          manifest: singleFileManifest(),
          adapter,
          sources: { 'styles/test.css': read(HERE, 'dialect', file) },
          assets: FAKE_ASSETS,
          settings,
        });
        expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        // groups[0] starts with the generated :root rule, covered by the spec-example goldens.
        const css = (r.output?.groups ?? [])
          .map((g) => g.css.replace(/^:root\{[^}]*\}/, ''))
          .join('');
        await expect(pretty(css)).toMatchFileSnapshot(
          `dialect/__golden__/${file.replace('.css', '')}.${run}.css`,
        );
      });
    }
  }
});

describe('spec example golden output', () => {
  const dusk = flattenTokenTree(
    (validatePalette(readJson(FIXTURES, 'palettes/dusk.json')).value as Palette).tokens,
  ).tokens;
  const cases: Record<string, Partial<CompileInput>> = {
    default: {},
    'focus-compact': { variant: 'focus', settings: { density: 'compact', maxWidth: 1430 } },
    'palette-dusk': { palette: dusk },
    'light-variant': { variant: 'light' },
    'light-variant-with-overrides': {
      variant: 'light',
      palette: dusk,
      tokenOverrides: { 'color.accent': '#ff8800' },
    },
  };
  for (const [name, extra] of Object.entries(cases)) {
    it(name, async () => {
      const r = compileTemplate({
        manifest: specManifest(),
        adapter,
        sources: specSources(),
        assets: FAKE_ASSETS,
        ...extra,
      });
      expect(r.diagnostics).toEqual([]);
      const output = r.output;
      if (!output) throw new Error('no output');
      const readable = {
        ...output,
        groups: output.groups.map((g) => ({
          routes: g.routes,
          css: pretty(g.css).split('\n').filter(Boolean),
        })),
      };
      await expect(`${JSON.stringify(readable, null, 2)}\n`).toMatchFileSnapshot(
        `golden/spec-example.${name}.json`,
      );
    });
  }

  it('palette tokens apply only when the template consumes standard/v1', () => {
    const m = specManifest();
    const noPalette: TemplateManifest = { ...m, tokens: { defaults: m.tokens?.defaults ?? {} } };
    const r = compileTemplate({
      manifest: noPalette,
      adapter,
      sources: specSources(),
      assets: FAKE_ASSETS,
      palette: dusk,
    });
    expect(r.output?.groups[0]?.css).toContain('--rk-color-bg:#0f0f10');
  });

  it('user values are clamped and invalid ones fall back with a warning', () => {
    const r = compileTemplate({
      manifest: specManifest(),
      adapter,
      sources: specSources(),
      assets: FAKE_ASSETS,
      settings: { maxWidth: 99_999, density: 'huge' },
    });
    expect(r.output?.groups[0]?.css).toContain('--rk-s-max-width:1800px');
    expect(r.diagnostics).toEqual([
      expect.objectContaining({ code: 'SETTING_VALUE_INVALID', severity: 'warning' }),
    ]);
  });

  it('hash changes with settings and is stable otherwise', () => {
    const base = { manifest: specManifest(), adapter, sources: specSources(), assets: FAKE_ASSETS };
    const a = compileTemplate(base).output?.hash;
    expect(compileTemplate(base).output?.hash).toBe(a);
    expect(compileTemplate({ ...base, settings: { hideShorts: false } }).output?.hash).not.toBe(a);
  });
});

describe('compile errors', () => {
  const one = (
    css: string,
    target: Partial<TemplateManifest['targets'][number]> = {},
    extra: Partial<CompileInput> = {},
  ) =>
    compileTemplate({
      manifest: singleFileManifest(target),
      adapter,
      sources: { 'styles/test.css': css },
      assets: FAKE_ASSETS,
      ...extra,
    });
  const codes = (r: ReturnType<typeof one>) =>
    r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

  it.each([
    ['unknown component', ':--reels { color: red }', 'DIALECT_UNKNOWN_COMPONENT'],
    ['unknown token', ':--masthead { color: token(color-sparkle) }', 'DIALECT_UNKNOWN_TOKEN'],
    ['dotted token', ':--masthead { color: token(color.bg) }', 'DIALECT_BAD_ARGUMENT'],
    ['token with two args', ':--masthead { color: token(color-bg, red) }', 'DIALECT_BAD_ARGUMENT'],
    [
      'setting() on a boolean',
      ':--masthead { width: setting(hideShorts) }',
      'DIALECT_SETTING_TYPE',
    ],
    ['setting() unknown', ':--masthead { width: setting(nope) }', 'DIALECT_UNKNOWN_SETTING'],
    ['@setting unknown', '@setting nope { :--masthead { color: red } }', 'DIALECT_UNKNOWN_SETTING'],
    [
      '@setting select without value',
      '@setting density { :--masthead { color: red } }',
      'DIALECT_SETTING_TYPE',
    ],
    [
      '@setting boolean with value',
      '@setting hideShorts = yes { :--masthead { color: red } }',
      'DIALECT_SETTING_TYPE',
    ],
    [
      '@setting value not an option',
      '@setting density = roomy { :--masthead { color: red } }',
      'DIALECT_SETTING_PRELUDE',
    ],
    [
      '@setting garbage prelude',
      '@setting a b c { :--masthead { color: red } }',
      'DIALECT_SETTING_PRELUDE',
    ],
    ['@setting without block', '@setting hideShorts;', 'DIALECT_SETTING_PRELUDE'],
    [
      'errors inside inactive @setting blocks still count',
      '@setting !hideShorts { :--reels { color: red } }',
      'DIALECT_UNKNOWN_COMPONENT',
    ],
    ['unknown asset', ':--masthead { background: asset(noise) }', 'DIALECT_UNKNOWN_ASSET'],
    [
      'component in @scope prelude',
      '@scope (:--masthead) { a { color: red } }',
      'DIALECT_BAD_ARGUMENT',
    ],
    ['nested CSS', ':--masthead { color: red; .x { color: blue } }', 'CSS_PARSE_ERROR'],
  ])('%s → %s', (_name, css, code) => {
    expect(codes(one(css))).toContain(code);
  });

  it('rejects asset data that is not a base64 data URI', () => {
    const r = one(
      ':--masthead { background: asset(inter) }',
      {},
      { assets: { inter: 'https://evil.test/font.woff2' } },
    );
    expect(codes(r)).toContain('ASSET_DATA_INVALID');
  });

  it('requires rawSelectors: true for raw selectors, and warns when it is unnecessary', () => {
    expect(codes(one('.title { color: red }', { rawSelectors: false }))).toContain(
      'RAW_SELECTORS_UNDECLARED',
    );
    expect(
      codes(one(':--video-card .title { color: red }', { rawSelectors: undefined })),
    ).toContain('RAW_SELECTORS_UNDECLARED');
    const r = one(':--masthead { color: red }', { rawSelectors: true });
    expect(r.ok).toBe(true);
    expect(r.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'RAW_SELECTORS_UNDECLARED', severity: 'warning' }),
    );
  });

  it.each<[string, Partial<TemplateManifest['targets'][number]>, string]>([
    [
      'sensitive route on a style',
      { styles: [{ file: 'styles/test.css', routes: ['account'] }] },
      'ROUTE_SENSITIVE',
    ],
    ['sensitive route on the target', { routes: ['home', 'account'] }, 'ROUTE_SENSITIVE'],
    [
      'style route outside target routes',
      { routes: ['home'], styles: [{ file: 'styles/test.css', routes: ['watch'] }] },
      'ROUTE_NOT_IN_TARGET',
    ],
    ['missing style file', { styles: [{ file: 'styles/missing.css' }] }, 'STYLE_FILE_MISSING'],
    [
      'unsafe media',
      { styles: [{ file: 'styles/test.css', media: 'screen) { } * { display: none' }] },
      'CSS_MEDIA_INVALID',
    ],
    [
      'hide protected component',
      { hide: [{ component: 'consent-dialog' }] },
      'PROTECTED_COMPONENT_HIDDEN',
    ],
    ['adapter outside range', { adapterRange: '^3.0.0' }, 'ADAPTER_RANGE_UNSATISFIED'],
  ])('%s → %s', (_name, target, code) => {
    expect(codes(one(':--masthead { color: red }', target))).toContain(code);
  });

  it('wraps media-scoped files and groups route-scoped files', () => {
    const r = one(':--masthead { color: red }', {
      styles: [
        { file: 'styles/test.css', media: '(prefers-color-scheme: dark)' },
        { file: 'styles/test.css', routes: ['watch', 'home'] },
      ],
    });
    expect(r.output?.groups.map((g) => g.routes)).toEqual([
      ['channel', 'home', 'search', 'shorts', 'watch'],
      ['home', 'watch'],
    ]);
    expect(r.output?.groups[0]?.css).toContain(
      '@media (prefers-color-scheme: dark){:is(ytd-masthead){color:red}}',
    );
    expect(r.output?.sensitiveRoutes).toEqual(['account']);
  });

  it('rejects a target for another adapter and an unsupported engine', () => {
    const m = singleFileManifest();
    expect(
      codes(compileTemplate({ manifest: m, adapter: { ...adapter, id: 'reddit' }, sources: {} })),
    ).toEqual(['ADAPTER_MISMATCH']);
    const future: TemplateManifest = { ...m, requires: { engine: '>=2.0.0' } };
    expect(
      codes(compileTemplate({ manifest: future, adapter, sources: { 'styles/test.css': '' } })),
    ).toContain('ENGINE_UNSUPPORTED');
  });

  it('enforces size and selector limits across files', () => {
    const big = `${':--masthead{color:red}'.repeat(12_000)}`;
    expect(codes(one(big))).toContain('CSS_SIZE_LIMIT');
    const many = Array.from({ length: 5001 }, (_, i) => `.c${i}`).join(',');
    expect(codes(one(`${many}{color:red}`))).toContain('CSS_TOO_MANY_SELECTORS');
  });
});

describe('performance', () => {
  it('compiles 256 KB of CSS in under 100 ms (warm median)', () => {
    const rule = (i: number) =>
      `:--video-card .c${i}:hover > .t${i}{color:token(color-text);background:linear-gradient(90deg,red,blue);margin:${i % 9}px}\n`;
    let css = '';
    for (let i = 0; css.length < 255 * 1024; i++) css += rule(i);
    const input = {
      manifest: singleFileManifest(),
      adapter,
      sources: { 'styles/test.css': css },
      assets: FAKE_ASSETS,
    };
    for (let i = 0; i < 3; i++) compileTemplate(input); // warm-up (JIT)
    const times: number[] = [];
    let ok = true;
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      ok &&= compileTemplate(input).ok;
      times.push(performance.now() - start);
    }
    const ms = times.sort((a, b) => a - b)[2] ?? Number.POSITIVE_INFINITY; // median of 5
    console.info(
      `compile 256 KB: median ${ms.toFixed(1)} ms of [${times.map((t) => t.toFixed(0)).join(', ')}]`,
    );
    expect(ok).toBe(true);
    expect(ms).toBeLessThan(process.env.CI ? 250 : 100);
  });
});

describe('dialect round-trip (T-1.2)', () => {
  // parse → generate → parse → generate is stable, and the dialect survives untouched before resolution.
  it.each(list(join(HERE, 'dialect'), '.css'))('%s', (file) => {
    const first = sanitizeCss(read(HERE, 'dialect', file), file);
    expect(first.diagnostics).toEqual([]);
    const once = generate(first.ast);
    const second = sanitizeCss(once, file);
    expect(second.diagnostics).toEqual([]);
    expect(generate(second.ast)).toBe(once);
    expect(once).toMatch(/:--|token\(|setting\(|@setting|asset\(|@keyframes/);
  });
});
