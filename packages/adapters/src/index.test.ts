import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index';

describe('package skeleton', () => {
  it('exports its name', () => {
    expect(PACKAGE_NAME).toMatch(/^@reskin\//);
  });
});
