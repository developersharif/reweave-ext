import { describe, expect, it } from 'vitest';
import { ProtectedGuard } from './guard';
import { enabledGroups } from './sheets';

describe('enabledGroups', () => {
  const groups = [
    { routes: ['home', 'watch', 'search'] },
    { routes: ['watch'] },
    { routes: ['home'] },
  ];
  const base = { route: 'watch', sensitive: false, graceRoute: null, off: false };

  it('enables groups for the current route', () => {
    expect(enabledGroups(groups, base)).toEqual([true, true, false]);
    expect(enabledGroups(groups, { ...base, route: null })).toEqual([false, false, false]);
  });

  it('keeps the previous route on during the grace period', () => {
    expect(enabledGroups(groups, { ...base, route: 'home', graceRoute: 'watch' })).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('turns everything off on sensitive routes and when paused or guarded', () => {
    expect(enabledGroups(groups, { ...base, sensitive: true, graceRoute: 'home' })).toEqual([
      false,
      false,
      false,
    ]);
    expect(enabledGroups(groups, { ...base, off: true })).toEqual([false, false, false]);
  });
});

describe('ProtectedGuard', () => {
  /** A fake document with one optional element whose visibility depends on whether our sheets are suspended. */
  function setup(opts: { present: boolean; visibleWithoutUs: boolean; visibleWithUs: boolean }) {
    let suspended = false;
    const calls: boolean[] = [];
    const el = {
      checkVisibility: () => (suspended ? opts.visibleWithoutUs : opts.visibleWithUs),
      getClientRects: () => [],
    };
    const doc = { querySelector: () => (opts.present ? el : null) } as unknown as Document;
    const guard = new ProtectedGuard({
      doc,
      suspend: (s) => {
        suspended = s;
        calls.push(s);
      },
    });
    guard.setSelectors(['ytd-consent-bump-v2-lightbox']);
    return { guard, calls, opts };
  }

  it('is off when no protected element is present', () => {
    const { guard, calls } = setup({ present: false, visibleWithoutUs: true, visibleWithUs: true });
    expect(guard.check(0)).toBe(false);
    expect(guard.active).toBe(false);
    expect(calls).toEqual([]);
  });

  it('turns on when the element is visible without our styles, even if a template hides it', () => {
    const { guard, calls } = setup({ present: true, visibleWithoutUs: true, visibleWithUs: false });
    expect(guard.check(0)).toBe(true);
    expect(guard.active).toBe(true);
    expect(calls).toEqual([true, false]);
  });

  it('stays off when the site itself hides the element, and re-checks it periodically', () => {
    const { guard, calls, opts } = setup({
      present: true,
      visibleWithoutUs: false,
      visibleWithUs: false,
    });
    guard.check(0);
    expect(guard.active).toBe(false);
    guard.check(1000);
    expect(calls).toHaveLength(2); // no re-measure within 3 s
    opts.visibleWithoutUs = true; // the site shows it later
    expect(guard.check(3500)).toBe(true);
  });
});
