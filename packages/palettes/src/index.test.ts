import { flattenTokenTree, type Palette, validatePalette } from '@reskin/schema';
import { describe, expect, it } from 'vitest';
import { BUNDLED_PALETTES } from './index.ts';

describe('bundled palettes', () => {
  it.each(BUNDLED_PALETTES.map((p) => [(p as Palette).id, p]))('%s is valid', (_id, raw) => {
    const r = validatePalette(raw);
    expect(r.diagnostics).toEqual([]);
    const { tokens, unknown, invalid } = flattenTokenTree((r.value as Palette).tokens);
    expect(unknown).toEqual([]);
    expect(invalid).toEqual([]);
    // Every palette sets every colour token, so switching palettes never mixes two.
    expect(Object.keys(tokens).sort()).toEqual([
      'color.accent',
      'color.accent-text',
      'color.bg',
      'color.border',
      'color.danger',
      'color.link',
      'color.success',
      'color.surface',
      'color.surface-2',
      'color.text',
      'color.text-muted',
    ]);
  });

  it('has unique ids', () => {
    const ids = BUNDLED_PALETTES.map((p) => (p as Palette).id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
