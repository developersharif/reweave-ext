/**
 * What the popup shows for the active tab (user-flows.md §3, §4). Without the `tabs`
 * permission the browser only reveals a tab's URL on sites we hold a host permission
 * for, so an unknown URL means "some site we don't have access to": we list the
 * supported sites that still need enabling, or say the site isn't supported once
 * every supported site is granted.
 */
import { matchRoute } from '@reskin/schema/routes';
import type { AppState, SiteView } from '../shared/messages';
import { siteForUrl } from '../shared/sites';

export type PopupView =
  | { kind: 'site'; site: SiteView; host: string; sensitive: boolean }
  | { kind: 'enable'; sites: SiteView[] }
  | { kind: 'unsupported'; sites: SiteView[] };

export function popupView(state: AppState, tabUrl: string | undefined): PopupView {
  const info = siteForUrl(tabUrl);
  const site = info && state.sites.find((s) => s.adapterId === info.adapterId);
  if (site && tabUrl) {
    const url = new URL(tabUrl);
    const sensitive = matchRoute(site.routes, site.sensitiveRoutes, url.pathname).sensitive;
    return { kind: 'site', site, host: url.hostname, sensitive };
  }
  if (tabUrl === undefined) {
    const notGranted = state.sites.filter((s) => !s.granted);
    if (notGranted.length > 0) return { kind: 'enable', sites: notGranted };
  }
  return { kind: 'unsupported', sites: state.sites };
}

/** Display text for a setting value with its unit (range settings). */
export const formatRange = (value: number, unit?: string): string => `${value}${unit ?? ''}`;
