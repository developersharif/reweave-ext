import { Runtime } from '../content/runtime';
import { siteForHost } from '../shared/sites';

// Registered at runtime per enabled site (background/sites.ts), never in the manifest.
export default defineContentScript({
  registration: 'runtime',
  runAt: 'document_start',
  main(ctx) {
    const site = siteForHost(location.hostname);
    if (!site) return;
    const runtime = new Runtime({
      win: window,
      adapterId: site.adapterId,
      storage: {
        get: (keys) => browser.storage.local.get(keys),
        onChanged: (cb) =>
          browser.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') cb(changes);
          }),
      },
      listen: (target, type, handler) =>
        target.addEventListener(type, handler, { signal: ctx.signal }),
      every: (ms, fn) => void ctx.setInterval(fn, ms),
      after: (ms, fn) => {
        const id = ctx.setTimeout(fn, ms);
        return () => clearTimeout(id);
      },
      now: () => performance.now(),
    });
    void runtime.start();
  },
});
