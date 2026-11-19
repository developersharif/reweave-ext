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

```
apps/extension/
├── wxt.config.ts
├── entrypoints/
│   ├── background.ts            # service worker: message router + lifecycle
│   ├── content.ts               # runtime-registered, document_start, isolated world
│   ├── popup/                   # React: site state, switch, settings, palette, report
│   ├── options/                 # React: library, per-site assignments, import/export, prefs
│   ├── welcome/                 # React: first-run (MVP-1 lives in the extension; moves to web at M7)
│   └── studio.content/ (M5)     # injected on demand via scripting.executeScript
└── src/
    ├── background/
    │   ├── registry.ts          # installed templates/adapters/palettes (bundled ∪ imported ∪ catalog)
    │   ├── compile-service.ts   # @reskin/compiler → rk:compiled:<adapter>
    │   ├── sites.ts             # enable/disable, permission checks, content-script registration
    │   ├── migrations.ts        # storage schema migrations (rk:v)
    │   └── updates.ts (M7)      # signed catalog/adapter updates
    ├── content/
    │   ├── boot.ts              # storage read → adoptedStyleSheets
    │   ├── routes.ts            # URL → adapter route id; navigation detection
    │   ├── sheets.ts            # sheet lifecycle, replaceSync on change, fallback <style>
    │   ├── shadow.ts (M4)       # per-shadow-root sheets
    │   └── probes.ts            # adapter health checks
    └── shared/
        ├── messages.ts          # typed request/response union, validated
        ├── storage.ts           # typed keys + wrappers
        └── adapter-match.ts     # URL ↔ adapter, used by popup and content script
```

Bundle budget: **content script ≤ 25 KB minified, no framework, no compiler.** The compiler (css-tree) lives in the service worker and Studio only.

## 3. Style injection

### 3.1 Primary: `document.adoptedStyleSheets` from the content script 🔬 T-2.1

1. Content script runs at `document_start` (only on hosts the user granted).
2. `chrome.storage.local.get(["rk:compiled:<adapter>", "rk:prefs"])`.
3. For each route group in the compiled payload, `new CSSStyleSheet()` + `replaceSync(css)`; append to `document.adoptedStyleSheets` (preserving any existing entries).
4. Enable groups matching the current route (`sheet.disabled = false`), disable the rest. Sensitive routes → all disabled.

Why adopted sheets: per the CSSOM spec, adopted stylesheets come **after** the document's own stylesheets in cascade order, so we win ties without fighting over DOM position, and no `<style>` node appears in the page's DOM. The research-phase CSP experiment successfully applied an adopted sheet from a content script.

Spike T-2.1 must measure:
- Time from `document_start` to sheet applied on YouTube home/watch (target: before first contentful paint in ≥ 95% of loads; record FOUC on throttled CPU).
- Whether the page ever overwrites `document.adoptedStyleSheets` (re-check on a timer/visibility change; re-append if missing).
- Behavior across bfcache restores and YouTube's in-page navigations.

### 3.2 Fallback: `<style>` element kept last

If adopted sheets prove unreliable on a site: insert `<style id="rk-…">` into `document.documentElement` at `document_start`, then after `DOMContentLoaded` move it to the end of `<head>`/`<html>` and keep it last with a narrowly scoped `MutationObserver` (childList on `head` only). This is the approach long used by userstyle managers.

### 3.3 Rejected options
- `chrome.scripting.insertCSS` from the service worker: requires knowing when navigation commits (needs `webNavigation` = "Read your browsing history" warning) and adds a round-trip → FOUC.
- `registerContentScripts({ css: [...] })`: only accepts packaged files, not dynamic compiled CSS.
- `origin: "USER"` CSS: user-origin normal declarations *lose* to author normal declarations, so every rule would need `!important`.

### 3.4 Cascade guidance for creators
Templates compile into unlayered author-origin CSS appended after page styles. Equal-specificity rules win; creators use `!important` only to beat page inline styles or `!important`. The compiler warns when > 50% of declarations are `!important` (maintainability smell).

