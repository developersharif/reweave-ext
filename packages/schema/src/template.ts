/**
 * Template manifest (`template.json`) schema — template-schema.md §3, §5.
 * Structural rules live here; cross-field rules live in `validate-template.ts`.
 */
import * as v from 'valibot';
import {
  ASSET_LICENSES,
  CATEGORIES,
  HANDLE,
  KEBAB_ID,
  LICENSES,
  RANGE_UNITS,
  SELECT_VALUE,
  SETTING_ID,
  TAG,
  TEMPLATE_ID,
} from './patterns.ts';
import { isRange, isVersion } from './semver.ts';

const kebab = v.pipe(v.string(), v.regex(KEBAB_ID, 'Must be kebab-case (e.g. video-card)'));
const label = v.pipe(v.string(), v.minLength(1), v.maxLength(40));
const settingId = v.pipe(
  v.string(),
  v.regex(SETTING_ID, 'Must be camelCase, start with a letter, ≤ 32 chars'),
);
export const VersionSchema = v.pipe(
  v.string(),
  v.check(isVersion, 'Must be a semver version like 1.2.0'),
);
export const RangeSchema = v.pipe(
  v.string(),
  v.check(isRange, 'Must be a semver range: 1.2.3, ^1.2.3, ~1.2.3, >=1.2.3 or *'),
);
const routeList = v.pipe(v.array(kebab), v.minLength(1), v.maxLength(32));

/** Relative path inside the template directory, under a fixed folder, no `..`. */
const filePath = (folder: string, extensions: readonly string[]) =>
  v.pipe(
    v.string(),
    v.maxLength(128),
    v.regex(
      new RegExp(
        `^${folder}/[a-z0-9][a-z0-9_-]*(?:/[a-z0-9][a-z0-9_-]*)*\\.(?:${extensions.join('|')})$`,
      ),
      `Must be a lowercase path under ${folder}/ ending in .${extensions.join(' or .')}`,
    ),
  );

export const StyleRefSchema = v.object({
  file: filePath('styles', ['css']),
  routes: v.optional(routeList),
  media: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(200))),
});

export const HideRuleSchema = v.object({
  component: kebab,
  when: v.optional(
    v.pipe(
      v.string(),
      v.regex(/^!?[a-z][a-zA-Z0-9]{0,31}$/, 'Must be a setting id, optionally prefixed with !'),
    ),
  ),
  routes: v.optional(routeList),
});

export const TargetSchema = v.object({
  adapter: kebab,
  adapterRange: RangeSchema,
  routes: v.optional(routeList),
  styles: v.pipe(v.array(StyleRefSchema), v.minLength(1), v.maxLength(32)),
  hide: v.optional(v.pipe(v.array(HideRuleSchema), v.maxLength(64))),
  rawSelectors: v.optional(v.boolean()),
});

const settingBase = {
  id: settingId,
  label,
  description: v.optional(v.pipe(v.string(), v.maxLength(140))),
};
const option = v.object({
  value: v.pipe(v.string(), v.regex(SELECT_VALUE, 'Must match ^[a-z0-9-]{1,32}$')),
  label,
});
const fontOption = v.object({ value: v.pipe(v.string(), v.minLength(1), v.maxLength(200)), label });

export const SettingSchema = v.variant('type', [
  v.object({ ...settingBase, type: v.literal('boolean'), default: v.boolean() }),
  v.object({
    ...settingBase,
    type: v.literal('select'),
    options: v.pipe(v.array(option), v.minLength(2), v.maxLength(16)),
    default: v.string(),
  }),
  v.object({
    ...settingBase,
    type: v.literal('range'),
    min: v.pipe(v.number(), v.finite()),
    max: v.pipe(v.number(), v.finite()),
    step: v.pipe(v.number(), v.finite(), v.gtValue(0)),
    unit: v.optional(v.picklist(RANGE_UNITS)),
    default: v.pipe(v.number(), v.finite()),
  }),
  v.object({
    ...settingBase,
    type: v.literal('color'),
    default: v.pipe(v.string(), v.maxLength(100)),
  }),
  v.object({
    ...settingBase,
    type: v.literal('font'),
    options: v.pipe(v.array(fontOption), v.minLength(1), v.maxLength(16)),
    default: v.string(),
  }),
]);

