/**
 * Installed adapters and templates. M2 has only the bundled ones; imported and
 * catalog templates join in M3/M7. Everything is validated here before use, bundled
 * or not: schema checks, adapter selector checks, and (at compile time) the CSS
 * sanitizer, so the extension never trusts a template it did not check itself
 * (security-model §3, "sanitize twice").
 */
import { BUNDLED_ADAPTERS } from '@reskin/adapters';
import { parseAdapter } from '@reskin/compiler';
import {
  type Adapter,
  type Diagnostic,
  hasErrors,
  type TemplateManifest,
  validateAdapter,
  validateTemplate,
} from '@reskin/schema';
import { BUNDLED_TEMPLATES } from '@reskin/templates';

export interface InstalledTemplate {
  manifest: TemplateManifest;
  sources: Readonly<Record<string, string>>;
  assets: Readonly<Record<string, string>>;
  origin: 'bundled';
}

export interface Registry {
  adapters: ReadonlyMap<string, Adapter>;
  templates: ReadonlyMap<string, InstalledTemplate>;
  /** Problems found while loading; logged, never fatal. */
  problems: { id: string; diagnostics: Diagnostic[] }[];
}

export function loadRegistry(
  rawAdapters: Readonly<Record<string, unknown>> = BUNDLED_ADAPTERS,
  rawTemplates: typeof BUNDLED_TEMPLATES = BUNDLED_TEMPLATES,
): Registry {
  const adapters = new Map<string, Adapter>();
  const templates = new Map<string, InstalledTemplate>();
  const problems: Registry['problems'] = [];

  for (const [id, raw] of Object.entries(rawAdapters)) {
    const r = validateAdapter(raw);
    const diagnostics = [...r.diagnostics, ...(r.value ? parseAdapter(r.value).diagnostics : [])];
    if (r.value && !hasErrors(diagnostics) && r.value.id === id) adapters.set(id, r.value);
    else problems.push({ id: `adapter:${id}`, diagnostics });
  }

  const adapterRecord = Object.fromEntries(adapters);
  for (const [id, t] of Object.entries(rawTemplates)) {
    const r = validateTemplate(t.manifest, { adapters: adapterRecord });
    if (r.value && !hasErrors(r.diagnostics) && r.value.id === id) {
      templates.set(id, {
        manifest: r.value,
        sources: t.sources,
        assets: t.assets,
        origin: 'bundled',
      });
    } else problems.push({ id: `template:${id}`, diagnostics: r.diagnostics });
  }
  return { adapters, templates, problems };
}

let cached: Registry | undefined;
/** The registry for this service-worker lifetime (bundled content never changes at runtime). */
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
