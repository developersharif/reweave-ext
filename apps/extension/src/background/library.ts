/**
 * The user's library (T-3.4): importing template bundles, uninstalling them, and
 * exporting or restoring everything as one JSON file. Every import is validated and
 * sanitized here, whatever already checked it (security-model §3, "sanitize twice").
 */
import { compileTemplate, loadBundle, sanitizeCss } from '@reskin/compiler';
import {
  CODES,
  type Diagnostic,
  diag,
  hasErrors,
  type Library,
  MAX_BUNDLE_BYTES,
  parseBundleFiles,
  parseLibrary,
} from '@reskin/schema';
import {
  getAllSettings,
  getInstalled,
  getPrefs,
  getSites,
  removeAllSettings,
  removeSettings,
  setInstalled,
  setPrefs,
  setSettings,
  setSites,
} from '../shared/storage';
import { Refusal } from './refusal';
import {
  currentRegistry,
  invalidateRegistry,
  type Registry,
  validateForExtension,
} from './registry';

const MAX_REPORTED = 20;

function refuseInvalid(message: string, diagnostics: Diagnostic[]): never {
  const errors = diagnostics.filter((d) => d.severity === 'error').slice(0, MAX_REPORTED);
  throw new Refusal('IMPORT_INVALID', message, errors);
}

const base64Bytes = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Installs (or updates) a template from the files of a `.zip`, base64-encoded. */
export async function importTemplate(
  reg: Registry,
  rawFiles: unknown,
): Promise<{ reg: Registry; templateId: string }> {
  const parsed = parseBundleFiles(rawFiles);
  if (!parsed.ok)
    refuseInvalid('The file is not a template bundle', [
      diag(
        CODES.MANIFEST_INVALID,
        'error',
        parsed.message,
        parsed.path ? { path: parsed.path } : {},
      ),
    ]);
  const files = parsed.value;
  let bytes: Map<string, Uint8Array>;
  try {
    bytes = new Map(Object.entries(files).map(([p, b64]) => [p, base64Bytes(b64)]));
  } catch {
    refuseInvalid('The file is not a template bundle', [
      diag(CODES.MANIFEST_INVALID, 'error', 'A file is not base64-encoded'),
    ]);
  }
  const total = [...bytes.values()].reduce((n, b) => n + b.length, 0);
  if (total > MAX_BUNDLE_BYTES)
    refuseInvalid('The template is too large', [
      diag(
        CODES.BUNDLE_TOO_LARGE,
        'error',
        `Bundle is ${total} bytes; the limit is ${MAX_BUNDLE_BYTES}`,
      ),
    ]);

  const decoder = new TextDecoder();
  const loaded = loadBundle({
    has: (p) => bytes.has(p),
    text: (p) => decoder.decode(bytes.get(p)),
    base64: (p) => files[p] ?? '',
  });
  const d: Diagnostic[] = loaded.diagnostics.filter((x) => x.code !== CODES.ADAPTER_REF_UNKNOWN);
  const checked =
    loaded.raw === undefined ? undefined : validateForExtension(loaded.raw, reg.adapters);
  if (checked) d.push(...checked.diagnostics.filter((x) => x.severity === 'error'));
  const manifest = checked?.value;
  if (!manifest || hasErrors(d)) refuseInvalid('The template has problems', d);

  const existing = reg.templates.get(manifest.id);
  if (existing?.origin === 'bundled')
    refuseInvalid('A bundled template has this id', [
      diag(CODES.TEMPLATE_ID_TAKEN, 'error', `${manifest.id} ships with the extension`),
    ]);
  // Compile every target we have an adapter for (this sanitizes its CSS); sanitize the rest.
  for (const t of manifest.targets) {
    const adapter = reg.adapters.get(t.adapter);
    if (adapter) {
      const r = compileTemplate({
        manifest,
        sources: loaded.sources,
        assets: loaded.assets,
        adapter,
      });
      d.push(...r.diagnostics.map((x) => ({ ...x, path: x.path ?? `targets.${t.adapter}` })));
    } else {
      for (const s of t.styles) {
        const source = loaded.sources[s.file];
        if (source !== undefined) d.push(...sanitizeCss(source, s.file).diagnostics);
      }
    }
  }
  if (hasErrors(d)) refuseInvalid('The template has problems', d);

  const installed = await getInstalled();
  installed[manifest.id] = {
    version: manifest.version,
    origin: 'imported',
    installedAt: Date.now(),
    bundle: { manifest: loaded.raw, sources: loaded.sources, assets: loaded.assets },
  };
  await setInstalled(installed);
  invalidateRegistry();
  return { reg: await currentRegistry(), templateId: manifest.id };
}

/**
 * Removes an imported template and its settings. Sites using it switch to "Original
 * site". Returns the new registry and the sites that changed.
 */
export async function uninstallTemplate(
  reg: Registry,
  templateId: string,
): Promise<{ reg: Registry; changed: string[] }> {
  const t = reg.templates.get(templateId);
  const installed = await getInstalled();
  if (t?.origin === 'bundled')
    throw new Refusal('TEMPLATE_BUNDLED', `${templateId} ships with the extension`);
  if (!(templateId in installed))
    throw new Refusal('UNKNOWN_TEMPLATE', `${templateId} is not installed`);
  delete installed[templateId];
  await setInstalled(installed);
  await removeSettings(templateId);
  const sites = await getSites();
  const changed: string[] = [];
  for (const [adapterId, s] of Object.entries(sites)) {
    if (s.templateId !== templateId) continue;
    const { variantId: _v, ...rest } = s;
    sites[adapterId] = { ...rest, templateId: null };
    changed.push(adapterId);
  }
  await setSites(sites);
  invalidateRegistry();
  return { reg: await currentRegistry(), changed };
}

/** Everything the user chose, in one file. No browsing data: no URLs, history or health. */
export async function exportLibrary(now: Date = new Date()): Promise<Library> {
  return {
    format: 'reskin-library',
    formatVersion: 1,
    exportedAt: now.toISOString(),
    prefs: await getPrefs(),
    sites: await getSites(),
    settings: await getAllSettings(),
    installed: await getInstalled(),
  };
}

/**
 * Replaces the library with an exported one. Site access is not part of the file:
 * sites whose permission isn't granted on this browser end up disabled by the
 * caller's registration sync.
 */
export async function importLibrary(raw: unknown): Promise<Registry> {
  const r = parseLibrary(raw);
  if (!r.ok)
    refuseInvalid('The file is not a library export', [
      diag(CODES.MANIFEST_INVALID, 'error', r.message, r.path ? { path: r.path } : {}),
    ]);
  const lib = r.value;
  await removeAllSettings();
  await setInstalled(lib.installed);
  await setPrefs(lib.prefs);
  await setSites(lib.sites);
  for (const [templateId, values] of Object.entries(lib.settings))
    await setSettings(templateId, values);
  invalidateRegistry();
  return currentRegistry();
}
