/**
 * Adapter health on this device (T-3.3, extension-architecture §7). Probes are the
 * adapter's own list of components that should (or shouldn't) be on a route; the
 * popup turns their results into "Works here" or "May be broken". Pure functions;
 * the runtime decides when to run them.
 */
import type { CompiledProbe, Health, HealthStatus } from '@reskin/schema/runtime';

/** First check after the page settles, then a recheck of anything that failed (late renders). */
export const PROBE_DELAY_MS = 2000;
export const PROBE_RECHECK_MS = 6000;
/** Unchanged results are rewritten at most this often, so `checkedAt` stays meaningful. */
export const HEALTH_REFRESH_MS = 6 * 60 * 60 * 1000;
/** Share of the theme map's site variables that must exist for colours to count as working. */
export const THEME_MIN_SHARE = 0.5;

/** Component id → whether its probe passed. */
export function runProbes(
  doc: Document,
  probes: readonly CompiledProbe[],
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const p of probes) {
    let found = false;
    try {
      found = doc.querySelector(p.selector) !== null;
    } catch {
      found = false; // an invalid selector is a failed probe, not a crash
    }
    out[p.component] = p.expect === 'present' ? found : !found;
  }
  return out;
}

/** Whether enough of `vars` are defined on the root element. Call with our sheets off. */
export function themeDefined(win: Window, vars: readonly string[]): boolean {
  if (vars.length === 0) return true;
  const cs = win.getComputedStyle(win.document.documentElement);
  const defined = vars.filter((name) => cs.getPropertyValue(name).trim() !== '').length;
  return defined >= Math.ceil(vars.length * THEME_MIN_SHARE);
}

export interface HealthUpdate {
  adapterVersion: string;
  route: string;
  probes: Record<string, boolean>;
  /** Undefined when not checked. */
  theme?: boolean;
}

/** The next health record, or null when nothing changed and nothing is stale. */
export function mergeHealth(prev: Health | null, update: HealthUpdate, now: number): Health | null {
  const base: Health =
    prev && prev.adapterVersion === update.adapterVersion
      ? prev
      : { adapterVersion: update.adapterVersion, probes: {} };
  let changed = base !== prev;
  const status = (passed: boolean): HealthStatus => (passed ? 'ok' : 'failed');
  const stale = (checkedAt: number) => now - checkedAt >= HEALTH_REFRESH_MS;

  const probes = { ...base.probes };
  for (const [component, passed] of Object.entries(update.probes)) {
    const old = probes[component];
    if (
      !old ||
      old.status !== status(passed) ||
      old.route !== update.route ||
      stale(old.checkedAt)
    ) {
      probes[component] = { status: status(passed), route: update.route, checkedAt: now };
      changed = true;
    }
  }
  let theme = base.theme;
  if (update.theme !== undefined) {
    if (!theme || theme.status !== status(update.theme) || stale(theme.checkedAt)) {
      theme = { status: status(update.theme), checkedAt: now };
      changed = true;
    }
  }
  if (!changed) return null;
  return { adapterVersion: base.adapterVersion, probes, ...(theme ? { theme } : {}) };
}
