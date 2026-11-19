/**
 * Content-script runtime (T-2.6): reads `rk:compiled:<adapter>` and `rk:prefs`,
 * applies the route-group sheets, follows SPA navigation and storage changes.
 * No framework, no compiler; only validation and route matching from @reskin/schema.
 */
import { matchRoute } from '@reskin/schema/routes';
import {
  type CompiledTemplate,
  compiledKey,
  DEFAULT_PREFS,
  type Health,
  healthKey,
  PrefsSchema,
  parseCompiled,
  parseHealth,
  parseStored,
  STORAGE_KEYS,
} from '@reskin/schema/runtime';
import { ProtectedGuard } from './guard';
import { type Listen, watchNavigation } from './navigation';
import { mergeHealth, PROBE_DELAY_MS, PROBE_RECHECK_MS, runProbes, themeDefined } from './probes';
import { enabledGroups, SheetSet } from './sheets';

/** How long the previous route's sheets stay on after the URL changes (extension-architecture §4). */
export const GRACE_MS = 1500;

export interface RuntimeEnv {
  win: Window;
  adapterId: string;
  storage: {
    get: (keys: string[]) => Promise<Record<string, unknown>>;
    set: (items: Record<string, unknown>) => Promise<void>;
    onChanged: (cb: (changes: Record<string, { newValue?: unknown }>) => void) => void;
  };
  listen: Listen;
  every: (ms: number, fn: () => void) => void;
  after: (ms: number, fn: () => void) => () => void;
  /** Monotonic time (guard rechecks). */
  now: () => number;
  /** Wall-clock time (health `checkedAt`). */
  date: () => number;
}

export class Runtime {
  readonly #env: RuntimeEnv;
  readonly #sheets: SheetSet;
  readonly #guard: ProtectedGuard;
  #compiled: CompiledTemplate | null = null;
  #paused = false;
  #path: string;
  #route: string | null = null;
  #sensitive = false;
  #graceRoute: string | null = null;
  #cancelGrace: (() => void) | null = null;
  #cancelProbes: (() => void) | null = null;
  #health: Health | null = null;
  /** The theme map is checked once per page load. */
  #themeChecked = false;

