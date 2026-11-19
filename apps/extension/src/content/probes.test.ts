import type { CompiledProbe, Health } from '@reskin/schema/runtime';
import { describe, expect, it } from 'vitest';
import { HEALTH_REFRESH_MS, mergeHealth, runProbes, themeDefined } from './probes';

const probe = (component: string, selector: string, expect: 'present' | 'absent' = 'present') =>
  ({ component, route: 'watch', selector, expect }) satisfies CompiledProbe;

describe('runProbes', () => {
  const doc = {
    querySelector: (s: string) => {
      if (s === ':bad(') throw new SyntaxError('invalid');
      return s === 'ytd-masthead' ? {} : null;
    },
  } as unknown as Document;

  it('passes present probes that match and absent probes that do not; bad selectors fail', () => {
    expect(
      runProbes(doc, [
        probe('masthead', 'ytd-masthead'),
        probe('comments', 'ytd-comments'),
        probe('promo', 'ytd-promo', 'absent'),
        probe('broken', ':bad('),
      ]),
    ).toEqual({ masthead: true, comments: false, promo: true, broken: false });
  });
});

describe('themeDefined', () => {
  const win = (defined: string[]) =>
    ({
      document: { documentElement: {} },
      getComputedStyle: () => ({
        getPropertyValue: (n: string) => (defined.includes(n) ? '#fff' : ''),
      }),
    }) as unknown as Window;

  it('needs at least half of the variables', () => {
    expect(themeDefined(win(['--a', '--b']), ['--a', '--b', '--c', '--d'])).toBe(true);
    expect(themeDefined(win(['--a']), ['--a', '--b', '--c', '--d'])).toBe(false);
    expect(themeDefined(win([]), [])).toBe(true);
  });
});

describe('mergeHealth', () => {
  const update = {
    adapterVersion: '1.1.0',
    route: 'watch',
    probes: { masthead: true, comments: false },
  };

  it('creates a record, then only writes when something changes or goes stale', () => {
    const first = mergeHealth(null, update, 1000) as Health;
    expect(first).toEqual({
      adapterVersion: '1.1.0',
      probes: {
        masthead: { status: 'ok', route: 'watch', checkedAt: 1000 },
        comments: { status: 'failed', route: 'watch', checkedAt: 1000 },
      },
    });
    expect(mergeHealth(first, update, 2000)).toBeNull();
    const fixed = mergeHealth(first, { ...update, probes: { comments: true } }, 3000);
    expect(fixed?.probes.comments).toEqual({ status: 'ok', route: 'watch', checkedAt: 3000 });
    expect(fixed?.probes.masthead?.checkedAt).toBe(1000);
    expect(mergeHealth(first, update, 1000 + HEALTH_REFRESH_MS)?.probes.masthead?.checkedAt).toBe(
      1000 + HEALTH_REFRESH_MS,
    );
  });

  it('starts over when the adapter version changes, and records the theme check', () => {
    const first = mergeHealth(null, update, 1000) as Health;
    const next = mergeHealth(
      first,
      { adapterVersion: '1.2.0', route: 'home', probes: { masthead: true }, theme: false },
      2000,
    );
    expect(next).toEqual({
      adapterVersion: '1.2.0',
      probes: { masthead: { status: 'ok', route: 'home', checkedAt: 2000 } },
      theme: { status: 'failed', checkedAt: 2000 },
    });
  });
});
