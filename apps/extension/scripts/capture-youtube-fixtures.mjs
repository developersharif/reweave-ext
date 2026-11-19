/**
 * Captures structure-only YouTube fixtures from the LIVE site (logged out). Manual
 * tool, never run in CI:
 *   cd apps/extension && node scripts/capture-youtube-fixtures.mjs
 * Writes packages/test-fixtures/youtube/<page>.html. What is kept and stripped is
 * documented in packages/test-fixtures/README.md ("Structure-only snapshots").
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const OUT = join(import.meta.dirname, '../../../packages/test-fixtures/youtube');
const PAGES = {
  home: 'https://www.youtube.com/',
  watch: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  search: 'https://www.youtube.com/results?search_query=cats',
  shorts: 'https://www.youtube.com/shorts',
  channel: 'https://www.youtube.com/@YouTube',
  subscriptions: 'https://www.youtube.com/feed/subscriptions',
  playlist: null, // discovered from the channel's playlists tab
};

/** Runs in the live page: returns the sanitized HTML and the tree signature it must parse to. */
function snapshot() {
  function treeSignature(root) {
    const out = [];
    const walk = (el, depth) => {
      out.push(`${depth}:${el.localName}#${el.id}`);
      for (const c of el.children) walk(c, depth + 1);
    };
    walk(root, 0);
    return out.join('\n');
  }
  const CONTENT = /href|src|url|title|label|alt|text|value|content|name|style|lang|placeholder/;
  const KEEP_VALUE = new Set(['id', 'class', 'page-subtype', 'role', 'slot', 'type', 'target-id']);
  const DROP_ELEMENTS =
    'script,style,link,meta,noscript,iframe,img,video,audio,source,canvas,object,embed,input,textarea';
  // Generated or content-derived tokens (video ids, hashes): mixed case + digits, long, or numeric.
  const generated = (t) =>
    t.length > 40 || (/[A-Z]/.test(t) && /[0-9]/.test(t)) || /^[0-9]+$/.test(t);

  // Import into an inert document: no custom-element upgrades, so YouTube's own
  // element code never runs on the copy.
  const inert = document.implementation.createHTMLDocument('');
  const root = inert.importNode(document.documentElement, true);
  // <head> holds only resources and custom elements the parser would move to <body>.
  root.querySelector('head')?.replaceChildren();
  for (const el of root.querySelectorAll(DROP_ELEMENTS)) el.remove();
  for (const el of root.querySelectorAll('template')) {
    el.content.replaceChildren(); // Trusted Types: no innerHTML
    el.replaceChildren();
  }
  for (const el of root.querySelectorAll('svg')) el.replaceChildren();
  const walker = inert.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT);
  const drop = [];
  while (walker.nextNode()) drop.push(walker.currentNode);
  for (const n of drop) n.remove();

  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const { name, value } of [...el.attributes]) {
      if (/^(on|data-|aria-)/.test(name) || CONTENT.test(name)) {
        el.removeAttribute(name);
      } else if (name === 'id' || name === 'class') {
        const kept = value.split(/\s+/).filter((t) => t && !generated(t));
        if (kept.length) el.setAttribute(name, kept.join(' '));
        else el.removeAttribute(name);
      } else if (KEEP_VALUE.has(name)) {
        if (generated(value) || !/^[\w -]{0,40}$/.test(value)) el.removeAttribute(name);
      } else if (value !== '') {
        // Boolean-style state attributes (e.g. `is-shorts`, `hidden`) keep their presence only.
        if (/^[a-z][a-z0-9_-]*$/.test(name)) el.setAttribute(name, '');
        else el.removeAttribute(name);
      }
    }
  }

  // The HTML parser cannot nest <a> in <a> or <button> in <button>: it closes the outer
  // one and re-parents what follows. Inner ones become <span> so the file round-trips;
  // adapter selectors must not rely on those inner elements.
  for (const el of [...root.querySelectorAll('a a, button button')].reverse()) {
    const span = inert.createElement('span');
    for (const { name, value } of el.attributes) span.setAttribute(name, value);
    span.append(...el.childNodes);
    el.replaceWith(span);
  }
  return {
    html: `<!doctype html>\n${root.outerHTML.replace(/>\s+</g, '><')}\n`,
    signature: treeSignature(root),
  };
}

const browser = await chromium.launch({ channel: 'chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
const blank = await ctx.newPage();
await blank.route('**/*', (r) => r.abort());
mkdirSync(OUT, { recursive: true });
let failed = false;

for (const [name, url] of Object.entries(PAGES)) {
  const page = await ctx.newPage();
  let target = url;
  if (!target) {
    await page.goto('https://www.youtube.com/@YouTube/playlists', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    const href = await page.locator('a[href^="/playlist?list="]').first().getAttribute('href');
    target = new URL(href ?? '/', 'https://www.youtube.com').toString();
  }
  await page.goto(target, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(4000);
  await page.mouse.wheel(0, 2500);
  await page.waitForTimeout(2500);
  await page.mouse.wheel(0, -2500);
  await page.waitForTimeout(500);
  if (name === 'watch') {
    // Comments load lazily once their section scrolls into view.
    await page.locator('ytd-comments#comments').scrollIntoViewIfNeeded();
    await page
      .locator('ytd-comment-thread-renderer')
      .first()
      .waitFor({ timeout: 20_000 })
      .catch(() => {
        console.warn('  watch: no comment threads loaded');
      });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
  }
  const { html, signature } = await page.evaluate(snapshot);
  const path = new URL(page.url()).pathname;
  await page.close();

  // Round-trip check: the saved file must parse back into the same element tree.
  await blank.setContent(html);
  const reparsed = await blank.evaluate(() => {
    const out = [];
    const walk = (el, depth) => {
      out.push(`${depth}:${el.localName}#${el.id}`);
      for (const c of el.children) walk(c, depth + 1);
    };
    walk(document.documentElement, 0);
    return out.join('\n');
  });
  const ok = reparsed === signature;
  if (!ok) {
    const a = signature.split('\n');
    const b = reparsed.split('\n');
    const i = a.findIndex((line, k) => line !== b[k]);
    console.log(
      `  first difference at element ${i}:\n  expected ${a.slice(Math.max(0, i - 3), i + 3).join(' | ')}\n  parsed   ${b.slice(Math.max(0, i - 3), i + 3).join(' | ')}`,
    );
  }
  failed ||= !ok;
  writeFileSync(join(OUT, `${name}.html`), html);
  console.log(
    `${name.padEnd(14)} ${path.padEnd(22)} ${(html.length / 1024).toFixed(0).padStart(4)} KB  round-trip ${ok ? 'ok' : 'MISMATCH'}`,
  );
}
await browser.close();
process.exitCode = failed ? 1 : 0;
