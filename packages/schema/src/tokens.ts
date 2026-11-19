/**
 * Standard design-token contract `standard/v1` (template-schema §6).
 *
 * Names are dotted in manifests (`color.bg`, DTCG-style paths) and hyphenated in the
 * CSS authoring dialect (`token(color-bg)`), because css-tree cannot parse dotted
 * identifiers inside function arguments. Both map to the custom property `--rk-color-bg`.
 */

export type TokenType = 'color' | 'fontFamily' | 'dimension' | 'number' | 'duration';

export const TOKEN_CONTRACT = 'standard/v1';
export const CSS_PREFIX = 'rk';

/** Default values = the built-in "Default Dark" look. */
export const STANDARD_TOKENS = {
  'color.bg': { type: 'color', default: '#0f0f10' },
  'color.surface': { type: 'color', default: '#18181b' },
  'color.surface-2': { type: 'color', default: '#222226' },
  'color.text': { type: 'color', default: '#ececf1' },
  'color.text-muted': { type: 'color', default: '#a0a0ab' },
  'color.accent': { type: 'color', default: '#7aa2f7' },
  'color.accent-text': { type: 'color', default: '#0f0f10' },
  'color.border': { type: 'color', default: '#2e2e33' },
  'color.link': { type: 'color', default: '#8ab4f8' },
  'color.danger': { type: 'color', default: '#f7768e' },
  'color.success': { type: 'color', default: '#9ece6a' },
  'font.body': { type: 'fontFamily', default: 'system-ui, sans-serif' },
  'font.heading': { type: 'fontFamily', default: 'system-ui, sans-serif' },
  'font.mono': { type: 'fontFamily', default: 'ui-monospace, monospace' },
  'font.scale': { type: 'number', default: 1 },
  'radius.sm': { type: 'dimension', default: '4px' },
  'radius.md': { type: 'dimension', default: '8px' },
  'radius.lg': { type: 'dimension', default: '16px' },
  'space.scale': { type: 'number', default: 1 },
  'motion.duration': { type: 'duration', default: '150ms' },
} as const satisfies Record<string, { type: TokenType; default: string | number }>;

export type TokenName = keyof typeof STANDARD_TOKENS;
export type TokenValue = string | number;

export const isTokenName = (name: string): name is TokenName =>
  Object.hasOwn(STANDARD_TOKENS, name);

/** `color-bg` (dialect) → `color.bg` (manifest). Only the first hyphen separates group and name. */
export function tokenFromDialect(dialectName: string): TokenName | null {
  const i = dialectName.indexOf('-');
  if (i <= 0) return null;
  const name = `${dialectName.slice(0, i)}.${dialectName.slice(i + 1)}`;
  return isTokenName(name) ? name : null;
}

export const tokenCssVar = (name: TokenName): string => `--${CSS_PREFIX}-${name.replace('.', '-')}`;

export const settingCssVar = (settingId: string): string =>
  `--${CSS_PREFIX}-s-${settingId.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

// ---------------------------------------------------------------------------
// Value validation. Every value that reaches compiled CSS goes through one of these,
// so a palette or setting can never break out of its declaration.

const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const NAMED = /^[a-zA-Z]{3,20}$/;
const COLOR_FN = /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([0-9a-z.%\s,/+-]{1,80}\)$/;
const DIMENSION = /^(?:0|-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|%|vw|vh|ch))$/;
const DURATION = /^(?:\d+\.?\d*|\.\d+)(?:ms|s)$/;
const FAMILY_NAME = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/;
const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',
]);

export const isSafeColor = (v: string): boolean =>
  HEX.test(v) || NAMED.test(v) || COLOR_FN.test(v.toLowerCase());

export const isSafeDimension = (v: string): boolean => DIMENSION.test(v);
export const isSafeDuration = (v: string): boolean => DURATION.test(v);

/** Returns a normalized, quoted CSS font-family list, or null if unsafe. */
export function normalizeFontFamily(v: string): string | null {
  const parts = v.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
  if (parts.length === 0 || parts.length > 6) return null;
  const out: string[] = [];
  for (const p of parts) {
    if (GENERIC_FAMILIES.has(p)) out.push(p);
    else if (FAMILY_NAME.test(p)) out.push(`"${p}"`);
    else return null;
  }
  return out.join(', ');
}

/** Returns the CSS text for a token value, or null if the value is not valid for its type. */
export function tokenValueToCss(name: TokenName, value: TokenValue): string | null {
  const type: TokenType = STANDARD_TOKENS[name].type;
  switch (type) {
    case 'color':
      return typeof value === 'string' && isSafeColor(value) ? value : null;
    case 'dimension':
      return typeof value === 'string' && isSafeDimension(value) ? value : null;
    case 'duration':
      return typeof value === 'string' && isSafeDuration(value) ? value : null;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10
        ? String(value)
        : null;
    case 'fontFamily':
      return typeof value === 'string' ? normalizeFontFamily(value) : null;
  }
}
