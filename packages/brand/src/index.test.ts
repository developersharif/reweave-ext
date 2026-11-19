import { describe, expect, it } from 'vitest';
import { BRAND } from './index';

describe('BRAND', () => {
  it('fits Chrome Web Store manifest limits', () => {
    // name ≤ 75 chars, short_name ≤ 12 recommended, description ≤ 132 chars
    expect(BRAND.name.length).toBeLessThanOrEqual(75);
    expect(BRAND.shortName.length).toBeLessThanOrEqual(12);
    expect(BRAND.description.length).toBeLessThanOrEqual(132);
  });
});
