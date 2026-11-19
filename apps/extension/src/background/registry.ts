/**
 * Installed adapters and templates: the bundled ones, plus templates the user
 * imported (`rk:installed`, T-3.4); catalog templates join in M7. Everything is
 * validated here before use, bundled or not: schema checks, adapter selector checks, and (at compile time) the CSS
 * sanitizer, so the extension never trusts a template it did not check itself
 * (security-model §3, "sanitize twice").
 */
import { BUNDLED_ADAPTERS } from '@reskin/adapters';
import { parseAdapter, type TokenMap } from '@reskin/compiler';
import { BUNDLED_PALETTES } from '@reskin/palettes';
import {
  type Adapter,
  CODES,
  type Diagnostic,
  diag,
  flattenTokenTree,
  hasErrors,
  type Installed,
  type TemplateManifest,
  type ValidationResult,
  validateAdapter,
  validatePalette,
  validateTemplate,
} from '@reskin/schema';
import { BUNDLED_TEMPLATES } from '@reskin/templates';
import { getInstalled } from '../shared/storage';

export interface InstalledTemplate {
  manifest: TemplateManifest;
  sources: Readonly<Record<string, string>>;
  assets: Readonly<Record<string, string>>;
  origin: 'bundled' | 'imported';
}

export interface InstalledPalette {
  id: string;
  name: string;
  tokens: TokenMap;
}

export interface Registry {
  adapters: ReadonlyMap<string, Adapter>;
  templates: ReadonlyMap<string, InstalledTemplate>;
  /** In picker order. */
  palettes: ReadonlyMap<string, InstalledPalette>;
  /** Problems found while loading; logged, never fatal. */
  problems: { id: string; diagnostics: Diagnostic[] }[];
}

export function loadRegistry(
  rawAdapters: Readonly<Record<string, unknown>> = BUNDLED_ADAPTERS,
  rawTemplates: typeof BUNDLED_TEMPLATES = BUNDLED_TEMPLATES,
  rawPalettes: readonly unknown[] = BUNDLED_PALETTES,
): Registry {
  const adapters = new Map<string, Adapter>();
  const templates = new Map<string, InstalledTemplate>();
  const palettes = new Map<string, InstalledPalette>();
  const problems: Registry['problems'] = [];

  for (const [id, raw] of Object.entries(rawAdapters)) {
    const r = validateAdapter(raw);
    const diagnostics = [...r.diagnostics, ...(r.value ? parseAdapter(r.value).diagnostics : [])];
    if (r.value && !hasErrors(diagnostics) && r.value.id === id) adapters.set(id, r.value);
    else problems.push({ id: `adapter:${id}`, diagnostics });
  }

  for (const [id, t] of Object.entries(rawTemplates)) {
    const r = validateForExtension(t.manifest, adapters);
    if (r.value && !hasErrors(r.diagnostics) && r.value.id === id) {
      templates.set(id, {
        manifest: r.value,
        sources: t.sources,
        assets: t.assets,
        origin: 'bundled',
      });
    } else problems.push({ id: `template:${id}`, diagnostics: r.diagnostics });
  }

  rawPalettes.forEach((raw, i) => {
    const r = validatePalette(raw);
    if (r.value && !hasErrors(r.diagnostics) && !palettes.has(r.value.id)) {
      // `modes` (light/dark variants) are not applied in v1; `tokens` is the palette.
      palettes.set(r.value.id, {
        id: r.value.id,
        name: r.value.name,
        tokens: flattenTokenTree(r.value.tokens).tokens,
      });
    } else problems.push({ id: `palette:${r.value?.id ?? i}`, diagnostics: r.diagnostics });
  });
  return { adapters, templates, palettes, problems };
}

/**
 * `validateTemplate` against the installed adapters, except that a target for a site
 * this version doesn't support is not an error: the template may support more sites
 * than we do, and that target is simply unused.
 */
export function validateForExtension(
  raw: unknown,
  adapters: ReadonlyMap<string, Adapter>,
): ValidationResult<TemplateManifest> {
  const r = validateTemplate(raw, { adapters: Object.fromEntries(adapters) });
  const diagnostics = r.diagnostics.map((d) =>
    d.code === CODES.ADAPTER_REF_UNKNOWN ? { ...d, severity: 'warning' as const } : d,
  );
  const m = r.value;
  if (m && !m.targets.some((t) => adapters.has(t.adapter)))
    diagnostics.push(
      diag(CODES.ADAPTER_REF_UNKNOWN, 'error', 'The template has no target for a supported site', {
        path: 'targets',
      }),
    );
  const ok = !hasErrors(diagnostics);
  return ok && m ? { ok, value: m, diagnostics } : { ok: false, diagnostics };
}

/** Adds the user's imported templates. A bundled template's id always wins. */
export function withInstalled(base: Registry, installed: Installed): Registry {
  const templates = new Map(base.templates);
  const problems = [...base.problems];
  for (const [id, entry] of Object.entries(installed)) {
    const r = validateForExtension(entry.bundle.manifest, base.adapters);
    if (base.templates.has(id)) {
      problems.push({
        id: `template:${id}`,
        diagnostics: [diag(CODES.TEMPLATE_ID_TAKEN, 'error', `${id} is a bundled template`)],
      });
    } else if (r.value && r.value.id === id) {
      templates.set(id, {
        manifest: r.value,
        sources: entry.bundle.sources,
        assets: entry.bundle.assets,
        origin: 'imported',
      });
    } else problems.push({ id: `template:${id}`, diagnostics: r.diagnostics });
  }
  return { ...base, templates, problems };
}

let current: Registry | undefined;
/** Bundled + imported templates. Cached until `invalidateRegistry()` (the background is the only writer). */
export async function currentRegistry(): Promise<Registry> {
  if (!current) {
    current = withInstalled(registry(), await getInstalled());
    for (const p of current.problems.slice(registry().problems.length))
      console.warn('[reskin] skipped', p.id, p.diagnostics);
  }
  return current;
}
export function invalidateRegistry(): void {
  current = undefined;
}

let cached: Registry | undefined;
/** The bundled registry for this service-worker lifetime (bundled content never changes at runtime). */
export function registry(): Registry {
  if (!cached) {
    cached = loadRegistry();
    for (const p of cached.problems) console.warn('[reskin] skipped', p.id, p.diagnostics);
  }
  return cached;
}

/** Installed templates with a target for this adapter, in a stable order. */
export function templatesFor(reg: Registry, adapterId: string): InstalledTemplate[] {
  return [...reg.templates.values()]
    .filter((t) => t.manifest.targets.some((target) => target.adapter === adapterId))
    .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
}
