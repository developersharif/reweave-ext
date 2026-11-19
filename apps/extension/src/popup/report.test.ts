import { describe, expect, it } from 'vitest';
import type { SiteView, TemplateSummary } from '../shared/messages';
import { browserName, issueUrl } from './report';

describe('browserName', () => {
  it('keeps only the browser and major version', () => {
    expect(
      browserName(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/159.0.8154.6 Safari/537.36',
      ),
    ).toBe('Chrome 159');
    expect(
      browserName('Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0'),
    ).toBe('Firefox 140');
    expect(browserName('something else')).toBe('unknown browser');
  });
});

describe('issueUrl', () => {
  const site = {
    adapterId: 'youtube',
    name: 'YouTube',
    adapterVersion: '1.1.0',
    health: { status: 'broken', failed: ['comments', 'related-sidebar'], themeFailed: true },
  } as SiteView;
  const template = {
    id: 'reskin/focus-youtube',
    name: 'Focus YouTube',
    version: '1.0.0',
  } as TemplateSummary;

  it('prefills ids, versions and failed parts, and nothing from the page', () => {
    const url = new URL(
      issueUrl(site, template, { extensionVersion: '0.1.0', userAgent: 'Chrome/159.0.1' }),
    );
    expect(url.origin + url.pathname).toBe(
      'https://github.com/developersharif/reweave-ext/issues/new',
    );
    expect(url.searchParams.get('title')).toBe('[YouTube] Focus YouTube looks broken');
    const body = url.searchParams.get('body') ?? '';
    expect(body).toContain('`reskin/focus-youtube` 1.0.0');
    expect(body).toContain('`youtube` 1.1.0');
    expect(body).toContain('`comments`, `related-sidebar`');
    expect(body).toContain('Colours:');
    expect(body).toContain('Chrome 159');
    expect(body).not.toMatch(/https?:\/\/(?!github)/);
    expect([...url.searchParams.keys()]).toEqual(['title', 'body']);
  });
});