  constructor(env: RuntimeEnv) {
    this.#env = env;
    this.#sheets = new SheetSet(env.win.document);
    this.#guard = new ProtectedGuard({
      doc: env.win.document,
      suspend: (s) => (s ? this.#sheets.setEnabled([]) : this.#toggle()),
    });
    this.#path = env.win.location.pathname;
  }

  async start(): Promise<void> {
    const ck = compiledKey(this.#env.adapterId);
    const hk = healthKey(this.#env.adapterId);
    this.#env.storage.onChanged((changes) => {
      if (ck in changes) this.#setCompiled(changes[ck]?.newValue);
      if (STORAGE_KEYS.prefs in changes) this.#setPrefs(changes[STORAGE_KEYS.prefs]?.newValue);
      if (hk in changes) this.#setHealth(changes[hk]?.newValue);
      if (ck in changes || STORAGE_KEYS.prefs in changes) this.#render();
    });
    const data = await this.#env.storage.get([ck, STORAGE_KEYS.prefs, hk]);
    this.#setCompiled(data[ck]);
    this.#setPrefs(data[STORAGE_KEYS.prefs]);
    this.#setHealth(data[hk]);
    this.#render();
    watchNavigation(
      this.#env.win,
      this.#compiled?.navigationEvents ?? [],
      {
        onUrlChange: () => this.#onUrlChange(),
        onFinished: () => this.#endGrace(),
        onTick: () => this.#onTick(),
      },
      this.#env.listen,
      this.#env.every,
    );
    this.#env.listen(this.#env.win.document, 'visibilitychange', () => this.#sheets.adopt());
  }

  #setCompiled(value: unknown): void {
    this.#compiled = value === undefined ? null : parseCompiled(value);
    this.#guard.setSelectors(this.#compiled?.protectedSelectors ?? []);
  }

  #setPrefs(value: unknown): void {
    this.#paused = parseStored(PrefsSchema, value, DEFAULT_PREFS).paused;
  }

  #setHealth(value: unknown): void {
    this.#health = value === undefined ? null : parseHealth(value);
  }

  #render(): void {
    const c = this.#compiled;
    if (!c) {
      this.#sheets.clear();
      return;
    }
    this.#matchRoute();
    this.#sheets.update(c.groups.map((g) => g.css));
    this.#guard.check(this.#env.now());
    this.#toggle();
    this.#scheduleProbes();
  }

  #matchRoute(): void {
    const c = this.#compiled;
    const m = c
      ? matchRoute(c.routeTable, c.sensitiveRoutes, this.#path)
      : { route: null, sensitive: false };
    this.#route = m.route;
    this.#sensitive = m.sensitive;
  }

  #toggle(): void {
    const c = this.#compiled;
    if (!c) return;
    this.#sheets.setEnabled(
      enabledGroups(c.groups, {
        route: this.#route,
        sensitive: this.#sensitive,
        graceRoute: this.#graceRoute,
        off: this.#paused || this.#guard.active,
      }),
    );
  }

  #onUrlChange(): void {
    const path = this.#env.win.location.pathname;
    if (path === this.#path) return;
    this.#path = path;
    const previous = this.#route;
    this.#matchRoute();
    if (previous !== this.#route && previous !== null && !this.#sensitive) {
      this.#graceRoute = previous;
      this.#cancelGrace?.();
      this.#cancelGrace = this.#env.after(GRACE_MS, () => this.#endGrace());
    } else if (this.#sensitive) {
      this.#graceRoute = null;
    }
    this.#sheets.adopt();
    this.#guard.check(this.#env.now());
    this.#toggle();
    this.#scheduleProbes();
  }

  #endGrace(): void {
    this.#cancelGrace?.();
    this.#cancelGrace = null;
    this.#scheduleProbes(); // the new page has rendered (or the grace timer ran out)
    if (this.#graceRoute === null) return;
    this.#graceRoute = null;
    this.#toggle();
  }

  /** Runs the current route's probes once the page has settled; never on sensitive routes. */
  #scheduleProbes(): void {
    this.#cancelProbes?.();
    this.#cancelProbes = null;
    const c = this.#compiled;
    const route = this.#route;
    if (!c || route === null || this.#sensitive || this.#paused) return;
    const probes = c.probes.filter((p) => p.route === route);
    const checkTheme = !this.#themeChecked && c.themeVars.length > 0;
    if (probes.length === 0 && !checkTheme) return;
    const doc = this.#env.win.document;
    this.#cancelProbes = this.#env.after(PROBE_DELAY_MS, () => {
      const results = runProbes(doc, probes);
      const theme = checkTheme ? this.#checkTheme(c.themeVars) : undefined;
      const failed = probes.filter((p) => !results[p.component]);
      const record = (r: Record<string, boolean>) =>
        this.#recordHealth({ adapterVersion: c.adapterVersion, route, probes: r, theme });
      if (failed.length === 0) return record(results);
      this.#cancelProbes = this.#env.after(PROBE_RECHECK_MS, () =>
        record({ ...results, ...runProbes(doc, failed) }),
      );
    });
  }

  /** Our own theme rule defines these variables, so measure with our sheets off (no paint in between). */
  #checkTheme(vars: readonly string[]): boolean {
    this.#themeChecked = true;
    this.#sheets.setEnabled([]);
    const ok = themeDefined(this.#env.win, vars);
    this.#toggle();
    return ok;
  }

  #recordHealth(update: Parameters<typeof mergeHealth>[1]): void {
    const next = mergeHealth(this.#health, update, this.#env.date());
    if (!next) return;
    this.#health = next;
    void this.#env.storage.set({ [healthKey(this.#env.adapterId)]: next }).catch(() => undefined); // health is best-effort
  }

  #onTick(): void {
    if (this.#compiled && this.#guard.check(this.#env.now())) this.#toggle();
  }
}
