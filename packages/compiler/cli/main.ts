/**
 * `reskin` CLI (T-1.7). Node-only; the extension never imports this file.
 *
 *   reskin validate <dir> [--adapter <adapter.json>]... [--json]
 *   reskin compile  <dir>  --adapter <adapter.json> [--variant <id>] [--set id=value]...
 *                          [--palette <palette.json>] [--json]
 */
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  type Adapter,
  CODES,
  type Diagnostic,
  diag,
  flattenTokenTree,
  hasErrors,
  type SettingValue,
  type TemplateManifest,
  validateAdapter,
  validatePalette,
  validateTemplate,
} from '@reskin/schema';
import {
  type CompiledTemplate,
  compileTemplate,
  sanitizeCss,
  type TokenMap,
} from '../src/index.ts';

const MIME: Record<string, string> = {
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

const USAGE = `Usage:
  reskin validate <dir> [--adapter <adapter.json>]... [--json]
  reskin compile  <dir> --adapter <adapter.json> [--variant <id>] [--set id=value]... [--palette <palette.json>] [--json]`;

export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
  color: boolean;
}

const defaultIo: Io = {
  out: (l) => process.stdout.write(`${l}\n`),
  err: (l) => process.stderr.write(`${l}\n`),
  color: process.stdout.isTTY === true && !process.env.NO_COLOR,
};

