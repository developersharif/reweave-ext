/**
 * Supported sites: the one table that ties an adapter to its hosts and to the
 * optional host permission it needs (D-011). `wxt.config.ts` builds
 * `optional_host_permissions` from it, so adding a site here is an extension update.
 */
export interface SiteInfo {
  adapterId: string;
  /** Shown in the popup. */
  name: string;
  hosts: readonly string[];
  /** Match patterns for `optional_host_permissions` and content-script registration. */
  origins: readonly string[];
  /** Applied the first time the site is enabled (falls back to the first installed template). */
  defaultTemplateId?: string;
  /** Opened by the welcome page's "Try it". */
  homeUrl: string;
}

export const SITES: readonly SiteInfo[] = [
  {
    adapterId: 'youtube',
    name: 'YouTube',
    hosts: ['www.youtube.com'],
    origins: ['https://www.youtube.com/*'],
    defaultTemplateId: 'reskin/focus-youtube',
    homeUrl: 'https://www.youtube.com/',
  },
];

export const siteById = (adapterId: string): SiteInfo | undefined =>
  SITES.find((s) => s.adapterId === adapterId);

export const siteForHost = (host: string): SiteInfo | undefined =>
  SITES.find((s) => s.hosts.includes(host));

/** The site for a tab URL, or undefined (unknown URL, other site, or not an http(s) page). */
export function siteForUrl(url: string | undefined): SiteInfo | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? siteForHost(u.hostname) : undefined;
  } catch {
    return undefined;
  }
}

/** Id of the runtime-registered content script for a site. */
export const contentScriptId = (adapterId: string): string => `rk-site-${adapterId}`;

/** Built path of `entrypoints/content.ts` (WXT output layout). */
export const CONTENT_SCRIPT_FILE = 'content-scripts/content.js';
