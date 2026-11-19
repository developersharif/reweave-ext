/**
 * "Looks broken?" (T-3.3): a prefilled GitHub issue the user reviews and submits
 * themselves. It carries ids and versions only: never the page URL, title or content
 * (D-017, user-flows §3).
 */
import { BRAND } from '@reskin/brand';
import type { SiteView, TemplateSummary } from '../shared/messages';

/** "Chrome 159" / "Firefox 140" from a user agent string; nothing else from it. */
export function browserName(userAgent: string): string {
  const firefox = /Firefox\/(\d+)/.exec(userAgent);
  if (firefox) return `Firefox ${firefox[1]}`;
  const edge = /Edg\/(\d+)/.exec(userAgent);
  if (edge) return `Edge ${edge[1]}`;
  const chrome = /Chrome\/(\d+)/.exec(userAgent);
  return chrome ? `Chrome ${chrome[1]}` : 'unknown browser';
}

export function issueUrl(
  site: SiteView,
  template: TemplateSummary,
  env: { extensionVersion: string; userAgent: string },
): string {
  const health = site.health;
  const lines = [
    '**What looks wrong?**',
    '',
    '<!-- Describe what you see. Please do not paste links to videos, channels or accounts. -->',
    '',
    '---',
    `- Template: \`${template.id}\` ${template.version}`,
    `- Site adapter: \`${site.adapterId}\` ${site.adapterVersion ?? 'unknown'}`,
    `- Parts not found: ${health?.failed.length ? health.failed.map((c) => `\`${c}\``).join(', ') : 'none detected'}`,
    ...(health?.themeFailed
      ? ['- Colours: the site no longer has the colour variables we use']
      : []),
    `- Extension: ${env.extensionVersion}`,
    `- Browser: ${browserName(env.userAgent)}`,
  ];
  const params = new URLSearchParams({
    title: `[${site.name}] ${template.name} looks broken`,
    body: lines.join('\n'),
  });
  return `${BRAND.issuesUrl}/new?${params.toString()}`;
}
