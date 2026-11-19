/** Builds the `AppState` the popup and options pages render. */
import { resolveSettingValues } from '@reskin/compiler';
import { TOKEN_CONTRACT } from '@reskin/schema';
import type {
  AppState,
  PaletteSummary,
  SiteView,
  TemplateHealth,
  TemplateSummary,
} from '../shared/messages';
import { SITES } from '../shared/sites';
import { getCompiled, getHealth, getPrefs, getSettings, getSites } from '../shared/storage';
import { validUserSettings } from './compile-service';
import { type InstalledTemplate, type Registry, templatesFor } from './registry';
import { isGranted } from './sites';

function summarize({ manifest, origin }: InstalledTemplate): TemplateSummary {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    summary: manifest.summary,
    authors: manifest.authors.map((a) => a.handle),
    origin,
    adapters: manifest.targets.map((t) => t.adapter),
    settings: manifest.settings ?? [],
    variants: (manifest.variants ?? []).map((v) => ({ id: v.id, label: v.label })),
    usesPalettes: manifest.tokens?.consumes === TOKEN_CONTRACT,
  };
}

/** Last compile problem per adapter, for this service-worker lifetime. */
export const problems = new Map<string, string>();

export async function getAppState(reg: Registry): Promise<AppState> {
  const [prefs, stored] = await Promise.all([getPrefs(), getSites()]);
  const sites: SiteView[] = [];
  for (const site of SITES) {
    const state = stored[site.adapterId];
    const templates = templatesFor(reg, site.adapterId).map(summarize);
    const templateId = state?.templateId ?? null;
    const active = templateId ? reg.templates.get(templateId) : undefined;
    const settings = active
      ? resolveSettingValues(
          active.manifest.settings ?? [],
          active.manifest.variants?.find((v) => v.id === state?.variantId),
          validUserSettings(reg, active.manifest.id, await getSettings(active.manifest.id)),
        ).values
      : {};
    const adapter = reg.adapters.get(site.adapterId);
    const routes = adapter?.routes ?? {};
    sites.push({
      adapterId: site.adapterId,
      name: site.name,
      origins: [...site.origins],
      routes: Object.fromEntries(
        Object.entries(routes).map(([id, r]) => [
          id,
          Array.isArray(r.path) ? [...r.path] : [r.path],
        ]),
      ),
      sensitiveRoutes: Object.entries(routes)
        .filter(([, r]) => r.sensitive)
        .map(([id]) => id),
      granted: await isGranted(site),
      enabled: state?.enabled ?? false,
      templateId,
      variantId: state?.variantId ?? null,
      paletteId: state?.paletteId && reg.palettes.has(state.paletteId) ? state.paletteId : null,
      templates,
      settings,
      problem: problems.get(site.adapterId) ?? null,
      health: state?.enabled && templateId ? await templateHealth(site.adapterId) : null,
      adapterVersion: adapter?.version ?? null,
    });
  }
  const palettes: PaletteSummary[] = [...reg.palettes.values()].map((p) => ({
    id: p.id,
    name: p.name,
    swatches: (['color.bg', 'color.surface', 'color.text', 'color.accent'] as const).flatMap(
      (t) => {
        const value = p.tokens[t];
        return typeof value === 'string' ? [value] : [];
      },
    ),
  }));
  const library = [...reg.templates.values()]
    .map(summarize)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { prefs, sites, palettes, library };
}

/**
 * The active template's status from this device's probe results: only parts the
 * template uses and the adapter probes count (extension-architecture §7).
 */
export async function templateHealth(adapterId: string): Promise<TemplateHealth> {
  const [compiled, health] = await Promise.all([getCompiled(adapterId), getHealth(adapterId)]);
  if (!compiled || !health || health.adapterVersion !== compiled.adapterVersion)
    return { status: 'unknown', failed: [], themeFailed: false };
  const used = new Set(compiled.components);
  const probed = [...new Set(compiled.probes.map((p) => p.component))].filter((c) => used.has(c));
  const failed = probed.filter((c) => health.probes[c]?.status === 'failed').sort();
  const checked = probed.filter((c) => health.probes[c] !== undefined);
  const themeFailed = compiled.themeVars.length > 0 && health.theme?.status === 'failed';
  const status =
    failed.length > 0 || themeFailed ? 'broken' : checked.length > 0 ? 'working' : 'unknown';
  return { status, failed, themeFailed };
}
