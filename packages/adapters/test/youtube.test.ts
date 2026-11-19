/**
 * YouTube adapter v1 against structure-only fixtures (T-2.3). Selectors are evaluated
 * by headless Chromium, the engine templates actually run in: happy-dom and jsdom
 * disagree with Chromium on `:not()` with complex selectors and on parsing these pages.
 * No network: every request from the fixture page is aborted.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Browser, chromium, type Page } from '@playwright/test';
import { parseAdapter } from '@reskin/compiler';
import { type Adapter, matchRoute, validateAdapter } from '@reskin/schema';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BUNDLED_ADAPTERS } from '../src/index.ts';

const FIXTURES = join(import.meta.dirname, '../../test-fixtures/youtube');
interface FixturePage {
  path: string;
  query?: string;
  route: string;
}
const manifest = JSON.parse(readFileSync(join(FIXTURES, 'pages.json'), 'utf8')) as {
  pages: Record<string, FixturePage>;
};
const PAGES = Object.entries(manifest.pages);
const html = (name: string) => readFileSync(join(FIXTURES, `${name}.html`), 'utf8');

const validated = validateAdapter(BUNDLED_ADAPTERS.youtube);
const adapter = validated.value as Adapter;
const components = Object.entries(adapter.components);
const routeTable = Object.fromEntries(
  Object.entries(adapter.routes).map(([id, r]) => [id, Array.isArray(r.path) ? r.path : [r.path]]),
);
const sensitive = Object.entries(adapter.routes)
  .filter(([, r]) => r.sensitive)
  .map(([id]) => id);

/** Fixture name → component id → number of matching elements. */
const counts = new Map<string, Record<string, number>>();
/** Fixture name → component ids whose matches nest inside another match of the same component. */
const nested = new Map<string, string[]>();
let browser: Browser;
let page: Page;

async function countAll(source: string) {
  await page.setContent(source);
  return page.evaluate(
    (list) => {
      const result: Record<string, number> = {};
      const nestedIds: string[] = [];
      for (const [id, selector] of list) {
        const matches = [...document.querySelectorAll(selector)];
        result[id] = matches.length;
        if (matches.some((el) => el.parentElement?.closest(selector))) nestedIds.push(id);
      }
      return { result, nestedIds };
    },
    components.map(([id, c]) => [id, c.selector] as [string, string]),
  );
}

beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.route('**/*', (r) => r.abort());
  for (const [name] of PAGES) {
    const { result, nestedIds } = await countAll(html(name));
    counts.set(name, result);
    nested.set(name, nestedIds);
  }
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

describe('youtube adapter v1', () => {
  it('passes schema and selector validation', () => {
    expect(validated.diagnostics).toEqual([]);
    expect(parseAdapter(adapter).diagnostics).toEqual([]);
  });

  it('maps every fixture URL to its route', () => {
    for (const [, p] of PAGES) {
      expect(matchRoute(routeTable, sensitive, p.path)).toEqual({
        route: p.route,
        sensitive: false,
      });
    }
    for (const path of ['/account', '/account_privacy', '/paid_memberships', '/premium']) {
      expect(matchRoute(routeTable, sensitive, path).sensitive).toBe(true);
    }
    expect(matchRoute(routeTable, sensitive, '/feed/history').route).toBeNull();
  });

  it('has a fixture for every non-sensitive route', () => {
    const covered = new Set(PAGES.map(([, p]) => p.route));
    const routes = Object.keys(adapter.routes).filter((r) => !sensitive.includes(r));
    expect(routes.filter((r) => !covered.has(r))).toEqual([]);
  });

  it.each(PAGES)('every component declared for %s matches on its fixture', (name, p) => {
    const missing = components
      .filter(([, c]) => !c.protected)
      .filter(([, c]) => !c.routes || c.routes.includes('*') || c.routes.includes(p.route))
      .map(([id]) => id)
      .filter((id) => (counts.get(name)?.[id] ?? 0) === 0);
    expect(missing).toEqual([]);
  });

  it('matches only the outermost element for each component', () => {
    const offenders = [...nested].filter(([, ids]) => ids.some((id) => id === 'video-card'));
    expect(offenders).toEqual([]);
  });

  it('passes every probe on its route fixture', () => {
    for (const probe of adapter.probes ?? []) {
      const fixture = PAGES.find(([, p]) => p.route === probe.route)?.[0];
      expect(fixture, `fixture for route ${probe.route}`).toBeDefined();
      const n = counts.get(fixture ?? '')?.[probe.component] ?? 0;
      expect(n > 0, `${probe.component} on ${probe.route}`).toBe(probe.expect === 'present');
    }
  });

  it('matches the protected consent dialog only where it exists', async () => {
    for (const [name] of PAGES) expect(counts.get(name)?.['consent-dialog']).toBe(0);
    // Synthetic: the EU consent bump is not served to the capture location.
    const withDialog = html('home').replace(
      '<ytd-app',
      '<ytd-consent-bump-v2-lightbox></ytd-consent-bump-v2-lightbox><ytd-app',
    );
    const { result } = await countAll(withDialog);
    expect(result['consent-dialog']).toBe(1);
  });
});

describe('youtube fixtures stay structure-only', () => {
  it.each(PAGES)('%s has no scripts, text or content attributes', (name) => {
    const source = html(name);
    expect(source).not.toMatch(/<script|<style|<iframe|<img|<video/i);
    expect(source).not.toMatch(/>[^<\s][^<]*</);
    expect(source).not.toMatch(/\s(?:href|src|srcset|title|alt|style|aria-[\w-]+|data-[\w-]+)=/i);
  });
});
