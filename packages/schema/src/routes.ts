/**
 * Route matching for adapter `routes` (template-schema.md §11). Pure and tiny:
 * the content script imports it, so it must not pull in Valibot.
 *
 * Patterns are matched against `location.pathname`, case-sensitively and anchored at
 * both ends. `*` matches any run of characters, including `/`. A trailing slash on the
 * path is ignored (except for `/` itself). Sensitive routes win over everything; then
 * the first matching route in table order.
 */

export type RouteTable = Readonly<Record<string, readonly string[]>>;

export interface RouteMatch {
  /** Adapter route id, or null when no route matches (nothing applies there). */
  route: string | null;
  sensitive: boolean;
}

const cache = new Map<string, RegExp>();

export function routePatternToRegExp(pattern: string): RegExp {
  let re = cache.get(pattern);
  if (!re) {
    const body = pattern
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');
    re = new RegExp(`^${body}$`);
    cache.set(pattern, re);
  }
  return re;
}

export function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function pathMatches(patterns: readonly string[], pathname: string): boolean {
  const path = normalizePath(pathname);
  return patterns.some((p) => routePatternToRegExp(p).test(path));
}

export function matchRoute(
  table: RouteTable,
  sensitiveRoutes: readonly string[],
  pathname: string,
): RouteMatch {
  for (const id of sensitiveRoutes) {
    const patterns = table[id];
    if (patterns && pathMatches(patterns, pathname)) return { route: id, sensitive: true };
  }
  for (const [id, patterns] of Object.entries(table)) {
    if (pathMatches(patterns, pathname)) return { route: id, sensitive: false };
  }
  return { route: null, sensitive: false };
}
