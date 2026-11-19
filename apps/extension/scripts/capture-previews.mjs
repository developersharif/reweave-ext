/**
 * Captures the bundled templates' preview images from live YouTube (logged out) with
 * the real extension applying them. Manual, never in CI:
 *   cd apps/extension && pnpm build:e2e && node scripts/capture-previews.mjs [--dark]
 *
 * Thumbnails, the player, text and the logo are blurred before each screenshot, so a
 * preview shows layout and colour, not anyone's content (template-schema §10).
 * Writes packages/templates/<dir>/previews/{cover,before,after}.jpg.
 */
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

const { values: args } = parseArgs({ options: { dark: { type: 'boolean' } } });
const EXT = resolve(import.meta.dirname, '../.output/chrome-mv3-e2e');
const TEMPLATES = resolve(import.meta.dirname, '../../../packages/templates');
const YT = 'https://www.youtube.com';

/** Per template: the page for before/after (after optionally with a variant), and the cover. */
const SHOTS = [
  {
    id: 'reskin/focus-youtube',
    dir: 'focus-youtube',
    compare: `${YT}/watch?v=jNQXAC9IVRw`,
    after: { variant: 'deep-focus' },
    cover: {
      url: `${YT}/watch?v=jNQXAC9IVRw`,
      variant: 'deep-focus',
      settings: { maxWidth: 1000 },
    },
  },
  {
    id: 'reskin/compact-youtube',
    dir: 'compact-youtube',
    compare: `${YT}/@YouTube/videos`,
    cover: { url: `${YT}/@YouTube/videos`, variant: 'dense' },
  },
  {
    id: 'reskin/calm-youtube',
    dir: 'calm-youtube',
    compare: `${YT}/results?search_query=nature+documentary`,
    cover: { url: `${YT}/results?search_query=nature+documentary` },
  },
];

const BLUR = `
  img, yt-image, .ytCoreImageHost, ytd-thumbnail, yt-thumbnail-view-model, #movie_player,
  .html5-video-player, #avatar, yt-avatar-shape, yt-img-shadow { filter: blur(16px) !important; }
  #video-title, yt-formatted-string, .yt-core-attributed-string, .ytAttributedStringHost,
  #channel-name, #metadata-line, #description, h1, h3, #text, .badge-shape-wiz__text,
  ytd-topbar-logo-renderer, #logo, #country-code { filter: blur(5px) !important; }`;

const dir = mkdtempSync(join(tmpdir(), 'rk-previews-'));
const ctx = await chromium.launchPersistentContext(dir, {
  channel: 'chromium',
  viewport: { width: 1280, height: 800 },
  locale: 'en-US',
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
const ext = await ctx.newPage();
await ext.goto(`chrome-extension://${new URL(sw.url()).host}/popup.html`);
const send = async (m) => {
  const r = await ext.evaluate((msg) => chrome.runtime.sendMessage(msg), m);
  if (!r?.ok) throw new Error(`${m.type} failed: ${JSON.stringify(r?.error)}`);
};
await send({ type: 'setSiteEnabled', adapterId: 'youtube', enabled: true });

const page = await ctx.newPage();
async function shoot(url, file) {
  if (page.url() !== url) {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(5000);
  }
  await page.evaluate(
    ({ css, dark }) => {
      if (dark) document.documentElement.setAttribute('dark', '');
      if (!window.__rkBlur) {
        window.__rkBlur = new CSSStyleSheet();
        window.__rkBlur.replaceSync(css);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, window.__rkBlur];
      }
    },
    { css: BLUR, dark: args.dark === true },
  );
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
  console.log(
    `${file.replace(`${TEMPLATES}/`, '')}  ${(statSync(file).size / 1024).toFixed(0)} KB`,
  );
}

for (const s of SHOTS) {
  const out = join(TEMPLATES, s.dir, 'previews');
  await send({ type: 'setTemplate', adapterId: 'youtube', templateId: null });
  await shoot(s.compare, join(out, 'before.jpg'));
  await send({
    type: 'setTemplate',
    adapterId: 'youtube',
    templateId: s.id,
    ...(s.after?.variant ? { variantId: s.after.variant } : {}),
  });
  await shoot(s.compare, join(out, 'after.jpg'));
  await send({
    type: 'setTemplate',
    adapterId: 'youtube',
    templateId: s.id,
    ...(s.cover.variant ? { variantId: s.cover.variant } : {}),
  });
  if (s.cover.settings)
    await send({ type: 'setSettings', templateId: s.id, values: s.cover.settings });
  await shoot(s.cover.url, join(out, 'cover.jpg'));
  await send({ type: 'resetSettings', templateId: s.id });
}
await ctx.close();
rmSync(dir, { recursive: true, force: true });
