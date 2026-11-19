/**
 * Site Adapter schema — template-schema.md §11. Selector *syntax* is checked by the
 * compiler (it owns the CSS parser); everything else is checked here.
 */
import * as v from 'valibot';
import { CSS_CUSTOM_PROPERTY, EVENT_NAME, HOSTNAME, KEBAB_ID, ROUTE_PATH } from './patterns.ts';
import { VersionSchema } from './template.ts';

const kebab = v.pipe(v.string(), v.regex(KEBAB_ID, 'Must be kebab-case'));
const routePath = v.pipe(
  v.string(),
  v.maxLength(200),
  v.regex(ROUTE_PATH, 'Route paths start with / and use * as the only wildcard'),
);

export const RouteSchema = v.object({
  path: v.union([routePath, v.pipe(v.array(routePath), v.minLength(1), v.maxLength(16))]),
  sensitive: v.optional(v.boolean()),
});

export const ComponentSchema = v.object({
  selector: v.pipe(v.string(), v.minLength(1), v.maxLength(2000)),
  /** Route ids where the component exists; `*` = everywhere (default). */
  routes: v.optional(v.pipe(v.array(v.union([kebab, v.literal('*')])), v.minLength(1))),
  /** Consent/security/legal UI: templates may not style or hide it. */
  protected: v.optional(v.boolean()),
  description: v.optional(v.pipe(v.string(), v.maxLength(200))),
});

const cssVar = v.pipe(
  v.string(),
  v.regex(CSS_CUSTOM_PROPERTY, 'Must be a CSS custom property name'),
);
/** Token names are checked against `standard/v1` semantically (validateAdapter). */
const tokenKey = v.pipe(v.string(), v.maxLength(40));

/**
 * How the site's own colour variables relate to the standard tokens (template-schema §11.2,
 * D-033). Platform-maintained, like selectors.
 */
export const ThemeSchema = v.object({
  /** Elements where the site defines its theme variables, e.g. `:root, [dark], [light]`. */
  scope: v.pipe(v.string(), v.minLength(1), v.maxLength(500)),
  /** Token → the site variable it reads when no template, variant or palette sets it. */
  follow: v.optional(v.record(tokenKey, cssVar)),
  /** Token → the site variables that take the token's value when something sets it. */
  bind: v.optional(v.record(tokenKey, v.pipe(v.array(cssVar), v.minLength(1), v.maxLength(64)))),
});

export const AdapterSchema = v.object({
  $schema: v.optional(v.pipe(v.string(), v.maxLength(200))),
  schemaVersion: v.literal(1),
  id: kebab,
  version: VersionSchema,
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(60)),
  hosts: v.pipe(
    v.array(v.pipe(v.string(), v.regex(HOSTNAME, 'Must be a lowercase hostname'))),
    v.minLength(1),
    v.maxLength(8),
  ),
  routes: v.record(kebab, RouteSchema),
  components: v.record(kebab, ComponentSchema),
  shadowRoots: v.optional(
    v.array(
      v.object({
        host: v.pipe(v.string(), v.minLength(1), v.maxLength(500)),
        components: v.array(kebab),
      }),
    ),
  ),
  navigationEvents: v.optional(
    v.pipe(v.array(v.pipe(v.string(), v.regex(EVENT_NAME))), v.maxLength(8)),
  ),
  probes: v.optional(
    v.array(
      v.object({ component: kebab, route: kebab, expect: v.picklist(['present', 'absent']) }),
    ),
  ),
  theme: v.optional(ThemeSchema),
});

export type Adapter = v.InferOutput<typeof AdapterSchema>;
export type AdapterRoute = v.InferOutput<typeof RouteSchema>;
export type AdapterComponent = v.InferOutput<typeof ComponentSchema>;
export type AdapterTheme = v.InferOutput<typeof ThemeSchema>;
