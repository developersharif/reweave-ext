/** Service-worker lifecycle work: migrations, registration re-sync, recompiles. */
import { browser } from 'wxt/browser';
import { SITES } from '../shared/sites';
import { recompile } from './compile-service';
import { migrate } from './migrations';
import type { Registry } from './registry';
import { syncRegistrations } from './sites';
import { problems } from './state';
import { reconcile } from './sync';

/**
 * Runs on install, update and browser start: migrations, choices from other browsers
 * (T-3.5), registrations, and a recompile of every site so engine or adapter updates
 * take effect.
 */
export async function startup(reg: Registry): Promise<void> {
  await migrate();
  try {
    await reconcile(browser.storage.local, browser.storage.sync);
  } catch (e) {
    console.warn('[reskin] storage.sync unavailable; choices stay on this device', e);
  }
  await syncRegistrations();
  await recompileAll(reg);
}

export async function recompileAll(reg: Registry): Promise<void> {
  for (const site of SITES) {
    const outcome = await recompile(reg, site.adapterId);
    if (outcome.status === 'failed') problems.set(site.adapterId, outcome.reason);
    else problems.delete(site.adapterId);
  }
}
