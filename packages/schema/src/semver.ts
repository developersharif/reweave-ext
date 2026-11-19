/**
 * Minimal semver for manifest versions and adapter ranges. Supported range forms:
 * `1.2.3` (exact), `^1.2.3`, `~1.2.3`, `>=1.2.3`, `*`. Pre-release tags are allowed
 * on versions and sort before the release (no build metadata).
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
}

const VERSION =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const RANGE = /^(\^|~|>=)?(.+)$/;

export function parseVersion(input: string): SemVer | null {
  const m = VERSION.exec(input);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ?? null,
  };
}

export const isVersion = (input: string): boolean => parseVersion(input) !== null;

export function compareVersions(a: SemVer, b: SemVer): number {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === null) return 1;
  if (b.prerelease === null) return -1;
  return a.prerelease < b.prerelease ? -1 : 1;
}

export function isRange(input: string): boolean {
  if (input === '*') return true;
  const m = RANGE.exec(input);
  return m !== null && m[2] !== undefined && isVersion(m[2]);
}

export function satisfies(version: string, range: string): boolean {
  const v = parseVersion(version);
  if (!v) return false;
  if (range === '*') return v.prerelease === null;
  const m = RANGE.exec(range);
  const base = m?.[2] ? parseVersion(m[2]) : null;
  if (!m || !base) return false;
  const op = m[1] ?? '=';
  const cmp = compareVersions(v, base);
  switch (op) {
    case '=':
      return cmp === 0;
    case '>=':
      return cmp >= 0;
    case '~':
      return cmp >= 0 && v.major === base.major && v.minor === base.minor;
    case '^':
      if (cmp < 0) return false;
      if (base.major > 0) return v.major === base.major;
      if (base.minor > 0) return v.major === 0 && v.minor === base.minor;
      return v.major === 0 && v.minor === 0 && v.patch === base.patch;
    default:
      return false;
  }
}

/** Lowest version a range can match (used to validate dialect against the oldest allowed adapter). */
export function rangeFloor(range: string): string | null {
  if (range === '*') return '0.0.0';
  const m = RANGE.exec(range);
  return m?.[2] && isVersion(m[2]) ? m[2] : null;
}
