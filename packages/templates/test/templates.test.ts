/** Bundled templates must validate and compile against the bundled adapters (T-2.8). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileTemplate, type TokenMap } from '@reskin/compiler';
import { main } from '@reskin/compiler/cli';
import {
  type Adapter,
  type SettingValues,
  type TemplateManifest,
  validateAdapter,
} from '@reskin/schema';
import { describe, expect, it } from 'vitest';
import { TEMPLATE_DIRS } from '../src/index.ts';

const ROOT = join(import.meta.dirname, '..');
const ADAPTER_FILE = join(ROOT, '../adapters/youtube/adapter.json');
const adapter = validateAdapter(JSON.parse(readFileSync(ADAPTER_FILE, 'utf8'))).value as Adapter;

const run = async (...argv: string[]) => {
  const out: string[] = [];
  const err: string[] = [];
  const code = await main(argv, { out: (l) => out.push(l), err: (l) => err.push(l), color: false });
  return { code, out: out.join('\n'), err: err.join('\n') };
};

describe.each(Object.entries(TEMPLATE_DIRS))('%s', (id, dir) => {
  const path = join(ROOT, dir);
  const manifest = JSON.parse(
    readFileSync(join(path, 'template.json'), 'utf8'),
  ) as TemplateManifest;
  const sources = Object.fromEntries(
    manifest.targets
      .flatMap((t) => t.styles)
      .map((s) => [s.file, readFileSync(join(path, s.file), 'utf8')]),
  );

  it('validates with no diagnostics', async () => {
    const r = await run('validate', path, '--adapter', ADAPTER_FILE, '--json');
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toMatchObject({ ok: true, diagnostics: [] });
  });

  it('compiles to the golden output', async () => {
    const r = compileTemplate({ manifest, sources, adapter });
    expect(r.diagnostics).toEqual([]);
    expect(r.output?.templateId).toBe(id);
    await expect(`${JSON.stringify(r.output, null, 2)}\n`).toMatchFileSnapshot(
      `__golden__/${dir}.default.json`,
    );
  });

  it('uses palettes and never paints site colours itself (D-033)', () => {
    expect(manifest.tokens?.consumes).toBe('standard/v1');
    for (const css of Object.values(sources)) {
      expect(css).not.toMatch(/(?:^|[\s;{])(?:background(?:-color)?|color|border-color)\s*:/m);
    }
  });

  it.each(manifest.variants ?? [])('variant $id compiles', (variant) => {
    const r = compileTemplate({ manifest, sources, adapter, variant: variant.id });
    expect(r.diagnostics).toEqual([]);
  });
});

const compile = (
  dir: string,
  input: { settings?: SettingValues; variant?: string; palette?: TokenMap } = {},
) => {
  const path = join(ROOT, dir);
  const manifest = JSON.parse(
    readFileSync(join(path, 'template.json'), 'utf8'),
  ) as TemplateManifest;
  const sources = Object.fromEntries(
    manifest.targets
      .flatMap((t) => t.styles)
      .map((s) => [s.file, readFileSync(join(path, s.file), 'utf8')]),
  );
  const r = compileTemplate({ manifest, sources, adapter, ...input });
  expect(r.diagnostics).toEqual([]);
  return {
    all: r.output?.groups.map((g) => g.css).join('\n') ?? '',
    route: (route: string) => r.output?.groups.find((g) => g.routes.join() === route)?.css ?? '',
  };
};

describe('focus-youtube', () => {
  it('applies settings', () => {
    const out = compile('focus-youtube', {
      settings: { hideShorts: false, hideHomeFeed: true, maxWidth: 1000 },
    });
    expect(out.all).toContain('--rk-s-max-width:1000px');
    expect(out.all).not.toContain('ytm-shorts-lockup-view-model-v2');
    expect(out.route('home')).toContain('display:none');
  });

  it('deep focus hides recommendations and comments and centres the column', () => {
    const out = compile('focus-youtube', { variant: 'deep-focus' });
    expect(out.route('watch')).toContain('ytd-watch-flexy #secondary{display:none!important}');
    expect(out.route('watch')).toContain(
      'margin-inline:auto!important;padding-inline:24px!important',
    );
  });

  it('follows the site colours unless a palette is chosen', () => {
    expect(compile('focus-youtube').all).toContain(
      '--rk-color-bg:var(--yt-sys-color-baseline--base-background',
    );
    const themed = compile('focus-youtube', { palette: { 'color.bg': '#2e3440' } }).all;
    expect(themed).toContain('--t3e41d7b17b187f69:var(--rk-color-bg)!important');
  });
});

describe('compact-youtube', () => {
  it('sets videos per row from the setting', () => {
    const out = compile('compact-youtube', { settings: { perRow: 7 } });
    expect(out.all).toContain('--rk-s-per-row:7');
    expect(out.all).toContain('--ytd-rich-grid-items-per-row:var(--rk-s-per-row)!important');
  });
});

describe('calm-youtube', () => {
  it('recolours the site with its own colours by default, and the Day variant swaps them', () => {
    const night = compile('calm-youtube').all;
    expect(night).toContain('--rk-color-bg:#1b1a1f');
    expect(night).toContain('--t3e41d7b17b187f69:var(--rk-color-bg)!important');
    expect(compile('calm-youtube', { variant: 'day' }).all).toContain('--rk-color-bg:#f6f1e9');
  });

  it('a palette wins over its colours', () => {
    expect(compile('calm-youtube', { palette: { 'color.bg': '#2e3440' } }).all).toContain(
      '--rk-color-bg:#2e3440',
    );
  });
});
