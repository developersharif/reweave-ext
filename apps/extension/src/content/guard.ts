/**
 * Protected-component guard (T-2.9): while consent/security UI declared `protected`
 * by the adapter is on screen, the template is switched off, so no CSS (not even on
 * an ancestor, which static checks can't catch) can hide or disguise it.
 *
 * Visibility is judged with our sheets disabled, so a template that hides an ancestor
 * can't make the dialog look "already gone".
 */
export interface GuardDeps {
  doc: Document;
  /** Temporarily disables (true) or restores (false) our sheets, synchronously. */
  suspend: (suspended: boolean) => void;
}

const RECHECK_MS = 3000;

function isVisible(el: Element): boolean {
  const check = (el as Element & { checkVisibility?: (o?: object) => boolean }).checkVisibility;
  if (typeof check === 'function') {
    return check.call(el, { checkOpacity: true, checkVisibilityCSS: true });
  }
  return el.getClientRects().length > 0;
}

export class ProtectedGuard {
  readonly #deps: GuardDeps;
  #selectors: readonly string[] = [];
  #active = false;
  #lastElement: Element | null = null;
  #lastCheck = 0;

  constructor(deps: GuardDeps) {
    this.#deps = deps;
  }

  get active(): boolean {
    return this.#active;
  }

  setSelectors(selectors: readonly string[]): void {
    this.#selectors = selectors;
    this.#lastElement = null;
  }

  /** Re-evaluates the guard; returns true when its state changed. Call on load, navigation and poll. */
  check(now: number): boolean {
    const el = this.#find();
    const before = this.#active;
    if (!el) {
      this.#active = false;
    } else if (el !== this.#lastElement || this.#active || now - this.#lastCheck >= RECHECK_MS) {
      // Measure with our sheets off: two synchronous style recalcs, no paint in between.
      this.#deps.suspend(true);
      this.#active = isVisible(el);
      this.#deps.suspend(false);
      this.#lastCheck = now;
    }
    this.#lastElement = el;
    return before !== this.#active;
  }

  #find(): Element | null {
    for (const selector of this.#selectors) {
      try {
        const el = this.#deps.doc.querySelector(selector);
        if (el) return el;
      } catch {
        // An invalid selector can't match anything; the compiler already rejected it.
      }
    }
    return null;
  }
}
