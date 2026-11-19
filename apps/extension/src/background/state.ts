/** Builds the `AppState` the popup and options pages render. */
import { resolveSettingValues } from '@reskin/compiler';
import type { AppState, SiteView, TemplateSummary } from '../shared/messages';
import { SITES } from '../shared/sites';
import { getPrefs, getSettings, getSites } from '../shared/storage';
import { validUserSettings } from './compile-service';
import { type Registry, templatesFor } from './registry';
import { isGranted } from './sites';

/** Last compile problem per adapter, for this service-worker lifetime. */
export const problems = new Map<string, string>();

export async function getAppState(reg: Registry): Promise<AppState> {
  const [prefs, stored] = await Promise.all([getPrefs(), getSites()]);
  const sites: SiteView[] = [];
  for (const site of SITES) {
    const state = stored[site.adapterId];
    const templates: TemplateSummary[] = templatesFor(reg, site.adapterId).map(({ manifest }) => ({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      summary: manifest.summary,
      settings: manifest.settings ?? [],
      variants: (manifest.variants ?? []).map((v) => ({ id: v.id, label: v.label })),
    }));
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
      templates,
      settings,
      problem: problems.get(site.adapterId) ?? null,
    });
  }
  return { prefs, sites };
}
