import { describe, expect, it } from 'vitest';
import { matchRoute, pathMatches } from './routes.ts';

const table = {
  home: ['/'],
  watch: ['/watch'],
  shorts: ['/shorts/*'],
  channel: ['/@*', '/channel/*', '/c/*'],
  account: ['/account*'],
};

describe('routes', () => {
  it.each([
    ['/', 'home'],
    ['/watch', 'watch'],
    ['/watch/', 'watch'],
    ['/shorts/abc123', 'shorts'],
    ['/@YouTube', 'channel'],
    ['/@YouTube/videos', 'channel'],
    ['/channel/UC123', 'channel'],
    ['/feed/history', null],
    ['/watchlater', null],
    ['/Watch', null],
  ])('%s → %s', (path, route) => {
    expect(matchRoute(table, ['account'], path).route).toBe(route);
  });

  it('sensitive routes win and are flagged', () => {
    expect(matchRoute(table, ['account'], '/account_privacy')).toEqual({
      route: 'account',
      sensitive: true,
    });
    expect(matchRoute({ any: ['/*'], account: ['/account'] }, ['account'], '/account')).toEqual({
      route: 'account',
      sensitive: true,
    });
  });

  it('escapes regex characters in patterns', () => {
    expect(pathMatches(['/a.b'], '/a.b')).toBe(true);
    expect(pathMatches(['/a.b'], '/aXb')).toBe(false);
  });
});
