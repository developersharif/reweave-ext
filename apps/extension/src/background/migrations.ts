/** Storage schema migrations (`rk:v`), run on install, update and browser start. */
import { DEFAULT_PREFS, STORAGE_VERSION } from '@reskin/schema';
import { getPrefs, getSites, getVersion, setPrefs, setSites, setVersion } from '../shared/storage';

export async function migrate(): Promise<{ from: number | undefined; to: number }> {
  const from = await getVersion();
  if (from === STORAGE_VERSION) return { from, to: STORAGE_VERSION };
  if (from !== undefined && from > STORAGE_VERSION) {
    // Written by a newer build (downgrade): leave it alone rather than corrupt it.
    return { from, to: from };
  }
  // v1 is the first layout: normalize whatever is there (invalid values fall back to defaults).
  await setPrefs(from === undefined ? DEFAULT_PREFS : await getPrefs());
  await setSites(await getSites());
  await setVersion(STORAGE_VERSION);
  return { from, to: STORAGE_VERSION };
}
