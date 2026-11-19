/**
 * Token and setting resolution (template-schema §5, §6). Pure functions: the
 * compiler turns the result into one generated `:root { --rk-… }` rule.
 */
import {
  CODES,
  type Diagnostic,
  diag,
  isTokenName,
  isValidSettingValue,
  normalizeFontFamily,
  type Setting,
  type SettingValue,
  type SettingValues,
  STANDARD_TOKENS,
  settingCssVar,
  type TemplateManifest,
  type TokenName,
  type TokenValue,
  tokenCssVar,
  tokenValueToCss,
  type Variant,
} from '@reskin/schema';

export type TokenMap = Partial<Record<TokenName, TokenValue>>;

/** Snaps to the step grid, then clamps (template-schema §5: values are re-clamped on upgrade). */
export function clampRange(s: Extract<Setting, { type: 'range' }>, value: number): number {
  const snapped = s.min + Math.round((value - s.min) / s.step) * s.step;
  return Number(Math.min(s.max, Math.max(s.min, snapped)).toFixed(6));
}

/** defaults → variant.settings → user values. Invalid user values fall back with a warning. */
export function resolveSettingValues(
  settings: readonly Setting[],
  variant: Variant | undefined,
  user: Readonly<SettingValues> = {},
): { values: SettingValues; diagnostics: Diagnostic[] } {
  const values: SettingValues = {};
  const diagnostics: Diagnostic[] = [];
  for (const s of settings) {
    let value: SettingValue = s.default;
    for (const [source, layer] of [
      ['variant', variant?.settings ?? {}],
      ['user', user],
    ] as const) {
      if (!Object.hasOwn(layer, s.id)) continue;
      const candidate = layer[s.id];
      if (isValidSettingValue(s, candidate)) value = candidate as SettingValue;
      else
        diagnostics.push(
          diag(
            CODES.SETTING_VALUE_INVALID,
            'warning',
            `Ignoring invalid ${source} value for "${s.id}"`,
            { path: `settings.${s.id}` },
          ),
        );
    }
    values[s.id] = s.type === 'range' && typeof value === 'number' ? clampRange(s, value) : value;
  }
  return { values, diagnostics };
}

/** standard defaults → template defaults → variant → palette (if consumed) → user overrides. */
export function resolveTokens(
  manifest: Pick<TemplateManifest, 'tokens'>,
  variant: Variant | undefined,
  palette: TokenMap | undefined,
  overrides: TokenMap | undefined,
): { css: Record<TokenName, string>; set: ReadonlySet<TokenName>; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  /** Tokens given a value by the template, a variant, the palette or an override. */
  const set = new Set<TokenName>();
  const css = Object.fromEntries(
    Object.entries(STANDARD_TOKENS).map(([name, t]) => [name, String(t.default)]),
  ) as Record<TokenName, string>;
  const consumesPalette = manifest.tokens?.consumes === 'standard/v1';
  const layers: [string, Record<string, TokenValue> | undefined][] = [
    ['template', manifest.tokens?.defaults],
    ['variant', variant?.tokens],
    ['palette', consumesPalette ? palette : undefined],
    ['override', overrides],
  ];
  for (const [source, layer] of layers) {
    for (const [name, value] of Object.entries(layer ?? {})) {
      const cssValue = isTokenName(name) ? tokenValueToCss(name, value) : null;
      if (isTokenName(name) && cssValue !== null) {
        css[name] = cssValue;
        set.add(name);
      } else
        diagnostics.push(
          diag(CODES.TOKEN_VALUE_INVALID, 'warning', `Ignoring invalid ${source} token "${name}"`, {
            path: `tokens.${name}`,
          }),
        );
    }
  }
  return { css, set, diagnostics };
}

/**
 * The site-theme rule (D-033), emitted for templates that consume `standard/v1`:
 * - a token something set is pushed to the site: `--site-var: var(--rk-token) !important`;
 * - any other token with a `follow` entry reads the site's own value instead, falling
 *   back to its standard default: `--rk-token: var(--site-var, <default>)`.
 * So unset tokens match the site's light/dark theme, and if the site renames its
 * variables the page keeps its own (readable) colours.
 */
export function themeDeclarations(
  theme: {
    follow?: Readonly<Record<string, string>>;
    bind?: Readonly<Record<string, readonly string[]>>;
  },
  tokens: Readonly<Record<TokenName, string>>,
  set: ReadonlySet<TokenName>,
): { decls: string[]; written: string[] } {
  const decls: string[] = [];
  const written: string[] = [];
  for (const name of Object.keys(STANDARD_TOKENS) as TokenName[]) {
    if (set.has(name)) {
      for (const siteVar of theme.bind?.[name] ?? []) {
        decls.push(`${siteVar}:var(${tokenCssVar(name)})!important`);
        written.push(siteVar);
      }
    } else {
      const siteVar = theme.follow?.[name];
      if (siteVar) decls.push(`${tokenCssVar(name)}:var(${siteVar},${tokens[name]})`);
    }
  }
  return { decls, written };
}

/** The generated `:root` declarations: all standard tokens + value-type settings. */
export function rootDeclarations(
  tokens: Readonly<Record<TokenName, string>>,
  settings: readonly Setting[],
  values: Readonly<SettingValues>,
): string {
  const decls = Object.entries(tokens).map(
    ([name, value]) => `${tokenCssVar(name as TokenName)}:${value}`,
  );
  for (const s of settings) {
    const v = values[s.id];
    if (s.type === 'range' && typeof v === 'number')
      decls.push(`${settingCssVar(s.id)}:${v}${s.unit ?? ''}`);
    else if (s.type === 'color' && typeof v === 'string') decls.push(`${settingCssVar(s.id)}:${v}`);
    else if (s.type === 'font' && typeof v === 'string') {
      const family = normalizeFontFamily(v);
      if (family) decls.push(`${settingCssVar(s.id)}:${family}`);
    }
  }
  return `:root{${decls.join(';')}}`;
}
