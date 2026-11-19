/** Bundled templates must validate and compile against the bundled adapters (T-2.8). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileTemplate } from '@reskin/compiler';
import { main } from '@reskin/compiler/cli';
import { type Adapter, type TemplateManifest, validateAdapter } from '@reskin/schema';
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

  it('applies settings', () => {
    const r = compileTemplate({
      manifest,
      sources,
      adapter,
      settings: { hideShorts: false, hideHomeFeed: true, maxWidth: 1000 },
    });
    const css = r.output?.groups.map((g) => g.css).join('\n') ?? '';
    expect(css).toContain('--rk-s-max-width:1000px');
    expect(css).not.toContain('ytm-shorts-lockup-view-model-v2');
    expect(r.output?.groups.find((g) => g.routes.join() === 'home')?.css).toContain('display:none');
  });
});