interface Loaded {
  manifest?: TemplateManifest;
  sources: Record<string, string>;
  assets: Record<string, string>;
  diagnostics: Diagnostic[];
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadAdapters(paths: readonly string[], d: Diagnostic[]): Adapter[] {
  return paths.flatMap((p) => {
    const r = validateAdapter(readJsonFile(p));
    d.push(...r.diagnostics.map((x) => ({ ...x, file: p })));
    return r.value && r.ok ? [r.value] : [];
  });
}

function loadTemplate(dir: string, adapters: readonly Adapter[]): Loaded {
  const d: Diagnostic[] = [];
  const manifestPath = join(dir, 'template.json');
  if (!existsSync(manifestPath)) {
    d.push(diag(CODES.FILE_MISSING, 'error', 'template.json not found', { file: 'template.json' }));
    return { sources: {}, assets: {}, diagnostics: d };
  }
  const ctx =
    adapters.length > 0 ? { adapters: Object.fromEntries(adapters.map((a) => [a.id, a])) } : {};
  const v = validateTemplate(readJsonFile(manifestPath), ctx);
  d.push(...v.diagnostics.map((x) => ({ ...x, file: 'template.json' })));
  const manifest = v.value;
  const sources: Record<string, string> = {};
  const assets: Record<string, string> = {};
  if (!manifest) return { sources, assets, diagnostics: d };

  const need = (file: string, path: string) => {
    if (existsSync(join(dir, file))) return true;
    d.push(diag(CODES.FILE_MISSING, 'error', `${file} not found`, { file: 'template.json', path }));
    return false;
  };
  manifest.targets.forEach((t, ti) => {
    t.styles.forEach((s, si) => {
      if (!(s.file in sources) && need(s.file, `targets.${ti}.styles.${si}.file`))
        sources[s.file] = readFileSync(join(dir, s.file), 'utf8');
    });
  });
  (manifest.assets ?? []).forEach((a, i) => {
    if (!need(a.file, `assets.${i}.file`)) return;
    const mime = MIME[extname(a.file)] ?? 'application/octet-stream';
    assets[a.id] = `data:${mime};base64,${readFileSync(join(dir, a.file)).toString('base64')}`;
  });
  manifest.previews.forEach((p, i) => {
    need(p.file, `previews.${i}.file`);
  });
  return { manifest, sources, assets, diagnostics: d };
}

function parseSetValue(raw: string): SettingValue {
  if (raw === 'true' || raw === 'false') return raw === 'true';
  const n = Number(raw);
  return raw.trim() !== '' && Number.isFinite(n) ? n : raw;
}

function format(d: Diagnostic, color: boolean): string {
  const paint = (code: number, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
  const sev =
    d.severity === 'error'
      ? paint(31, 'error')
      : d.severity === 'warning'
        ? paint(33, 'warn ')
        : paint(36, 'review');
  const where = [d.file, d.line !== undefined ? `${d.line}:${d.column ?? 1}` : undefined]
    .filter(Boolean)
    .join(':');
  const path = d.path ? ` (${d.path})` : '';
  return `${sev} ${paint(2, d.code)} ${where}${path}  ${d.message}`;
}

function report(diagnostics: readonly Diagnostic[], io: Io): void {
  for (const d of diagnostics) io.err(format(d, io.color));
  const count = (s: Diagnostic['severity']) => diagnostics.filter((d) => d.severity === s).length;
  io.err(
    `${count('error')} error(s), ${count('warning')} warning(s), ${count('review')} review flag(s)`,
  );
}

export async function main(argv: readonly string[], io: Io = defaultIo): Promise<number> {
  let parsed: ReturnType<typeof parseArgs<{ options: typeof options; allowPositionals: true }>>;
  const options = {
    adapter: { type: 'string', multiple: true },
    variant: { type: 'string' },
    set: { type: 'string', multiple: true },
    palette: { type: 'string' },
    json: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  } as const;
  try {
    parsed = parseArgs({ args: [...argv], options, allowPositionals: true });
  } catch (e) {
    io.err(`${(e as Error).message}\n${USAGE}`);
    return 2;
  }
  const { values, positionals } = parsed;
  const [command, dirArg] = positionals;
  if (values.help || !command || !dirArg || (command !== 'validate' && command !== 'compile')) {
    io.err(USAGE);
    return values.help ? 0 : 2;
  }

  const dir = resolve(dirArg);
  const d: Diagnostic[] = [];
  const adapters = loadAdapters(values.adapter ?? [], d);
  const loaded = loadTemplate(dir, adapters);
  d.push(...loaded.diagnostics);
  const { manifest } = loaded;

  let outputs: CompiledTemplate[] = [];
  if (manifest) {
    // Sanitize every style once, even for targets with no adapter given (catches CSS problems early).
    const adapterIds = new Set(adapters.map((a) => a.id));
    for (const t of manifest.targets) {
      if (adapterIds.has(t.adapter)) continue;
      for (const s of t.styles) {
        const source = loaded.sources[s.file];
        if (source !== undefined) d.push(...sanitizeCss(source, s.file).diagnostics);
      }
    }

    let palette: TokenMap | undefined;
    if (values.palette) {
      const p = validatePalette(readJsonFile(values.palette));
      d.push(...p.diagnostics.map((x) => ({ ...x, file: values.palette })));
      if (p.value) palette = flattenTokenTree(p.value.tokens).tokens;
    }
    const settings = Object.fromEntries(
      (values.set ?? []).map((kv) => {
        const i = kv.indexOf('=');
        return [kv.slice(0, i), parseSetValue(kv.slice(i + 1))];
      }),
    );

    if (command === 'compile' && adapters.length === 0) {
      io.err('compile needs --adapter <adapter.json>');
      return 2;
    }
    for (const adapter of adapters) {
      if (!manifest.targets.some((t) => t.adapter === adapter.id)) continue;
      const r = compileTemplate({
        manifest,
        adapter,
        sources: loaded.sources,
        assets: loaded.assets,
        ...(values.variant ? { variant: values.variant } : {}),
        settings,
        ...(palette ? { palette } : {}),
      });
      d.push(
        ...r.diagnostics.map((x) => (x.file || !x.path ? x : { ...x, file: 'template.json' })),
      );
      if (r.output) outputs.push(r.output);
    }

    const compiledAll = outputs.length === manifest.targets.length;
    if (compiledAll) {
      const used = new Set(outputs.flatMap((o) => o.assets));
      (manifest.assets ?? []).forEach((a, i) => {
        if (!used.has(a.id))
          d.push(
            diag(
              CODES.ASSET_UNUSED,
              'warning',
              `Asset "${a.id}" is never referenced with asset(${a.id})`,
              { file: 'template.json', path: `assets.${i}` },
            ),
          );
      });
    }
  }

  const failed = hasErrors(d);
  if (failed) outputs = [];
  if (values.json) {
    io.out(
      JSON.stringify(
        { ok: !failed, diagnostics: d, ...(command === 'compile' ? { outputs } : {}) },
        null,
        2,
      ),
    );
  } else {
    report(d, io);
    if (command === 'compile') for (const o of outputs) io.out(JSON.stringify(o, null, 2));
    else if (!failed)
      io.err(
        `✓ ${manifest?.id}@${manifest?.version} is valid${adapters.length ? '' : ' (CSS only: pass --adapter to check components)'}`,
      );
  }
  return failed ? 1 : 0;
}
