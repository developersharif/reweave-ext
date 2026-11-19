/**
 * Attack fixtures (T-1.3a) and the benign corpus. Each attack file starts with
 * `/* expect: CODE` or `/* expect: CODE (review)`; the compiler must report that code.
 */
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileTemplate } from '../src/index.ts';
import {
  FAKE_ASSETS,
  HERE,
  list,
  read,
  singleFileManifest,
  specAdapter,
  specManifest,
  specSources,
} from './fixtures.ts';

const adapter = specAdapter();
const compileOne = (css: string) =>
  compileTemplate({
    manifest: singleFileManifest(),
    adapter,
    sources: { 'styles/test.css': css },
    assets: FAKE_ASSETS,
  });

const attacks = list(join(HERE, 'attacks'), '.css').map((file) => {
  const css = read(HERE, 'attacks', file);
  const m = /^\/\* expect: ([A-Z_]+)(?: \((review|warning)\))?/.exec(css);
  if (!m?.[1]) throw new Error(`${file}: missing "/* expect: CODE" header`);
  return { file, css, code: m[1], severity: m[2] ?? 'error' };
});

describe('attack fixtures', () => {
  it('covers at least 15 attacks', () => expect(attacks.length).toBeGreaterThanOrEqual(15));

  it.each(attacks)('$file → $code', ({ css, code, severity }) => {
    const r = compileOne(css);
    expect(r.diagnostics).toContainEqual(expect.objectContaining({ code, severity }));
    // Review flags route to a human; they don't block compiling. Everything else must.
    if (severity === 'error') expect(r.ok).toBe(false);
  });

  it('never emits a non-data url() even when an attack compiles (review cases)', () => {
    for (const { css } of attacks) {
      const r = compileOne(css);
      for (const g of r.output?.groups ?? []) expect(g.css).not.toMatch(/url\((?!"?data:)/i);
    }
  });
});

describe('benign corpus', () => {
  it('kitchen-sink.css compiles with no diagnostics', () => {
    const r = compileOne(read(HERE, 'benign', 'kitchen-sink.css'));
    expect(r.diagnostics).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('the spec example compiles with no diagnostics', () => {
    const r = compileTemplate({
      manifest: specManifest(),
      adapter,
      sources: specSources(),
      assets: FAKE_ASSETS,
    });
    expect(r.diagnostics).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('strips @charset with a warning', () => {
    const r = compileOne('@charset "utf-8"; .a { margin: 0 }');
    expect(r.ok).toBe(true);
    expect(r.diagnostics.map((d) => d.code)).toEqual(['CSS_CHARSET_IGNORED']);
    expect(r.output?.groups[0]?.css).not.toContain('@charset');
  });
});
