/**
 * Message router: validates every request (`RequestSchema`), accepts only our own
 * extension pages as senders, applies the change, and answers with the new AppState.
 */
import {
  MESSAGE_ERRORS,
  type MessageErrorCode,
  parseRequest,
  type Request,
  type Response,
} from '@reskin/schema';
import type { AppState } from '../shared/messages';
import { SITES, siteById } from '../shared/sites';
import {
  getPrefs,
  getSettings,
  getSites,
  removeSettings,
  setPrefs,
  setSettings,
  setSites,
} from '../shared/storage';
import { recompile, validUserSettings } from './compile-service';
import { type Registry, templatesFor } from './registry';
import { isGranted, syncRegistrations } from './sites';
import { getAppState, problems } from './state';

class Refusal extends Error {
  readonly code: MessageErrorCode;
  constructor(code: MessageErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** Popup and options pages only; content scripts and other extensions are refused. */
export function isTrustedSender(
  sender: { id?: string; url?: string },
  extensionId: string,
  extensionOrigin: string,
): boolean {
  return (
    sender.id === extensionId &&
    typeof sender.url === 'string' &&
    sender.url.startsWith(extensionOrigin)
  );
}

async function refreshSite(reg: Registry, adapterId: string): Promise<void> {
  const outcome = await recompile(reg, adapterId);
  if (outcome.status === 'failed') problems.set(adapterId, outcome.reason);
  else problems.delete(adapterId);
}

export async function setSiteEnabled(
  reg: Registry,
  adapterId: string,
  enabled: boolean,
): Promise<void> {
  const site = siteById(adapterId);
  if (!site || !reg.adapters.has(adapterId))
    throw new Refusal('UNKNOWN_SITE', `Unknown site ${adapterId}`);
  if (enabled && !(await isGranted(site))) {
    throw new Refusal('PERMISSION_MISSING', `Permission for ${site.name} has not been granted`);
  }
  const sites = await getSites();
  const current = sites[adapterId];
  // First enable: start with the first installed template rather than "Original site".
  const templateId =
    current?.templateId !== undefined
      ? current.templateId
      : (templatesFor(reg, adapterId)[0]?.manifest.id ?? null);
  sites[adapterId] = { ...current, enabled, templateId };
  await setSites(sites);
  await syncRegistrations();
  await refreshSite(reg, adapterId);
}

/**
 * A site's permission was just granted, from the popup's "Enable" button or the
 * browser's own site-access UI. Granting access means "use it here", so the site is
 * enabled. Handled in the background because the popup may close while the
 * permission prompt is open.
 */
export async function onPermissionsAdded(reg: Registry, origins: readonly string[]): Promise<void> {
  for (const site of SITES) {
    if (site.origins.some((o) => origins.includes(o)))
      await setSiteEnabled(reg, site.adapterId, true);
  }
}

async function apply(reg: Registry, req: Request): Promise<void> {
  switch (req.type) {
    case 'getState':
      return;
    case 'setPaused': {
      const prefs = await getPrefs();
      await setPrefs({ ...prefs, paused: req.paused });
      return;
    }
    case 'setSiteEnabled':
      return setSiteEnabled(reg, req.adapterId, req.enabled);
    case 'setTemplate': {
      if (!siteById(req.adapterId))
        throw new Refusal('UNKNOWN_SITE', `Unknown site ${req.adapterId}`);
      if (req.templateId !== null) {
        const t = reg.templates.get(req.templateId);
        if (!t?.manifest.targets.some((target) => target.adapter === req.adapterId)) {
          throw new Refusal(
            'UNKNOWN_TEMPLATE',
            `Template ${req.templateId} is not installed for ${req.adapterId}`,
          );
        }
        if (req.variantId && !t.manifest.variants?.some((v) => v.id === req.variantId)) {
          throw new Refusal('BAD_REQUEST', `Unknown variant ${req.variantId}`);
        }
      }
      const sites = await getSites();
      const current = sites[req.adapterId] ?? { enabled: false, templateId: null };
      const { variantId: _old, ...rest } = current;
      sites[req.adapterId] = {
        ...rest,
        templateId: req.templateId,
        ...(req.templateId && req.variantId ? { variantId: req.variantId } : {}),
      };
      await setSites(sites);
      await refreshSite(reg, req.adapterId);
      return;
    }
    case 'setSettings':
    case 'resetSettings': {
      if (!reg.templates.has(req.templateId))
        throw new Refusal('UNKNOWN_TEMPLATE', `Unknown template ${req.templateId}`);
      if (req.type === 'resetSettings') await removeSettings(req.templateId);
      else {
        const merged = { ...(await getSettings(req.templateId)), ...req.values };
        await setSettings(req.templateId, validUserSettings(reg, req.templateId, merged));
      }
      const sites = await getSites();
      for (const [adapterId, s] of Object.entries(sites)) {
        if (s.templateId === req.templateId) await refreshSite(reg, adapterId);
      }
      return;
    }
  }
}

export async function handleRequest(reg: Registry, raw: unknown): Promise<Response<AppState>> {
  const req = parseRequest(raw);
  if (!req)
    return { ok: false, error: { code: MESSAGE_ERRORS.BAD_REQUEST, message: 'Malformed request' } };
  try {
    await apply(reg, req);
    return { ok: true, data: await getAppState(reg) };
  } catch (e) {
    if (e instanceof Refusal) return { ok: false, error: { code: e.code, message: e.message } };
    console.error('[reskin] request failed', req.type, e);
    return { ok: false, error: { code: MESSAGE_ERRORS.INTERNAL, message: 'Something went wrong' } };
  }
}
