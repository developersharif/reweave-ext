/**
 * URL-change detection for single-page sites (T-2.2, extension-architecture §4):
 * Navigation API `currententrychange` first, then `popstate`/`pageshow`, then a
 * visible-only poll. Adapter `navigationEvents` signal "navigation finished".
 */
export interface NavigationHooks {
  /** The URL may have changed (cheap to call; compare yourself). */
  onUrlChange: () => void;
  /** The site says the new page is rendered. */
  onFinished: () => void;
  /** Runs every poll tick while the page is visible. */
  onTick: () => void;
}

export type Listen = (target: EventTarget, type: string, handler: () => void) => void;

export const POLL_MS = 750;

export function watchNavigation(
  win: Window,
  events: readonly string[],
  hooks: NavigationHooks,
  listen: Listen,
  every: (ms: number, fn: () => void) => void,
): void {
  const nav = (win as Window & { navigation?: EventTarget }).navigation;
  if (nav) listen(nav, 'currententrychange', hooks.onUrlChange);
  listen(win, 'popstate', hooks.onUrlChange);
  listen(win, 'pageshow', hooks.onUrlChange);
  for (const name of events) {
    listen(win.document, name, () => {
      hooks.onUrlChange();
      hooks.onFinished();
    });
  }
  every(POLL_MS, () => {
    if (win.document.visibilityState !== 'visible') return;
    hooks.onUrlChange();
    hooks.onTick();
  });
}
