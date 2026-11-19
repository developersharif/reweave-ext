/** Fixture loading for compiler tests (Node-only; never imported by src/). */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type Adapter,
  type TemplateManifest,
  validateAdapter,
  validateTemplate,
} from '@reskin/schema';

export const FIXTURES = join(import.meta.dirname, '../../test-fixtures');
export const HERE = import.meta.dirname;

export const read = (...parts: string[]): string => readFileSync(join(...parts), 'utf8');
export const readJson = (...parts: string[]): unknown => JSON.parse(read(...parts));
export const list = (dir: string, ext: string): string[] =>
  readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .sort();

export function specAdapter(): Adapter {
  const r = validateAdapter(readJson(FIXTURES, 'adapters/youtube-spec.json'));
  if (!r.value) throw new Error('fixture adapter invalid');
  return r.value;
}

export function specManifest(): TemplateManifest {
  const r = validateTemplate(readJson(FIXTURES, 'spec-example/template.json'));
  if (!r.value) throw new Error('fixture manifest invalid');
  return r.value;
}

export function specSources(): Record<string, string> {
  const dir = join(FIXTURES, 'spec-example');
  return Object.fromEntries(
    list(join(dir, 'styles'), '.css').map((f) => [`styles/${f}`, read(dir, 'styles', f)]),
  );
}

/** A tiny valid base64 payload; content doesn't matter to the compiler. */
export const FAKE_ASSETS = { inter: 'data:font/woff2;base64,d09GMgABAAAAAA==' };

/** One-file manifest for testing a single stylesheet against the spec adapter. */
export function singleFileManifest(
  overrides: Partial<TemplateManifest['targets'][number]> = {},
): TemplateManifest {
  const m = specManifest();
  return {
    ...m,
    targets: [
      {
        adapter: 'youtube',
        adapterRange: '^2.0.0',
        styles: [{ file: 'styles/test.css' }],
        rawSelectors: true,
        ...overrides,
      },
    ],
  };
}
