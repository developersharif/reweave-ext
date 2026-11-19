import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type BundleReader, loadBundle, mimeFor } from '../src/index.ts';

const FOCUS = join(import.meta.dirname, '../../templates/focus-youtube');

/** An in-memory bundle: path → text (binary files as text too; fine for these checks). */
const reader = (files: Record<string, string>): BundleReader => ({
  has: (p) => p in files,
  text: (p) => files[p] ?? '',
  base64: (p) => Buffer.from(files[p] ?? '').toString('base64'),
});

const focusFiles = (): Record<string, string> => {
  const manifest = readFileSync(join(FOCUS, 'template.json'), 'utf8');
  const files: Record<string, string> = { 'template.json': manifest };
  const m = JSON.parse(manifest) as {
    targets: { styles: { file: string }[] }[];
    previews: { file: string }[];
  };
  for (const s of m.targets.flatMap((t) => t.styles))
    files[s.file] = readFileSync(join(FOCUS, s.file), 'utf8');
  for (const p of m.previews) files[p.file] = 'jpg';
  return files;
};

describe('loadBundle', () => {
  it('loads a complete bundle', () => {
    const r = loadBundle(reader(focusFiles()));
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.manifest?.id).toBe('reskin/focus-youtube');
    expect(Object.keys(r.sources).sort()).toEqual(['styles/base.css', 'styles/watch.css']);
    expect((r.raw as { id: string }).id).toBe('reskin/focus-youtube');
  });

  it('reports a missing manifest, bad JSON and missing files by code', () => {
    expect(loadBundle(reader({})).diagnostics.map((d) => d.code)).toEqual(['FILE_MISSING']);
    expect(loadBundle(reader({ 'template.json': '{' })).diagnostics.map((d) => d.code)).toEqual([
      'FILE_NOT_JSON',
    ]);
    const files = focusFiles();
    delete files['styles/watch.css'];
    delete files['previews/cover.jpg'];
    const missing = loadBundle(reader(files)).diagnostics.filter((d) => d.code === 'FILE_MISSING');
    expect(missing.map((d) => d.message).sort()).toEqual([
      'previews/cover.jpg not found',
      'styles/watch.css not found',
    ]);
  });

  it('maps asset types', () => {
    expect(mimeFor('assets/inter.woff2')).toBe('font/woff2');
    expect(mimeFor('a.SVG')).toBe('image/svg+xml');
    expect(mimeFor('a.exe')).toBe('application/octet-stream');
  });
});
