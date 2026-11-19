/**
 * Generates the YouTube adapter's `theme` block (D-033) from the live site. Manual,
 * never in CI. Logged out, headless; nothing is recorded except variable names.
 *
 *   node apps/extension/scripts/map-youtube-theme.mjs            # print the block and a summary
 *   node apps/extension/scripts/map-youtube-theme.mjs --write    # also update adapter.json
 *   node apps/extension/scripts/map-youtube-theme.mjs --preview out.png   # screenshot with a test palette
 *
 * YouTube paints mostly through build-generated variables (`--t<16 hex>`) defined with
 * literal colours on `:root`, `[dark]` and `[light]`; a few rules use its readable
 * `--yt-sys-color-baseline--*` names. A generated variable is bound to a standard
 * token when its (light, dark) colour pair equals that of a readable name listed for
 * exactly one token below. Re-run when the adapter's theme health check fails.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

const { values: args } = parseArgs({
  options: { write: { type: 'boolean' }, preview: { type: 'string' } },
});
const ADAPTER = join(import.meta.dirname, '../../../packages/adapters/youtube/adapter.json');
const SYS = '--yt-sys-color-baseline--';

/** Standard token → YouTube's readable names whose role it takes over. */
const SOURCES = {
  'color.bg': ['base-background', 'text-primary-inverse'],
  'color.surface': ['raised-background', 'menu-background'],
  'color.surface-2': ['additive-background', 'badge-chip-background'],
  'color.text': ['text-primary', 'inverted-background'],
  'color.text-muted': ['text-secondary', 'text-disabled'],
  'color.accent': ['call-to-action'],
  'color.border': ['outline', '10-percent-layer'],
  'color.danger': ['error-indicator'],
};
/** Standard token → the readable name it follows when nothing sets it. */
const FOLLOW = {
  'color.bg': 'base-background',
  'color.surface': 'raised-background',
  'color.surface-2': 'additive-background',
  'color.text': 'text-primary',
  'color.text-muted': 'text-secondary',
  'color.accent': 'call-to-action',
  'color.accent-text': 'text-primary-inverse',
  'color.border': 'outline',
  'color.link': 'call-to-action',
  'color.danger': 'error-indicator',
};
/**
 * Variables YouTube's scripts set inline on some elements (the chapter bars in search
 * results get colours picked from the thumbnail). They can't be read from <html>, so
 * they're listed here, and the scope includes the elements that carry them.
 */
const INLINE = {
  'color.surface-2': [
    '--yt-lightsource-section1-color',
    '--yt-lightsource-section2-color',
    '--yt-lightsource-section3-color',
    '--yt-lightsource-section4-color',
  ],
  'color.text': ['--yt-lightsource-primary-title-color', '--yt-lightsource-icon-activated-color'],
  'color.text-muted': [
    '--yt-lightsource-secondary-title-color',
    '--yt-lightsource-icon-inactive-color',
    '--yt-lightsource-icon-disabled-color',
  ],
};
const SCOPE = ':root, [dark], [light], [style*="--yt-lightsource"]';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
const page = await ctx.newPage();
await page.goto('https://www.youtube.com/watch?v=jNQXAC9IVRw', { waitUntil: 'load' });
await page.waitForTimeout(6000);

/** Computed values of every readable and generated colour variable on <html>, normalized to rgb(). */
const read = () =>
  page.evaluate((sys) => {
    const html = document.documentElement;
    const cs = getComputedStyle(html);
    const probe = document.createElement('i');
    document.body.append(probe);
    const norm = (value) => {
      probe.style.color = '';
      probe.style.color = value;
      return probe.style.color ? getComputedStyle(probe).color : null;
    };
    const out = {};
    for (let i = 0; i < cs.length; i++) {
      const name = cs[i];
      if (!name.startsWith(sys) && !/^--t[0-9a-f]{16}$/.test(name)) continue;
      const value = norm(cs.getPropertyValue(name).trim());
      if (value) out[name] = value;
    }
    probe.remove();
    return out;
  }, SYS);

const light = await read();
await page.evaluate(() => document.documentElement.setAttribute('dark', ''));
const dark = await read();
await page.evaluate(() => document.documentElement.removeAttribute('dark'));

