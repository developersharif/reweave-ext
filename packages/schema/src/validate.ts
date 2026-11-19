/**
 * Validation entry points: structural (Valibot) → semantic (cross-field) checks.
 * Same code runs in CI, on the server and in the extension (template-schema §12).
 */
import * as v from 'valibot';
import { type Adapter, AdapterSchema } from './adapter.ts';
import { CODES, type Diagnostic, diag, hasErrors } from './diagnostics.ts';
import { flattenTokenTree, type Palette, PaletteSchema } from './palette.ts';
import { OFFICIAL_WORDS } from './patterns.ts';
import { satisfies } from './semver.ts';
import { type Setting, type TemplateManifest, TemplateSchema } from './template.ts';
import { isSafeColor, isTokenName, normalizeFontFamily, tokenValueToCss } from './tokens.ts';

export interface ValidationResult<T> {
  ok: boolean;
  /** Present when structural validation passed (semantic errors may still exist). */
  value?: T;
  diagnostics: Diagnostic[];
}

function structural<T>(
  schema: v.GenericSchema<unknown, T>,
  input: unknown,
): { value?: T; diagnostics: Diagnostic[] } {
  const result = v.safeParse(schema, input);
  if (result.success) return { value: result.output, diagnostics: [] };
  return {
    diagnostics: result.issues.map((issue) =>
      diag(CODES.MANIFEST_INVALID, 'error', issue.message, { path: v.getDotPath(issue) ?? '' }),
    ),
  };
}

function unknownFields(input: unknown, known: readonly string[], path: string): Diagnostic[] {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return [];
  return Object.keys(input)
    .filter((k) => !known.includes(k))
    .map((k) =>
      diag(CODES.MANIFEST_UNKNOWN_FIELD, 'warning', `Unknown field "${k}" is ignored`, {
        path: path ? `${path}.${k}` : k,
      }),
    );
}

function duplicates(
  ids: readonly string[],
  path: (i: number) => string,
  what: string,
): Diagnostic[] {
  const seen = new Set<string>();
  const out: Diagnostic[] = [];
  ids.forEach((id, i) => {
    if (seen.has(id))
      out.push(diag(CODES.DUPLICATE_ID, 'error', `Duplicate ${what} "${id}"`, { path: path(i) }));
    seen.add(id);
  });
  return out;
}

/** Checks a value against a setting definition. Shared with variant + user-value validation. */
export function isValidSettingValue(setting: Setting, value: unknown): boolean {
  switch (setting.type) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'select':
      return typeof value === 'string' && setting.options.some((o) => o.value === value);
    case 'range':
      return typeof value === 'number' && Number.isFinite(value);
    case 'color':
      return typeof value === 'string' && isSafeColor(value);
    case 'font':
      return typeof value === 'string' && setting.options.some((o) => o.value === value);
  }
}

function checkTokens(map: Record<string, string | number> | undefined, path: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const [name, value] of Object.entries(map ?? {})) {
    const p = `${path}.${name}`;
    if (!isTokenName(name))
      out.push(
        diag(CODES.TOKEN_UNKNOWN, 'error', `"${name}" is not a standard/v1 token`, { path: p }),
      );
    else if (tokenValueToCss(name, value) === null)
      out.push(
        diag(CODES.TOKEN_VALUE_INVALID, 'error', `Invalid value for token "${name}"`, { path: p }),
      );
  }
  return out;
}

