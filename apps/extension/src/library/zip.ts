/**
 * Reads a template `.zip` in the options page (T-3.4). No dependency: the central
 * directory is parsed here and deflated entries go through the browser's
 * `DecompressionStream('deflate-raw')`. Defensive by default: sizes are checked
 * before and during inflation (zip bombs), paths must be plain relative paths, and
 * CRCs must match. The background validates the files again (security-model §3).
 */
import { BUNDLE_PATH, MAX_BUNDLE_BYTES, MAX_BUNDLE_FILES } from '@reskin/schema';

export class ZipError extends Error {}

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

let table: Uint32Array | undefined;
export function crc32(data: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of data) crc = (table[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Hidden files and folders (`.git/`, `.DS_Store`) and OS metadata; never part of a template. `.`/`..` are not skipped: they are refused. */
const JUNK = /(?:^|\/)(?:__MACOSX\/|\.(?!\.?(?:\/|$))|Thumbs\.db$)/;

interface Entry {
  name: string;
  method: number;
  crc: number;
  compressedSize: number;
  size: number;
  offset: number;
}

function readEntries(buf: Uint8Array): Entry[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipError('Not a zip file');
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  if (count === 0xffff || p === 0xffffffff) throw new ZipError('ZIP64 archives are not supported');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const entries: Entry[] = [];
  for (let i = 0; i < count; i++) {
    if (p + 46 > buf.length || view.getUint32(p, true) !== CENTRAL)
      throw new ZipError('Corrupt zip directory');
    const flags = view.getUint16(p + 8, true);
    const nameLength = view.getUint16(p + 28, true);
    const extraLength = view.getUint16(p + 30, true);
    const commentLength = view.getUint16(p + 32, true);
    if (flags & 1) throw new ZipError('Encrypted zips are not supported');
    let name: string;
    try {
      name = decoder.decode(buf.subarray(p + 46, p + 46 + nameLength));
    } catch {
      throw new ZipError('A file name is not valid UTF-8');
    }
    entries.push({
      name,
      method: view.getUint16(p + 10, true),
      crc: view.getUint32(p + 16, true),
      compressedSize: view.getUint32(p + 20, true),
      size: view.getUint32(p + 24, true),
      offset: view.getUint32(p + 42, true),
    });
    p += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflate(data: Uint8Array, size: number): Promise<Uint8Array> {
  const stream = new Blob([data as Uint8Array<ArrayBuffer>])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  const out = new Uint8Array(size);
  let n = 0;
  const reader = stream.getReader();
  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      throw new ZipError('A file in the zip is corrupt');
    }
    if (chunk.done) break;
    if (n + chunk.value.length > size) {
      await reader.cancel();
      throw new ZipError('A file is larger than the zip says');
    }
    out.set(chunk.value, n);
    n += chunk.value.length;
  }
  if (n !== size) throw new ZipError('A file is smaller than the zip says');
  return out;
}

/**
 * The files of a template `.zip`, by path. A single top-level folder holding
 * `template.json` is stripped, so zipping the template's folder works too.
 */
export async function unzip(buf: Uint8Array): Promise<Map<string, Uint8Array>> {
  const entries = readEntries(buf).filter((e) => !e.name.endsWith('/') && !JUNK.test(e.name));
  if (entries.length > MAX_BUNDLE_FILES) throw new ZipError(`More than ${MAX_BUNDLE_FILES} files`);
  const total = entries.reduce((sum, e) => sum + e.size, 0);
  if (total > MAX_BUNDLE_BYTES) throw new ZipError('The template is larger than 2 MB');

  const names = entries.map((e) => e.name);
  const top = names.includes('template.json')
    ? ''
    : (names.find((n) => /^[^/]+\/template\.json$/.test(n))?.split('/')[0] ?? '');
  const prefix = top && names.every((n) => n.startsWith(`${top}/`)) ? `${top}/` : '';

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const files = new Map<string, Uint8Array>();
  for (const e of entries) {
    const path = e.name.slice(prefix.length);
    if (path.length > 200 || !BUNDLE_PATH.test(path))
      throw new ZipError(`Unsafe file name: ${e.name}`);
    if (files.has(path)) throw new ZipError(`Duplicate file: ${path}`);
    if (e.offset + 30 > buf.length || view.getUint32(e.offset, true) !== LOCAL)
      throw new ZipError('Corrupt zip entry');
    const start =
      e.offset + 30 + view.getUint16(e.offset + 26, true) + view.getUint16(e.offset + 28, true);
    const raw = buf.subarray(start, start + e.compressedSize);
    if (raw.length !== e.compressedSize) throw new ZipError('Truncated zip');
    let data: Uint8Array;
    if (e.method === 0) {
      if (e.compressedSize !== e.size) throw new ZipError('Corrupt zip entry');
      data = raw.slice();
    } else if (e.method === 8) data = await inflate(raw, e.size);
    else throw new ZipError(`Unsupported compression in ${path}`);
    if (crc32(data) !== e.crc) throw new ZipError(`Checksum mismatch in ${path}`);
    files.set(path, data);
  }
  return files;
}

/** Base64 per file, for the `importTemplate` request. */
export function toBase64Files(files: ReadonlyMap<string, Uint8Array>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, data] of files) {
    let s = '';
    for (let i = 0; i < data.length; i += 0x8000)
      s += String.fromCharCode(...data.subarray(i, i + 0x8000));
    out[path] = btoa(s);
  }
  return out;
}
