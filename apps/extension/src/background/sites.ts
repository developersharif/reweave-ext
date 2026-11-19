/**
 * Keeps runtime content-script registrations in line with what the user allowed:
 * a site's script is registered only while its host permission is granted AND the
 * site is enabled. Registration persists across browser restarts, but we re-sync on
 * install, update and startup because the docs don't promise it survives updates
 * (technical-research §3).
 */
import { browser } from 'wxt/browser';
import { CONTENT_SCRIPT_FILE, contentScriptId, SITES, type SiteInfo } from '../shared/sites';
import { getSites, setSites } from '../shared/storage';

export const isGranted = (site: SiteInfo): Promise<boolean> =>
  browser.permissions.contains({ origins: [...site.origins] });

/** Returns the adapter ids whose site was disabled because its permission is gone. */
export async function syncRegistrations(): Promise<string[]> {
  const sites = await getSites();
  const registered = new Set(
    (await browser.scripting.getRegisteredContentScripts()).map((s) => s.id),
  );
  const revoked: string[] = [];

  for (const site of SITES) {
    const id = contentScriptId(site.adapterId);
    const granted = await isGranted(site);
    const state = sites[site.adapterId];
    if (!granted && state?.enabled) {
      sites[site.adapterId] = { ...state, enabled: false };
      revoked.push(site.adapterId);
    }
    const want = granted && sites[site.adapterId]?.enabled === true;
    if (want && !registered.has(id)) {
      await browser.scripting.registerContentScripts([
        {
          id,
          matches: [...site.origins],
          js: [CONTENT_SCRIPT_FILE],
          runAt: 'document_start',
          allFrames: false,
          persistAcrossSessions: true,
        },
      ]);
    } else if (!want && registered.has(id)) {
      await browser.scripting.unregisterContentScripts({ ids: [id] });
    }
  }
  if (revoked.length) await setSites(sites);
  return revoked;
}
