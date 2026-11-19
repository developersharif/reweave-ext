/**
 * Typed `chrome.storage.local` access (extension-architecture §8). Every read is
 * validated against its schema in `@reskin/schema`; invalid or missing values fall
 * back to safe defaults instead of throwing.
 */
import {
  type CompiledTemplate,
  compiledKey,
  DEFAULT_PREFS,
  type Prefs,
  PrefsSchema,
  parseCompiled,
  parseStored,
  type Sites,
  SitesSchema,
  STORAGE_KEYS,
  type StoredSettings,
  StoredSettingsSchema,
  settingsKey,
} from '@reskin/schema';
import { browser } from 'wxt/browser';

const local = () => browser.storage.local;

async function read(key: string): Promise<unknown> {
  return (await local().get(key))[key];
}

export async function getVersion(): Promise<number | undefined> {
  const v = await read(STORAGE_KEYS.version);
  return typeof v === 'number' && Number.isInteger(v) ? v : undefined;
}
export const setVersion = (v: number) => local().set({ [STORAGE_KEYS.version]: v });

export const getPrefs = async (): Promise<Prefs> =>
  parseStored(PrefsSchema, await read(STORAGE_KEYS.prefs), DEFAULT_PREFS);
export const setPrefs = (prefs: Prefs) => local().set({ [STORAGE_KEYS.prefs]: prefs });

export const getSites = async (): Promise<Sites> =>
  parseStored(SitesSchema, await read(STORAGE_KEYS.sites), {});
export const setSites = (sites: Sites) => local().set({ [STORAGE_KEYS.sites]: sites });

export const getSettings = async (templateId: string): Promise<StoredSettings> =>
  parseStored(StoredSettingsSchema, await read(settingsKey(templateId)), {});
export const setSettings = (templateId: string, values: StoredSettings) =>
  local().set({ [settingsKey(templateId)]: values });
export const removeSettings = (templateId: string) => local().remove(settingsKey(templateId));

export async function getCompiled(adapterId: string): Promise<CompiledTemplate | null> {
  const value = await read(compiledKey(adapterId));
  return value === undefined ? null : parseCompiled(value);
}
export const setCompiled = (adapterId: string, compiled: CompiledTemplate) =>
  local().set({ [compiledKey(adapterId)]: compiled });
export const removeCompiled = (adapterId: string) => local().remove(compiledKey(adapterId));
