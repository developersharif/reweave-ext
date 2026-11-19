// Bundle budgets on the *built* extension (run after `pnpm build`):
// - content script ≤ 25 KB minified, no framework or compiler (AGENTS.md §2.8, NFR-01);
// - service worker ≤ 60 KB gzip, which fails if css-tree is imported whole instead of
//   through its subpaths (T-2.10, technical-research §9).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const OUTPUT = process.argv[2] ?? 'apps/extension/.output';
const TARGETS = ['chrome-mv3', 'firefox-mv3'];
const BUDGETS = [
  { file: 'content-scripts/content.js', maxRaw: 25 * 1024, maxGzip: 10 * 1024 },
  { file: 'background.js', maxRaw: 200 * 1024, maxGzip: 60 * 1024 },
];
// Strings that only appear when a forbidden dependency is bundled into the content script.
const CONTENT_FORBIDDEN = [
  { pattern: /react\.(?:element|transitional)|__SECRET_INTERNALS/, what: 'React' },
  { pattern: /css-tree|csstree|Unknown at-rule/, what: 'the CSS compiler' },
];

const errors = [];
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
for (const target of TARGETS) {
  for (const { file, maxRaw, maxGzip } of BUDGETS) {
    const path = join(OUTPUT, target, file);
    if (!existsSync(path)) {
      errors.push(`${target}: missing ${file} (run pnpm build first)`);
      continue;
    }
    const code = readFileSync(path);
    const gzip = gzipSync(code, { level: 9 }).length;
    const line = `${target}/${file}: ${kb(code.length)} raw, ${kb(gzip)} gzip (budget ${kb(maxRaw)} / ${kb(maxGzip)})`;
    if (code.length > maxRaw || gzip > maxGzip) errors.push(line);
    else console.log(`  ${line}`);
    if (file.startsWith('content-scripts/')) {
      const text = code.toString('utf8');
      for (const { pattern, what } of CONTENT_FORBIDDEN) {
        if (pattern.test(text)) errors.push(`${target}/${file}: bundles ${what}`);
      }
    }
  }
}
if (errors.length) {
  console.error(`Bundle size check failed:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log('Bundle size check passed');
