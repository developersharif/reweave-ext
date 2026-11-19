export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    // M2 (T-2.5): run storage migrations and re-sync content-script registrations here.
    console.info(`[reskin] installed (${reason})`);
  });
});
