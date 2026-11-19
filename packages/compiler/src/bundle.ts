/**
 * Loads a template bundle (template.json + styles + assets) from any file source:
 * a directory (CLI), or a `.zip` unpacked by the extension (T-3.4). Pure: the caller
 * supplies the file reads. Validates the manifest and that every referenced file
 * exists; CSS is sanitized later, by `compileTemplate` or `sanitizeCss`.
 */
import {
  CODES,
  type Diagnostic,
  diag,
  type TemplateContext,
  type TemplateManifest,
  validateTemplate,
} from '@reskin/schema';

/** Asset and preview file types (template-schema §7). */
export const BUNDLE_MIME: Readonly<Record<string, string>> = {
  woff2: 'font/woff2',
  webp: 'image/webp',
  png: 'image/png',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export const mimeFor = (file: string): string =>
  BUNDLE_MIME[file.slice(file.lastIndexOf('.') + 1).toLowerCase()] ?? 'application/octet-stream';

export interface BundleReader {
  has(path: string): boolean;
  /** UTF-8 contents. Only called for paths where `has` is true. */
  text(path: string): string;
  /** Base64 contents. Only called for paths where `has` is true. */
  base64(path: string): string;
}

export interface LoadedBundle {
  /** The manifest as authored (stored as-is and re-validated on load). */
  raw?: unknown;
  manifest?: TemplateManifest;
  /** Style file path → authoring-dialect CSS. */
  sources: Record<string, string>;
  /** Asset id → `data:` URI. */
  assets: Record<string, string>;
  diagnostics: Diagnostic[];
}

export function loadBundle(files: BundleReader, ctx: TemplateContext = {}): LoadedBundle {
  const d: Diagnostic[] = [];
  const sources: Record<string, string> = {};
  const assets: Record<string, string> = {};
  if (!files.has('template.json')) {
    d.push(diag(CODES.FILE_MISSING, 'error', 'template.json not found', { file: 'template.json' }));
    return { sources, assets, diagnostics: d };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(files.text('template.json'));
  } catch {
    d.push(
      diag(CODES.FILE_NOT_JSON, 'error', 'template.json is not valid JSON', {
        file: 'template.json',
      }),
    );
    return { sources, assets, diagnostics: d };
  }
  const v = validateTemplate(raw, ctx);
  d.push(...v.diagnostics.map((x) => ({ ...x, file: 'template.json' })));
  const manifest = v.value;
  if (!manifest) return { raw, sources, assets, diagnostics: d };

  const need = (file: string, path: string) => {
    if (files.has(file)) return true;
    d.push(diag(CODES.FILE_MISSING, 'error', `${file} not found`, { file: 'template.json', path }));
    return false;
  };
  manifest.targets.forEach((t, ti) => {
    t.styles.forEach((s, si) => {
      if (!(s.file in sources) && need(s.file, `targets.${ti}.styles.${si}.file`))
        sources[s.file] = files.text(s.file);
    });
  });
  (manifest.assets ?? []).forEach((a, i) => {
    if (need(a.file, `assets.${i}.file`))
      assets[a.id] = `data:${mimeFor(a.file)};base64,${files.base64(a.file)}`;
  });
  manifest.previews.forEach((p, i) => {
    need(p.file, `previews.${i}.file`);
  });
  return { raw, manifest, sources, assets, diagnostics: d };
}