## 4. Routes and SPA navigation 🔬 T-2.2

- Route matching uses adapter `routes` (path patterns) evaluated with `URLPattern` (Chrome 95+). Firefox build: verify native support; else `urlpattern-polyfill`.
- Navigation detection, in order of preference:
  1. Navigation API: `navigation.addEventListener("currententrychange", …)` (must confirm it fires for the page's `history.pushState` when observed from the content script's isolated world).
  2. `popstate` + `pageshow` (bfcache).
  3. Adapter-provided site event hints (e.g. YouTube's `yt-navigate-finish`), declared as data in the adapter (`navigationEvents: ["yt-navigate-finish"]`).
  4. Fallback poll of `location.href` every 750 ms while `document.visibilityState === "visible"`.
- On route change: toggle sheets (O(number of route groups)), schedule probes.

## 5. Settings, variants, palettes

Settings are **compiled into the CSS**, not toggled through page attributes (more robust: pages can't strip them).
- Boolean/select `@setting` blocks and `hide … when` rules are included or excluded at compile time.
- Range/color/font settings and all tokens are emitted as custom properties in a generated `:root { --rk-…: … }` rule in the base group.
- Popup change → background recompiles → storage → content script `replaceSync`. Slider drags are debounced (≈100 ms) — acceptable for MVP; if it feels laggy, the content script can apply the custom property directly for instant feedback (later optimization).

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

## 8. Storage layout

| Key (`chrome.storage.local`) | Value | Notes |
|---|---|---|
| `rk:v` | integer | storage schema version; migrations in `background/migrations.ts` |
| `rk:prefs` | `{ paused, telemetryOptIn: false, … }` | |
| `rk:sites` | `{ [adapterId]: { enabled, templateId \| null, variantId?, paletteId? } }` | mirrored to `storage.sync` (M3) |
| `rk:settings:<templateId>` | `{ [settingId]: value }` | mirrored to `storage.sync` |
| `rk:installed` | `{ [templateId]: { version, origin: "bundled"\|"imported"\|"catalog"\|"local", bundle } }` | sources only; bundled ones reference package files |
| `rk:compiled:<adapterId>` | `{ hash, templateId, version, adapterVersion, groups: [{ routes, css }], shadow: [...], sensitiveRoutes, routeTable }` | the **only** key the content script needs |
| `rk:health:<adapterId>` | probe results | |

Assets (fonts/images) > 100 KB go to IndexedDB (M7 catalog assets); bundled assets are package files. 🔬 T-0.3 records current quotas (`storage.local`, `storage.sync` per-item/total) from Chrome docs and sets size guards accordingly.

## 9. Messaging

- Popup/options → background: typed messages (`getSiteState`, `setTemplate`, `setSettings`, `setPalette`, `setEnabled`, `importBundle`, `exportLibrary`, `reportBroken`). Every message validated with `packages/schema` before handling.
- **Permission requests happen in the popup/options/welcome page** (they need a user gesture), then the page tells the background to register.
- Content script ← background: **no messaging needed**; it reacts to `storage.onChanged` for its adapter key.
- Content scripts never listen to `window.postMessage`. `externally_connectable` (website → extension install) arrives in M7, restricted to our domain.

## 10. Service worker lifecycle

The SW is stateless between events: every handler loads what it needs from storage. Long operations (compiling all templates after an adapter update) are chunked per adapter. On `runtime.onInstalled`/`onStartup`: run migrations, re-verify content-script registrations against granted permissions (`permissions.getAll`), recompile if engine version changed.

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
| Adapters | Vitest + jsdom/happy-dom over fixtures | every component selector matches ≥ 1 node on its route fixture; probes pass |
| Extension logic | Vitest + WXT fake browser 🔬 | storage migrations, compile-service, message validation |
| E2E | Playwright persistent Chromium with `--load-extension` | real target URLs (`https://www.youtube.com/...`) **fulfilled from fixtures via request interception**, so content-script match patterns work without touching the real site 🔬 T-2.4 |
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