const tokenMap = v.record(
  v.pipe(v.string(), v.maxLength(64)),
  v.union([v.pipe(v.string(), v.maxLength(200)), v.pipe(v.number(), v.finite())]),
);

export const TokensSchema = v.object({
  consumes: v.optional(v.literal('standard/v1')),
  defaults: v.optional(tokenMap),
});

export const VariantSchema = v.object({
  id: kebab,
  label,
  settings: v.optional(
    v.record(
      settingId,
      v.union([v.boolean(), v.pipe(v.number(), v.finite()), v.pipe(v.string(), v.maxLength(200))]),
    ),
  ),
  tokens: v.optional(tokenMap),
});

export const AssetSchema = v.object({
  id: kebab,
  file: filePath('assets', ['woff2', 'webp', 'png', 'avif', 'svg']),
  kind: v.picklist(['font', 'image']),
  license: v.optional(v.picklist(ASSET_LICENSES)),
});

export const PreviewSchema = v.object({
  file: filePath('previews', ['webp', 'png', 'jpg', 'jpeg']),
  alt: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
  role: v.optional(v.literal('cover')),
  route: v.optional(kebab),
});

export const TemplateSchema = v.object({
  $schema: v.optional(v.pipe(v.string(), v.maxLength(200))),
  schemaVersion: v.literal(1),
  id: v.pipe(
    v.string(),
    v.regex(TEMPLATE_ID, 'Must be owner/slug, lowercase kebab-case'),
    v.check((id) => {
      const slug = id.split('/')[1] ?? '';
      return slug.length >= 3 && slug.length <= 48;
    }, 'Slug must be 3–48 characters'),
  ),
  name: v.pipe(v.string(), v.minLength(3), v.maxLength(60)),
  summary: v.pipe(v.string(), v.minLength(1), v.maxLength(140)),
  description: v.optional(v.pipe(v.string(), v.maxLength(10_000))),
  version: VersionSchema,
  license: v.picklist(LICENSES),
  authors: v.pipe(
    v.array(v.object({ handle: v.pipe(v.string(), v.regex(HANDLE, 'Invalid handle')) })),
    v.minLength(1),
    v.maxLength(10),
  ),
  category: v.picklist(CATEGORIES),
  tags: v.optional(
    v.pipe(
      v.array(v.pipe(v.string(), v.maxLength(24), v.regex(TAG, 'Tags are lowercase kebab-case'))),
      v.maxLength(8),
    ),
  ),
  targets: v.pipe(v.array(TargetSchema), v.minLength(1), v.maxLength(5)),
  tokens: v.optional(TokensSchema),
  settings: v.optional(v.pipe(v.array(SettingSchema), v.maxLength(32))),
  variants: v.optional(v.pipe(v.array(VariantSchema), v.maxLength(8))),
  assets: v.optional(v.pipe(v.array(AssetSchema), v.maxLength(32))),
  previews: v.pipe(v.array(PreviewSchema), v.minLength(1), v.maxLength(8)),
  requires: v.optional(v.object({ engine: v.optional(RangeSchema) })),
});

export type TemplateManifest = v.InferOutput<typeof TemplateSchema>;
export type Target = v.InferOutput<typeof TargetSchema>;
export type StyleRef = v.InferOutput<typeof StyleRefSchema>;
export type HideRule = v.InferOutput<typeof HideRuleSchema>;
export type Setting = v.InferOutput<typeof SettingSchema>;
export type SettingType = Setting['type'];
export type Variant = v.InferOutput<typeof VariantSchema>;
export type Asset = v.InferOutput<typeof AssetSchema>;
export type SettingValue = boolean | number | string;
export type SettingValues = Record<string, SettingValue>;