const pair = (name) => `${light[name]}|${dark[name]}`;
/** The same pair with alpha dropped: YouTube's frosted masthead is a translucent base background. */
const opaque = (value) => value.replace(/^rgba\((\d+), (\d+), (\d+), [\d.]+\)$/, 'rgb($1, $2, $3)');
const opaquePair = (name) => `${opaque(light[name])}|${opaque(dark[name])}`;
const names = Object.keys(light).filter((n) => n in dark);
const sysNames = names.filter((n) => n.startsWith(SYS));
const generated = names.filter((n) => !n.startsWith(SYS));
const tokenOf = new Map();
for (const [token, roles] of Object.entries(SOURCES))
  for (const role of roles) if (sysNames.includes(SYS + role)) tokenOf.set(SYS + role, token);

const bySysPair = new Map();
for (const n of sysNames) bySysPair.set(pair(n), [...(bySysPair.get(pair(n)) ?? []), n]);

const bind = Object.fromEntries(Object.keys(SOURCES).map((t) => [t, []]));
for (const [n, t] of tokenOf) bind[t].push(n);
let unmatched = 0;
let ambiguous = 0;
let translucent = 0;
const tokensFor = (key) =>
  new Set((bySysPair.get(key) ?? []).map((s) => tokenOf.get(s)).filter(Boolean));
for (const n of generated) {
  let tokens = tokensFor(pair(n));
  if (tokens.size === 0 && opaquePair(n) !== pair(n)) {
    tokens = tokensFor(opaquePair(n));
    if (tokens.size === 1) translucent++;
  }
  if (tokens.size === 1) bind[[...tokens][0]].push(n);
  else if (tokens.size === 0) unmatched++;
  else ambiguous++;
}
for (const [token, list] of Object.entries(INLINE)) bind[token].push(...list);
const theme = {
  scope: SCOPE,
  follow: Object.fromEntries(
    Object.entries(FOLLOW)
      .filter(([, role]) => sysNames.includes(SYS + role))
      .map(([t, role]) => [t, SYS + role]),
  ),
  bind: Object.fromEntries(
    Object.entries(bind)
      .filter(([, list]) => list.length > 0)
      .map(([t, list]) => [t, list.sort()]),
  ),
};
const bound = Object.values(theme.bind).reduce(
  (n, l) => n + l.filter((x) => generated.includes(x)).length,
  0,
);
console.log(JSON.stringify(theme, null, 2));
console.error(
  `${generated.length} generated variables: ${bound} bound (${translucent} translucent), ${ambiguous} ambiguous, ${unmatched} not a standard role; ${sysNames.length} readable names; ${Object.values(INLINE).flat().length} inline`,
);
for (const [t, list] of Object.entries(theme.bind))
  console.error(`  ${t.padEnd(18)} ${list.length}`);

if (args.preview) {
  // A test palette (dark, warm) applied the way the compiler would emit it.
  const palette = {
    'color.bg': '#1d1b26',
    'color.surface': '#27243a',
    'color.surface-2': '#322e48',
    'color.text': '#f2e9dc',
    'color.text-muted': '#b8ab98',
    'color.accent': '#f0a35e',
    'color.border': '#3d3856',
    'color.danger': '#ef6f6c',
  };
  const decls = Object.entries(theme.bind).flatMap(([t, list]) =>
    palette[t] ? list.map((n) => `${n}:${palette[t]}!important`) : [],
  );
  await page.evaluate(
    (css) => {
      const s = new CSSStyleSheet();
      s.replaceSync(css);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, s];
    },
    `${SCOPE}{${decls.join(';')}} img,video,yt-image,.ytCoreImageHost{filter:blur(18px)} #video-title,yt-formatted-string,.yt-core-attributed-string,#logo{filter:blur(4px)}`,
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: args.preview });
  console.error(`preview written to ${args.preview}`);
}

if (args.write) {
  const adapter = JSON.parse(readFileSync(ADAPTER, 'utf8'));
  adapter.theme = theme;
  writeFileSync(ADAPTER, `${JSON.stringify(adapter, null, 2)}\n`);
  console.error(`updated ${ADAPTER}`);
}
await browser.close();
