/**
 * Our adopted stylesheets on the page (extension-architecture §3.1): one
 * `CSSStyleSheet` per compiled route group, kept after the page's own adopted sheets,
 * toggled with `sheet.disabled`. No DOM nodes or attributes are added (T8).
 */
export class SheetSet {
  readonly #doc: Document;
  #sheets: CSSStyleSheet[] = [];
  #css: string[] = [];

  constructor(doc: Document) {
    this.#doc = doc;
  }

  get size(): number {
    return this.#sheets.length;
  }

  /** Makes our sheets hold exactly these CSS texts, reusing sheets whose text is unchanged. */
  update(cssTexts: readonly string[]): void {
    const next: CSSStyleSheet[] = [];
    cssTexts.forEach((css, i) => {
      const existing = this.#sheets[i];
      if (existing && this.#css[i] === css) {
        next.push(existing);
        return;
      }
      const sheet = existing ?? new CSSStyleSheet();
      sheet.replaceSync(css);
      next.push(sheet);
    });
    this.#sheets = next;
    this.#css = [...cssTexts];
    this.adopt();
  }

  /** Sets which of our sheets are enabled, by index. */
  setEnabled(enabled: readonly boolean[]): void {
    this.#sheets.forEach((sheet, i) => {
      const disabled = !enabled[i];
      if (sheet.disabled !== disabled) sheet.disabled = disabled;
    });
  }

  /**
   * Ensures our sheets are adopted, last and in order, keeping the page's own sheets.
   * Cheap when nothing changed, so it can run on every route change.
   */
  adopt(): void {
    const current = this.#doc.adoptedStyleSheets;
    const ours = new Set(this.#sheets);
    const theirs = current.filter((s) => !ours.has(s));
    const tail = current.slice(theirs.length);
    const inPlace =
      tail.length === this.#sheets.length && tail.every((s, i) => s === this.#sheets[i]);
    if (!inPlace) this.#doc.adoptedStyleSheets = [...theirs, ...this.#sheets];
  }

  /** Removes all our sheets from the page. */
  clear(): void {
    if (this.#sheets.length === 0) return;
    const ours = new Set(this.#sheets);
    this.#doc.adoptedStyleSheets = this.#doc.adoptedStyleSheets.filter((s) => !ours.has(s));
    this.#sheets = [];
    this.#css = [];
  }
}

export interface RouteState {
  /** Current adapter route, or null when the URL matches none. */
  route: string | null;
  sensitive: boolean;
  /** Previous route kept on during the navigation grace period (extension-architecture §4). */
  graceRoute: string | null;
  /** Global pause (options) or the protected-component guard (T-2.9). */
  off: boolean;
}

/** Which groups should be enabled. Sensitive routes and `off` disable everything. */
export function enabledGroups(
  groups: readonly { routes: readonly string[] }[],
  s: RouteState,
): boolean[] {
  if (s.off || s.sensitive) return groups.map(() => false);
  return groups.map(
    (g) =>
      (s.route !== null && g.routes.includes(s.route)) ||
      (s.graceRoute !== null && g.routes.includes(s.graceRoute)),
  );
}
