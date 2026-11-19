import { appendFileSync, cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { main } from '../cli/main.ts';
import { FIXTURES } from './fixtures.ts';

const example = join(FIXTURES, 'spec-example');
const adapter = join(FIXTURES, 'adapters/youtube-spec.json');
const run = async (...argv: string[]) => {
  const out: string[] = [];
  const err: string[] = [];
  const code = await main(argv, { out: (l) => out.push(l), err: (l) => err.push(l), color: false });
  return { code, out: out.join('\n'), err: err.join('\n') };
};
const tmp = mkdtempSync(join(tmpdir(), 'reskin-cli-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('reskin CLI', () => {
  it('validates the spec example directory', async () => {
    const r = await run('validate', example, '--adapter', adapter);
    expect(r.code).toBe(0);
    expect(r.err).toContain('demo/minimal-youtube@1.2.0 is valid');
  });

  it('reports sanitizer and dialect errors with file:line, exit 1', async () => {
    const dir = join(tmp, 'bad');
    cpSync(example, dir, { recursive: true });
    appendFileSync(
      join(dir, 'styles/home.css'),
      '\n:--reels { background: url(https://evil.test/x) }\n',
    );
    const r = await run('validate', dir, '--adapter', adapter, '--json');
    expect(r.code).toBe(1);
    const json = JSON.parse(r.out) as {
      ok: boolean;
      diagnostics: { code: string; file?: string; line?: number }[];
    };
    expect(json.ok).toBe(false);
    expect(json.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'CSS_URL_FORBIDDEN', file: 'styles/home.css', line: 9 }),
    );
    expect(json.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'DIALECT_UNKNOWN_COMPONENT', file: 'styles/home.css' }),
    );
  });

  it('reports missing files', async () => {
    const dir = join(tmp, 'missing');
    cpSync(example, dir, { recursive: true });
    rmSync(join(dir, 'previews/cover.webp'));
    const r = await run('validate', dir, '--json');
    expect(JSON.parse(r.out).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FILE_MISSING', path: 'previews.0.file' }),
    );
  });

  it('compiles with settings and prints the output', async () => {
    const r = await run(
      'compile',
      example,
      '--adapter',
      adapter,
      '--set',
      'maxWidth=1000',
      '--set',
      'hideShorts=false',
      '--json',
    );
    expect(r.code).toBe(0);
    const json = JSON.parse(r.out) as { outputs: { groups: { css: string }[] }[] };
    const css = json.outputs[0]?.groups[0]?.css ?? '';
    expect(css).toContain('--rk-s-max-width:1000px');
    expect(css).not.toContain('ytd-reel-shelf-renderer{display:none');
  });

  it('prints usage on bad arguments', async () => {
    expect((await run('frobnicate', example)).code).toBe(2);
    expect((await run('compile', example)).code).toBe(2);
  });
});
