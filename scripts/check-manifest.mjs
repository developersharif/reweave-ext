// Guards the AGENTS.md non-negotiables on the *built* manifests (D-011, security-model T8).
// Run after `pnpm build`. Fails CI if a permission or exposure sneaks in.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT = process.argv[2] ?? 'apps/extension/.output';
const TARGETS = ['chrome-mv3', 'firefox-mv3'];

const ALLOWED_PERMISSIONS = new Set(['storage', 'scripting']);
const ALLOWED_OPTIONAL_HOSTS = new Set([
  'https://www.youtube.com/*',
  // M4: 'https://www.reddit.com/*', 'https://x.com/*'
]);
const FORBIDDEN_KEYS = ['host_permissions', 'web_accessible_resources', 'externally_connectable'];

const errors = [];
for (const target of TARGETS) {
  const file = join(OUTPUT, target, 'manifest.json');
  if (!existsSync(file)) {
    errors.push(`${target}: missing ${file} (run pnpm build first)`);
    continue;
  }
  const m = JSON.parse(readFileSync(file, 'utf8'));
  const where = (msg) => errors.push(`${target}: ${msg}`);

  if (m.manifest_version !== 3) where(`manifest_version is ${m.manifest_version}, expected 3`);
  for (const p of m.permissions ?? []) {
    if (!ALLOWED_PERMISSIONS.has(p)) where(`permission "${p}" is not allowed`);
  }
  for (const p of m.optional_permissions ?? []) where(`optional permission "${p}" is not allowed`);
  for (const h of m.optional_host_permissions ?? []) {
    if (!ALLOWED_OPTIONAL_HOSTS.has(h)) where(`optional host "${h}" is not allowed`);
  }
  for (const key of FORBIDDEN_KEYS) {
    const v = m[key];
    if (v !== undefined && !(Array.isArray(v) && v.length === 0)) where(`"${key}" must not be set`);
  }
  for (const cs of m.content_scripts ?? []) {
    where(`static content_scripts are not allowed (found matches ${JSON.stringify(cs.matches)})`);
  }
  if (m.content_security_policy) where('custom content_security_policy is not allowed');
}

if (errors.length) {
  console.error(`Manifest check failed:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`Manifest check passed for ${TARGETS.join(', ')}`);
