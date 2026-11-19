import { INSTALLED_KEY } from '@reskin/schema';
import { exclusive } from '../background/exclusive';
import { recompileAll, startup } from '../background/lifecycle';
import { currentRegistry, invalidateRegistry } from '../background/registry';
import { handleRequest, isTrustedSender, onPermissionsAdded } from '../background/router';
import { syncRegistrations } from '../background/sites';
import { applyRemote, flush, persistDirty, SyncScheduler } from '../background/sync';

export default defineBackground(() => {
  const origin = browser.runtime.getURL('/');
  const log = (what: string) => (e: unknown) => console.error(`[reskin] ${what} failed`, e);

  browser.runtime.onInstalled.addListener(({ reason }) => {
    void exclusive(async () => startup(await currentRegistry())).catch(log('startup'));
    // First install: the welcome page (T-3.6). `tabs.create` needs no permission.
    if (reason === 'install')
      void browser.tabs
        .create({ url: browser.runtime.getURL('/welcome.html') })
        .catch(log('welcome'));
  });
  browser.runtime.onStartup.addListener(
    () => void exclusive(async () => startup(await currentRegistry())).catch(log('startup')),
  );

  browser.permissions.onAdded.addListener(({ origins }) => {
    void exclusive(async () => onPermissionsAdded(await currentRegistry(), origins ?? [])).catch(
      log('enable'),
    );
  });
  // The user can revoke a site's permission from the browser's own UI at any time.
  browser.permissions.onRemoved.addListener(() => {
    void exclusive(async () => {
      await syncRegistrations();
      await recompileAll(await currentRegistry());
    }).catch(log('permission sync'));
  });

  const local = browser.storage.local;
  const sync = new SyncScheduler({
    now: () => Date.now(),
    after: (ms, fn) => void setTimeout(fn, ms),
    flush: (keys) => flush(local, browser.storage.sync, keys),
    persist: persistDirty(local),
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      // Imported templates are cached; drop the cache if they change behind our back.
      if (INSTALLED_KEY in changes) invalidateRegistry();
      sync.mark(Object.keys(changes));
    } else if (area === 'sync') {
      // Choices made in another browser (T-3.5).
      void exclusive(async () => {
        if ((await applyRemote(local, changes)).length > 0)
          await recompileAll(await currentRegistry());
      }).catch(log('sync'));
    }
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isTrustedSender(sender, browser.runtime.id, origin)) return false;
    void exclusive(async () => handleRequest(await currentRegistry(), message)).then(sendResponse);
    return true; // keeps the channel open for the async response (Chrome and Firefox)
  });
});
