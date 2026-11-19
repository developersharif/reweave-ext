# Extension Architecture (Chrome MV3, WXT)

Read with: [`template-schema.md`](template-schema.md) (formats), [`security-model.md`](security-model.md) (rules), [`../execution/task-tracker.md`](../execution/task-tracker.md) (what to build next).

**Verification status:** Items marked 🔬 are design assumptions that a spike task must confirm on a real Chrome build before code depends on them. The technical research pass was interrupted, so these were deliberately turned into spikes rather than guessed.

---

## 1. Manifest (target for MVP-1)

```jsonc
{
  "manifest_version": 3,
  "name": "__MSG_appName__",               // from packages/brand via WXT i18n
  "permissions": ["storage", "scripting"],  // + "activeTab" in M5 (Studio on unsupported sites), + "alarms" in M7
  "optional_host_permissions": [
    "https://www.youtube.com/*",
    "https://www.reddit.com/*",             // M4
    "https://x.com/*"                       // M4
  ],
  "background": { "service_worker": "background.js", "type": "module" },
  "action": { "default_popup": "popup.html" },
  "options_ui": { "page": "options.html", "open_in_tab": true },
  "web_accessible_resources": []           // expose nothing: avoids extension fingerprinting (LinkedIn-style probing)
}
```

- No static `content_scripts`: content scripts are **registered at runtime** per enabled site (WXT `registration: "runtime"` 🔬 T-0.2).
- No `webNavigation`, `tabs`, `history`, or `<all_urls>` (each adds install warnings or review friction).
- Adding a new supported site = new `optional_host_permissions` entry = extension update. 🔬 Confirm that adding *optional* permissions does not disable the extension or prompt existing users on update (T-0.3).

## 2. Entry points and modules

Modules marked (Mx) don't exist yet.

```
apps/extension/
├── wxt.config.ts                # manifest; optional_host_permissions from src/shared/sites.ts
├── src/entrypoints/             # thin WXT entrypoints only
│   ├── background.ts            # service worker: wires lifecycle, permission events, message router
│   ├── content.ts               # runtime-registered, document_start, isolated world
│   ├── popup/                   # React shell; UI lives in src/popup/
│   ├── options/ (M3)            # React: library, per-site assignments, import/export, prefs
│   ├── welcome/ (M3)            # React: first-run
│   └── studio.content/ (M5)     # injected on demand via scripting.executeScript
└── src/
    ├── background/
    │   ├── registry.ts          # bundled adapters + templates, validated on load (imported/catalog: M3/M7)
    │   ├── compile-service.ts   # @reskin/compiler → rk:compiled:<adapter>; writes only when the hash changes
    │   ├── sites.ts             # content-script registration ⇔ (permission granted AND site enabled)
    │   ├── router.ts            # validated messages from extension pages only; returns AppState
    │   ├── state.ts             # AppState for popup/options
    │   ├── lifecycle.ts         # install/update/startup: migrate, re-sync registrations, recompile
    │   ├── migrations.ts        # storage schema migrations (rk:v)
    │   ├── exclusive.ts         # runs state changes one at a time
    │   └── updates.ts (M7)      # signed catalog/adapter updates
    ├── content/
    │   ├── runtime.ts           # storage read → sheets; route changes; storage.onChanged; pause
    │   ├── sheets.ts            # one adopted sheet per route group; enable/disable by route
    │   ├── navigation.ts        # Navigation API → popstate/pageshow → poll; adapter navigationEvents
    │   ├── guard.ts             # protected-component guard (T-2.9, §7.1)
    │   ├── shadow.ts (M4)       # per-shadow-root sheets
    │   └── probes.ts (M3)       # adapter health checks
    ├── popup/                   # Popup.tsx, SettingControl.tsx, view.ts (site detection, testable)
    └── shared/
        ├── sites.ts             # supported sites: adapter id ↔ hosts ↔ permission origins
        ├── messages.ts          # AppState types + send(); request schemas live in @reskin/schema
        └── storage.ts           # typed, validated chrome.storage.local access
```

Bundle budget: **content script ≤ 25 KB minified, no framework, no compiler.** The compiler (css-tree) lives in the service worker and Studio only.

## 3. Style injection

