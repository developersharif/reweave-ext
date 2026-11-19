/**
 * Popup/options → background messaging (extension-architecture §9). Requests are
 * validated by the background with `RequestSchema` from `@reskin/schema`; responses
 * come from our own service worker and are typed here.
 */
import type {
  Library,
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
  /** Author handles. */
  authors: string[];
  /** Bundled templates ship with the extension; imported ones can be uninstalled. */
  origin: 'bundled' | 'imported';
  /** Adapter ids it has targets for. */
  adapters: string[];
  settings: Setting[];
  variants: { id: string; label: string }[];
  /** Consumes `standard/v1` tokens, so palettes apply to it. */
  usesPalettes: boolean;
}

export interface PaletteSummary {
  id: string;
  name: string;
  /** A few colours for the picker: background, surface, text, accent. */
  swatches: string[];
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
  /** null = the template's own colours. */
  paletteId: string | null;
  templates: TemplateSummary[];
  /** Effective setting values for the active template (defaults merged with the user's). */
  settings: SettingValues;
  /** Why the active template could not be applied, if it couldn't. */
  problem: string | null;
  /** Local health of the active template (T-3.3); null when no template applies. */
  health: TemplateHealth | null;
  adapterVersion: string | null;
}

export interface TemplateHealth {
  /** working: every probed part it uses was found; broken: some weren't; unknown: not checked yet. */
  status: 'working' | 'broken' | 'unknown';
  /** Component ids the template uses whose probes failed. */
  failed: string[];
  /** The site no longer defines the colour variables the theme map writes (D-033). */
  themeFailed: boolean;
}

export interface AppState {
  prefs: Prefs;
  sites: SiteView[];
  palettes: PaletteSummary[];
  /** Every installed template, by name. */
  library: TemplateSummary[];
}

export type ErrorDiagnostic = NonNullable<
  Extract<Response<unknown>, { ok: false }>['error']['diagnostics']
>[number];

export class RequestError extends Error {
  readonly code: MessageErrorCode;
  readonly diagnostics: ErrorDiagnostic[];
  constructor(code: MessageErrorCode, message: string, diagnostics: ErrorDiagnostic[] = []) {
    super(message);
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

async function request<T>(req: Request): Promise<T> {
  const res = (await browser.runtime.sendMessage(req)) as Response<T> | undefined;
  if (!res) throw new RequestError('INTERNAL', 'No response from the background');
  if (!res.ok) throw new RequestError(res.error.code, res.error.message, res.error.diagnostics);
  return res.data;
}

/** Sends a request to the background and returns the new state, or throws `RequestError`. */
export type StateRequest = Exclude<Request, { type: 'exportLibrary' }>;

export const send = (req: StateRequest): Promise<AppState> => request<AppState>(req);

/** The library file (T-3.4). */
export const exportLibrary = (): Promise<Library> => request<Library>({ type: 'exportLibrary' });
