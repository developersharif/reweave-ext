import { describe, expect, it } from 'vitest';
import { isRange, isVersion, rangeFloor, satisfies } from './semver.ts';
import {
  normalizeFontFamily,
  settingCssVar,
  tokenCssVar,
  tokenFromDialect,
  tokenValueToCss,
} from './tokens.ts';

describe('semver', () => {
  it('parses versions', () => {
    expect(isVersion('1.2.3')).toBe(true);
    expect(isVersion('1.2.3-beta.1')).toBe(true);
    expect(isVersion('01.2.3')).toBe(false);
    expect(isVersion('1.2')).toBe(false);
  });

  it.each([
    ['2.3.1', '^2.0.0', true],
    ['3.0.0', '^2.0.0', false],
    ['0.2.5', '^0.2.0', true],
    ['0.3.0', '^0.2.0', false],
    ['1.2.9', '~1.2.0', true],
    ['1.3.0', '~1.2.0', false],
    ['5.0.0', '>=1.0.0', true],
    ['1.0.0', '1.0.0', true],
    ['2.0.0-rc.1', '^2.0.0', false],
    ['2.0.0-rc.1', '*', false],
    ['9.9.9', '*', true],
  ])('%s satisfies %s → %s', (version, range, expected) => {
    expect(satisfies(version, range)).toBe(expected);
  });

  it('validates ranges and finds floors', () => {
    expect(isRange('^2.0.0')).toBe(true);
    expect(isRange('latest')).toBe(false);
    expect(isRange('>2.0.0')).toBe(false);
    expect(rangeFloor('^2.1.0')).toBe('2.1.0');
    expect(rangeFloor('*')).toBe('0.0.0');
  });
});

describe('tokens', () => {
  it('maps dialect names to manifest names and CSS variables', () => {
    expect(tokenFromDialect('color-bg')).toBe('color.bg');
    expect(tokenFromDialect('color-text-muted')).toBe('color.text-muted');
    expect(tokenFromDialect('color-surface-2')).toBe('color.surface-2');
    expect(tokenFromDialect('color-nope')).toBeNull();
    expect(tokenFromDialect('bg')).toBeNull();
    expect(tokenCssVar('color.text-muted')).toBe('--rk-color-text-muted');
    expect(settingCssVar('maxWidth')).toBe('--rk-s-max-width');
  });

  it.each<[Parameters<typeof tokenValueToCss>[0], string | number, string | null]>([
    ['color.bg', '#0f0f10', '#0f0f10'],
    ['color.bg', 'oklch(0.7 0.1 250 / 0.5)', 'oklch(0.7 0.1 250 / 0.5)'],
    ['color.bg', 'rebeccapurple', 'rebeccapurple'],
    ['color.bg', 'red;}*{color:red', null],
    ['color.bg', 'url(x)', null],
    ['radius.md', '10px', '10px'],
    ['radius.md', 'calc(1px + 2px)', null],
    ['motion.duration', '150ms', '150ms'],
    ['font.scale', 1.25, '1.25'],
    ['font.scale', 99, null],
    ['font.body', 'Inter, sans-serif', '"Inter", sans-serif'],
    ['font.body', '"Inter"; }', null],
  ])('%s = %s → %s', (name, value, expected) => {
    expect(tokenValueToCss(name, value)).toBe(expected);
  });

  it('rejects long font stacks', () => {
    expect(normalizeFontFamily('a,b,c,d,e,f,g')).toBeNull();
  });
});