### 3.1 Primary: `document.adoptedStyleSheets` from the content script (confirmed in T-2.1)

1. Content script runs at `document_start` (only on hosts the user granted).
2. `chrome.storage.local.get(["rk:compiled:<adapter>", "rk:prefs"])`.
3. For each route group in the compiled payload, `new CSSStyleSheet()` + `replaceSync(css)`; append to `document.adoptedStyleSheets` (preserving any existing entries).
4. Enable groups matching the current route (`sheet.disabled = false`), disable the rest. Sensitive routes → all disabled.

Why adopted sheets: per the CSSOM spec, adopted stylesheets come **after** the document's own stylesheets in cascade order, so we win ties without fighting over DOM position, and no `<style>` node appears in the page's DOM. The research-phase CSP experiment successfully applied an adopted sheet from a content script.

T-2.1 results (technical-research §5.1, live YouTube, 80 loads):
- styles were applied before first contentful paint in every load, including with 4× CPU throttling;
- time to apply is 10–22 ms median at 1× and 49–160 ms at 4×, mostly the `storage.local` read;
- YouTube never removed or replaced the sheet, during load or across SPA navigations;
- YouTube is not restored from bfcache: going back reloads the page and the content script runs again.

The page's own scripts *can* list our adopted sheet and read its rules, so compiled CSS must carry no template ids, names or comments (R-18).

### 3.2 Fallback: `<style>` element kept last

If adopted sheets prove unreliable on a site: insert `<style id="rk-…">` into `document.documentElement` at `document_start`, then after `DOMContentLoaded` move it to the end of `<head>`/`<html>` and keep it last with a narrowly scoped `MutationObserver` (childList on `head` only). This is the approach long used by userstyle managers.

### 3.3 Rejected options
- `chrome.scripting.insertCSS` from the service worker: requires knowing when navigation commits (needs `webNavigation` = "Read your browsing history" warning) and adds a round-trip → FOUC.
- `registerContentScripts({ css: [...] })`: only accepts packaged files, not dynamic compiled CSS.
- `origin: "USER"` CSS: user-origin normal declarations *lose* to author normal declarations, so every rule would need `!important`.

### 3.4 Cascade guidance for creators
Templates compile into unlayered author-origin CSS appended after page styles. Equal-specificity rules win; creators use `!important` only to beat page inline styles or `!important`. The compiler warns when > 50% of declarations are `!important` (maintainability smell).

## 4. Routes and SPA navigation (decided in T-2.2)

- **Route matching** uses the compiled `routeTable` with `matchRoute` from `@reskin/schema`:
  - patterns are anchored, case-sensitive, and `*` is the only wildcard;
  - sensitive routes win;
  - otherwise the first matching route in table order applies.
  - It is pure and Valibot-free, so it adds almost nothing to the content script. `URLPattern` is not used (T-2.2: not needed, and it would need a polyfill check on Firefox).
- **Detecting a route change**, in order:
  1. Navigation API `currententrychange`. It fires in the isolated world 1–2 ms after the page's `pushState`, `replaceState` or back/forward.
  2. `popstate` + `pageshow`, for browsers without the Navigation API.
  3. A `location.href` poll every 750 ms while `document.visibilityState === "visible"`, as the last resort.
- **"Navigation finished"** comes from the adapter's `navigationEvents`, declared as data. For YouTube that is `yt-navigate-finish`, 0.5–1 s after the URL change, once the new page has rendered.
- **On a route change:**
  - enable the new route's groups immediately;
  - keep the previous route's groups on until a `navigationEvents` event or 1.5 s, whichever comes first (YouTube keeps the old page on screen until then);
  - then disable stale groups and schedule probes.
  - The work is O(number of route groups). Sensitive routes disable everything immediately, with no grace period.

## 5. Settings, variants, palettes

