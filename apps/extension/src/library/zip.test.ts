import { describe, expect, it } from 'vitest';
import { makeZip } from './make-zip';
import { crc32, toBase64Files, unzip, ZipError } from './zip';

const text = (b: Uint8Array | undefined) => new TextDecoder().decode(b);

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('unzip', () => {
  it('reads stored and deflated entries', async () => {
    for (const deflate of [false, true]) {
      const files = await unzip(
        await makeZip(
          { 'template.json': '{"a":1}', 'styles/base.css': 'a{}'.repeat(100) },
          { deflate },
        ),
      );
      expect([...files.keys()]).toEqual(['template.json', 'styles/base.css']);
      expect(text(files.get('styles/base.css'))).toBe('a{}'.repeat(100));
    }
  });

  it('strips a single top-level folder and OS junk', async () => {
    const files = await unzip(
      await makeZip({
        'my-template/template.json': '{}',
        'my-template/styles/base.css': '',
        'my-template/.DS_Store': 'x',
        'my-template/.git/config': 'x',
      }),
    );
    expect([...files.keys()]).toEqual(['template.json', 'styles/base.css']);
  });

  it.each([
    ['../evil.css', 'Unsafe file name'],
    ['/etc/passwd', 'Unsafe file name'],
    ['styles\\base.css', 'Unsafe file name'],
    ['styles/./base.css', 'Unsafe file name'],
  ])('refuses the path %s', async (name, message) => {
    await expect(unzip(await makeZip({ 'template.json': '{}', [name]: 'x' }))).rejects.toThrow(
      message,
    );
  });

  it('refuses non-zips, oversize archives, lying sizes and bad checksums', async () => {
    await expect(unzip(new TextEncoder().encode('hello'))).rejects.toBeInstanceOf(ZipError);

    const big = await makeZip(
      { 'template.json': '{}', 'a.css': 'a'.repeat(2 * 1024 * 1024) },
      { deflate: true },
    );
    await expect(unzip(big)).rejects.toThrow('larger than 2 MB');

    // A deflated entry that claims to be smaller than it is (zip bomb shape).
    const bomb = await makeZip({ 'template.json': 'x'.repeat(5000) }, { deflate: true });
    const view = new DataView(bomb.buffer);
    const central = bomb.length - 22 - (46 + 'template.json'.length);
    view.setUint32(central + 24, 100, true);
    await expect(unzip(bomb)).rejects.toThrow('larger than the zip says');

    const corrupt = await makeZip({ 'template.json': '{"a":1}' });
    corrupt[30 + 'template.json'.length] = 0x5b; // flip the first byte of the data
    await expect(unzip(corrupt)).rejects.toThrow('Checksum mismatch');
  });

  it('encodes files as base64 for the request', () => {
    const out = toBase64Files(new Map([['a.txt', new TextEncoder().encode('hi')]]));
    expect(out).toEqual({ 'a.txt': 'aGk=' });
  });
});
