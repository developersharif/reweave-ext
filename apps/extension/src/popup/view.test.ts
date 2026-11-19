import { describe, expect, it } from 'vitest';
import type { AppState, SiteView } from '../shared/messages';
import { popupView } from './view';

const youtube = (over: Partial<SiteView> = {}): SiteView => ({
  adapterId: 'youtube',
  name: 'YouTube',
  origins: ['https://www.youtube.com/*'],
  routes: { home: ['/'], watch: ['/watch'], account: ['/account*'] },
  sensitiveRoutes: ['account'],
  granted: true,
  enabled: true,
  templateId: 'reskin/focus-youtube',
  variantId: null,
  templates: [],
  settings: {},
  problem: null,
  ...over,
});
const state = (site: SiteView): AppState => ({ prefs: { paused: false }, sites: [site] });

describe('popupView', () => {
  it('shows the site when the tab is on a supported site', () => {
    expect(popupView(state(youtube()), 'https://www.youtube.com/watch?v=x')).toMatchObject({
      kind: 'site',
      host: 'www.youtube.com',
      sensitive: false,
    });
  });

  it('flags sensitive routes', () => {
    expect(popupView(state(youtube()), 'https://www.youtube.com/account_privacy')).toMatchObject({
      kind: 'site',
      sensitive: true,
    });
  });

  it('offers to enable sites when the URL is hidden and a site is not granted yet', () => {
    expect(popupView(state(youtube({ granted: false })), undefined)).toMatchObject({
      kind: 'enable',
    });
  });

  it('says unsupported when the URL is hidden but every site is granted, or the URL is another site', () => {
    expect(popupView(state(youtube()), undefined).kind).toBe('unsupported');
    expect(popupView(state(youtube()), 'https://example.com/').kind).toBe('unsupported');
    expect(popupView(state(youtube()), 'http://www.youtube.com/').kind).toBe('unsupported');
  });
});