Settings are **compiled into the CSS**, not toggled through page attributes (more robust: pages can't strip them).
- Boolean/select `@setting` blocks and `hide … when` rules are included or excluded at compile time.
- Range/color/font settings and all tokens are emitted as custom properties in a generated `:root { --rk-…: … }` rule in the base group.
- Popup change → background recompiles → storage → content script `replaceSync`. Slider drags are debounced (120 ms). If that feels laggy, the content script could apply the custom property directly for instant feedback (a later optimization).

> Per D-021, the only runtime state on the page is which route-group sheets are enabled.

## 6. Shadow DOM (M4, for Reddit) 🔬 T-4.1

- Adapter declares `shadowRoots: [{ host: "<custom-element>", components: [...] }]`.
- Compiler emits a separate sheet per shadow scope with selectors relative to the shadow root.
- Content script: `MutationObserver` (subtree childList) **only when the adapter declares shadow roots**; for each matching host with an open `shadowRoot`, append that scope's sheet to `host.shadowRoot.adoptedStyleSheets`. Constructed sheets can be shared across many roots.
- Closed roots: investigate `chrome.dom.openOrClosedShadowRoot()`; if unavailable or unreliable, components in closed roots are unsupported (documented in the adapter).
- Prefer `::part()` when the site exposes parts.

## 7. Health probes

- After route change + idle (`requestIdleCallback`, ~2 s timeout), run adapter `probes` for that route: `document.querySelector` (or within declared shadow scopes) → `ok | missing`.
- Store `rk:health:<adapter>` = `{ adapterVersion, results: { componentId: { status, checkedAt } } }` (local only).
- Popup derives the template's local status: all components the template uses are `ok` → "Works here"; any missing → "May be broken (n parts not found)".
- Never on sensitive routes. Upload only in M8 and only with opt-in (D-017).

### 7.1 Protected-component guard (T-2.9)

The compiler rejects any rule that targets an adapter `protected` component (D-028). Hiding an *ancestor*, or covering the component with an overlay, can't be caught statically. So the content script also checks at runtime:
- **When:** on load, on route changes, and on every 750 ms poll tick, it looks for the compiled `protectedSelectors`.
- **How visibility is judged:** with our sheets switched off. That is two synchronous style recalcs with no paint in between, so a template can't make the dialog look "already gone".
- **While visible:** the template is off and the user sees the original site.
- **Cost:** while a protected element lingers hidden, it is re-checked every 3 s; when none exists, the cost is one `querySelector` per tick.

## 8. Storage layout

| Key (`chrome.storage.local`) | Value | Notes |
|---|---|---|
| `rk:v` | integer | storage schema version; migrations in `background/migrations.ts` |
| `rk:prefs` | `{ paused, telemetryOptIn: false, … }` | |
| `rk:sites` | `{ [adapterId]: { enabled, templateId \| null, variantId?, paletteId? } }` | mirrored to `storage.sync` (M3) |
| `rk:settings:<templateId>` | `{ [settingId]: value }` | mirrored to `storage.sync` |
| `rk:installed` (M3) | `{ [templateId]: { version, origin: "bundled"\|"imported"\|"catalog"\|"local", bundle } }` | sources only; bundled templates are not stored (they ship in the package) |
| `rk:compiled:<adapterId>` | the compiler output (D-021 contract): `{ engineVersion, templateId, templateVersion, adapterId, adapterVersion, hash, groups: [{ routes, css }], sensitiveRoutes, routeTable, rawSelectors, components, assets, navigationEvents, protectedSelectors }`; shadow groups arrive in M4 | the **only** key the content script needs. Absent = nothing applies (site off, "Original site", or compile failed) |
| `rk:health:<adapterId>` | probe results | |

Assets (fonts/images) > 100 KB go to IndexedDB (M7 catalog assets); bundled assets are package files. 🔬 T-0.3 records current quotas (`storage.local`, `storage.sync` per-item/total) from Chrome docs and sets size guards accordingly.

## 9. Messaging

- **Popup/options → background.** Requests (`RequestSchema` in `@reskin/schema`): `getState`, `setSiteEnabled`, `setTemplate` (null = "Original site", optional variant), `setSettings`, `resetSettings`, `setPaused`.
  - Later: `setPalette` (M3), `importBundle`/`exportLibrary` (M3), `reportBroken` (M8).
  - Every request is schema-validated, and accepted only from our own extension pages (sender id + extension-origin URL). Content scripts and other extensions are refused.
  - Every answer is `{ ok: true, data: AppState } | { ok: false, error: { code, message } }`, with stable error codes.
  - State changes run one at a time (`exclusive.ts`).
- **Permission requests** happen in the popup/options/welcome page, because they need a user gesture.
  - The page asks for the site's origin, then sends `setSiteEnabled`.
  - The background also enables a site on `permissions.onAdded`, because the popup can close while the prompt is open. The same path covers access granted from the browser's own site-access UI.
  - `permissions.onRemoved` disables the site and unregisters its script.
- **Content script ← background:** no messaging. It reacts to `storage.onChanged` for its adapter's compiled key and `rk:prefs`.
- Content scripts never listen to `window.postMessage`. `externally_connectable` (website → extension install) arrives in M7, restricted to our domain.

## 10. Service worker lifecycle

The SW is stateless between events: every handler loads what it needs from storage. Long operations (compiling all templates after an adapter update) are chunked per adapter. On `runtime.onInstalled`/`onStartup`: run migrations, re-sync content-script registrations against granted permissions (`permissions.contains` per site), and recompile every enabled site, so engine, adapter and template updates take effect. The compile service only rewrites `rk:compiled:*` when the output hash changes.

## 11. Studio (Creator mode, M5)

- Injected with `scripting.executeScript({ files: ["studio.js"] })` into the active tab on user action; UI mounted in a shadow root (WXT shadow-root UI helper 🔬) so page CSS can't break it and ours can't leak.
- Bundles the compiler for keystroke-level live preview; writes its own preview sheet into `adoptedStyleSheets` (replacing the active template's sheet while open).
- Component picker: on hover, walk ancestors and test `element.matches()` against adapter component selectors (cached); label the nearest component. Alt-click = raw element (marks template `rawSelectors`).
- Drafts saved to `rk:installed` with `origin: "local"`; export `.zip` (manifest + styles + assets).

## 12. Cross-browser notes

- Firefox: MV3 with background scripts instead of a service worker (WXT handles), `browser_specific_settings.gecko.id`, AMO source-code submission for bundled code. Keep `wxt build -b firefox` green in CI; release after Chrome beta (D-005).
- Edge/Brave/Opera: Chrome build works; Edge listing optional post-beta.
- Safari: deferred (App Store app wrapper, Apple developer account).

## 13. Testing strategy

| Layer | Tool | What |
|---|---|---|
| Schema/compiler | Vitest | golden files: dialect → CSS; sanitizer rejects every attack fixture in `security-model.md` §3 |
| Adapters | Vitest + headless Chromium (Playwright) over fixtures | every component selector matches ≥ 1 node on its route fixtures; probes pass; fixtures stay structure-only. Chromium, not happy-dom or jsdom, because those disagree with the browser on these selectors (technical-research §5.3, D-030) |
| Extension logic | Vitest + WXT fake browser (`permissions`/`scripting` mocked per test) | migrations, registry, compile service, router, registration sync, popup view logic, content-script route and guard logic |
| E2E | Playwright persistent Chromium with `--load-extension` on the `RK_E2E` build (D-029) | real target URLs (`https://www.youtube.com/...`) **fulfilled from fixtures via request interception**; every other request aborted. Covers enable → apply, SPA navigation and grace period, sensitive routes, live settings, pause, "Original site", the protected guard, and the popup (`popup.html?tab=<id>`) |
| Live checks (manual) | `apps/extension/scripts/live-check-youtube.mjs`, `spikes/live-youtube/smoke.mjs` | adapter components on the live site (logged out, or logged in with `--profile`); the real extension on live YouTube. Never in CI |
| Live canary (M8) | Scheduled job, never gates PRs | logged-out pages on real sites → probe results → adapter alerts |

Fixtures are structure-only snapshots: scripts removed, text/images replaced, no personal data.

## 14. Performance budgets

| Metric | Budget |
|---|---|
| Content-script main-thread time at `document_start` | ≤ 5 ms (p95, mid-range laptop) |
| Sheet apply after storage read | ≤ 1 frame |
| Route change → sheets toggled | ≤ 16 ms |
| Probes | ≤ 2 ms per route, at idle |
| Compiled CSS per site | ≤ 300 KB |
| MutationObserver | only for shadow-root adapters or the `<style>` fallback; scoped as narrowly as possible |
