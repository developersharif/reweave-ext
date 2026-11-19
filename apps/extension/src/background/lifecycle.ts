/** Service-worker lifecycle work: migrations, registration re-sync, recompiles. */
import { SITES } from '../shared/sites';
import { recompile } from './compile-service';
import { migrate } from './migrations';
import type { Registry } from './registry';
import { syncRegistrations } from './sites';
import { problems } from './state';

/** Runs on install, update and browser start. Recompiles every site so engine or adapter updates take effect. */
export async function startup(reg: Registry): Promise<void> {
  await migrate();
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
