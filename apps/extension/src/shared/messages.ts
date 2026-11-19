/**
 * Popup/options → background messaging (extension-architecture §9). Requests are
 * validated by the background with `RequestSchema` from `@reskin/schema`; responses
 * come from our own service worker and are typed here.
 */
import type {
  MessageErrorCode,
  Prefs,
  Request,
  Response,
  Setting,
  SettingValues,
} from '@reskin/schema';
import { browser } from 'wxt/browser';

export interface TemplateSummary {
  id: string;
  name: string;
  version: string;
  summary: string;
  settings: Setting[];
  variants: { id: string; label: string }[];
}

export interface SiteView {
  adapterId: string;
  name: string;
  origins: string[];
  /** Adapter route id → path patterns, and the sensitive ones (for the popup's "paused here" state). */
  routes: Record<string, string[]>;
  sensitiveRoutes: string[];
  /** The optional host permission for this site is granted. */
  granted: boolean;
  enabled: boolean;
  /** null = "Original site". */
  templateId: string | null;
  variantId: string | null;
  templates: TemplateSummary[];
  /** Effective setting values for the active template (defaults merged with the user's). */
  settings: SettingValues;
  /** Why the active template could not be applied, if it couldn't. */
  problem: string | null;
}

export interface AppState {
  prefs: Prefs;
  sites: SiteView[];
}

export class RequestError extends Error {
  readonly code: MessageErrorCode;
  constructor(code: MessageErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** Sends a request to the background and returns its data, or throws `RequestError`. */
export async function send(request: Request): Promise<AppState> {
  const res = (await browser.runtime.sendMessage(request)) as Response<AppState> | undefined;
  if (!res) throw new RequestError('INTERNAL', 'No response from the background');
  if (!res.ok) throw new RequestError(res.error.code, res.error.message);
  return res.data;
}
