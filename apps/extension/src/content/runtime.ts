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
  PrefsSchema,
  parseCompiled,
  parseStored,
  STORAGE_KEYS,
} from '@reskin/schema/runtime';
import { ProtectedGuard } from './guard';
import { type Listen, watchNavigation } from './navigation';
import { enabledGroups, SheetSet } from './sheets';

/** How long the previous route's sheets stay on after the URL changes (extension-architecture §4). */
export const GRACE_MS = 1500;

export interface RuntimeEnv {
  win: Window;
  adapterId: string;
  storage: {
    get: (keys: string[]) => Promise<Record<string, unknown>>;
    onChanged: (cb: (changes: Record<string, { newValue?: unknown }>) => void) => void;
  };
  listen: Listen;
  every: (ms: number, fn: () => void) => void;
  after: (ms: number, fn: () => void) => () => void;
  now: () => number;
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
    this.#env.storage.onChanged((changes) => {
      if (ck in changes) this.#setCompiled(changes[ck]?.newValue);
      if (STORAGE_KEYS.prefs in changes) this.#setPrefs(changes[STORAGE_KEYS.prefs]?.newValue);
      if (ck in changes || STORAGE_KEYS.prefs in changes) this.#render();
    });
    const data = await this.#env.storage.get([ck, STORAGE_KEYS.prefs]);
    this.#setCompiled(data[ck]);
    this.#setPrefs(data[STORAGE_KEYS.prefs]);
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
  }

  #endGrace(): void {
    this.#cancelGrace?.();
    this.#cancelGrace = null;
    if (this.#graceRoute === null) return;
    this.#graceRoute = null;
    this.#toggle();
  }

  #onTick(): void {
    if (this.#compiled && this.#guard.check(this.#env.now())) this.#toggle();
  }
}
