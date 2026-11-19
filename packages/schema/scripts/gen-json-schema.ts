/**
 * Writes JSON Schemas for editor autocomplete (template-schema §12).
 *   pnpm --filter @reskin/schema gen:json-schema          # write json/*.json
 *   pnpm --filter @reskin/schema gen:json-schema --check  # fail if json/ is stale (CI)
 * Custom `check()` rules (semver, slug length) can't be expressed in JSON Schema and
 * are skipped; the Valibot schemas remain the source of truth.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { toJsonSchema } from '@valibot/to-json-schema';
import { AdapterSchema } from '../src/adapter.ts';
import { PaletteSchema } from '../src/palette.ts';
import { TemplateSchema } from '../src/template.ts';

const schemas = {
  'template.v1.json': { title: 'Template manifest (template.json) v1', schema: TemplateSchema },
  'adapter.v1.json': { title: 'Site adapter v1', schema: AdapterSchema },
  'palette.v1.json': { title: 'Palette v1', schema: PaletteSchema },
};
const check = process.argv.includes('--check');
let stale = false;

for (const [file, { title, schema }] of Object.entries(schemas)) {
  const body = toJsonSchema(schema, { target: 'draft-2020-12', errorMode: 'ignore' });
  const doc = { $schema: 'https://json-schema.org/draft/2020-12/schema', title, ...body };
  const json = `${JSON.stringify(doc, null, 2)}\n`;
  const path = new URL(`../json/${file}`, import.meta.url);
  if (!check) {
    writeFileSync(path, json);
    console.log(`wrote json/${file}`);
    continue;
  }
  let current = '';
  try {
    current = readFileSync(path, 'utf8');
  } catch {
    // missing file counts as stale
  }
  if (current !== json) {
    console.error(`json/${file} is out of date. Run: pnpm --filter @reskin/schema gen:json-schema`);
    stale = true;
  }
}
if (stale) process.exit(1);
