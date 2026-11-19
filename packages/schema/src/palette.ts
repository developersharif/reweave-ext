/**
 * Palette schema — template-schema.md §6. Token values use the W3C Design Tokens
 * Format Module 2025.10 shapes for the five supported types, restricted to the
 * `standard/v1` contract. Plain CSS strings are also accepted for `color`,
 * `dimension` and `duration` as a convenience (non-DTCG extension).
 */
import * as v from 'valibot';
import { LICENSES, PALETTE_ID } from './patterns.ts';
import { VersionSchema } from './template.ts';
import { isTokenName, type TokenName, type TokenValue } from './tokens.ts';

const finite = v.pipe(v.number(), v.finite());

const DtcgColor = v.object({
  colorSpace: v.picklist([
    'srgb',
    'srgb-linear',
    'display-p3',
    'oklch',
    'oklab',
    'hsl',
    'hwb',
    'lab',
    'lch',
  ]),
  components: v.pipe(v.array(v.union([finite, v.literal('none')])), v.length(3)),
  alpha: v.optional(v.pipe(finite, v.minValue(0), v.maxValue(1))),
  hex: v.optional(v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/))),
});
const DtcgDimension = v.object({ value: finite, unit: v.picklist(['px', 'rem']) });
const DtcgDuration = v.object({ value: finite, unit: v.picklist(['ms', 's']) });

export const DtcgValueSchema = v.union([
  v.pipe(v.string(), v.maxLength(200)),
  finite,
  v.pipe(v.array(v.pipe(v.string(), v.maxLength(64))), v.minLength(1), v.maxLength(6)),
  DtcgColor,
  DtcgDimension,
  DtcgDuration,
]);

const DtcgToken = v.object({
  $value: DtcgValueSchema,
  $type: v.optional(v.picklist(['color', 'dimension', 'fontFamily', 'number', 'duration'])),
  $description: v.optional(v.pipe(v.string(), v.maxLength(200))),
});

/** `{ color: { bg: { $value } } }` — exactly two levels, matching `group.name`. */
export const DtcgTokenTreeSchema = v.record(
  v.pipe(v.string(), v.regex(/^[a-z]+$/)),
  v.record(v.pipe(v.string(), v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)), DtcgToken),
);

export const PaletteSchema = v.object({
  $schema: v.optional(v.string()),
  schemaVersion: v.literal(1),
  id: v.pipe(v.string(), v.regex(PALETTE_ID, 'Must be owner/slug')),
  name: v.pipe(v.string(), v.minLength(3), v.maxLength(60)),
  version: VersionSchema,
  license: v.picklist(LICENSES),
  tokens: DtcgTokenTreeSchema,
  modes: v.optional(
    v.object({ light: v.optional(DtcgTokenTreeSchema), dark: v.optional(DtcgTokenTreeSchema) }),
  ),
});

export type Palette = v.InferOutput<typeof PaletteSchema>;
export type DtcgValue = v.InferOutput<typeof DtcgValueSchema>;
export type DtcgTokenTree = v.InferOutput<typeof DtcgTokenTreeSchema>;

const round = (n: number, digits = 4): string => String(Number(n.toFixed(digits)));

/**
 * Converts a DTCG value to the flat CSS-ish form used by `tokenValueToCss`.
 * Returns null for shapes that make no sense (validation happens afterwards).
 */
export function dtcgToTokenValue(value: DtcgValue): TokenValue | null {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (Array.isArray(value)) return value.join(', ');
  if ('colorSpace' in value) {
    if (value.hex && (value.alpha === undefined || value.alpha === 1)) return value.hex;
    const c = value.components.map((x) => (x === 'none' ? 'none' : round(x)));
    const alpha = value.alpha === undefined ? '' : ` / ${round(value.alpha)}`;
    switch (value.colorSpace) {
      case 'oklch':
      case 'oklab':
      case 'lab':
      case 'lch':
        return `${value.colorSpace}(${c.join(' ')}${alpha})`;
      case 'hsl':
      case 'hwb':
        return `${value.colorSpace}(${c[0]} ${c[1]}% ${c[2]}%${alpha})`;
      default:
        return null; // srgb/display-p3 need color(); only hex form is supported for them in v1
    }
  }
  return `${round(value.value)}${value.unit}`;
}

/** Flattens a palette tree to `{ 'color.bg': '#000', … }`, skipping names outside `standard/v1`. */
export function flattenTokenTree(tree: DtcgTokenTree): {
  tokens: Partial<Record<TokenName, TokenValue>>;
  unknown: string[];
  invalid: string[];
} {
  const tokens: Partial<Record<TokenName, TokenValue>> = {};
  const unknown: string[] = [];
  const invalid: string[] = [];
  for (const [group, entries] of Object.entries(tree)) {
    for (const [name, token] of Object.entries(entries)) {
      const key = `${group}.${name}`;
      if (!isTokenName(key)) {
        unknown.push(key);
        continue;
      }
      const flat = dtcgToTokenValue(token.$value);
      if (flat === null) invalid.push(key);
      else tokens[key] = flat;
    }
  }
  return { tokens, unknown, invalid };
}