function checkSettings(settings: readonly Setting[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  settings.forEach((s, i) => {
    const p = `settings.${i}`;
    if (s.type === 'range') {
      if (s.min >= s.max)
        out.push(
          diag(CODES.SETTING_RANGE_INVALID, 'error', 'min must be < max', { path: `${p}.min` }),
        );
      else if ((s.max - s.min) / s.step > 10_000)
        out.push(
          diag(CODES.SETTING_RANGE_INVALID, 'error', 'Range has more than 10 000 steps', {
            path: `${p}.step`,
          }),
        );
      if (s.default < s.min || s.default > s.max)
        out.push(
          diag(CODES.SETTING_DEFAULT_INVALID, 'error', 'default is outside min..max', {
            path: `${p}.default`,
          }),
        );
    } else if (s.type === 'select') {
      out.push(
        ...duplicates(
          s.options.map((o) => o.value),
          (j) => `${p}.options.${j}.value`,
          'option',
        ),
      );
      if (!isValidSettingValue(s, s.default))
        out.push(
          diag(CODES.SETTING_DEFAULT_INVALID, 'error', 'default must be one of the option values', {
            path: `${p}.default`,
          }),
        );
    } else if (s.type === 'font') {
      s.options.forEach((o, j) => {
        if (normalizeFontFamily(o.value) === null)
          out.push(
            diag(
              CODES.SETTING_VALUE_INVALID,
              'error',
              `"${o.value}" is not a safe font-family list`,
              { path: `${p}.options.${j}.value` },
            ),
          );
      });
      if (!isValidSettingValue(s, s.default))
        out.push(
          diag(CODES.SETTING_DEFAULT_INVALID, 'error', 'default must be one of the option values', {
            path: `${p}.default`,
          }),
        );
    } else if (s.type === 'color' && !isValidSettingValue(s, s.default)) {
      out.push(
        diag(
          CODES.SETTING_DEFAULT_INVALID,
          'error',
          'default must be a hex, named or functional color',
          { path: `${p}.default` },
        ),
      );
    }
  });
  return out;
}

export interface TemplateContext {
  /** Installed adapters by id. When given, adapter/route/component references are checked. */
  adapters?: Readonly<Record<string, Adapter>>;
}

const TEMPLATE_FIELDS = Object.keys(TemplateSchema.entries);

export function validateTemplate(
  input: unknown,
  ctx: TemplateContext = {},
): ValidationResult<TemplateManifest> {
  const { value: m, diagnostics } = structural(TemplateSchema, input);
  diagnostics.push(...unknownFields(input, TEMPLATE_FIELDS, ''));
  if (!m) return { ok: false, diagnostics };

  const d = diagnostics;
  const settings = m.settings ?? [];
  const settingById = new Map(settings.map((s) => [s.id, s]));

  for (const field of ['name', 'summary'] as const) {
    if (OFFICIAL_WORDS.test(m[field]))
      d.push(
        diag(CODES.NAME_IMPLIES_OFFICIAL, 'error', `${field} must not imply official affiliation`, {
          path: field,
        }),
      );
  }

  d.push(
    ...duplicates(
      settings.map((s) => s.id),
      (i) => `settings.${i}.id`,
      'setting id',
    ),
  );
  d.push(
    ...duplicates(
      (m.variants ?? []).map((x) => x.id),
      (i) => `variants.${i}.id`,
      'variant id',
    ),
  );
  d.push(
    ...duplicates(
      (m.assets ?? []).map((x) => x.id),
      (i) => `assets.${i}.id`,
      'asset id',
    ),
  );
  d.push(
    ...duplicates(
      m.targets.map((t) => t.adapter),
      (i) => `targets.${i}.adapter`,
      'target adapter',
    ),
  );
  d.push(...checkSettings(settings));
  d.push(...checkTokens(m.tokens?.defaults, 'tokens.defaults'));

  const covers = m.previews.filter((p) => p.role === 'cover').length;
  if (covers !== 1)
    d.push(
      diag(
        CODES.COVER_PREVIEW_COUNT,
        'error',
        `Exactly one preview must have role "cover" (found ${covers})`,
        { path: 'previews' },
      ),
    );

  (m.assets ?? []).forEach((a, i) => {
    const ext = a.file.slice(a.file.lastIndexOf('.') + 1);
    if ((a.kind === 'font') !== (ext === 'woff2'))
      d.push(
        diag(CODES.MANIFEST_INVALID, 'error', 'Fonts must be .woff2 and only fonts may be .woff2', {
          path: `assets.${i}.file`,
        }),
      );
    if (a.kind === 'font' && !a.license)
      d.push(
        diag(CODES.MANIFEST_INVALID, 'error', 'Fonts must declare an open license', {
          path: `assets.${i}.license`,
        }),
      );
  });

  (m.variants ?? []).forEach((variant, i) => {
    for (const [id, value] of Object.entries(variant.settings ?? {})) {
      const s = settingById.get(id);
      const p = `variants.${i}.settings.${id}`;
      if (!s)
        d.push(diag(CODES.SETTING_REF_UNKNOWN, 'error', `Unknown setting "${id}"`, { path: p }));
      else if (!isValidSettingValue(s, value))
        d.push(
          diag(CODES.SETTING_VALUE_INVALID, 'error', `Invalid value for setting "${id}"`, {
            path: p,
          }),
        );
    }
    d.push(...checkTokens(variant.tokens, `variants.${i}.tokens`));
  });

  m.targets.forEach((t, ti) => {
    const tp = `targets.${ti}`;
    (t.hide ?? []).forEach((h, hi) => {
      if (!h.when) return;
      const id = h.when.replace(/^!/, '');
      const s = settingById.get(id);
      const p = `${tp}.hide.${hi}.when`;
      if (!s)
        d.push(diag(CODES.SETTING_REF_UNKNOWN, 'error', `Unknown setting "${id}"`, { path: p }));
      else if (s.type !== 'boolean')
        d.push(
          diag(CODES.SETTING_REF_NOT_BOOLEAN, 'error', `"${id}" must be a boolean setting`, {
            path: p,
          }),
        );
    });

    const adapter = ctx.adapters?.[t.adapter];
    if (!ctx.adapters) return;
    if (!adapter) {
      d.push(
        diag(CODES.ADAPTER_REF_UNKNOWN, 'error', `Unknown adapter "${t.adapter}"`, {
          path: `${tp}.adapter`,
        }),
      );
      return;
    }
    if (!satisfies(adapter.version, t.adapterRange))
      d.push(
        diag(
          CODES.ADAPTER_RANGE_UNSATISFIED,
          'warning',
          `Installed ${t.adapter}@${adapter.version} is outside ${t.adapterRange}`,
          {
            path: `${tp}.adapterRange`,
          },
        ),
      );
    const routeRefs: [string, string][] = [
      ...(t.routes ?? []).map((r, i): [string, string] => [r, `${tp}.routes.${i}`]),
      ...t.styles.flatMap((s, si) =>
        (s.routes ?? []).map((r, i): [string, string] => [r, `${tp}.styles.${si}.routes.${i}`]),
      ),
      ...(t.hide ?? []).flatMap((h, hi) =>
        (h.routes ?? []).map((r, i): [string, string] => [r, `${tp}.hide.${hi}.routes.${i}`]),
      ),
    ];
    for (const [route, p] of routeRefs) {
      if (!Object.hasOwn(adapter.routes, route))
        d.push(
          diag(CODES.ROUTE_UNKNOWN, 'error', `Adapter "${t.adapter}" has no route "${route}"`, {
            path: p,
          }),
        );
    }
    (t.hide ?? []).forEach((h, hi) => {
      const c = Object.hasOwn(adapter.components, h.component)
        ? adapter.components[h.component]
        : undefined;
      const p = `${tp}.hide.${hi}.component`;
      if (!c)
        d.push(
          diag(
            CODES.COMPONENT_UNKNOWN,
            'error',
            `Adapter "${t.adapter}" has no component "${h.component}"`,
            { path: p },
          ),
        );
      else if (c.protected)
        d.push(
          diag(
            CODES.PROTECTED_COMPONENT_HIDDEN,
            'error',
            `"${h.component}" is protected and cannot be hidden`,
            { path: p },
          ),
        );
    });
  });

  return { ok: !hasErrors(d), value: m, diagnostics: d };
}

const ADAPTER_FIELDS = Object.keys(AdapterSchema.entries);

export function validateAdapter(input: unknown): ValidationResult<Adapter> {
  const { value: a, diagnostics: d } = structural(AdapterSchema, input);
  d.push(...unknownFields(input, ADAPTER_FIELDS, ''));
  if (!a) return { ok: false, diagnostics: d };

  const hasRoute = (r: string) => Object.hasOwn(a.routes, r);
  const hasComponent = (c: string) => Object.hasOwn(a.components, c);

  for (const [id, c] of Object.entries(a.components)) {
    (c.routes ?? []).forEach((r, i) => {
      if (r !== '*' && !hasRoute(r))
        d.push(
          diag(CODES.ROUTE_UNKNOWN, 'error', `Unknown route "${r}"`, {
            path: `components.${id}.routes.${i}`,
          }),
        );
    });
  }
  (a.probes ?? []).forEach((p, i) => {
    if (!hasComponent(p.component))
      d.push(
        diag(CODES.COMPONENT_UNKNOWN, 'error', `Unknown component "${p.component}"`, {
          path: `probes.${i}.component`,
        }),
      );
    if (!hasRoute(p.route))
      d.push(
        diag(CODES.ROUTE_UNKNOWN, 'error', `Unknown route "${p.route}"`, {
          path: `probes.${i}.route`,
        }),
      );
  });
  (a.shadowRoots ?? []).forEach((s, i) => {
    s.components.forEach((c, j) => {
      if (!hasComponent(c))
        d.push(
          diag(CODES.COMPONENT_UNKNOWN, 'error', `Unknown component "${c}"`, {
            path: `shadowRoots.${i}.components.${j}`,
          }),
        );
    });
  });
  if (!Object.values(a.routes).some((r) => !r.sensitive))
    d.push(
      diag(CODES.MANIFEST_INVALID, 'error', 'Adapter needs at least one non-sensitive route', {
        path: 'routes',
      }),
    );

  return { ok: !hasErrors(d), value: a, diagnostics: d };
}

export function validatePalette(input: unknown): ValidationResult<Palette> {
  const { value: p, diagnostics: d } = structural(PaletteSchema, input);
  if (!p) return { ok: false, diagnostics: d };

  const trees: [string, Palette['tokens'] | undefined][] = [
    ['tokens', p.tokens],
    ['modes.light', p.modes?.light],
    ['modes.dark', p.modes?.dark],
  ];
  for (const [path, tree] of trees) {
    if (!tree) continue;
    const { tokens, unknown, invalid } = flattenTokenTree(tree);
    for (const name of unknown)
      d.push(
        diag(
          CODES.TOKEN_UNKNOWN,
          'warning',
          `"${name}" is not a standard/v1 token and is ignored`,
          { path: `${path}.${name}` },
        ),
      );
    for (const name of invalid)
      d.push(
        diag(CODES.TOKEN_VALUE_INVALID, 'error', `Unsupported value for "${name}"`, {
          path: `${path}.${name}`,
        }),
      );
    d.push(...checkTokens(tokens as Record<string, string | number>, path));
  }
  return { ok: !hasErrors(d), value: p, diagnostics: d };
}
