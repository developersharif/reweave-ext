import { exclusive } from '../background/exclusive';
import { recompileAll, startup } from '../background/lifecycle';
import { registry } from '../background/registry';
import { handleRequest, isTrustedSender, onPermissionsAdded } from '../background/router';
import { syncRegistrations } from '../background/sites';

export default defineBackground(() => {
  const reg = registry();
  const origin = browser.runtime.getURL('/');
  const log = (what: string) => (e: unknown) => console.error(`[reskin] ${what} failed`, e);

  browser.runtime.onInstalled.addListener(
    () => void exclusive(() => startup(reg)).catch(log('startup')),
  );
  browser.runtime.onStartup.addListener(
    () => void exclusive(() => startup(reg)).catch(log('startup')),
  );

  browser.permissions.onAdded.addListener(({ origins }) => {
    void exclusive(() => onPermissionsAdded(reg, origins ?? [])).catch(log('enable'));
  });
  // The user can revoke a site's permission from the browser's own UI at any time.
  browser.permissions.onRemoved.addListener(() => {
    void exclusive(async () => {
      await syncRegistrations();
      await recompileAll(reg);
    }).catch(log('permission sync'));
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isTrustedSender(sender, browser.runtime.id, origin)) return false;
    void exclusive(() => handleRequest(reg, message)).then(sendResponse);
    return true; // keeps the channel open for the async response (Chrome and Firefox)
  });
});
