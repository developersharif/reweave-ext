/**
 * Spike (M3): where YouTube defines its theme custom properties, and which of them
 * paint the main surfaces. Manual, live, logged out. Prints a report only.
 *   node spikes/live-youtube/theme-vars.mjs [light|dark]
 */
import { chromium } from '@playwright/test';

const scheme = process.argv[2] === 'light' ? 'light' : 'dark';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'en-US',
  colorScheme: scheme,
});
const page = await ctx.newPage();
const report = {};
for (const [name, url] of [
  ['home', 'https://www.youtube.com/'],
  ['watch', 'https://www.youtube.com/watch?v=jNQXAC9IVRw'],
]) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  report[name] = await page.evaluate(() => {
    const html = document.documentElement;
    // 1. Which rules define --yt-spec-* variables, and on what selectors.
    const definers = {};
    for (const sheet of [...document.styleSheets, ...document.adoptedStyleSheets]) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      const walk = (list) => {
        for (const r of list) {
          if (r.cssRules && !r.style) walk(r.cssRules);
          if (!r.style) continue;
          let n = 0;
          for (const p of r.style) if (p.startsWith('--yt-spec-')) n++;
          if (n > 0) definers[r.selectorText] = (definers[r.selectorText] ?? 0) + n;
        }
      };
      walk(rules);
    }
    // 2. Computed values on html and ytd-app for the main variables.
    const vars = [
      '--yt-spec-base-background',
      '--yt-spec-raised-background',
      '--yt-spec-menu-background',
      '--yt-spec-general-background-a',
      '--yt-spec-general-background-b',
      '--yt-spec-general-background-c',
      '--yt-spec-text-primary',
      '--yt-spec-text-secondary',
      '--yt-spec-text-disabled',
      '--yt-spec-call-to-action',
      '--yt-spec-brand-button-background',
      '--yt-spec-10-percent-layer',
      '--yt-spec-badge-chip-background',
      '--yt-spec-icon-active-other',
      '--yt-spec-icon-inactive',
      '--yt-spec-static-brand-red',
      '--yt-spec-themed-blue',
      '--yt-spec-suggested-action',
      '--yt-spec-outline',
      '--yt-spec-additive-background',
      '--yt-spec-wordmark-text',
      '--yt-spec-static-overlay-background-heavy',
      '--yt-spec-touch-response',
      '--yt-spec-shadow',
      '--yt-spec-inverted-background',
      '--yt-spec-filled-button-text',
      '--yt-spec-error-indicator',
    ];
    const at = (el) =>
      el
        ? Object.fromEntries(vars.map((v) => [v, getComputedStyle(el).getPropertyValue(v).trim()]))
        : null;
    // 3. What actually paints: computed colors of main surfaces.
    const paint = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color, font: cs.fontFamily.slice(0, 40) };
    };
    // 4. Elements below html that redefine the variables (inline or via rules).
    const redefine = new Set();
    const base = getComputedStyle(html).getPropertyValue('--yt-spec-base-background');
    for (const el of document.querySelectorAll(
      'ytd-app, ytd-masthead, #masthead, ytd-page-manager, ytd-browse, ytd-watch-flexy, tp-yt-app-drawer, ytd-popup-container, ytd-mini-guide-renderer, #container.ytd-masthead, ytd-searchbox, yt-searchbox',
    )) {
      const v = getComputedStyle(el).getPropertyValue('--yt-spec-base-background');
      if (v !== base) redefine.add(`${el.localName}${el.id ? `#${el.id}` : ''} = ${v.trim()}`);
    }
    return {
      htmlAttrs: [...html.attributes]
        .map((a) => a.name)
        .filter((n) => !/^(lang|style|class)$/.test(n)),
      htmlClass: html.className.slice(0, 80),
      definers,
      onHtml: at(html),
      redefinedBelowHtml: [...redefine],
      paint: {
        body: paint('body'),
        app: paint('ytd-app'),
        masthead: paint('ytd-masthead #background') ?? paint('ytd-masthead'),
        searchbox: paint('yt-searchbox .ytSearchboxComponentInputBox') ?? paint('yt-searchbox'),
        guide: paint('tp-yt-app-drawer#guide #guide-content') ?? paint('tp-yt-app-drawer#guide'),
        chip: paint('yt-chip-cloud-chip-renderer') ?? paint('chip-view-model'),
        title: paint('ytd-watch-metadata h1') ?? paint('#video-title'),
        meta: paint('ytd-watch-metadata #owner-sub-count') ?? paint('#metadata-line'),
        description: paint('ytd-watch-metadata #description'),
        subscribe: paint('ytd-watch-metadata #subscribe-button button'),
      },
    };
  });
}
console.log(JSON.stringify({ scheme, ...report }, null, 1));
await browser.close();
